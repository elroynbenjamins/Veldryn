import {V33_EQUIPMENT_RECIPES} from '../src/content/equipment-recipes-v33';
import {itemDef} from '../src/content/items';
import {createCharacter,equipItem,newGame,sellItem,unequipItem} from '../src/core/game';
import {attemptEquipmentUpgrade} from '../src/core/equipment-enhancement';
import {claimEquipmentCraft,equipmentCraftingQueue,startEquipmentCraft} from '../src/core/equipment-crafting-queue';
import {bestStoredGearInstance,CRAFTED_GEAR_RARITY_CHANCES,CRAFTED_GEAR_STAT_MULTIPLIER,gearInstances,rarityBreakdownForStack,rollCraftedGearRarity} from '../src/core/crafted-gear-instances';
import {itemRarity} from '../src/core/item-rarity';
import {normalizeSave} from '../src/core/save-normalization';
import {totalXpAtLevel} from '../src/core/progression';
import {characterDeleteConfirmation,createAccountCharacter,deleteAccountCharacter} from '../src/core/account-actions';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function close(actual:number,expected:number,message:string){if(Math.abs(actual-expected)>1e-9)throw new Error(message+' · expected '+expected+', got '+actual)}

close(Object.values(CRAFTED_GEAR_RARITY_CHANCES).reduce((sum,value)=>sum+value,0),1,'Forge rarity chances must total 100%');
ok(rollCraftedGearRarity(.5)==='common','Common roll boundary missing');
ok(rollCraftedGearRarity(.05)==='uncommon','Uncommon roll boundary missing');
ok(rollCraftedGearRarity(.02)==='rare','Rare roll boundary missing');
ok(rollCraftedGearRarity(.005)==='epic','Epic roll boundary missing');
ok(rollCraftedGearRarity(.002)==='legendary','Legendary roll boundary missing');
ok(rollCraftedGearRarity(.0005)==='mythic','Mythic roll boundary missing');
ok(CRAFTED_GEAR_STAT_MULTIPLIER.common===1&&CRAFTED_GEAR_STAT_MULTIPLIER.legendary===1.14&&CRAFTED_GEAR_STAT_MULTIPLIER.mythic===1.18,'Crafted rarity stat curve missing');

const t1=V33_EQUIPMENT_RECIPES.find(row=>row.v33EquipmentTier==='T1'&&row.classId==='IRONWARDEN')!;
const t9=V33_EQUIPMENT_RECIPES.find(row=>row.v33EquipmentTier==='T9'&&row.classId==='IRONWARDEN')!;
ok(itemRarity(itemDef(t1.output.itemId))==='common','T1 V33 definition must start Common');
ok(itemRarity(itemDef(t9.output.itemId))==='common','T9 V33 definition must also start Common with no tier rarity floor');

const inputs=new Map<string,number>();
for(const recipe of [t1,t9])for(const input of recipe.inputs)inputs.set(input.itemId,(inputs.get(input.itemId)??0)+input.quantity*8);
let state=createCharacter(newGame(0),'IRONWARDEN','Rarity Tester','male');
state={...state,character:{...state.character!,level:100,gold:5_000_000},skills:state.skills.map(row=>row.skillId==='smithing'?{...row,level:100,xp:totalXpAtLevel(100)}:row),inventory:{...state.inventory,capacity:120,stacks:[...inputs].map(([itemId,quantity])=>({itemId,quantity}))},bank:{...state.bank,capacity:500,stacks:[]}};

let started=startEquipmentCraft(state,t1.id,1000);state=started.state;
let job=equipmentCraftingQueue(state).find(row=>row.recipeId===t1.id)!;
let claimed=claimEquipmentCraft(state,job.id,job.completesAtMs,.002);state=claimed.state;
ok(claimed.craftResult.rarity==='legendary','T1 must use the universal Legendary roll');
ok(claimed.craftResult.statBonusPct===14,'Legendary craft result must report +14% quality stats');
ok(claimed.craftResult.setProgress?.owned===1,'First set piece must progress the set by one unique piece');

started=startEquipmentCraft(state,t9.id,job.completesAtMs+1);state=started.state;
job=equipmentCraftingQueue(state).find(row=>row.recipeId===t9.id)!;
claimed=claimEquipmentCraft(state,job.id,job.completesAtMs,.002);state=claimed.state;
ok(claimed.craftResult.rarity==='legendary','T9 must use the exact same Legendary roll as T1');

started=startEquipmentCraft(state,t1.id,job.completesAtMs+1);state=started.state;
job=equipmentCraftingQueue(state).filter(row=>row.recipeId===t1.id)[0]!;
const duplicate=claimEquipmentCraft(state,job.id,job.completesAtMs,.5);state=duplicate.state;
ok(duplicate.craftResult.rarity==='common','Duplicate T1 craft should be able to roll Common');
ok(duplicate.craftResult.ownedCopies===2,'Duplicate result must report two owned copies');
ok(duplicate.craftResult.setProgress?.owned===1,'Duplicate copy must not advance unique set-piece progress');

const t1Stack=state.inventory.stacks.find(row=>row.itemId===t1.output.itemId)!;
ok(t1Stack.quantity===2,'Two crafted copies should remain represented by the grouped inventory quantity');
let breakdown=rarityBreakdownForStack(state,t1.output.itemId,'inventory',t1Stack.quantity);
ok(breakdown.some(row=>row.rarity==='legendary'&&row.count===1)&&breakdown.some(row=>row.rarity==='common'&&row.count===1),'Grouped stack must preserve per-copy Common + Legendary rarity');
const best=bestStoredGearInstance(state,t1.output.itemId,'inventory')!;
ok(best.craftedRarity==='legendary','Equip selection must prefer the best crafted rarity');

state={...state,inventory:{...state.inventory,stacks:[...state.inventory.stacks,{itemId:'TEMPERING_DUST',quantity:20}]}};
state=equipItem(state,t1.output.itemId);
const equippedId=state.character!.equippedGearInstanceIds?.[itemDef(t1.output.itemId).slot!]!;
ok(equippedId===best.id,'Equip by item stack must bind the best crafted instance');
const beforeInstances=gearInstances(state);
const upgraded=attemptEquipmentUpgrade(state,t1.output.itemId,0);state=upgraded.state;
ok(upgraded.result.success&&upgraded.result.newRank===1,'Equipped crafted instance should upgrade normally');
const legendaryAfter=gearInstances(state).find(row=>row.id===best.id)!;
const commonAfter=gearInstances(state).find(row=>row.itemId===t1.output.itemId&&row.craftedRarity==='common')!;
ok(legendaryAfter.enhancement.rank===1&&commonAfter.enhancement.rank===0,'Upgrade rank must stay on the specific equipped instance');
ok(beforeInstances.find(row=>row.id===best.id)!.enhancement.rank===0,'Upgrade must not mutate prior state');

state=unequipItem(state,itemDef(t1.output.itemId).slot!);
state=sellItem(state,t1.output.itemId,1);
breakdown=rarityBreakdownForStack(state,t1.output.itemId,'inventory',state.inventory.stacks.find(row=>row.itemId===t1.output.itemId)?.quantity??0);
ok(breakdown.length===1&&breakdown[0].rarity==='legendary','Selling one duplicate must consume the lowest-rarity disposable Common copy first');
ok(gearInstances(state).some(row=>row.id===best.id&&row.enhancement.rank===1),'Enhanced Legendary copy must survive duplicate disposal');

const normalized=normalizeSave({...state,version:6});
ok(normalized.account.gearInstances?.some(row=>row.id===best.id&&row.craftedRarity==='legendary'&&row.enhancement.rank===1),'Crafted instance rarity/enhancement must survive save normalization');
const deleted=deleteAccountCharacter(normalized,normalized.character!.id,characterDeleteConfirmation(normalized.character!.name),50_000);
const banked=deleted.account.gearInstances?.find(row=>row.id===best.id);
ok(!deleted.character&&banked?.storage==='bank'&&banked.craftedRarity==='legendary'&&banked.enhancement.rank===1,'Deleting the last character must preserve the crafted instance in Bank recovery state');
const recreated=createAccountCharacter(deleted,'IRONWARDEN','Reborn Warden','male',60_000);
const adopted=recreated.account.gearInstances?.find(row=>row.id===best.id);
ok(adopted?.ownerCharacterId===recreated.character!.id&&adopted.storage==='bank','A matching new character must adopt orphaned Bank gear without losing rarity or enhancement');

console.log('PASS: all tiers roll the same Common→Mythic table; duplicates preserve rarity, best-copy equip and per-instance enhancement');
