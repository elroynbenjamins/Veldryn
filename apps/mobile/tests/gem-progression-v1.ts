import {createCharacter,newGame} from '../src/core/game';
import {equippedCanonicalStatGemBonusesV1,gearEnhancement,normalizeEnhancementGemSlots,replaceGem,socketGem,unsocketGem} from '../src/core/equipment-enhancement';
import {startGemCombine,startGemRefinement,claimForgeJob,equipmentCraftQueueModel} from '../src/core/equipment-crafting-queue';
import {availableGemCombinesV1,availableGemRefinementsV1,availableGemResearchV1,claimResonanceCacheV1,dismantleGemV1,gemCodexRowsV1,gemCombineRecipeIdV1,gemRefineRecipeIdV1,gemUnsocketCostV1,formatGemValueV1,recommendedEffectFamiliesV1,researchEffectGemV1,resonanceCacheStatusV1,resonanceForFamilyV1} from '../src/core/gem-progression-v1';
import {V33_EQUIPMENT_RECIPES} from '../src/content/equipment-recipes-v33';
import {itemDef} from '../src/content/items';
import {gemRollPercentFromUnitV1,gemRolledValueV1,gemValueRangeV1} from '../src/content/gems-v1';
import {executeGameCommand} from '../src/core/game-commands';
import {totalXpAtLevel} from '../src/core/progression';
import {RECIPES} from '../src/content/skills';
import {MONSTERS} from '../src/content/monsters';
import {gemPouch,gemStorageQuantity} from '../src/core/gem-pouch';

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
 {itemId:'raw_gem:effect_flow:g2',quantity:1},
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

const oldBulwarkCount=gemStorageQuantity(state,'gem:effect_bulwark:g1');
state=replaceGem(state,'basic_sword','gem:effect_retaliation:g1');
ok(gearEnhancement(state,'basic_sword').effectGemId==='gem:effect_retaliation:g1','Replace should atomically swap the Effect Gem');
const returnedBulwark=gemStorageQuantity(state,'gem:effect_bulwark:g1');
ok(returnedBulwark===oldBulwarkCount+1,'Replace should return the removed gem to storage');
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
ok(gemPouch(state).stacks.some(row=>row.itemId==='gem:stat_vitality:g1'),'Refinement should create the socketable gem of the same family and grade');
ok(!state.inventory.stacks.some(row=>row.itemId==='raw_gem:stat_vitality:g1'),'Refinement should consume the unrefined gem');
ok(state.skills.find(row=>row.skillId==='enchanting')!.xp===enchantingBeforeRefine+90,'Gem refinement should award Enchanting XP on completion');
const dustBefore=state.inventory.stacks.filter(row=>row.itemId==='GEM_DUST').reduce((sum,row)=>sum+row.quantity,0);
state=dismantleGemV1(state,'gem:effect_bulwark:g1',1);
const dustAfter=state.inventory.stacks.filter(row=>row.itemId==='GEM_DUST').reduce((sum,row)=>sum+row.quantity,0);
ok(dustAfter===dustBefore+1,'Dismantling a Cut gem should return exactly 1 Gem Dust');

const lockedEffect=availableGemCombinesV1(state).find(row=>row.recipe.familyId==='effect_bulwark'&&row.recipe.fromGrade===1);
ok(Boolean(lockedEffect&&!lockedEffect.recipeReady),'Effect Gem combining must remain locked until its recipe is discovered');
ok(MONSTERS.some(monster=>monster.level>=4&&monster.level<=25&&monster.drops.some(drop=>drop.itemId.startsWith('raw_gem:')&&drop.itemId.endsWith(':g1'))),'Asterfall combat should provide an early unrefined Grade I gem path');
let researchState={...state,skills:state.skills.map(row=>row.skillId==='enchanting'?{...row,level:25,xp:totalXpAtLevel(25)}:row)};
const researchBeforeDust=researchState.inventory.stacks.find(row=>row.itemId==='GEM_DUST')?.quantity??0,researchBeforeGold=researchState.character!.gold,researchBeforeXp=researchState.skills.find(row=>row.skillId==='enchanting')!.xp;
ok(availableGemResearchV1(researchState).some(row=>row.family?.familyId==='effect_flow'&&row.ready),'Found Effect Gem family should become researchable at Enchanting 25');
researchState=researchEffectGemV1(researchState,'effect_flow');
ok(researchState.account.unlockedKnowledgeIds?.includes('recipe_gem_flow'),'Research should permanently unlock the Effect Gem combine recipe');
ok(!researchState.inventory.stacks.some(row=>row.itemId==='raw_gem:effect_flow:g2'),'Research should consume the lowest-grade owned unrefined family gem');
ok((researchState.inventory.stacks.find(row=>row.itemId==='GEM_DUST')?.quantity??0)===researchBeforeDust-10,'Research should consume 10 Gem Dust');
ok(researchState.character!.gold===researchBeforeGold-2500,'Research should consume 2,500 Gold');
ok(researchState.skills.find(row=>row.skillId==='enchanting')!.xp===researchBeforeXp+600,'Research should grant one-time Enchanting XP');
ok(formatGemValueV1('stat_vitality',4).includes('1.25%'),'Flawless Vitality must display the exact 1.25% value, not rounded 1.3%');
ok(formatGemValueV1('stat_might',1).includes('0.4%'),'Cut Might must retain its precise 0.4% value');
ok(formatGemValueV1('stat_precision',2).includes('0.4 pp'),'Precision uses percentage points, not percentage multipliers');
ok(gemUnsocketCostV1('gem:stat_might:g5',1).gold===5000&&gemUnsocketCostV1('gem:stat_might:g5',1).dust===3,'Base Grade V extraction keeps its authored cost');
ok(gemUnsocketCostV1('gem:stat_might:g5',45).gold===3000&&gemUnsocketCostV1('gem:stat_might:g5',45).dust===2,'Adept Enchanting should reduce Grade V extraction Gold and Dust');
ok(gemUnsocketCostV1('gem:stat_might:g5',80).gold===1250&&gemUnsocketCostV1('gem:stat_might:g5',80).dust===0,'Perfect Extraction should remove Dust cost and reduce Gold by 75%');
const regionalCatalystRecipe=RECIPES.find(row=>row.id==='ENCHANT_REGIONAL_CATALYST'),radiantCatalystRecipe=RECIPES.find(row=>row.id==='ENCHANT_RADIANT_CATALYST');
ok(regionalCatalystRecipe?.level===70&&regionalCatalystRecipe.inputs.some(row=>row.itemId==='FROSTMARCH_BOTANICAL_ESSENCE'),'Enchanting 70 should synthesize Regional Catalysts from Frostmarch botanical essence');
ok(radiantCatalystRecipe?.level===90&&radiantCatalystRecipe.inputs.some(row=>row.itemId==='ASHLANDS_BOTANICAL_ESSENCE'),'Enchanting 90 should synthesize Radiant Catalysts from Ashlands botanical essence');
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
ok(gemPouch(claimed.state).stacks.some(row=>row.itemId==='gem:stat_might:g2'),'Claiming a gem forge job should award the upgraded gem');
ok(claimed.state.skills.find(row=>row.skillId==='enchanting')!.xp===enchantingBeforeCombine+140,'Gem combining should award Enchanting XP');

const cacheNow=Date.UTC(2026,8,21,12),cacheWeek='2026-09-21';
const cacheReadyState={...claimed.state,account:{...claimed.state.account,resonanceCache:{weekKey:cacheWeek,liveClears:3,claimed:false,effectChoices:['effect_bulwark','effect_mercy','effect_flow'],dustReward:31,regionalCatalysts:1,radiantCatalysts:1}}};
ok(resonanceCacheStatusV1(cacheReadyState,cacheNow).ready,'Three Live clears with server-authored choices should make the weekly cache ready');
const cacheDustBefore=cacheReadyState.inventory.stacks.filter(row=>row.itemId==='GEM_DUST').reduce((sum,row)=>sum+row.quantity,0)+cacheReadyState.bank.stacks.filter(row=>row.itemId==='GEM_DUST').reduce((sum,row)=>sum+row.quantity,0);
const cacheState=claimResonanceCacheV1(cacheReadyState,'effect_bulwark',cacheNow);
ok(gemPouch(cacheState).stacks.some(row=>row.itemId==='raw_gem:effect_bulwark:g3'),'Resonance Cache choice should settle an unrefined Grade III Effect Gem');
const cacheDustAfter=cacheState.inventory.stacks.filter(row=>row.itemId==='GEM_DUST').reduce((sum,row)=>sum+row.quantity,0)+cacheState.bank.stacks.filter(row=>row.itemId==='GEM_DUST').reduce((sum,row)=>sum+row.quantity,0);
ok(cacheDustAfter===cacheDustBefore+31,'Resonance Cache should settle its pre-rolled Gem Dust');
let doubleClaimBlocked=false;try{claimResonanceCacheV1(cacheState,'effect_mercy',cacheNow)}catch{doubleClaimBlocked=true}ok(doubleClaimBlocked,'Resonance Cache must be single-claim per UTC week');

// Grindstone-style values: trusted roll, durable socket state, best-of reapply,
// backward-compatible gems, and gameplay modifiers share one authored value.
const might='gem:stat_might:g1';
const range=gemValueRangeV1('stat_might',1);
ok(Math.abs(range.min-.0032)<1e-10&&Math.abs(range.max-.0048)<1e-10,'Cut Might Gem rolls from +0.32% to +0.48% Power');
ok(gemRollPercentFromUnitV1(0)===80&&gemRollPercentFromUnitV1(.999999)===120&&gemRollPercentFromUnitV1(.5)===100,'Nine roll outcomes cover minimum, midpoint and maximum inclusively');
ok(Math.abs(gemRolledValueV1('stat_might',1,120)-.0048)<1e-10,'Rolled power uses the actual grade value and multiplier');
let rollState=createCharacter(newGame(1),'IRONWARDEN','Roll Tester','male');
rollState={...rollState,character:{...rollState.character!,equipment:{...rollState.character!.equipment,weapon:'basic_sword'},gold:10000,gearEnhancements:{}},inventory:{...rollState.inventory,stacks:[{itemId:might,quantity:5}]}};
const minSocket=socketGem(rollState,'basic_sword',might,0);
ok(gearEnhancement(minSocket,'basic_sword').statGemRollPercent===80,'First socket persists its own actual minimum roll');
ok(Math.abs((equippedCanonicalStatGemBonusesV1(minSocket).statPercent.power??0)-.0032)<1e-10,'Combat stats use the saved roll, not the old fixed grade value');
const improved=replaceGem(minSocket,'basic_sword',might,.85);
ok(gearEnhancement(improved,'basic_sword').statGemRollPercent===115,'A duplicate gem reroll can improve a low roll');
ok(gemStorageQuantity(improved,might)===3,'A reroll consumes exactly one duplicate without returning the previously socketed gem');
const noDowngrade=replaceGem(improved,'basic_sword',might,0);
ok(gearEnhancement(noDowngrade,'basic_sword').statGemRollPercent===115,'Bad rerolls consume the copy but never lower a high roll');
ok(gemStorageQuantity(noDowngrade,might)===2,'Failed improvement still spends exactly one gem');
const perfected=replaceGem(noDowngrade,'basic_sword',might,.999999);
ok(gearEnhancement(perfected,'basic_sword').statGemRollPercent===120,'A final reroll can perfect the socket');
const countAtMax=gemStorageQuantity(perfected,might);
let maxBlocked=false;try{replaceGem(perfected,'basic_sword',might,0)}catch(error){maxBlocked=String(error).includes('maximum roll')}
ok(maxBlocked&&gemStorageQuantity(perfected,might)===countAtMax,'A perfected socket cannot waste another gem on a pointless reroll');
const removed=unsocketGem(perfected,'basic_sword',0);
ok(gearEnhancement(removed,'basic_sword').statGemRollPercent===undefined,'Extraction removes the socket roll along with its gem');
ok(gemStorageQuantity(removed,might)===countAtMax+1,'Extracted gem returns as an unrolled stackable copy');
const incompatibleLegacy=normalizeEnhancementGemSlots({rank:0,failures:0,gemIds:[might],statGemRollPercent:120});
ok(incompatibleLegacy.statGemId===might&&incompatibleLegacy.statGemRollPercent===undefined,'A legacy gemIds fallback must not inherit a roll from an unrelated former socket');
const compatibleLegacy=normalizeEnhancementGemSlots({rank:0,failures:0,statGemId:might,statGemRollPercent:110,gemIds:[]});
ok(compatibleLegacy.statGemRollPercent===110,'A valid existing named socket retains its saved roll');
const legacyState={...rollState,character:{...rollState.character!,gearEnhancements:{basic_sword:{rank:0,failures:0,statGemId:might,gemIds:[]}}}};
ok(Math.abs((equippedCanonicalStatGemBonusesV1(legacyState).statPercent.power??0)-.004)<1e-10,'Older socketed gems preserve their original midpoint value');
let untrusted=false;try{executeGameCommand(rollState,{type:'socket',args:{id:'basic_sword',gemId:might}},1000)}catch(error){untrusted=String(error).includes('trusted_random_required')}
ok(untrusted,'Online authoritative socket commands must reject a missing server random roll');
const serverSocket=executeGameCommand(rollState,{type:'socket',args:{id:'basic_sword',gemId:might}},1000,{randomRoll:1/9-1e-9}).state;
ok(gearEnhancement(serverSocket,'basic_sword').statGemRollPercent===80,'Trusted server command snapshots the exact roll');
const serverImprove=executeGameCommand(serverSocket,{type:'replace_socket',args:{id:'basic_sword',gemId:might}},1000,{randomRoll:.999999}).state;
ok(gearEnhancement(serverImprove,'basic_sword').statGemRollPercent===120,'Authoritative duplicate-gem command honors best-of improvement');

console.log('PASS: Enchanting refinement, research, extraction expertise, catalyst synthesis, Resonance Cache and shared forge queue');
