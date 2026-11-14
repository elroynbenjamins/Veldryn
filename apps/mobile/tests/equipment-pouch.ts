import {V33_EQUIPMENT_RECIPES} from '../src/content/equipment-recipes-v33';
import {ITEMS,itemDef} from '../src/content/items';
import {createCharacter,newGame,routeRewards} from '../src/core/game';
import {claimEquipmentCraft,startEquipmentCraft,equipmentCraftingQueue} from '../src/core/equipment-crafting-queue';
import {equipmentPouch,equipmentPouchUpgradePreview,moveLegacyEquipmentPouchStack,tryStoreEquipmentInPouch,upgradeEquipmentPouch} from '../src/core/equipment-pouch';
import {equipmentSalvageReward} from '../src/core/equipment-salvage';
import {gemPouch} from '../src/core/gem-pouch';
import {equipmentPouchSaleCandidates,equipmentPouchSaleId,equipmentPouchQuickSellIds,sellEquipmentPouchSelected,equipmentPouchSalvageCandidates,equipmentPouchQuickSalvageIds,salvageEquipmentPouchSelected} from '../src/core/equipment-pouch-selling';
import {draftCraftedGearInstance} from '../src/core/crafted-gear-instances';
import {itemRarity} from '../src/core/item-rarity';
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
const inventoryFull={...back,inventory:{...back.inventory,capacity:back.inventory.stacks.length}};
const legacyEquipped=executeGameCommand({...inventoryFull,character:{...back.character!,level:100}},{type:'equipment_pouch_equip',args:{itemId:output}},1002).state;
ok(legacyEquipped.character?.equipment[itemDef(output).slot!]===output&&equipmentPouch(legacyEquipped).stacks.filter(row=>row.itemId===output).length===1,'Legacy equipment can be equipped directly from its character pouch');
ok(legacyEquipped.inventory.stacks.length===inventoryFull.inventory.stacks.length,'Direct legacy equip must not require a free Inventory slot');
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
const maxedCopies=Array.from({length:25},(_,index)=>draftCraftedGearInstance({
 itemId:output,ownerCharacterId:started.state.character!.id,jobId:'owner-autosell-'+index,createdAtMs:1000,roll:.00005,
}));
const cappedBank:GameState={...inactiveForge,bank:{...inactiveForge.bank,capacity:30,stacks:maxedCopies.map(instance=>({itemId:output,quantity:1,instanceId:instance.id}))},
 account:{...inactiveForge.account,craftedGearInstances:maxedCopies,craftedGearAutoSellMode:'keep_best_seven'}};
ok(auditCraftedGearOwnership(cappedBank).consistent,'Inactive owner auto-sale fixture needs exact existing physical copies');
const priorOwnerGold=cappedBank.otherCharacters![0].character.gold,priorBankGold=cappedBank.bank.gold??0;
const autoSale=claimEquipmentCraft(cappedBank,job.id,job.completesAtMs,.9);
ok(autoSale.result.autoSold==='incoming','The 26th weaker forged copy must honor the opt-in 25-copy auto-sell setting');
ok(autoSale.state.otherCharacters?.[0].character.gold===priorOwnerGold+itemDef(output).value
 &&(autoSale.state.bank.gold??0)===priorBankGold,
 'Auto-sale of an inactive character\'s would-be Equipment Pouch item must credit that character, never the shared Bank');
ok(auditCraftedGearOwnership(autoSale.state).consistent,'Inactive-owner auto-sale must preserve 25 exact physical copies');

// Sales must be explicit, copy-specific and atomic. No item IDs or prices can be
// supplied as a substitute for a physical pouch entry or its exact Forge receipt.
const legacyCandidates=equipmentPouchSaleCandidates(back);
ok(legacyCandidates.length===2&&legacyCandidates.every(row=>row.eligible),'Both ordinary unenhanced pouch copies should be sellable');
const saleIds=legacyCandidates.map(row=>row.id);
const initialGold=back.character!.gold;
const soldLegacy=executeGameCommand(back,{type:'equipment_pouch_sell',args:{ids:saleIds}},1005).state;
ok(equipmentPouch(soldLegacy).stacks.length===0&&soldLegacy.character!.gold===initialGold+2*itemDef(output).value,
 'Bulk sale removes exactly the selected legacy pouch copies and adds correct character Gold');
ok(back.character!.gold===initialGold&&equipmentPouch(back).stacks.length===2,'Selling must not mutate previous saved state');
let duplicateSaleRejected=false;
try{executeGameCommand(soldLegacy,{type:'equipment_pouch_sell',args:{ids:saleIds}},1006)}catch{duplicateSaleRejected=true}
ok(duplicateSaleRejected,'Retrying stale equipment IDs cannot award Gold twice');
let forgedSaleRejected=false;
try{validateGameCommand({type:'equipment_pouch_sell',args:{ids:saleIds,gold:999999}})}catch{forgedSaleRejected=true}
ok(forgedSaleRejected,'Server must not accept user-provided Gold on equipment sale');
const firstSingle=executeGameCommand(back,{type:'equipment_pouch_sell',args:{ids:[saleIds[0]]}},1005).state;
ok(equipmentPouch(firstSingle).stacks.length===1&&firstSingle.character!.gold===initialGold+itemDef(output).value,
 'Selling one unmarked equipment slot must not consume a second copy');
const reserved:GameState={...back,character:{...back.character!,gearEnhancements:{
 [output]:{rank:1,failures:0,gemIds:[]}}}};
const reservedPreview=equipmentPouchSaleCandidates(reserved);
ok(reservedPreview.filter(row=>row.eligible).length===1,'Bulk safe selection retains one unmarked copy for unequipped legacy enhancement');
const reservedSale=sellEquipmentPouchSelected(reserved,reservedPreview.filter(row=>row.eligible).map(row=>row.id));
ok(equipmentPouch(reservedSale).stacks.length===1,'Selling spare legacy equipment must leave protected enhanced copy');
let reservedRejected=false;try{sellEquipmentPouchSelected(reserved,saleIds)}catch{reservedRejected=true}
ok(reservedRejected,'Requesting more than unprotected legacy gear must reject entire batch');
const favoriteGear:GameState={...back,settings:{...back.settings,favoriteItemIds:[output]}};
ok(equipmentPouchSaleCandidates(favoriteGear).every(row=>!row.eligible),'Favorites cannot enter safe sale selection');
let favoriteRejected=false;try{sellEquipmentPouchSelected(favoriteGear,[saleIds[0]])}catch{favoriteRejected=true}
ok(favoriteRejected,'Favorites cannot be sold even by a forged direct command');
const lockedGear:GameState={...back,settings:{...back.settings,lockedItemIds:[output]}};
ok(equipmentPouchSaleCandidates(lockedGear).every(row=>!row.eligible),'Locked gear is protected against bulk selection');
const withLoadout:GameState={...back,character:{...back.character!,savedLoadouts:[{id:'saved-1',slotIndex:0,name:'My set',classId:back.character!.classId,equipment:{[itemDef(output).slot!]:output},createdAtMs:100,updatedAtMs:100}]}};
ok(equipmentPouchSaleCandidates(withLoadout).every(row=>!row.eligible),'Legacy equipment referenced by saved loadouts stays protected');
const exactCandidate=equipmentPouchSaleCandidates(tagged)[0];
ok(exactCandidate.id==='copy:'+record.id&&exactCandidate.eligible,'Exact Forge copy is selectable only through its unique receipt');
const soldExact=executeGameCommand(tagged,{type:'equipment_pouch_sell',args:{ids:[exactCandidate.id]}},1007).state;
ok(!equipmentPouch(soldExact).stacks.length&&!soldExact.account.craftedGearInstances?.some(row=>row.id===record.id)
 &&soldExact.character!.gold===tagged.character!.gold+itemDef(output).value
 &&auditCraftedGearOwnership(soldExact).consistent,
 'Selling exact Forge receipt must remove its one owned instance and credit only its original character');
const protectedExact:GameState={...tagged,account:{...tagged.account,craftedGearInstances:[{...record,locked:true}]}};
ok(!equipmentPouchSaleCandidates(protectedExact)[0].eligible,'Exact locked Forge gear must be blocked from safe selection');
let protectedExactRejected=false;try{sellEquipmentPouchSelected(protectedExact,[exactCandidate.id])}catch{protectedExactRejected=true}
ok(protectedExactRejected,'A direct server command cannot bypass an exact-copy lock');
const mixed:GameState={...tagged,character:{...tagged.character!,equipmentPouch:{capacity:30,stacks:[{itemId:output,quantity:1},{itemId:output,quantity:1,instanceId:record.id}]}},
 account:{...tagged.account,craftedGearInstances:[{...record,locked:true}]}};
const mixedIds=mixed.character!.equipmentPouch!.stacks.map((stack,index)=>equipmentPouchSaleId(stack,index));
let mixedRejected=false;try{sellEquipmentPouchSelected(mixed,mixedIds)}catch{mixedRejected=true}
ok(mixedRejected&&equipmentPouch(mixed).stacks.length===2,'Mixed batch containing locked unique gear must fail without a partial sale');
const withOverflow:GameState={...back,character:{...back.character!,gold:Number.MAX_SAFE_INTEGER}};
let overflowRejected=false;try{sellEquipmentPouchSelected(withOverflow,[saleIds[0]])}catch{overflowRejected=true}
ok(overflowRejected,'Gold overflow must fail the entire sale');
const quick=equipmentPouchQuickSellIds(equipmentPouchSaleCandidates(tagged));
ok(quick.every(id=>{const entry=equipmentPouchSaleCandidates(tagged).find(candidate=>candidate.id===id)!;return ['common','uncommon','rare'].includes(entry.rarity)}),
 'Quick Select Safe must exclude valuable Epic, Legendary and Mythic gear');
ok(['common','uncommon','rare'].includes(itemRarity(itemDef(output)))||quick.length===0,'Rare-tier quick select remains explicit');
ok(validateGameCommand({type:'equipment_pouch_upgrade'}).type==='equipment_pouch_upgrade','Server command permits Equipment Pouch upgrade');
ok(validateGameCommand({type:'equipment_pouch_move',args:{itemId:output,from:'equipment_pouch',to:'inventory',quantity:1}}).type==='equipment_pouch_move','Server command permits validated pouch movement');
ok(validateGameCommand({type:'equipment_pouch_sell',args:{ids:saleIds}}).type==='equipment_pouch_sell','Server accepts a bounded selection of exact equipment IDs');
// Salvage uses exact receipts and one server-confirmed material settlement.
const salvageReward=equipmentSalvageReward(output)!;
ok(!!salvageReward&&salvageReward.itemId==='TEMPERING_DUST','T1–T9 equipment has a modest authored upgrade-material salvage yield');
const salvageCandidates=equipmentPouchSalvageCandidates(back);
ok(salvageCandidates.length===2&&salvageCandidates.every(row=>row.eligible),'Both unenhanced legacy pouch copies are salvageable');
const salvageIds=salvageCandidates.map(row=>row.id);
const oldSalvageMaterials=back.inventory.stacks.find(row=>row.itemId===salvageReward.itemId)?.quantity??0;
const salvagedLegacy=executeGameCommand(back,{type:'equipment_pouch_salvage',args:{ids:salvageIds}},1010).state;
ok(!equipmentPouch(salvagedLegacy).stacks.length
 &&(salvagedLegacy.inventory.stacks.find(row=>row.itemId===salvageReward.itemId)?.quantity??0)===oldSalvageMaterials+salvageReward.quantity*2
 &&salvagedLegacy.character!.gold===back.character!.gold,
 'Bulk legacy salvage removes only selected gear, rewards the authored materials once and awards no Gold');
const salvageExactId=equipmentPouchSalvageCandidates(tagged)[0].id;
const salvagedExact=executeGameCommand(tagged,{type:'equipment_pouch_salvage',args:{ids:[salvageExactId]}},1011).state;
ok(!equipmentPouch(salvagedExact).stacks.length&&!salvagedExact.account.craftedGearInstances?.some(row=>row.id===record.id)
 &&(salvagedExact.inventory.stacks.find(row=>row.itemId===salvageReward.itemId)?.quantity??0)===(tagged.inventory.stacks.find(row=>row.itemId===salvageReward.itemId)?.quantity??0)+salvageReward.quantity
 &&auditCraftedGearOwnership(salvagedExact).consistent,
 'Exact forged-copy salvage preserves ownership and correctly rewards character Inventory');
ok(equipmentPouchSalvageCandidates(lockedGear).every(row=>!row.eligible),'Type-level locks protect all legacy copies from salvage');
ok(equipmentPouchSalvageCandidates(protectedExact).every(row=>!row.eligible),'Exact-copy locks protect forged gear from salvage');
const salvageReserved=equipmentPouchSalvageCandidates(reserved);
ok(salvageReserved.filter(row=>row.eligible).length===1,'Legacy enhanced equipment retains its reserved last copy during salvage');
ok(equipmentPouchSalvageCandidates(reserved,[saleIds[0]]).every(row=>row.eligible),
 'A single legacy copy remains selectable when another copy is left for its enhancement');
const salvageMixedIds=equipmentPouch(mixed).stacks.map((stack,index)=>equipmentPouchSaleId(stack,index));
let mixedSalvageRejected=false;try{salvageEquipmentPouchSelected(mixed,salvageMixedIds)}catch{mixedSalvageRejected=true}
ok(mixedSalvageRejected&&equipmentPouch(mixed).stacks.length===2,'Mixed salvage cannot partially dispose protected gear');
let duplicateSalvageRejected=false;try{salvageEquipmentPouchSelected(salvagedExact,[salvageExactId])}catch{duplicateSalvageRejected=true}
ok(duplicateSalvageRejected,'Stale exact-copy salvage command cannot duplicate material rewards');
const fullInventory:GameState={...tagged,inventory:{...tagged.inventory,capacity:tagged.inventory.stacks.length}};
const fullSalvage=equipmentPouchSalvageCandidates(fullInventory);
ok(!fullSalvage[0].eligible,'Full Inventory with no existing material stack must block new salvage rewards');
let fullRejected=false;try{salvageEquipmentPouchSelected(fullInventory,[salvageExactId])}catch{fullRejected=true}
ok(fullRejected,'Authoritative salvage rejects full Inventory atomically');
const quickSalvage=equipmentPouchQuickSalvageIds(tagged,equipmentPouchSalvageCandidates(tagged));
ok(quickSalvage.every(id=>{const row=equipmentPouchSalvageCandidates(tagged).find(candidate=>candidate.id===id)!;return ['common','uncommon','rare'].includes(itemRarity(itemDef(row.itemId)))}),
 'Quick Select Safe Salvage excludes Epic, Legendary and Mythic items');
let spoofedSalvageRejected=false;try{validateGameCommand({type:'equipment_pouch_salvage',args:{ids:salvageIds,materials:9999}})}catch{spoofedSalvageRejected=true}
ok(spoofedSalvageRejected,'Salvage command cannot supply its own material rewards');
ok(validateGameCommand({type:'equipment_pouch_salvage',args:{ids:salvageIds}}).type==='equipment_pouch_salvage','Server accepts bounded exact-copy salvage IDs');
const fs=require('fs') as {readFileSync:(p:string,e:string)=>string};
const view=fs.readFileSync('src/screens/InventoryScreen.tsx','utf8'),panel=fs.readFileSync('src/components/EquipmentPouchPanel.tsx','utf8');
ok(view.includes('<EquipmentPouchPanel')&&view.includes('Equipment')&&panel.includes('To Inventory')&&panel.includes('To Bank')&&panel.includes('Equip'),'Inventory must expose usable Equipment Pouch actions');
ok(panel.includes('Select safe to sell')&&panel.includes('Sell selected')&&panel.includes("type:'equipment_pouch_sell'")&&panel.includes('Sell selected equipment?'),'Pouch must provide direct sale, safe mass selection and explicit irreversible-sale confirmation');
console.log('PASS: Equipment Pouch bulk sale and salvage, authored materials, Forge ownership, transfers and protections');
