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
const fin=finalizeWorldBossRanks({nowMs:700000,endsAtMs:999999,defeatedAtMs:0,inFlightScoredAttempts:0,definition:boss,rankCandidates:ranks}); assert.equal(fin.ready,true); assert.equal(fin.finalRanks.length,3);
const crisisRewards=crisisRewardIntents({state:'secured',totalPersonalPoints:800,claimedRewardKeys:[],definition:crisis}); assert.ok(crisisRewards.some(x=>x.rewardKey==='participation')); assert.ok(crisisRewards.some(x=>x.rewardKey==='success'));
const bossRewards=worldBossRewardIntents({state:'defeated',validAttempts:1,echoAttempts:0,scoredRaidImpact:2100,finalRank:5,qualifyingPopulation:500,claimedRewardKeys:[],definition:boss}); assert.ok(bossRewards.some(x=>x.rewardKey==='victory')); assert.ok(bossRewards.some(x=>x.rewardKey==='prestige'));
assert.equal(bossUnlockForReachedStages('crisis-1',crisis,['response','turning_point','secured'])?.worldBossTemplateId,'world_boss_rift_colossus');
console.log('v19 finalization/reward/ranking tests passed');
