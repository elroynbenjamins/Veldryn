import { strict as assert } from 'node:assert';
import { deriveRegionalCrisisScale, evaluateRegionalCrisis, REGIONAL_CRISIS_TEMPLATE_POOL, scoreRegionalCrisisContribution } from './regional-crises';
import { applyWorldBossDamage, canStartScoredBossAttempt, computeWorldBossImpact, deriveWorldBossScale, phaseForHp, WORLD_BOSS_TEMPLATE_POOL } from './world-bosses';

const crisis=REGIONAL_CRISIS_TEMPLATE_POOL[0];
const scale=deriveRegionalCrisisScale({eligibleActiveAccounts7d:1000,durationHours:48});
assert.ok(scale.targetPoints>=6000);
assert.equal(scale.expectedParticipationFraction,0.45);

const eval1=evaluateRegionalCrisis(crisis,{targetPoints:10000,creditedPoints:6500,combatPoints:3000,skillingPoints:3000});
assert.equal(eval1.secured,false);
assert.ok(eval1.reachedStageIds.includes('turning_point'));
const eval2=evaluateRegionalCrisis(crisis,{targetPoints:10000,creditedPoints:10000,combatPoints:3000,skillingPoints:3000});
assert.equal(eval2.secured,true);

const event={sourceEventId:'evt-1',accountId:'a',occurredAtMs:1,dateKey:'2026-09-14',profile:{id:'crisis.test',category:'combat' as const,challenge:'elite' as const,expectedSecondsPerUnit:60,difficultyMultiplier:1,offline:false},units:10,activityKind:'combat' as const,contentId:'enemy',regionId:'rift'};
const score=scoreRegionalCrisisContribution(event,crisis,0);
assert.equal(score.eligible,true);
assert.ok(score.creditedPoints>0);
assert.ok(score.creditedPoints<=crisis.contributionRules.dailyAccountCreditCap);

const boss=WORLD_BOSS_TEMPLATE_POOL[0];
const bossScale=deriveWorldBossScale({eligibleCombatAccounts7d:1000,medianImpactPerAttempt:1200});
assert.ok(bossScale.maxHp>=50000);
assert.equal(phaseForHp(boss,100000,100000).id,'phase_1');
assert.equal(phaseForHp(boss,60000,100000).id,'phase_2');
assert.equal(phaseForHp(boss,20000,100000).id,'phase_3');

const damageImpact=computeWorldBossImpact(boss,{encounterId:'e',accountId:'a',characterId:'c',roleProfile:'damage',durationSeconds:90,directDamage:1000,damagePrevented:0,effectiveHealing:0,utilityUptimeSeconds:0,survived:true,defeatedPlayer:false});
const tankImpact=computeWorldBossImpact(boss,{encounterId:'e2',accountId:'b',characterId:'c2',roleProfile:'tank',durationSeconds:90,directDamage:650,damagePrevented:800,effectiveHealing:0,utilityUptimeSeconds:10,survived:true,defeatedPlayer:false});
const supportImpact=computeWorldBossImpact(boss,{encounterId:'e3',accountId:'c',characterId:'c3',roleProfile:'support',durationSeconds:90,directDamage:550,damagePrevented:100,effectiveHealing:650,utilityUptimeSeconds:30,survived:true,defeatedPlayer:false});
assert.ok(damageImpact.raidImpact>0&&tankImpact.raidImpact>0&&supportImpact.raidImpact>0);
assert.ok(tankImpact.raidImpact>=Math.round(damageImpact.raidImpact*0.65));
assert.ok(supportImpact.raidImpact>=Math.round(damageImpact.raidImpact*0.65));

assert.deepEqual(applyWorldBossDamage(1000,250),{previousHp:1000,remainingHp:750,requestedDamage:250,appliedDamage:250,defeated:false});
assert.equal(applyWorldBossDamage(100,250).appliedDamage,100);
assert.equal(applyWorldBossDamage(100,250).remainingHp,0);
assert.equal(canStartScoredBossAttempt({state:'active',attemptsToday:3,definition:boss,nowMs:1000,endsAtMs:2000}).allowed,true);
assert.equal(canStartScoredBossAttempt({state:'active',attemptsToday:4,definition:boss,nowMs:1000,endsAtMs:2000}).allowed,false);
assert.equal(canStartScoredBossAttempt({state:'defeated',attemptsToday:4,validAttemptsTotal:0,echoAttemptsTotal:0,definition:boss,nowMs:1000,endsAtMs:100000,defeatedAtMs:500}).echoOnly,true);
assert.equal(canStartScoredBossAttempt({state:'defeated',attemptsToday:0,validAttemptsTotal:1,echoAttemptsTotal:0,definition:boss,nowMs:1000,endsAtMs:100000,defeatedAtMs:500}).allowed,false);
assert.equal(canStartScoredBossAttempt({state:'defeated',attemptsToday:0,validAttemptsTotal:0,echoAttemptsTotal:1,definition:boss,nowMs:1000,endsAtMs:100000,defeatedAtMs:500}).allowed,false);

console.log('v19 shared-world balance tests passed');

import { rankWorldBossCandidates, worldBossPrestigeTier } from './world-boss-ranking';
import { crisisRewardIntents, worldBossRewardIntents } from './shared-world-rewards';
import { finalizeWorldBossRanks } from './shared-world-finalization';
import { bossUnlockForReachedStages } from './crisis-world-boss-chain';

const ranks=rankWorldBossCandidates([
 {accountId:'b',raidImpact:1000,appliedGlobalDamage:900,validAttempts:2,bestAttemptImpact:600,lastScoredAttemptAtMs:20},
 {accountId:'a',raidImpact:1000,appliedGlobalDamage:900,validAttempts:2,bestAttemptImpact:600,lastScoredAttemptAtMs:10},
 {accountId:'c',raidImpact:900,appliedGlobalDamage:900,validAttempts:1,bestAttemptImpact:900,lastScoredAttemptAtMs:5},
]);
assert.equal(ranks[0].accountId,'a'); assert.equal(ranks[0].finalRank,1); assert.equal(worldBossPrestigeTier(1,1000),'top10'); assert.equal(worldBossPrestigeTier(80,1000),'top100');
const echoClosedMs=boss.postDefeatEchoWindowHours*3_600_000;
const fin=finalizeWorldBossRanks({nowMs:echoClosedMs,endsAtMs:echoClosedMs*2,defeatedAtMs:0,inFlightScoredAttempts:0,definition:boss,rankCandidates:ranks}); assert.equal(fin.ready,true); assert.equal(fin.finalRanks.length,3);
const crisisRewards=crisisRewardIntents({state:'secured',totalPersonalPoints:800,claimedRewardKeys:[],definition:crisis}); assert.ok(crisisRewards.some(x=>x.rewardKey==='participation')); assert.ok(crisisRewards.some(x=>x.rewardKey==='success'));
const bossRewards=worldBossRewardIntents({state:'defeated',validAttempts:1,echoAttempts:0,scoredRaidImpact:2100,finalRank:5,qualifyingPopulation:500,claimedRewardKeys:[],definition:boss}); assert.ok(bossRewards.some(x=>x.rewardKey==='victory')); assert.ok(bossRewards.some(x=>x.rewardKey==='prestige'));
assert.equal(bossUnlockForReachedStages('crisis-1',crisis,['response','turning_point','secured'])?.worldBossTemplateId,'world_boss_rift_colossus');
console.log('v19 finalization/reward/ranking tests passed');

// --- Refinement regressions ---
import { crisisFinalState } from './shared-world-finalization';
import { worldBossEchoWindowEndsAtMs } from './world-bosses';
import { executeSharedWorldAdminCommand } from './shared-world-admin-v19';
import { runSharedWorldWorker } from './shared-world-worker';
import { crisisStageNotification, regionDisplayName, worldBossSpawnedNotification } from './shared-world-notifications';
import { recordRegionalCrisisContribution } from './regional-crisis-service';
import { settleWorldBossAttempt } from './world-boss-service';

// The backend build types node:assert through src/types/node-shims.d.ts, which has no
// assert.rejects, so check async rejections with a local helper.
async function rejectsWith(promise:Promise<unknown>,pattern:RegExp){
  let message='';
  try{await promise;}catch(error){message=error instanceof Error?error.message:String(error);}
  assert.ok(pattern.test(message),'expected rejection matching '+pattern+', got '+(message||'no rejection'));
}

void (async()=>{
  // Finalization must not close the Echo window at the moment of defeat.
  const early=finalizeWorldBossRanks({nowMs:60_000,endsAtMs:100*3_600_000,defeatedAtMs:0,inFlightScoredAttempts:0,definition:boss,rankCandidates:ranks});
  assert.equal(early.ready,false); assert.equal(early.reason,'echo_window_open');
  // ...but an Echo window that would outlast the boss closes with the boss.
  assert.equal(worldBossEchoWindowEndsAtMs(boss,1000,5000),5000);
  assert.equal(finalizeWorldBossRanks({nowMs:5000,endsAtMs:5000,defeatedAtMs:1000,inFlightScoredAttempts:0,definition:boss,rankCandidates:ranks}).ready,true);
  assert.equal(finalizeWorldBossRanks({nowMs:5000,endsAtMs:5000,defeatedAtMs:1000,inFlightScoredAttempts:0,inFlightEchoAttempts:1,definition:boss,rankCandidates:ranks}).reason,'in_flight_attempts');
  assert.equal(canStartScoredBossAttempt({state:'defeated',attemptsToday:0,definition:boss,nowMs:echoClosedMs+1,endsAtMs:echoClosedMs*3,defeatedAtMs:0}).reason,'echo_window_closed');

  // Echo-only players get participation, never victory or prestige.
  const echoRewards=worldBossRewardIntents({state:'defeated',validAttempts:0,echoAttempts:1,scoredRaidImpact:0,finalRank:1,qualifyingPopulation:10,claimedRewardKeys:[],definition:boss});
  assert.deepEqual(echoRewards.map(x=>x.rewardKey),['participation']);
  // A finalized boss that expired undefeated pays no victory; a finalized defeated one does.
  assert.ok(!worldBossRewardIntents({state:'finalized',validAttempts:2,echoAttempts:0,scoredRaidImpact:10,claimedRewardKeys:[],definition:boss}).some(x=>x.rewardKey==='victory'));
  assert.ok(worldBossRewardIntents({state:'finalized',defeatedAtMs:1,validAttempts:2,echoAttempts:0,scoredRaidImpact:10,claimedRewardKeys:[],definition:boss}).some(x=>x.rewardKey==='victory'));
  // Prestige follows worldBossPrestigeTier: outside the top 100 and top 10% earns nothing.
  assert.ok(!worldBossRewardIntents({state:'defeated',validAttempts:1,echoAttempts:0,scoredRaidImpact:10,finalRank:400,qualifyingPopulation:1000,claimedRewardKeys:[],definition:boss}).some(x=>x.rewardKey==='prestige'));
  assert.ok(worldBossRewardIntents({state:'defeated',validAttempts:1,echoAttempts:0,scoredRaidImpact:10,finalRank:900,qualifyingPopulation:10000,claimedRewardKeys:[],definition:boss}).some(x=>x.rewardKey==='prestige'));

  // A failed-then-finalized crisis pays no success reward.
  assert.ok(!crisisRewardIntents({state:'finalized',outcome:'failed',totalPersonalPoints:800,claimedRewardKeys:[],definition:crisis}).some(x=>x.rewardKey==='success'));
  assert.ok(crisisRewardIntents({state:'finalized',outcome:'secured',totalPersonalPoints:800,claimedRewardKeys:[],definition:crisis}).some(x=>x.rewardKey==='success'));
  // Mixed crises need their category share, not just the total.
  assert.equal(crisisFinalState({nowMs:10,endsAtMs:5,definition:crisis,creditedPoints:10000,targetPoints:10000,combatPoints:9000,skillingPoints:1000}),'failed');
  assert.equal(crisisFinalState({nowMs:1,endsAtMs:5,definition:crisis,creditedPoints:10000,targetPoints:10000,combatPoints:9000,skillingPoints:1000}),null);
  assert.equal(crisisFinalState({nowMs:1,endsAtMs:5,definition:crisis,creditedPoints:10000,targetPoints:10000,combatPoints:5000,skillingPoints:5000}),'secured');

  // Impact: survival credit stops at defeat, and corrupt metrics never produce NaN.
  const alive=computeWorldBossImpact(boss,{encounterId:'s',accountId:'a',characterId:'c',roleProfile:'tank',durationSeconds:90,directDamage:0,damagePrevented:0,effectiveHealing:0,utilityUptimeSeconds:0,survived:true,defeatedPlayer:false});
  const fell=computeWorldBossImpact(boss,{encounterId:'f',accountId:'a',characterId:'c',roleProfile:'tank',durationSeconds:30,directDamage:0,damagePrevented:0,effectiveHealing:0,utilityUptimeSeconds:0,survived:false,defeatedPlayer:false});
  assert.ok(fell.performanceBreakdown.survival<alive.performanceBreakdown.survival);
  const corrupt=computeWorldBossImpact(boss,{encounterId:'n',accountId:'a',characterId:'c',roleProfile:'damage',durationSeconds:Number.NaN,directDamage:Number.NaN,damagePrevented:Number.POSITIVE_INFINITY,effectiveHealing:-5,utilityUptimeSeconds:Number.NaN,survived:true,defeatedPlayer:false});
  assert.equal(corrupt.raidImpact,0);

  // Admin commands reject blank ids and unaudited destructive actions.
  const calls:string[]=[];
  const deps={cancelCrisis:async(id:string)=>calls.push('cc:'+id),recalculateCrisis:async(id:string)=>calls.push('rc:'+id),cancelWorldBoss:async(id:string)=>calls.push('cb:'+id),recalculateWorldBossHp:async(id:string)=>calls.push('rb:'+id),repairWorldBossAttempt:async(id:string)=>calls.push('ra:'+id),finalizeWorldBoss:async(id:string)=>calls.push('fb:'+id)};
  await rejectsWith(executeSharedWorldAdminCommand(deps,'shared_world.crisis_recalculate',{},''),/instance_id_required/);
  await rejectsWith(executeSharedWorldAdminCommand(deps,'shared_world.world_boss_cancel',{instanceId:'b1'},'  '),/reason_required/);
  await executeSharedWorldAdminCommand(deps,'shared_world.world_boss_repair_attempt',{encounterId:' e1 '},'stuck reservation');
  await executeSharedWorldAdminCommand(deps,'shared_world.crisis_recalculate',{instanceId:'c1'},'');
  assert.deepEqual(calls,['ra:e1','rc:c1']);

  // Worker: a failing step is reported and does not stop later lifecycle steps.
  let heartbeat:Record<string,unknown>={};
  const worker=await runSharedWorldWorker({activateDueCrises:async()=>1,failExpiredCrises:async()=>{throw new Error('db_timeout');},finalizeResolvedCrises:async()=>2,spawnUnlockedWorldBosses:async()=>0,activateDueWorldBosses:async()=>0,expireStaleBossAttempts:async()=>3,expireWorldBosses:async()=>0,finalizeWorldBosses:async()=>4,heartbeat:async(_k,d)=>{heartbeat=d;}},{nowMs:()=>1});
  assert.equal(worker.finalizedBosses,4); assert.equal(worker.expiredAttempts,3); assert.deepEqual(worker.errors,[{step:'failExpiredCrises',message:'db_timeout'}]); assert.equal(heartbeat.ok,false);

  // Notifications dedupe on stable ids and show readable region names.
  assert.equal(crisisStageNotification({instanceId:'i',crisisName:'Rift Breach',stageId:'turning_point',stageName:'Wendepunkt'}).dedupeKey,'crisis-stage:i:turning_point');
  assert.equal(regionDisplayName('kings_road'),'Kings Road');
  assert.ok(worldBossSpawnedNotification({instanceId:'i',bossName:'Cindermaw',regionId:'sunscar'}).body.includes('Sunscar'));

  // Crisis service reports real progress even when a contribution is not credited.
  const securedInstance={instanceId:'c',definition:crisis,state:'secured' as const,startsAtMs:0,endsAtMs:10,targetPoints:100,creditedPoints:120,combatPoints:60,skillingPoints:60};
  const late=await recordRegionalCrisisContribution({getInstance:async()=>securedInstance,getAccountDailyPoints:async()=>0,recordContribution:async()=>{throw new Error('must not record');}},'c',{...event,occurredAtMs:50});
  assert.deepEqual(late,{crisisInstanceId:'c',creditedPoints:0,globalCreditedPoints:120,secured:true});

  // Settlement fails fast once the reservation has expired.
  const reservation={encounterId:'e',instanceId:'b',accountId:'a',characterId:'c',dateKey:'2026-09-14',echoOnly:false,phaseId:'phase_1',expiresAtMs:100};
  await rejectsWith(settleWorldBossAttempt({store:{loadAttempt:async()=>reservation} as never},{encounterId:'e',accountId:'a',nowMs:101,combatResult:{encounterId:'e',accountId:'a',characterId:'c',roleProfile:'damage',durationSeconds:90,directDamage:1,damagePrevented:0,effectiveHealing:0,utilityUptimeSeconds:0,survived:true,defeatedPlayer:false}}),/world_boss_attempt_expired/);

  console.log('v19 shared-world refinement tests passed');
})().catch(error=>{console.error(error);process.exit(1);});
