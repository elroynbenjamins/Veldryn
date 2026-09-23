import {createCharacter,newGame} from '../src/core/game';
import {gearEnhancement,replaceGem,socketGem} from '../src/core/equipment-enhancement';
import {startGemCombine,startGemRefinement,claimForgeJob,equipmentCraftQueueModel} from '../src/core/equipment-crafting-queue';
import {availableGemCombinesV1,availableGemRefinementsV1,claimResonanceCacheV1,dismantleGemV1,gemCodexRowsV1,gemCombineRecipeIdV1,gemRefineRecipeIdV1,recommendedEffectFamiliesV1,resonanceCacheStatusV1,resonanceForFamilyV1} from '../src/core/gem-progression-v1';
import {totalXpAtLevel} from '../src/core/progression';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
let state=createCharacter(newGame(1),'IRONWARDEN','Gem Tester','male');
state={...state,character:{...state.character!,gold:250000,equipment:{...state.character!.equipment,weapon:'basic_sword',offhand:'START_KITE_SHIELD',ring:'STONEHEART_RING',chest:'STONEHEART_CHEST'},gearEnhancements:{}},inventory:{...state.inventory,capacity:80,stacks:[
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
state=socketGem(state,'START_KITE_SHIELD','gem:effect_bulwark:g1');
state=socketGem(state,'STONEHEART_RING','gem:effect_bulwark:g1');
ok(resonanceForFamilyV1(state,'effect_bulwark').resonance===3,'Three matching Effect Gems should reach Resonance III');
let capBlocked=false;try{socketGem(state,'STONEHEART_CHEST','gem:effect_bulwark:g1')}catch{capBlocked=true}
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
let rawSocketBlocked=false;try{socketGem(state,'STONEHEART_CHEST','raw_gem:stat_vitality:g1')}catch{rawSocketBlocked=true}
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

const cacheNow=Date.UTC(2026,8,21,12),cacheWeek='2026-09-21';
const cacheReadyState={...claimed.state,account:{...claimed.state.account,resonanceCache:{weekKey:cacheWeek,liveClears:3,claimed:false,effectChoices:['effect_bulwark','effect_mercy','effect_flow'],dustReward:31,regionalCatalysts:1,radiantCatalysts:1}}};
ok(resonanceCacheStatusV1(cacheReadyState,cacheNow).ready,'Three Live clears with server-authored choices should make the weekly cache ready');
const cacheDustBefore=cacheReadyState.inventory.stacks.filter(row=>row.itemId==='GEM_DUST').reduce((sum,row)=>sum+row.quantity,0)+cacheReadyState.bank.stacks.filter(row=>row.itemId==='GEM_DUST').reduce((sum,row)=>sum+row.quantity,0);
const cacheState=claimResonanceCacheV1(cacheReadyState,'effect_bulwark',cacheNow);
ok(cacheState.inventory.stacks.some(row=>row.itemId==='raw_gem:effect_bulwark:g3')||cacheState.bank.stacks.some(row=>row.itemId==='raw_gem:effect_bulwark:g3'),'Resonance Cache choice should settle an unrefined Grade III Effect Gem');
const cacheDustAfter=cacheState.inventory.stacks.filter(row=>row.itemId==='GEM_DUST').reduce((sum,row)=>sum+row.quantity,0)+cacheState.bank.stacks.filter(row=>row.itemId==='GEM_DUST').reduce((sum,row)=>sum+row.quantity,0);
ok(cacheDustAfter===cacheDustBefore+31,'Resonance Cache should settle its pre-rolled Gem Dust');
let doubleClaimBlocked=false;try{claimResonanceCacheV1(cacheState,'effect_mercy',cacheNow)}catch{doubleClaimBlocked=true}ok(doubleClaimBlocked,'Resonance Cache must be single-claim per UTC week');

console.log('PASS: raw gem refinement, Enchanting gates/XP, canonical gem progression, Resonance Cache and shared forge queue');
