import {strict as assert} from 'node:assert';import {CoopRewardService,MemoryRewardIntegrityRepository,type CoopRewardEntitlement} from '../reward-integrity';
const repository=new MemoryRewardIntegrityRepository(),service=new CoopRewardService(repository);const state={cleared:true,routeProgress:1,reachedFinalBoss:true};
const entitlement=(id:string,mode:'live'|'qmode',account='player',earnedAtMs=0):CoopRewardEntitlement=>({id,runId:`run-${id}`,mode,recipientAccountId:account,characterId:`char-${account}`,kind:'participant',rewardStage:'clear',tier:1,mapBaseMarks:100,state,periodDateKey:'2026-09-09',periodWeekKey:'2026-09-07',earnedAtMs,claimed:false});
for(let i=0;i<4;i++){service.create(entitlement(`e${i}`,i%2?'live':'qmode'));service.claim('player',`e${i}`,`request-${i}`);}assert.equal(repository.daily.get('player:2026-09-09')?.enhanced,3);assert.equal(repository.weekly.get('player:2026-09-07')?.liveFellowship,2);assert.equal(repository.wallets.get('player'),370,'Live clears add a 25% Fellowship bonus while shared enhanced charges remain mode-neutral');
assert.deepEqual(service.rewardBudget('player',0,'2026-09-07'),{charges:0,nextChargeAtMs:28_800_000,weekKey:'2026-09-07',weeklyUsed:3});
service.create(entitlement('recharged','live','player',28_800_000));const thirdLive=service.claim('player','recharged','request-recharged');assert.equal(thirdLive.liveFellowshipBonus,25);assert.equal(repository.wallets.get('player'),495,'one enhanced reward charge regenerates after eight hours and the third Live clear still earns Fellowship');
assert.deepEqual(service.rewardBudget('player',28_800_000,'2026-09-07'),{charges:0,nextChargeAtMs:57_600_000,weekKey:'2026-09-07',weeklyUsed:4});
const replay=service.claim('player','e0','request-0');assert.equal(replay.idempotentReplay,true);assert.equal(repository.wallets.get('player'),495,'idempotent replay does not change the wallet');
let denied='';try{service.claim('echo-owner','e0','request-echo');}catch(error){denied=error instanceof Error?error.message:String(error);}assert.equal(denied,'not_reward_recipient');
service.create({...entitlement('assist','qmode','echo-owner'),kind:'echo_assistance',characterId:undefined});assert.ok(service.claim('echo-owner','assist','request-assist').marks>0);
repository.wallets.set('player',50);service.purchasePersonal({accountId:'player',activeParticipantAccountId:'player',memberKind:'human',cost:20,requestId:'buy-1'});service.purchasePersonal({accountId:'player',activeParticipantAccountId:'player',memberKind:'human',cost:20,requestId:'buy-1'});assert.equal(repository.wallets.get('player'),30);
let echoSpend='';try{service.purchasePersonal({accountId:'echo-owner',activeParticipantAccountId:'player',memberKind:'echo',cost:1,requestId:'bad-buy'});}catch(error){echoSpend=error instanceof Error?error.message:String(error);}assert.equal(echoSpend,'echo_wallet_forbidden');
const cadenceRepository=new MemoryRewardIntegrityRepository(),cadenceService=new CoopRewardService(cadenceRepository),eightHours=28_800_000;
for(let i=0;i<12;i++){const item={...entitlement(`cadence-${i}`,'live','cadence-player',i*eightHours),periodWeekKey:'week-a'};cadenceService.create(item);cadenceService.claim('cadence-player',item.id,`cadence-request-${i}`);}
const capped={...entitlement('cadence-capped','qmode','cadence-player',12*eightHours),periodWeekKey:'week-a'};cadenceService.create(capped);assert.equal(cadenceService.claim('cadence-player',capped.id,'cadence-request-capped').marks,20,'weekly limit keeps unlimited play at the post-cap rate');
const reset={...entitlement('cadence-reset','live','cadence-player',13*eightHours),periodWeekKey:'week-b'};cadenceService.create(reset);assert.equal(cadenceService.claim('cadence-player',reset.id,'cadence-request-reset').marks,125,'new week restores both enhanced eligibility and the 3-clear Live Fellowship allowance');
const noBonusRepository=new MemoryRewardIntegrityRepository(),noBonusService=new CoopRewardService(noBonusRepository),failed={...state,cleared:false};const failedLive={...entitlement('failed-live','live','failed-player'),state:failed};noBonusService.create(failedLive);assert.equal(noBonusService.claim('failed-player',failedLive.id,'failed-live-request').liveFellowshipBonus,0,'failed Live runs do not consume Fellowship');assert.equal(noBonusRepository.weekly.get('failed-player:2026-09-07')?.liveFellowship??0,0);
for(let i=0;i<4;i++){const item=entitlement(`fellowship-${i}`,'live','fellowship-player');noBonusService.create(item);const result=noBonusService.claim('fellowship-player',item.id,`fellowship-request-${i}`);assert.equal(result.liveFellowshipBonus,i<3?25:0);}assert.equal(noBonusRepository.weekly.get('fellowship-player:2026-09-07')?.liveFellowship,3,'Fellowship is limited to three successful Live clears per account week');
const failRepo=new MemoryRewardIntegrityRepository(),failService=new CoopRewardService(failRepo);
const fail={...state,cleared:false,routeProgress:1,reachedFinalBoss:true};
for(let i=0;i<14;i++){
 const item={...entitlement(`failure-${i}`,'live','failed-consolation',i*1000),state:fail};
 failService.create(item);
 const claim=failService.claim('failed-consolation',item.id,`failure-request-${i}`);
 assert.equal(claim.marks,i<12?7:0,'Failure payout must be limited to 12 small consolation claims per week');
 assert.equal(claim.liveFellowshipBonus,0,'Failed Live clears never grant Fellowship');
}
assert.equal(failRepo.enhancedCharges.size,0,'Failed attempts must not consume or initialize enhanced charges');
assert.equal(failRepo.weekly.get('failed-consolation:2026-09-07')?.enhanced,0,'Failed attempts cannot consume weekly enhanced reward allowance');
const clearAfterFailures=entitlement('after-failures','qmode','failed-consolation',20_000);
failService.create(clearAfterFailures);
assert.equal(failService.claim('failed-consolation',clearAfterFailures.id,'after-failures-clear').marks,100,'A successful clear after failures still earns a full enhanced payout');
assert.equal(failRepo.enhancedCharges.get('failed-consolation')?.charges,2,'Only a successful clear spends the charge');
const replayFailure=failService.claim('failed-consolation','failure-0','failure-request-0');
assert.equal(replayFailure.marks,7);assert.equal(replayFailure.idempotentReplay,true);
assert.equal(failRepo.failedWeekly.get('failed-consolation:2026-09-07'),12,'Idempotent replay never grants additional weekly failure allowance');
console.log('coop phase11 rewards OK');
