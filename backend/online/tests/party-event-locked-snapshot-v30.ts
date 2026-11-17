import {newGame,createCharacter} from '../../../apps/mobile/src/core/game';
import {partyEventRewardBundle} from '../../src/server/party/weekly-party-rewards-v2';
import {
 PARTY_EVENT_LOCKED_SNAPSHOT_QUERY_V30,
 PARTY_EVENT_LOCKED_SNAPSHOT_V30_RELEASED,
 validatePrivatePartyEventLockedSnapshotV30,
 readPrivatePartyEventLockedSnapshotV30,
 claimPartyEventFromLockedSnapshotV30,
 type PrivatePartyEventLockedSnapshotV30,
} from '../party-event-locked-snapshot-v30';
const account='11111111-1111-4111-8111-111111111111';
const offer='33333333-3333-4333-8333-333333333333';
const party='44444444-4444-4444-8444-444444444444';
const reservation='55555555-5555-4555-8555-555555555555';
const character='22222222-2222-4222-8222-222222222222';
const date='2026-11-01T00:00:00Z';
function yes(v:unknown,m:string):asserts v{
 if(!v)throw Error('party_v30_test_'+m);
}
function deny(fn:()=>unknown,m:string){
 try{fn();throw Error('unexpected_success');}
 catch(e){yes(String(e).includes(m),'expected_'+m+'_got_'+String(e));}
}
async function denyAsync(fn:()=>Promise<unknown>,m:string){
 try{await fn();throw Error('unexpected_success');}
 catch(e){yes(String(e).includes(m),'expected_'+m+'_got_'+String(e));}
}
function freshState(){
 const x=createCharacter(newGame(1700000000000),'IRONWARDEN',
  'V30 Test Adventurer');
 return {...x,character:{...x.character!,id:character,gold:1000}};
}
function snapshot(
 kind:'warrior'|'artisan'|'companion'|'participation'='warrior',
 difficulty:'standard'|'veteran'|'heroic'='standard',
 band=2,
):PrivatePartyEventLockedSnapshotV30{
 const reward=partyEventRewardBundle({
  difficulty,performanceBand:band,personalPoints:kind==='participation'?5:15,
  choice:kind==='participation'?undefined:kind,
 });
 return {
  schema:'party-event-locked-snapshot-v30',
  offerId:offer,partyId:party,reservationId:reservation,
  accountId:account,characterId:character,eventStartsAt:date,
  difficulty,rewardHash:'a'.repeat(64),reward,
  onlineRevision:10,walletGold:1000,characterGold:1000,
  state:freshState(),checked:true,previewOnly:true,
  claimable:false,claimed:false,economyApplied:false,
  inboxDelivered:false,locksReleasedAtRpcEnd:true,
 };
}
const verify=(s:unknown)=>validatePrivatePartyEventLockedSnapshotV30({
 trustedAccountId:account,offerId:offer,snapshot:s,
});
async function test(){
 yes(PARTY_EVENT_LOCKED_SNAPSHOT_V30_RELEASED===false,'release_off');
 yes(PARTY_EVENT_LOCKED_SNAPSHOT_QUERY_V30.includes(
  'private.inspect_party_event_claim_lock_v30($1::uuid,$2::uuid)'),
  'parameterized_private_sql');
 yes(!/\b(insert|update|delete)\s+(into|from|private\.)/i.test(
  PARTY_EVENT_LOCKED_SNAPSHOT_QUERY_V30),'sql_adapter_read_only');
 const v=verify(snapshot());
 yes(v.previewOnly&&v.paid===false&&v.committed===false
  &&v.inboxDelivered===false&&!v.locksHeld
  &&v.requiresRevalidationInsidePaymentTransaction,
  'never_claims_historical_lock');
 yes(v.frozenCharacterId===character&&v.walletGold===1000
  &&v.onlineRevision===10&&v.reward.kind==='warrior',
  'trusted_identity_projection');
 let calls=0;
 const db={
  queryOne:async(sql:typeof PARTY_EVENT_LOCKED_SNAPSHOT_QUERY_V30,
   params:readonly [string,string])=>{
   calls++;
   yes(sql===PARTY_EVENT_LOCKED_SNAPSHOT_QUERY_V30
    &&params[0]===offer&&params[1]===account,
    'trusted_parameter_order');
   return {snapshot:snapshot()};
  },
 };
 await denyAsync(()=>readPrivatePartyEventLockedSnapshotV30({
  gateEnabled:false,offerId:offer,trustedAccountId:account,db,
 }), 'inspection_gate_disabled');
 yes(calls===0,'disabled_gate_did_not_read');
 await denyAsync(()=>readPrivatePartyEventLockedSnapshotV30({
  gateEnabled:true,offerId:'bad',trustedAccountId:account,db,
 }), 'trusted_identity_invalid');
 yes(calls===0,'invalid_ids_did_not_read');
 const a=await readPrivatePartyEventLockedSnapshotV30({
  gateEnabled:true,offerId:offer,trustedAccountId:account,db,
 });
 yes(Number(calls)===1&&a.reward.gold===snapshot().reward.gold&&!a.locksHeld,
  'read_validated_not_payable');

 deny(()=>verify({...snapshot(),accountId:character}),
  'provenance_identity_invalid');
 deny(()=>verify({...snapshot(),offerId:reservation}),
  'provenance_identity_invalid');
 deny(()=>verify({...snapshot(),characterId:account}),
  'frozen_character_mismatch');
 deny(()=>verify({...snapshot(),locksReleasedAtRpcEnd:false}),
  'release_flags_invalid');
 deny(()=>verify({...snapshot(),checked:false}),
  'release_flags_invalid');
 deny(()=>verify({...snapshot(),claimable:true}),
  'release_flags_invalid');
 deny(()=>verify({...snapshot(),inboxDelivered:true}),
  'release_flags_invalid');
 deny(()=>verify({...snapshot(),rewardHash:'x'}),
  'quote_hash_invalid');
 deny(()=>verify({...snapshot(),difficulty:'mythic'}),
  'difficulty_invalid');
 deny(()=>verify({...snapshot(),walletGold:1001}),
  'gold_projection_conflict');
 deny(()=>verify({...snapshot(),characterGold:999}),
  'gold_projection_conflict');
 deny(()=>verify({...snapshot(),onlineRevision:9.5}),
  'revision_invalid');
 deny(()=>verify({...snapshot(),onlineRevision:Number.MAX_SAFE_INTEGER}),
  'revision_invalid');
 deny(()=>verify({...snapshot(),reward:{...snapshot().reward,gold:999}}),
  'quote_formula_mismatch');
 deny(()=>verify({...snapshot(),reward:{...snapshot().reward,
  materials:{GEM_DUST:999}}}),'quote_formula_mismatch');

 let checked=0;
 for(const difficulty of ['standard','veteran','heroic'] as const){
  for(let band=1;band<=6;band++){
   for(const kind of ['warrior','artisan','companion','participation'] as const){
    const q=snapshot(kind,difficulty,band);
    const r=verify(q);
    yes(r.reward.gold===q.reward.gold
      &&r.reward.kind===kind&&!r.locksHeld&&!r.paid,
      '72_reward_formulas');
    checked++;
   }
  }
 }
 await denyAsync(()=>claimPartyEventFromLockedSnapshotV30(),
  'atomic_grant_unreleased');
 console.log('Party Events v30: '+checked+
  ' locked claim inspections, trust-bound identity, quote and Gold parity, stale lock awareness, hard-off payout');
}
void test().catch(e=>{console.error(e);process.exitCode=1;});
