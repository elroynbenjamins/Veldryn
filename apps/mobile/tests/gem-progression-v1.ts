import {createCharacter,newGame} from '../src/core/game';
import {gearEnhancement,replaceGem,socketGem} from '../src/core/equipment-enhancement';
import {startGemCombine,startGemRefinement,claimForgeJob,equipmentCraftQueueModel} from '../src/core/equipment-crafting-queue';
import {availableGemCombinesV1,availableGemRefinementsV1,availableGemResearchV1,claimResonanceCacheV1,dismantleGemV1,gemCodexRowsV1,gemCombineRecipeIdV1,gemRefineRecipeIdV1,gemUnsocketCostForStateV1,isGemFamilyRecipeUnlockedV1,recommendedEffectFamiliesV1,researchGemV1,resonanceCacheStatusV1,resonanceForFamilyV1} from '../src/core/gem-progression-v1';
import {V33_EQUIPMENT_RECIPES} from '../src/content/equipment-recipes-v33';
import {itemDef} from '../src/content/items';
import {totalXpAtLevel} from '../src/core/progression';
import {RECIPES} from '../src/content/skills';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
const t1Ironwarden=V33_EQUIPMENT_RECIPES.filter(row=>row.classId==='IRONWARDEN'&&row.v33EquipmentTier==='T1');
const gearFor=(slot:string)=>t1Ironwarden.find(row=>itemDef(row.output.itemId).slot===slot)!.output.itemId;
const offhandId=gearFor('offhand'),ringId=gearFor('ring'),chestId=gearFor('chest');
let state=createCharacter(newGame(1),'IRONWARDEN','Gem Tester','male');
state={...state,character:{...state.character!,gold:250000,equipment:{...state.character!.equipment,weapon:'basic_sword',offhand:offhandId,ring:ringId,chest:chestId},gearEnhancements:{}},inventory:{...state.inventory,capacity:80,stacks:[
 ...state.inventory.stacks,
 {itemId:'gem:effect_bulwark:g1',quantity:4},
 {itemId:'gem:effect_retaliation:g1',quantity:1},
 {itemId:'gem:stat_might:g1',quantity:3},
 {itemId:'raw_gem:stat_vitality:g1',quantity:1},
 {itemId:'WISP_DUST',quantity:10},
 {itemId:'GEM_DUST',quantity:100},
 {itemId:'REGIONAL_CATALYST',quantity:2},
 {itemId:'RADIANT_CATALYST',quantity:1},
]}};

state=socketGem(state,'basic_sword','gem:effect_bulwark:g1');
state=socketGem(state,offhandId,'gem:effect_bulwark:g1');
state=socketGem(state,ringId,'gem:effect_bulwark:g1');
ok(resonanceForFamilyV1(state,'effect_bulwark').resonance===3,'Three matching Effect Gems should reach Resonance III');
let capBlocked=false;try{socketGem(state,chestId,'gem:effect_bulwark:g1')}catch{capBlocked=true}
ok(capBlocked,'A fourth matching Effect Gem must be rejected across equipped gear');

const oldBulwarkCount=state.inventory.stacks.filter(row=>row.itemId==='gem:effect_bulwark:g1').reduce((sum,row)=>sum+row.quantity,0);
state=replaceGem(state,'basic_sword','gem:effect_retaliation:g1');
ok(gearEnhancement(state,'basic_sword').effectGemId==='gem:effect_retaliation:g1','Replace should atomically swap the Effect Gem');
const returnedBulwark=state.inventory.stacks.filter(row=>row.itemId==='gem:effect_bulwark:g1').reduce((sum,row)=>sum+row.quantity,0);
ok(returnedBulwark===oldBulwarkCount+1,'Replace should return the removed gem to Inventory');
ok(resonanceForFamilyV1(state,'effect_bulwark').resonance===2,'Replacing one copy should reduce Resonance');

const recs=recommendedEffectFamiliesV1(state,'IRONWARDEN');
ok(recs.some(row=>row.family.familyId==='effect_bulwark'&&row.score>0),'Ironwarden recommendations should include Bulwark');
const codex=gemCodexRowsV1(state);
ok(codex.length===32,'Codex should expose all 32 canonical gem families');
ok(codex.find(row=>row.family.familyId==='stat_vitality')?.raw.some(row=>row.grade===1&&row.quantity===1),'Codex should expose owned unrefined gems separately from socketable gems');
let rawSocketBlocked=false;try{socketGem(state,'basic_sword','raw_gem:stat_vitality:g1')}catch{rawSocketBlocked=true}
ok(rawSocketBlocked,'Unrefined gems must never be socketable');
const refinement=availableGemRefinementsV1(state).find(row=>row.recipe.familyId==='stat_vitality'&&row.recipe.grade===1);
ok(Boolean(refinement?.ready),'Owned Grade I raw gem with reagents should be refinement-ready at Enchanting level 1');
const enchantingBeforeRefine=state.skills.find(row=>row.skillId==='enchanting')!.xp;
const refineStarted=startGemRefinement(state,gemRefineRecipeIdV1('stat_vitality',1),500);
const refineClaimed=claimForgeJob(refineStarted.state,refineStarted.job.id,refineStarted.job.completesAtMs);
state=refineClaimed.state;
ok(state.inventory.stacks.some(row=>row.itemId==='gem:stat_vitality:g1'),'Refinement should create the socketable gem of the same family and grade');
ok(!state.inventory.stacks.some(row=>row.itemId==='raw_gem:stat_vitality:g1'),'Refinement should consume the unrefined gem');
ok(state.skills.find(row=>row.skillId==='enchanting')!.xp===enchantingBeforeRefine+90,'Gem refinement should award Enchanting XP on completion');
const dustBefore=state.inventory.stacks.filter(row=>row.itemId==='GEM_DUST').reduce((sum,row)=>sum+row.quantity,0);
state=dismantleGemV1(state,'gem:effect_bulwark:g1',1);
const dustAfter=state.inventory.stacks.filter(row=>row.itemId==='GEM_DUST').reduce((sum,row)=>sum+row.quantity,0);
ok(dustAfter===dustBefore+1,'Dismantling a Cut gem should return exactly 1 Gem Dust');

const lockedEffect=availableGemCombinesV1(state).find(row=>row.recipe.familyId==='effect_bulwark'&&row.recipe.fromGrade===1);
ok(Boolean(lockedEffect&&!lockedEffect.recipeReady),'Effect Gem combining must remain locked until its recipe is discovered');
state={...state,account:{...state.account,unlockedKnowledgeIds:[...(state.account.unlockedKnowledgeIds??[]),'recipe_gem_bulwark']}};
ok(availableGemCombinesV1(state).some(row=>row.recipe.familyId==='effect_bulwark'&&row.recipe.fromGrade===1&&row.recipeReady),'Discovered Effect Gem recipe should unlock the forge family account-wide');
const recipeId=gemCombineRecipeIdV1('stat_might',1);
ok(availableGemCombinesV1(state).some(row=>row.recipe.id===recipeId&&!row.skillReady),'Gem combining should expose its Enchanting level requirement');
state={...state,skills:state.skills.map(row=>row.skillId==='enchanting'?{...row,level:60,xp:totalXpAtLevel(60)}:row)};
ok(availableGemCombinesV1(state).some(row=>row.recipe.id===recipeId&&row.ready),'Owned three Cut Might Gems should be combine-ready once the Enchanting gate is met');
const enchantingBeforeCombine=state.skills.find(row=>row.skillId==='enchanting')!.xp;
const started=startGemCombine(state,recipeId,1000);
ok(started.seconds===300,'Cut to Polished base combine should take five minutes without speed modifiers');
ok(equipmentCraftQueueModel(started.state,1000).jobs.some(job=>job.id===started.job.id),'Gem combine must occupy the shared equipment forge queue');
const claimed=claimForgeJob(started.state,started.job.id,started.job.completesAtMs);
ok(claimed.state.inventory.stacks.some(row=>row.itemId==='gem:stat_might:g2'),'Claiming a gem forge job should award the upgraded gem');
ok(claimed.state.skills.find(row=>row.skillId==='enchanting')!.xp===enchantingBeforeCombine+140,'Gem combining should award Enchanting XP');

let researchState=createCharacter(newGame(2),'IRONWARDEN','Gem Researcher','male');
researchState={...researchState,character:{...researchState.character!,gold:100000},skills:researchState.skills.map(row=>row.skillId==='enchanting'?{...row,level:25,xp:totalXpAtLevel(25)}:row),inventory:{...researchState.inventory,capacity:80,stacks:[{itemId:'raw_gem:effect_flow:g1',quantity:1},{itemId:'raw_gem:effect_flow:g2',quantity:1},{itemId:'GEM_DUST',quantity:30}]}};
ok(availableGemResearchV1(researchState).some(row=>row.family?.familyId==='effect_flow'&&row.grade===1&&row.ready),'Owned Effect Gem samples should become researchable at Enchanting 25');
const researchXpBefore=researchState.skills.find(row=>row.skillId==='enchanting')!.xp;
researchState=researchGemV1(researchState,'effect_flow',1);
ok(researchState.account.gemResearchProgressByFamily?.effect_flow===1,'Grade I Effect Gem research should add one progress point');
ok(!isGemFamilyRecipeUnlockedV1(researchState,'effect_flow'),'One Grade I sample must not instantly discover an Effect Gem recipe');
researchState=researchGemV1(researchState,'effect_flow',2);
ok(researchState.account.gemResearchProgressByFamily?.effect_flow===3&&isGemFamilyRecipeUnlockedV1(researchState,'effect_flow'),'A Grade I plus Grade II research path should reach the three-point deterministic unlock');
ok(researchState.skills.find(row=>row.skillId==='enchanting')!.xp===researchXpBefore+160+420,'Effect Gem research should award authored Enchanting XP');
ok(!availableGemResearchV1(researchState).some(row=>row.family?.familyId==='effect_flow'),'Discovered families must leave the research queue');

const lowExtraction=gemUnsocketCostForStateV1(createCharacter(newGame(3),'IRONWARDEN','Novice Enchanter'),'gem:effect_flow:g5');
let expert=createCharacter(newGame(3),'IRONWARDEN','Expert Enchanter');
expert={...expert,skills:expert.skills.map(row=>row.skillId==='enchanting'?{...row,level:80,xp:totalXpAtLevel(80)}:row)};
const expertExtraction=gemUnsocketCostForStateV1(expert,'gem:effect_flow:g5');
ok(lowExtraction.gold===5000&&lowExtraction.dust===3,'Low Enchanting keeps the canonical Grade V extraction cost');
ok(expertExtraction.gold===2500&&expertExtraction.dust===2&&expertExtraction.discount===.5,'Enchanting 80 should halve safe extraction Gold and reduce Dust without making it free');

const distill1=RECIPES.find(row=>row.id==='ENCHANT_DISTILL_WISP_DUST'),distill20=RECIPES.find(row=>row.id==='ENCHANT_CONDENSE_GLOAM_DUST'),distill45=RECIPES.find(row=>row.id==='ENCHANT_CRYSTALLIZE_RIME_DUST');
ok(distill1?.level===1&&distill1.repeatableTraining&&distill1.output.itemId==='GEM_DUST','Enchanting must have a deterministic Lv1 Wisp Dust training loop independent of gem RNG');
ok(distill20?.level===20&&distill20.output.quantity===5,'Midgame Enchanting must gain a more efficient Gloam Dust distillation loop');
ok(distill45?.level===45&&distill45.inputs.some(row=>row.itemId==='WILD_ESSENCE'),'High-level Enchanting distillation should connect Herbalism rare finds into the gem economy');

const regionalSynthesis=RECIPES.find(row=>row.id==='ENCHANT_REGIONAL_CATALYST'),radiantSynthesis=RECIPES.find(row=>row.id==='ENCHANT_RADIANT_CATALYST');
ok(regionalSynthesis?.skillId==='enchanting'&&regionalSynthesis.level===70&&regionalSynthesis.output.itemId==='REGIONAL_CATALYST'&&regionalSynthesis.inputs.some(row=>row.itemId==='WILD_ESSENCE'),'Enchanting 70 must synthesize Regional Catalysts using Wild Essence');
ok(radiantSynthesis?.skillId==='enchanting'&&radiantSynthesis.level===90&&radiantSynthesis.output.itemId==='RADIANT_CATALYST'&&radiantSynthesis.inputs.some(row=>row.itemId==='WILD_ESSENCE'),'Enchanting 90 must synthesize Radiant Catalysts as a late-game sink');

const cacheNow=Date.UTC(2026,8,21,12),cacheWeek='2026-09-21';
const cacheReadyState={...claimed.state,account:{...claimed.state.account,resonanceCache:{weekKey:cacheWeek,liveClears:3,claimed:false,effectChoices:['effect_bulwark','effect_mercy','effect_flow'],dustReward:31,regionalCatalysts:1,radiantCatalysts:1}}};
ok(resonanceCacheStatusV1(cacheReadyState,cacheNow).ready,'Three Live clears with server-authored choices should make the weekly cache ready');
const cacheDustBefore=cacheReadyState.inventory.stacks.filter(row=>row.itemId==='GEM_DUST').reduce((sum,row)=>sum+row.quantity,0)+cacheReadyState.bank.stacks.filter(row=>row.itemId==='GEM_DUST').reduce((sum,row)=>sum+row.quantity,0);
const cacheState=claimResonanceCacheV1(cacheReadyState,'effect_bulwark',cacheNow);
ok(cacheState.inventory.stacks.some(row=>row.itemId==='raw_gem:effect_bulwark:g3')||cacheState.bank.stacks.some(row=>row.itemId==='raw_gem:effect_bulwark:g3'),'Resonance Cache choice should settle an unrefined Grade III Effect Gem');
const cacheDustAfter=cacheState.inventory.stacks.filter(row=>row.itemId==='GEM_DUST').reduce((sum,row)=>sum+row.quantity,0)+cacheState.bank.stacks.filter(row=>row.itemId==='GEM_DUST').reduce((sum,row)=>sum+row.quantity,0);
ok(cacheDustAfter===cacheDustBefore+31,'Resonance Cache should settle its pre-rolled Gem Dust');
let doubleClaimBlocked=false;try{claimResonanceCacheV1(cacheState,'effect_mercy',cacheNow)}catch{doubleClaimBlocked=true}ok(doubleClaimBlocked,'Resonance Cache must be single-claim per UTC week');

console.log('PASS: Enchanting refinement, research, extraction expertise, catalyst synthesis, Resonance Cache and shared forge queue');
