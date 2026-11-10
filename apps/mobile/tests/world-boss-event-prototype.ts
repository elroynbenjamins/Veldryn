/**
 * World Boss v7 OFFLINE event reducer tests.
 * No real accounts, migrations, Edge functions, Sigils or inventory writes.
 */
import {assert} from './test-assert';
import {launchPlayer} from '../../../backend/src/server/combat/content/launch-combat';
import {
 createWorldBossEventPrototype,applyWorldBossAttemptPrototype,worldBossPhaseAtStart,
 WORLD_BOSS_EVENT_PROTOTYPE_VERSION,WORLD_BOSS_MAX_ATTEMPTS,
 type WorldBossAttemptPrototype,type WorldBossEventPrototype,type WorldBossSnapshotPrototype,
} from '../../../backend/src/server/combat/world-boss-event-prototype';

const START=1794315600000; // Synthetic UTC epoch for deterministic tests, not event launch.
const DAY=86400000;
function snapshots(account:string):WorldBossSnapshotPrototype[]{
 const kits=['Ironwarden','Wayfinder','Ravager','Dawnkeeper'];
 return kits.map((kit,i)=>({
  snapshotId:account+':'+kit+':v1',ownerAccountId:i===0?account:account+':echo:'+i,
  resolvedCombatant:launchPlayer(kit,25)
 }));
}
function command(account:string,request:string,at=START):WorldBossAttemptPrototype{
 return {accountId:account,characterId:account+':character-1',requestId:request,
  atUtcMs:at,order:'steady_assault',squad:snapshots(account)};
}
function event(hp:number):WorldBossEventPrototype{
 return createWorldBossEventPrototype({eventId:'WB_TEST_EVENT',boss:'hollowroot',
  startsAtUtcMs:START,endsAtUtcMs:START+7*DAY,maxHp:hp});
}
function throws(fn:()=>unknown,error:string){
 let caught=false;try{fn();}catch(e){caught=String(e).includes(error);}
 assert.ok(caught,'expected '+error);
}

const a=command('account-a','request-one');
const original=event(100000000);
assert.equal(original.revision,0,'event creation has no commitments');
assert.equal(worldBossPhaseAtStart(original),'armored');
const first=applyWorldBossAttemptPrototype(original,a);
assert.equal(original.remainingHp,100000000,'the input event is immutable during settlement');
assert.equal(Object.keys(original.receipts).length,0,'original receipt table never mutated');
assert.equal(first.receipt.ordinal,1,'first completed attack slot');
assert.equal(first.receipt.phase,'armored','phase pinned at attack start');
assert.equal(first.receipt.snapshotIds.length,4,'resolved Echo snapshots saved');
assert.equal(first.receipt.engineVersion,WORLD_BOSS_EVENT_PROTOTYPE_VERSION);
assert.ok(first.receipt.rawCombatDamage>=first.receipt.worldHpCredited,'world credit cannot exceed actual HP combat damage');
assert.ok(first.receipt.worldHpCredited>0,'real combat damage credited to event HP');
assert.equal(first.event.remainingHp,original.remainingHp-first.receipt.worldHpCredited);
assert.equal(first.event.revision,1,'each unique completed battle increments revision once');
assert.deepEqual(first.receipt.replay.events,applyWorldBossAttemptPrototype(original,a).receipt.replay.events,
 'same input generates same seeded replay');

const retry=applyWorldBossAttemptPrototype(first.event,a);
assert.equal(retry.repeated,true,'same request yields stored result');
assert.equal(retry.event,first.event,'idempotent retry returns same state reference');
assert.equal(retry.receipt,first.receipt,'idempotent receipt is same original battle');
throws(()=>applyWorldBossAttemptPrototype(first.event,{...a,order:'break_armor'}),'idempotency_payload_mismatch');

let state=first.event;
for(const request of ['request-two','request-three']){
 const result=applyWorldBossAttemptPrototype(state,command('account-a',request,START+DAY));
 assert.equal(result.receipt.ordinal,request==='request-two'?2:3);
 state=result.event;
}
assert.equal(Object.keys(state.receipts).length,WORLD_BOSS_MAX_ATTEMPTS);
throws(()=>applyWorldBossAttemptPrototype(state,command('account-a','request-four')),'attempt_limit');
assert.equal(state.remainingHp,100000000-Object.values(state.receipts).reduce((n,r)=>n+r.worldHpCredited,0),
 'no attack can debit global HP twice');
assert.ok(state.remainingHp>=0,'no negative shared HP');

throws(()=>applyWorldBossAttemptPrototype(event(100000),command('account-a','early',START-1)),'event_not_active');
throws(()=>applyWorldBossAttemptPrototype(event(100000),command('account-a','late',START+7*DAY)),'event_not_active');
const afterClose=applyWorldBossAttemptPrototype(first.event,a);
assert.equal(afterClose.repeated,true,'committed replay is retrievable even after event time progresses');

const phaseState=event(1000000);
const exposed={...phaseState,remainingHp:700000};
const enraged={...phaseState,remainingHp:300000};
assert.equal(worldBossPhaseAtStart(phaseState),'armored');
assert.equal(worldBossPhaseAtStart(exposed),'exposed','threshold inclusive at 70%');
assert.equal(worldBossPhaseAtStart(enraged),'enraged','threshold inclusive at 30%');
assert.equal(worldBossPhaseAtStart({...phaseState,remainingHp:0}),'enraged');

const tiny=event(1);
const win=applyWorldBossAttemptPrototype(tiny,command('account-z','defeat'));
assert.equal(win.event.remainingHp,0,'world HP clipped to zero');
assert.equal(win.receipt.worldHpCredited,1,'world HP debit never exceeds remaining health');
assert.equal(win.receipt.hpBefore-win.receipt.hpAfter,win.receipt.worldHpCredited);
assert.deepEqual(win.event.crossedThresholds,[70,30,0],'all crossed global thresholds recorded once');
const residual=applyWorldBossAttemptPrototype(win.event,command('account-b','residual'));
assert.equal(residual.receipt.residualEcho,true,'after community kill only residual attacks permitted');
assert.equal(residual.receipt.worldHpCredited,0,'no double community HP damage after boss death');
assert.equal(residual.event.remainingHp,0);
assert.equal(residual.receipt.hpBefore,0);
assert.ok(residual.receipt.rawCombatDamage>=0,'residual replay preserves real personal damage');
assert.deepEqual(residual.event.crossedThresholds,[70,30,0],'no duplicate milestones');
assert.equal(Object.keys(residual.event.receipts).length,2);

const upper=event(2);
const left=command('account-left','same-time');
const right=command('account-right','same-time');
// Two independent attempts can be *prepared* against the same old event.
// Serial application must still clip the second HP delta at zero; production
// requires a DB lock and unique receipt constraint, which this model lacks.
const leftCommit=applyWorldBossAttemptPrototype(upper,left);
const rightCommit=applyWorldBossAttemptPrototype(leftCommit.event,right);
assert.equal(leftCommit.receipt.worldHpCredited+rightCommit.receipt.worldHpCredited,2);
assert.equal(rightCommit.receipt.residualEcho,true,'second concurrent-style attempt is residual');
assert.equal(rightCommit.event.revision,2);

const badSquad=snapshots('account-a');
throws(()=>applyWorldBossAttemptPrototype(event(100000),{...a,squad:[...badSquad.slice(0,3),badSquad[0]]}),'duplicate_snapshot');
throws(()=>applyWorldBossAttemptPrototype(event(100000),{...a,squad:badSquad.slice(0,3)}),'requires_four_fighters');
throws(()=>applyWorldBossAttemptPrototype(event(100000),{...a,squad:badSquad.map((s,i)=>i===0?{...s,ownerAccountId:'attacker'}:s)}),'initiator_must_match_account');
throws(()=>applyWorldBossAttemptPrototype(event(100000),{...a,squad:badSquad.map((s,i)=>i===1?{...s,ownerAccountId:badSquad[0].ownerAccountId}:s)}),'duplicate_player_echo');
throws(()=>createWorldBossEventPrototype({eventId:'invalid',boss:'hollowroot',startsAtUtcMs:START,endsAtUtcMs:START,maxHp:1}),'invalid_event_definition');
throws(()=>createWorldBossEventPrototype({eventId:'invalid',boss:'hollowroot',startsAtUtcMs:START,endsAtUtcMs:START+DAY,maxHp:0}),'invalid_event_definition');

const errorBefore=event(100000);
throws(()=>applyWorldBossAttemptPrototype(errorBefore,{...a,squad:[
  {...badSquad[0],resolvedCombatant:{...badSquad[0].resolvedCombatant,stats:{...badSquad[0].resolvedCombatant.stats,maxHp:0}}},
  ...badSquad.slice(1)
]}),'invalid_combatant');
assert.equal(Object.keys(errorBefore.receipts).length,0,'invalid character never spends a slot');
assert.equal(errorBefore.remainingHp,100000,'invalid character never debits global HP');

// Body of a receipt is purely a hypothetical entitlement. No currency wallet
// can be reached from this model or its tests.
assert.ok([5,10].includes(first.receipt.hypotheticalBaseSigils),'reward preview is bounded');
console.log('WB_EVENT_PROTOTYPE='+JSON.stringify({
 mode:'test-only',idempotent:true,maxAttempts:WORLD_BOSS_MAX_ATTEMPTS,
 replayStored:true,residualWorldCredit:residual.receipt.worldHpCredited,
 thresholds:win.event.crossedThresholds,backendWrites:0,mintedSigils:0,
 engineVersion:WORLD_BOSS_EVENT_PROTOTYPE_VERSION
}));
