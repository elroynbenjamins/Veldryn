import {claimActivity,createCharacter,newGame,previewActivityReward,startGathering} from '../src/core/game';
import {applyTrustedLongTermProgression} from '../src/core/long-term-progression-runtime';
import {masteryPointsForRank,professionMasteryView} from '../src/core/profession-mastery-v40';
import {previewAlchemyReward,startAlchemyBatch} from '../src/core/alchemy';
import {claimForgeJob,equipmentCraftDurationSeconds,startEquipmentCraft,timedEquipmentRecipe} from '../src/core/equipment-crafting-queue';
import {RECIPES} from '../src/content/skills';
import {professionMasteryDiscoveryRecords,professionMasteryRecommendedTarget} from '../src/core/profession-mastery-presentation';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)}

let state=createCharacter(newGame(Date.UTC(2026,8,14)),'IRONWARDEN','ProgressionTester','male');
// The Contract Board fills only from genuinely available content.
// At this level it has 2 Hunt + 2 Work + 1 Regional Problem; Threat Bounties appear only after Challenge Hunt mastery.
state={...state,character:{...state.character!,level:10}};
let first=applyTrustedLongTermProgression(state,[],undefined,Date.UTC(2026,8,14,0,1),{accountId:'acct-runtime',eventId:'setup'});
state=first.state;
ok(state.account.weeklyOrders?.orders.length===5,'Trusted runtime creates 2 Hunt + 2 Work + 1 Regional Problem when no Threat Bounty is unlocked');
ok(state.account.journalState?.schemaVersion===42,'Trusted runtime initializes Journal state');
const order=state.account.weeklyOrders!.orders[0];
const kind=order.kind==='hunt'?'combat':order.activityId.startsWith('CRAFT_')||order.targetId.startsWith('SMELT_')||order.targetId.startsWith('SMITH_')?'crafting':'gathering';
const units=order.target;
const progressed=applyTrustedLongTermProgression(state,[{kind,contentId:order.targetId,units,startedAtMs:Date.UTC(2026,8,14,0,1)}],{xp:500,gold:40,items:[{itemId:'GREENWOOD_LOG',quantity:10}],kills:units,elapsedSeconds:1800},Date.UTC(2026,8,14,0,31),{accountId:'acct-runtime',eventId:'settlement-1'});
state=progressed.state;
const updated=state.account.weeklyOrders!.orders.find(row=>row.id===order.id)!;
equal(updated.progress,updated.target,'Verified activity advances the matching Weekly Order');
ok(progressed.weeklyOrderCompletions.includes(order.id),'Weekly completion is detected once');
ok(state.account.weeklyOrderPendingRewards?.some(row=>row.orderId===order.id),'Weekly reward is queued automatically without a claim tap');
if(kind==='gathering'||kind==='crafting')ok((state.account.professionMasteryByAction?.[order.targetId]?.points??0)>=units,'Verified profession activity advances mastery');
if(kind==='combat')ok((state.account.longTermMetrics?.['combat.total_kills']??0)>=units,'Verified combat advances long-term kill metric');
ok((state.account.longTermMetrics?.['weekly_orders.completed']??0)>=1,'Weekly completion increments Journal metric');
ok(state.account.journalState?.records.most_xp_single_settlement?.value===500,'Trusted settlement updates Personal Records');
const duplicate=applyTrustedLongTermProgression(state,[{kind,contentId:order.targetId,units,startedAtMs:Date.UTC(2026,8,14,0,1)}],undefined,Date.UTC(2026,8,14,0,32),{accountId:'acct-runtime',eventId:'settlement-2'});
equal(duplicate.state.account.weeklyOrders!.orders.find(row=>row.id===order.id)!.progress,order.target,'Completed Weekly Order stays capped');
equal(duplicate.state.account.weeklyOrderPendingRewards?.filter(row=>row.orderId===order.id).length,1,'Weekly reward outbox remains unique');

equal(professionMasteryView('test',{actionId:'test',points:masteryPointsForRank(10),updatedAtMs:1}).xpBonusBps,200,'Profession Mastery rank 10 grants +2% skill XP');
equal(professionMasteryView('test',{actionId:'test',points:masteryPointsForRank(20),updatedAtMs:1}).yieldBonusBps,200,'Profession Mastery rank 20 grants +2% yield');
equal(professionMasteryView('test',{actionId:'test',points:masteryPointsForRank(30),updatedAtMs:1}).speedBonusBps,300,'Profession Mastery rank 30 grants +3% speed');
equal(professionMasteryView('test',{actionId:'test',points:masteryPointsForRank(40),updatedAtMs:1}).yieldBonusBps,500,'Profession Mastery rank 40 raises total yield bonus to +5%');
equal(professionMasteryView('test',{actionId:'test',points:masteryPointsForRank(50),updatedAtMs:1}).speedBonusBps,500,'Profession Mastery rank 50 raises total speed bonus to +5%');

let masteryDiscovery=createCharacter(newGame(Date.UTC(2026,8,15,11)),'IRONWARDEN','MasteryDiscovery','male');
masteryDiscovery={...masteryDiscovery,account:{...masteryDiscovery.account,professionMasteryByAction:{
 GREENWOOD_TREE:{actionId:'GREENWOOD_TREE',points:masteryPointsForRank(9),updatedAtMs:1},
 IRONWOOD_TREE:{actionId:'IRONWOOD_TREE',points:masteryPointsForRank(30),updatedAtMs:2},
 COPPER_VEIN:{actionId:'COPPER_VEIN',points:masteryPointsForRank(50),updatedAtMs:3},
}}};
const closestMastery=professionMasteryDiscoveryRecords(masteryDiscovery,{sort:'closest_r50',status:'all'});
equal(closestMastery[0]?.actionId,'IRONWOOD_TREE','Closest-to-R50 sorting favors the nearest unfinished trained action instead of completed R50 records');
equal(closestMastery[closestMastery.length-1]?.actionId,'COPPER_VEIN','Closest-to-R50 sorting keeps completed R50 records after unfinished targets');
const highestMastery=professionMasteryDiscoveryRecords(masteryDiscovery,{sort:'highest_rank',status:'all'});
equal(highestMastery[0]?.actionId,'COPPER_VEIN','Highest Rank sorting surfaces the mastered R50 action first');
const bonusLeftMastery=professionMasteryDiscoveryRecords(masteryDiscovery,{status:'bonus_left'});
ok(bonusLeftMastery.some(row=>row.actionId==='GREENWOOD_TREE')&&bonusLeftMastery.some(row=>row.actionId==='IRONWOOD_TREE'),'Unearned-bonus filtering keeps trained actions that still have meaningful bonuses');
ok(!bonusLeftMastery.some(row=>row.actionId==='COPPER_VEIN'),'Unearned-bonus filtering removes fully mastered actions');
const masteredOnly=professionMasteryDiscoveryRecords(masteryDiscovery,{status:'mastered'});
equal(masteredOnly.length,1,'Mastered-only filtering returns only R50 records');
equal(masteredOnly[0]?.actionId,'COPPER_VEIN','Mastered-only filtering preserves the completed action');
const greenfieldsMastery=professionMasteryDiscoveryRecords(masteryDiscovery,{status:'all',regionId:'GREENFIELDS'});
equal(greenfieldsMastery.length,1,'Region filtering narrows trained mastery to the selected region');
equal(greenfieldsMastery[0]?.actionId,'GREENWOOD_TREE','Region filtering uses the real gathering location metadata');
const woodcuttingMastery=professionMasteryDiscoveryRecords(masteryDiscovery,{status:'all',skillId:'woodcutting'});
equal(woodcuttingMastery.length,2,'Skill filtering returns only trained mastery from the selected profession');
const recommendedMastery=professionMasteryRecommendedTarget(masteryDiscovery);
equal(recommendedMastery?.actionId,'GREENWOOD_TREE','Recommended mastery target favors the nearest meaningful bonus from existing progress');
equal(recommendedMastery?.targetRank,10,'Recommended mastery target points to the next authored bonus rank rather than an arbitrary checkpoint');
equal(recommendedMastery?.pointsToTarget,masteryPointsForRank(10)-masteryPointsForRank(9),'Recommended mastery target exposes the remaining mastery actions to that bonus');

const masteryStart=Date.UTC(2026,8,15,12);
let masteryJournal=createCharacter(newGame(masteryStart),'IRONWARDEN','MasteryJournal','male');
masteryJournal={...masteryJournal,account:{...masteryJournal.account,professionMasteryByAction:{GREENWOOD_TREE:{actionId:'GREENWOOD_TREE',points:masteryPointsForRank(50),updatedAtMs:masteryStart}}}};
const masteryJournalResult=applyTrustedLongTermProgression(masteryJournal,[],undefined,masteryStart+1,{accountId:'acct-mastery-journal',eventId:'mastery-journal'});
ok(masteryJournalResult.journalAchievements.includes('mastery_hall_novice'),'First R50 profession action unlocks the Mastery Hall Journal ladder automatically');
equal(masteryJournalResult.state.account.journalState?.unlockedAchievements.mastery_hall_novice,masteryStart+1,'Mastery Hall achievement persists on the account Journal');

let gatherBase=createCharacter(newGame(masteryStart),'IRONWARDEN','MasteryGather','male');
gatherBase=startGathering(gatherBase,'GREENWOOD_TREE',masteryStart);
const gatherBaseReward=previewActivityReward(gatherBase,masteryStart+3600_000);
let gatherMaster=createCharacter(newGame(masteryStart),'IRONWARDEN','MasteryGather','male');
gatherMaster={...gatherMaster,account:{...gatherMaster.account,professionMasteryByAction:{GREENWOOD_TREE:{actionId:'GREENWOOD_TREE',points:masteryPointsForRank(40),updatedAtMs:masteryStart}}}};
gatherMaster=startGathering(gatherMaster,'GREENWOOD_TREE',masteryStart);
const gatherMasterReward=previewActivityReward(gatherMaster,masteryStart+3600_000);
const quantity=(reward:typeof gatherMasterReward,id:string)=>reward.items.find(row=>row.itemId===id)?.quantity??0;
ok(gatherMasterReward.kills>gatherBaseReward.kills,'Rank 30 gathering speed bonus increases completed actions in the same elapsed time');
ok(gatherMasterReward.xp>gatherBaseReward.xp,'Rank 10 gathering XP bonus increases skill XP');
ok(quantity(gatherMasterReward,'GREENWOOD_LOG')>quantity(gatherBaseReward,'GREENWOOD_LOG'),'Rank 20/40 gathering yield bonus increases material output');

let alchemyBase=createCharacter(newGame(masteryStart),'IRONWARDEN','MasteryAlchemy','male');
alchemyBase={...alchemyBase,character:{...alchemyBase.character!,level:100,gold:100000},skills:alchemyBase.skills.map(row=>row.skillId==='alchemy'?{...row,level:100}:row),inventory:{...alchemyBase.inventory,stacks:[{itemId:'DEWLEAF',quantity:500}]}};
const brewId='BREW_DEWLEAF_DRAUGHT';
const alchemyMaster={...alchemyBase,account:{...alchemyBase.account,professionMasteryByAction:{[brewId]:{actionId:brewId,points:masteryPointsForRank(50),updatedAtMs:masteryStart}}}};
const masteredBrew=startAlchemyBatch(alchemyMaster,brewId,20,masteryStart);
ok((masteredBrew.activity?.brew?.cycleSeconds??60)<60,'Rank 30/50 speed bonus shortens Alchemy cycle time');
ok((masteredBrew.activity?.brew?.xpPerBatch??24)>24,'Rank 10 XP bonus is snapshotted into Alchemy batches');
const masteredBrewReward=previewAlchemyReward(masteredBrew,(masteredBrew.activity!.brew!.cycleSeconds*20)+.01);
equal(masteredBrewReward.craftingActions,20,'Mastered Alchemy batch completes the reserved action count');
equal(masteredBrewReward.items.find(row=>row.itemId==='DEWLEAF_DRAUGHT')?.quantity,21,'Rank 20/40 Alchemy yield bonus grants +5% output with deterministic remainder handling');

const claimBrew=startAlchemyBatch(alchemyBase,brewId,2,masteryStart);
const claimedBrew=claimActivity(claimBrew,masteryStart+61_000);
ok((claimedBrew.state.account.professionMasteryByAction?.[brewId]?.points??0)>=1,'Settled Alchemy batches advance recipe mastery');

const forgeRecipe=RECIPES.find(recipe=>!!timedEquipmentRecipe(recipe.id)&&(!recipe.classId||recipe.classId==='IRONWARDEN'));
ok(forgeRecipe,'A compatible timed equipment recipe must exist for mastery validation');
let forgeBase=createCharacter(newGame(masteryStart),'IRONWARDEN','MasteryForge','male');
forgeBase={...forgeBase,character:{...forgeBase.character!,level:100,gold:1_000_000},skills:forgeBase.skills.map(row=>row.skillId==='smithing'?{...row,level:100}:row),inventory:{...forgeBase.inventory,capacity:40,stacks:forgeRecipe!.inputs.map(input=>({...input,quantity:input.quantity+10}))}};
const forgeBaseSeconds=equipmentCraftDurationSeconds(forgeBase,forgeRecipe!.id);
const forgeMaster={...forgeBase,account:{...forgeBase.account,professionMasteryByAction:{[forgeRecipe!.id]:{actionId:forgeRecipe!.id,points:masteryPointsForRank(30),updatedAtMs:masteryStart}}}};
ok(equipmentCraftDurationSeconds(forgeMaster,forgeRecipe!.id)<forgeBaseSeconds,'Rank 30 Forge mastery shortens timed equipment crafting');
const forgeStarted=startEquipmentCraft(forgeBase,forgeRecipe!.id,masteryStart);
const forgeClaimed=claimForgeJob(forgeStarted.state,forgeStarted.job.id,forgeStarted.job.completesAtMs,.5);
equal(forgeClaimed.state.account.professionMasteryByAction?.[forgeRecipe!.id]?.points,1,'Claiming a timed Forge recipe advances that recipe mastery locally');

console.log('PASS: trusted gameplay progression runtime advances mastery/orders/journal and Profession Mastery bonuses are live across gathering, Alchemy and timed Forge crafting');
