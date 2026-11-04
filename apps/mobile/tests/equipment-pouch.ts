import {V33_EQUIPMENT_RECIPES} from '../src/content/equipment-recipes-v33';
import {ITEMS,itemDef} from '../src/content/items';
import {createCharacter,newGame,routeRewards} from '../src/core/game';
import {claimEquipmentCraft,startEquipmentCraft,equipmentCraftingQueue} from '../src/core/equipment-crafting-queue';
import {equipmentPouch,equipmentPouchUpgradePreview,moveLegacyEquipmentPouchStack,tryStoreEquipmentInPouch,upgradeEquipmentPouch} from '../src/core/equipment-pouch';
import {gemPouch} from '../src/core/gem-pouch';
import {draftCraftedGearInstance} from '../src/core/crafted-gear-instances';
import {auditCraftedGearOwnership,equipCraftedGearInstance,moveCraftedGearInstance,unequipCraftedGearInstance} from '../src/core/crafted-gear-ownership';
import {characterDeleteBlockReason} from '../src/core/account-actions';
import {executeGameCommand,validateGameCommand} from '../src/core/game-commands';
import type {GameState} from '../src/core/types';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
const recipe=V33_EQUIPMENT_RECIPES.find(row=>row.classId==='BASTION'&&row.v33EquipmentTier==='T1')!;
const otherRecipe=V33_EQUIPMENT_RECIPES.find(row=>row.output.itemId!==recipe.output.itemId)!;
const gem=ITEMS.find(item=>item.type==='gem'||!!item.rawGemFamilyId)!;
const output=recipe.output.itemId;
let base=createCharacter(newGame(0),'BASTION','Pouch Tester');
ok(equipmentPouch(base).capacity===30&&equipmentPouch(base).stacks.length===0,'Every character starts with an empty 30-slot Equipment Pouch');
const grants=routeRewards(base,[{itemId:gem.id,quantity:3},{itemId:output,quantity:2}],1000);
const stored={...base,...grants};
ok(gemPouch(stored).stacks.some(row=>row.itemId===gem.id&&row.quantity===3),'Earned gems must automatically enter the shared Gem Pouch');
ok(equipmentPouch(stored).stacks.filter(row=>row.itemId===output).length===2,'Earned equipment must automatically use one character pouch slot per copy');
ok(!stored.inventory.stacks.some(row=>row.itemId===gem.id||row.itemId===output),'Pouch-first rewards must avoid consuming normal Inventory slots');
const transferred=executeGameCommand(stored,{type:'equipment_pouch_move',args:{itemId:output,quantity:1,from:'equipment_pouch',to:'inventory'}},1001).state;
ok(equipmentPouch(transferred).stacks.filter(row=>row.itemId===output).length===1&&transferred.inventory.stacks.some(row=>row.itemId===output),
 'Manual legacy equipment transfer must preserve exactly one physical copy');
const back=moveLegacyEquipmentPouchStack(transferred,output,1,'inventory','equipment_pouch');
ok(equipmentPouch(back).stacks.filter(row=>row.itemId===output).length===2,'Manual character storage movement must be reversible');
const legacyEquipped=executeGameCommand({...back,character:{...back.character!,level:100}},{type:'equipment_pouch_equip',args:{itemId:output}},1002).state;
ok(legacyEquipped.character?.equipment[itemDef(output).slot!]===output&&equipmentPouch(legacyEquipped).stacks.filter(row=>row.itemId===output).length===1,'Legacy equipment can be equipped directly from its character pouch');
let noGearFromPouch=false;try{moveLegacyEquipmentPouchStack(back,gem.id,1,'equipment_pouch','bank')}catch{noGearFromPouch=true}
ok(noGearFromPouch,'Equipment Pouch must not accept gems or arbitrary materials');
const full={...base,character:{...base.character!,equipmentPouch:{capacity:30,stacks:Array.from({length:30},()=>({itemId:otherRecipe.output.itemId,quantity:1}))}}};
const fallback={...full,...routeRewards(full,[{itemId:output,quantity:1},{itemId:gem.id,quantity:1}],1002)};
ok(equipmentPouch(fallback).stacks.length===30&&fallback.inventory.stacks.some(row=>row.itemId===output),'Full character pouch must safely fall back to Inventory for gear');
ok(gemPouch(fallback).stacks.some(row=>row.itemId===gem.id),'Full Equipment Pouch must not block automatic gem routing');
const afterUpgrade=upgradeEquipmentPouch({...base,character:{...base.character!,level:10,gold:10000}});
ok(equipmentPouchUpgradePreview(base)?.capacity===40&&equipmentPouch(afterUpgrade).capacity===40&&afterUpgrade.character!.gold===0,'Character Pouch upgrade respects tier, level and exact Gold charge');
const record=draftCraftedGearInstance({itemId:output,ownerCharacterId:base.character!.id,jobId:'pouch-unique-1',createdAtMs:1000,roll:.003});
const tagged:GameState={...base,character:{...base.character!,level:100,equipmentPouch:{capacity:30,stacks:[{itemId:output,quantity:1,instanceId:record.id}]}},account:{...base.account,craftedGearInstances:[record]}};
ok(auditCraftedGearOwnership(tagged).consistent,'Unique gear in Equipment Pouch must retain exact physical ownership');
const equipped=equipCraftedGearInstance(tagged,record.id);
ok(equipped.character!.equipmentInstanceIds?.[itemDef(output).slot!]===record.id&&auditCraftedGearOwnership(equipped).consistent,
 'Direct equip from Equipment Pouch must preserve exact item rarity/quality receipts');
const unequipped=unequipCraftedGearInstance(equipped,record.id);
ok(equipmentPouch(unequipped).stacks.some(row=>row.instanceId===record.id),'Unequip should return exact gear to character Equipment Pouch');
ok(characterDeleteBlockReason(unequipped,base.character!.id)?.includes('Transfer unique equipment')===true,'Character deletion cannot silently strip unique equipment identity');
const inBank=moveCraftedGearInstance(unequipped,record.id,'bank');
ok(auditCraftedGearOwnership(inBank).consistent&&inBank.bank.stacks.some(row=>row.instanceId===record.id),'Bank transfer must retain exact receipt and free pouch slot');
ok(!characterDeleteBlockReason(inBank,base.character!.id),'Character can be deleted after moving exact owned copies to Bank');
const inactive={...base.character!,id:'SECOND_CHAR',name:'Second Character',equipmentPouch:{capacity:30,stacks:[]}};
const multi:GameState={...base,otherCharacters:[{character:inactive,inventory:{stacks:[],capacity:30},overflow:{stacks:[],expiresAtMs:null},activity:null,skills:base.skills,quests:base.quests,currentRegionId:base.currentRegionId}]};
const placed=tryStoreEquipmentInPouch(multi,{itemId:output,quantity:1},inactive.id)!;
ok(!!placed&&equipmentPouch(placed).stacks.length===0&&placed.otherCharacters?.[0].character.equipmentPouch?.stacks.length===1,'Inactive character rewards must not leak into current character storage');
function prepareForge(){
 let state=createCharacter(newGame(0),recipe.classId,'Pouch Tester');
 state={...state,character:{...state.character!,level:Math.max(recipe.characterLevel,50),gold:500000},
  skills:state.skills.map(row=>row.skillId===recipe.skillId?{...row,level:Math.max(recipe.level,50),xp:500000}:row),
  inventory:{...state.inventory,capacity:80,stacks:recipe.inputs.map(input=>({itemId:input.itemId,quantity:input.quantity*3}))}};
 return state;
}
const prepared=prepareForge(),started=startEquipmentCraft(prepared,recipe.id,2000),job=equipmentCraftingQueue(started.state)[0];
const claimed=claimEquipmentCraft(started.state,job.id,job.completesAtMs,.004);
ok(equipmentPouch(claimed.state).stacks.some(row=>row.instanceId===claimed.result.instanceId)&&auditCraftedGearOwnership(claimed.state).consistent,'Forge claim must deliver exact unique receipt directly to original character pouch');
const backgroundCharacter={...claimed.state.character!,id:'ALT',equipmentPouch:{capacity:30,stacks:[]}};
const inactiveForge:GameState={...started.state,character:backgroundCharacter,inventory:{stacks:[],capacity:30},
 otherCharacters:[{character:started.state.character!,inventory:started.state.inventory,overflow:started.state.overflow,activity:started.state.activity,skills:started.state.skills,quests:started.state.quests,currentRegionId:started.state.currentRegionId}]};
const backgroundClaim=claimEquipmentCraft(inactiveForge,job.id,job.completesAtMs,.004);
ok(backgroundClaim.state.otherCharacters?.[0].character.equipmentPouch?.stacks.some(row=>row.instanceId===backgroundClaim.result.instanceId)
 &&equipmentPouch(backgroundClaim.state).stacks.length===0,'Claiming a different character\'s finished Forge job must deliver to its owner\'s pouch');
ok(validateGameCommand({type:'equipment_pouch_upgrade'}).type==='equipment_pouch_upgrade','Server command permits Equipment Pouch upgrade');
ok(validateGameCommand({type:'equipment_pouch_move',args:{itemId:output,from:'equipment_pouch',to:'inventory',quantity:1}}).type==='equipment_pouch_move','Server command permits validated pouch movement');
const fs=require('fs') as {readFileSync:(p:string,e:string)=>string};
const view=fs.readFileSync('src/screens/InventoryScreen.tsx','utf8'),panel=fs.readFileSync('src/components/EquipmentPouchPanel.tsx','utf8');
ok(view.includes('<EquipmentPouchPanel')&&view.includes('Equipment')&&panel.includes('To Inventory')&&panel.includes('To Bank')&&panel.includes('Equip'),'Inventory must expose usable Equipment Pouch actions');
console.log('PASS: character Equipment Pouch, Forge receipts, gem and gear auto-routing, transfers, upgrades and deletion safety');
