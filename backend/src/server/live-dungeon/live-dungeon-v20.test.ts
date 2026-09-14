import { strict as assert } from 'node:assert';
import {areTicketsCompatible,LIVE_DUNGEON_POLICY,matchmakingWindow,rewardEligibility,validateLoadoutRole,validateStrictComposition,deserterCooldownMinutes} from './live-dungeon-policy';
import {readyDeadline,resolveReadyCheck} from './ready-check';
import {selectReplacement} from './matchmaking';
import {classifyAfk,classifyPresence,safetyAiRules} from './reconnect-afk';
import {resolveRouteVote,routeVoteDeadline} from './route-voting';
import {canTransitionLiveRun,recoveryDisposition,requiresRecovery} from './run-recovery';

assert.equal(validateStrictComposition(['tank','damage','damage','support']).valid,true);
assert.equal(validateStrictComposition(['damage','damage','damage','support']).valid,false);
const base={accountId:'a',characterId:'ca',classId:'ironwarden',role:'tank' as const,combatLevel:30,powerIndex:1500,tankScore:.80,supportScore:.1,loadoutVersion:1,contentId:'COP_004'};
assert.equal(validateLoadoutRole(base).valid,true);
assert.equal(validateLoadoutRole({...base,tankScore:.5}).valid,false);
const b={...base,accountId:'b',characterId:'cb',classId:'ravager',role:'damage' as const,powerIndex:1650,tankScore:0,supportScore:0};
assert.equal(areTicketsCompatible(base,b,120,120),true);
const replacement=selectReplacement({
  role:'damage',contentId:'COP_004',existingAccountIds:['a','b','c'],nowMs:180_000,referencePower:1600,referenceCombatLevel:31,
  candidates:[{...b,accountId:'replacement',characterId:'cr',combatLevel:32,powerIndex:1580,ticketId:'t1',queuedAtMs:0}],
});
assert.equal(replacement?.accountId,'replacement');

assert.ok(matchmakingWindow(1000,0,'tank').minPower>=900);
assert.equal(LIVE_DUNGEON_POLICY.liveEchoAutofill,false);
const rd=readyDeadline(1000); assert.equal(rd,21000);
assert.equal(resolveReadyCheck({members:[{accountId:'a',response:'ready'},{accountId:'b',response:'pending'}],nowMs:rd,deadlineMs:rd,replacementCycle:0}).state,'replace');
assert.equal(resolveReadyCheck({members:[{accountId:'a',response:'ready'},{accountId:'b',response:'ready'}],nowMs:2000,deadlineMs:rd,replacementCycle:0}).state,'launch');
assert.equal(classifyPresence({nowMs:100_000,lastHeartbeatMs:95_000}),'connected');
assert.equal(classifyPresence({nowMs:100_000,lastHeartbeatMs:70_000}),'safety_ai');
assert.equal(classifyPresence({nowMs:300_000,lastHeartbeatMs:0}),'dropped');
assert.equal(classifyAfk({secondsSinceMeaningfulInput:70,inCombat:true}),'warning');
assert.equal(classifyAfk({secondsSinceMeaningfulInput:130,inCombat:true}),'safety_ai');
assert.equal(safetyAiRules().canSpendConsumables,false);
const dl=routeVoteDeadline(0); assert.equal(dl,8000);
let vote=resolveRouteVote({optionIds:['left','right'],votes:[{accountId:'a',optionId:'left',eligible:true,submittedAtMs:1},{accountId:'b',optionId:'left',eligible:true,submittedAtMs:1}],eligibleAccountIds:['a','b'],nowMs:2,deadlineMs:dl,seed:'x'}); assert.equal(vote.reason,'unanimous');
vote=resolveRouteVote({optionIds:['left','right'],votes:[{accountId:'a',optionId:'left',eligible:true,submittedAtMs:1},{accountId:'b',optionId:'right',eligible:true,submittedAtMs:1}],eligibleAccountIds:['a','b'],nowMs:dl,deadlineMs:dl,seed:'stable'}); assert.equal(vote.resolved,true); assert.ok(vote.optionId);
assert.equal(rewardEligibility({wasReady:true,combatParticipation:.8,mechanicParticipation:.7,routeVotesCast:3,safetyAiSeconds:0,runDurationSeconds:1000,leftRun:false,completedRun:true}).eligible,true);
assert.equal(rewardEligibility({wasReady:true,combatParticipation:.05,mechanicParticipation:.02,routeVotesCast:0,safetyAiSeconds:800,runDurationSeconds:1000,leftRun:false,completedRun:true}).eligible,false);
assert.equal(deserterCooldownMinutes({intentionalLeaves30d:2,leftDuringActiveRun:true,disconnectClassifiedUnintentional:false}),20);
assert.equal(canTransitionLiveRun('active','recovering'),true); assert.equal(canTransitionLiveRun('completed','active'),false);
assert.equal(requiresRecovery({state:'active',nowMs:1000,leaseExpiresAtMs:999}),true);
assert.equal(recoveryDisposition({state:'recovering',encounterCommitted:true,runSnapshotAvailable:true}),'resume_from_snapshot');
console.log('v20 live dungeon production tests passed');
