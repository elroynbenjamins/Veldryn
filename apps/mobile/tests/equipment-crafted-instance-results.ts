import {V33_EQUIPMENT_RECIPES} from '../src/content/equipment-recipes-v33';
import {createCharacter,newGame} from '../src/core/game';
import {claimEquipmentCraft,equipmentCraftingQueue,startEquipmentCraft} from '../src/core/equipment-crafting-queue';
import {CRAFTED_EPIC_CHANCE,CRAFTED_MYTHIC_CHANCE,craftedGearRarity,craftedRarityStatMultiplier} from '../src/core/crafted-gear-rarity';
import {bestCraftedInstanceForItem,craftedGearInstances,craftClaimSubRoll,effectiveOwnedGearRarity} from '../src/core/crafted-gear-instances';
import {enhancedGearStats,upgradeQuote} from '../src/core/equipment-enhancement';
import {itemDef} from '../src/content/items';
import {itemRarity} from '../src/core/item-rarity';
import {executeGameCommand} from '../src/core/game-commands';
import {normalizeSave} from '../src/core/save-normalization';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}

ok(CRAFTED_EPIC_CHANCE===.006,'Forge Epic quality proc must be exactly 0.60%');
ok(CRAFTED_MYTHIC_CHANCE===.001,'Forge Mythic quality proc must be exactly 0.10%');

const recipe=V33_EQUIPMENT_RECIPES.find(row=>row.output.itemId==='T1P_001')!;
const base=itemRarity(itemDef(recipe.output.itemId));
ok(base==='common','T1P_001 must remain a useful Common baseline fixture');
ok(craftedGearRarity(recipe.output.itemId,0)==='mythic','Roll 0 should proc Mythic');
ok(craftedGearRarity(recipe.output.itemId,.000999)==='mythic','Mythic range should cover [0,0.001)');
ok(craftedGearRarity(recipe.output.itemId,.001)==='epic','Epic range must begin at 0.001');
ok(craftedGearRarity(recipe.output.itemId,.006999)==='epic','Epic range should extend through the combined 0.70% quality-proc window');
ok(craftedGearRarity(recipe.output.itemId,.007)==='common','Non-proc T1 craft should preserve authored Common rarity');

const t9=V33_EQUIPMENT_RECIPES.find(row=>row.v33EquipmentTier==='T9')!;
ok(itemRarity(itemDef(t9.output.itemId))==='mythic','T9 authored rarity should be Mythic');
ok(craftedGearRarity(t9.output.itemId,.5)==='mythic','Missed quality roll must never downgrade an authored Mythic item');
ok(craftedGearRarity(t9.output.itemId,.002)==='mythic','Epic proc must not downgrade authored Mythic');

let state=createCharacter(newGame(0),recipe.classId,'Instance Crafter','male');
state={...state,character:{...state.character!,level:recipe.characterLevel,gold:500000},skills:state.skills.map(row=>row.skillId==='smithing'?{...row,level:Math.max(10,recipe.level),xp:50000}:row),inventory:{...state.inventory,capacity:80,stacks:recipe.inputs.map(input=>({itemId:input.itemId,quantity:input.quantity*4}))},bank:{...state.bank,capacity:200,stacks:[]}};
const beforeStats=enhancedGearStats(state,recipe.output.itemId),beforeQuote=upgradeQuote(state,recipe.output.itemId);

let started=startEquipmentCraft(state,recipe.id,1000);state=started.state;
let job=equipmentCraftingQueue(state)[0];
const epicClaim=claimEquipmentCraft(state,job.id,job.completesAtMs,.002);
state=epicClaim.state;
ok(epicClaim.result.rarity==='epic'&&epicClaim.result.qualityProc,'Trusted .002 claim roll should produce an Epic quality proc');
ok(craftedGearInstances(state).length===1,'Claimed Forge gear must create a persisted instance');
ok(craftedGearInstances(state)[0].id.includes(job.id),'Crafted instance identity must derive from its authoritative Forge receipt');
ok(craftedGearInstances(state)[0].enhancement.rank===0&&craftedGearInstances(state)[0].enhancement.gemIds.length===0,'Fresh crafted instance must start unenhanced and unsocketed');
ok(effectiveOwnedGearRarity(state,recipe.output.itemId)==='epic','Best owned crafted copy should become effective rarity');
ok(craftedRarityStatMultiplier(recipe.output.itemId,'epic')>1,'Epic T1 proc must provide a real stat multiplier');
const epicStats=enhancedGearStats(state,recipe.output.itemId),epicQuote=upgradeQuote(state,recipe.output.itemId);
ok(epicStats.attack>beforeStats.attack||epicStats.defense>beforeStats.defense||epicStats.hp>beforeStats.hp,'Epic crafted copy must improve effective gear stats');
ok(epicQuote.gold>beforeQuote.gold,'Higher forged rarity must increase upgrade Gold cost');

started=startEquipmentCraft(state,recipe.id,job.completesAtMs+1);state=started.state;
job=equipmentCraftingQueue(state).find(row=>row.recipeId===recipe.id)!;
const commonClaim=claimEquipmentCraft(state,job.id,job.completesAtMs,.5);
state=commonClaim.state;
ok(commonClaim.result.rarity==='common','Second non-proc craft should preserve Common rarity');
ok(commonClaim.result.duplicateCount===1,'Second crafted copy should report one duplicate copy');
ok(craftedGearInstances(state).length===2,'Duplicate gear crafts must remain distinct owned instances');
ok(new Set(craftedGearInstances(state).map(row=>row.id)).size===2,'Duplicate crafted copies need distinct instance IDs');
ok(bestCraftedInstanceForItem(state,recipe.output.itemId)?.rarity==='epic','Lower-rarity duplicate must not displace the better owned copy');
ok(effectiveOwnedGearRarity(state,recipe.output.itemId)==='epic','Best-copy compatibility layer must retain Epic effective rarity');

const subA=craftClaimSubRoll(.123456,'job-a'),subB=craftClaimSubRoll(.123456,'job-b');
ok(subA>=0&&subA<1&&subB>=0&&subB<1&&subA!==subB,'Claim All must derive stable independent per-job sub-rolls');

let online=createCharacter(newGame(0),recipe.classId,'Online Crafter','male');
online={...online,character:{...online.character!,level:recipe.characterLevel,gold:500000},skills:online.skills.map(row=>row.skillId==='smithing'?{...row,level:10,xp:50000}:row),inventory:{...online.inventory,stacks:recipe.inputs.map(input=>({itemId:input.itemId,quantity:input.quantity}))}};
const commandStart=executeGameCommand(online,{type:'craft',args:{id:recipe.id}},2000,{randomRoll:.5});
const onlineJob=equipmentCraftingQueue(commandStart.state)[0];
let trustedRequired=false;try{executeGameCommand(commandStart.state,{type:'craft_claim',args:{id:onlineJob.id}},onlineJob.completesAtMs)}catch(error){trustedRequired=error instanceof Error&&error.message==='trusted_random_required'}
ok(trustedRequired,'Authoritative Forge claim must reject settlement without trusted randomness');
const commandClaim=executeGameCommand(commandStart.state,{type:'craft_claim',args:{id:onlineJob.id}},onlineJob.completesAtMs,{randomRoll:.0005});
ok(commandClaim.message?.startsWith('MYTHIC '),'Authoritative claim should expose Mythic result in player-facing message');
ok(craftedGearInstances(commandClaim.state)[0]?.rarity==='mythic','Authoritative trusted roll must persist Mythic instance rarity');

const normalized=normalizeSave({...state,version:6} as any);
ok(normalized.account.craftedGearInstances?.length===2,'Save normalization must preserve crafted gear instances');
ok(normalized.account.craftedGearInstances?.some(row=>row.rarity==='epic'),'Save normalization must preserve crafted instance rarity');

console.log('PASS: Forge rarity uses 0.60% Epic / 0.10% Mythic upward procs with trusted instance-backed settlement and meaningful stats');
