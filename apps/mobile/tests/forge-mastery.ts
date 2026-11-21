import {createCharacter,newGame} from '../src/core/game';
import {V33_EQUIPMENT_RECIPES} from '../src/content/equipment-recipes-v33';
import {forgeLevel,forgeSpeedBonus,forgeRarityBonusPercent,forgeRarePlusChance} from '../src/core/forge-mastery';
import {craftedGearRarity,craftedGearRarityOutcomes} from '../src/core/crafted-gear-rarity';
import {draftCraftedGearInstance} from '../src/core/crafted-gear-instances';
import {equipmentCraftDurationSeconds,startEquipmentCraft,equipmentCraftingQueue,claimForgeJob,normalizeEquipmentCraftingQueue} from '../src/core/equipment-crafting-queue';
import {totalXpAtLevel} from '../src/core/progression';

function assert(ok:unknown,message:string){if(!ok)throw new Error(message)}
for(const [level,bonus] of [[1,0],[24,0],[25,5],[49,5],[50,10],[74,10],[75,15],[100,15]]){
 assert(forgeRarityBonusPercent(level)===bonus,'Milestone mismatch at '+level);
}
assert(forgeSpeedBonus(1)===0,'Starting level speed must be neutral');
assert(Math.abs(forgeSpeedBonus(100)-.10)<1e-10,'Level 100 must reach +10% speed');
assert(forgeSpeedBonus(75)>forgeSpeedBonus(50),'Forge speed must progress each level');
assert(Math.abs(forgeRarePlusChance(75)-.04485)<1e-10,'Level 75 should give 4.485% Rare+');

const recipe=V33_EQUIPMENT_RECIPES.find(row=>row.v33SetId==='T1_001'&&row.skillId==='smithing')!;
assert(!!recipe,'A supported timed smithing equipment recipe is required');
const itemId=recipe.output.itemId;
const defaultOdds=craftedGearRarityOutcomes(itemId);
const upgradedOdds=craftedGearRarityOutcomes(itemId,15);
assert(Math.abs(defaultOdds.reduce((sum,row)=>sum+row.chance,0)-1)<1e-10,'Base odds must sum to 1');
assert(Math.abs(upgradedOdds.reduce((sum,row)=>sum+row.chance,0)-1)<1e-10,'Boosted odds must sum to 1');
assert(craftedGearRarity(itemId,.041)==='uncommon','Legacy job threshold must remain unchanged');
assert(craftedGearRarity(itemId,.041,15)==='rare','Level 75 must improve Rare+ rarity odds');
const origin=createCharacter(newGame(0),recipe.classId,'Forge QA');
const skillLevel=Math.max(20,recipe.level);
let state={...origin,character:{...origin.character!,level:Math.max(15,recipe.characterLevel??1),gold:100000},skills:origin.skills.map(row=>
  row.skillId==='smithing'?{...row,level:skillLevel,xp:totalXpAtLevel(skillLevel)}:
  row.skillId==='forge'?{...row,level:75,xp:totalXpAtLevel(75)}:row),
  inventory:{...origin.inventory,capacity:100,stacks:recipe.inputs.map(input=>({itemId:input.itemId,quantity:input.quantity*2}))}};
assert(forgeLevel(state)===75,'Forge level should be persisted per character');
const advancedDuration=equipmentCraftDurationSeconds(state,recipe.id);
const novice={...state,skills:state.skills.map(row=>row.skillId==='forge'?{...row,level:1,xp:0}:row)};
assert(advancedDuration<=equipmentCraftDurationSeconds(novice,recipe.id),'Higher Forge level must not slow crafting');
const start=startEquipmentCraft(state,recipe.id,1000),job=equipmentCraftingQueue(start.state)[0];
assert(job.forgeRarityBonusPercent===15,'Rarity must be frozen when a job starts');
assert(normalizeEquipmentCraftingQueue([job])[0].forgeRarityBonusPercent===15,'Save normalization must preserve reserved rarity odds');
const downgraded={...start.state,skills:start.state.skills.map(row=>row.skillId==='forge'?{...row,level:1,xp:0}:row)};
const claim=claimForgeJob(downgraded,job.id,job.completesAtMs,.041);
assert(claim.kind==='equipment'&&claim.instance.rarity==='rare','Claim must honor reserved level 75 odds, not current level');
assert(claim.state.skills.find(row=>row.skillId==='forge')!.xp>0,'Claim should award Forge XP');
assert(claim.state.skills.find(row=>row.skillId==='smithing')!.xp>=state.skills.find(row=>row.skillId==='smithing')!.xp,'Original profession XP must remain');
assert(equipmentCraftingQueue(claim.state).length===0,'Successful claim must remove job (prevent repeated XP)');
const direct=draftCraftedGearInstance({itemId,ownerCharacterId:'test',jobId:'legacy',createdAtMs:1000,roll:.041});
assert(direct.rarity==='uncommon','Legacy draft without Forge snapshot should not gain retroactive luck');
console.log('PASS: Forge milestone rates, speed, reservation snapshot, claims and profession XP');
