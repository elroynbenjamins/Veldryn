import {newGame,createCharacter} from '../../../apps/mobile/src/core/game';
import type {GameState,SkillId} from '../../../apps/mobile/src/core/types';
import type {PartyEventDraftGameStateV28} from '../party-event-save-projection-v28';
import {partyEventRewardBundle}
 from '../../src/server/party/weekly-party-rewards-v2';
import type {VerifiedPartyEventEvidenceV27}
 from '../../src/server/party/weekly-party-settlement-evidence-v27';
import {
 PARTY_EVENT_ATOMIC_PACKET_V29_RELEASED,
 planPrivatePartyEventAtomicPacketV29,
 commitPrivatePartyEventAtomicPacketV29,
} from '../party-event-atomic-packet-v29';

const account='11111111-1111-4111-8111-111111111111';
const character='22222222-2222-4222-8222-222222222222';
const offer='33333333-3333-4333-8333-333333333333';
const party='44444444-4444-4444-8444-444444444444';
const reservation='55555555-5555-4555-8555-555555555555';
const receiptId='66666666-6666-4666-8666-666666666666';
const inboxId='77777777-7777-4777-8777-777777777777';
const start='2026-11-01T00:00:00+00:00';
const requestId='party-v29-test-0000001';

function assert(value:unknown,name:string):asserts value{
 if(!value)throw Error('party_v29_packet_test:'+name);
}
async function denied(fn:()=>Promise<unknown>,message:string){
 try{await fn();throw Error('unexpected_success');}
 catch(e){assert(String(e).includes(message),
  'expected '+message+', received '+String(e));}
}
const fresh=():PartyEventDraftGameStateV28=>{
 const game=createCharacter(newGame(1700000000000),
  'IRONWARDEN','Test Character');
 return {...game,character:{...game.character!,id:character,gold:1000},
  account:{...game.account,partyRenown:10,companionEssence:5,
   bondstones:3},inventory:{stacks:[{itemId:'GEM_DUST',quantity:12}],
   capacity:30}};
};
type Quote=ReturnType<typeof partyEventRewardBundle>;
function evidence(reward:Quote,
 difficulty:'standard'|'veteran'|'heroic'='standard'):VerifiedPartyEventEvidenceV27{
 return {
  offerId:offer,partyId:party,reservationId:reservation,
  eventStartsAt:start,trustedAccountId:account,
  frozenCharacterId:character,quoteHash:'a'.repeat(64),
  difficulty,reward,historicalSnapshotsStale:false,onlineRevision:5,
  evidenceReconciled:true,claimable:false,entitled:false,claimed:false,
  economyApplied:false,inboxDelivered:false,payoutEnabled:false,
  blockers:[
   'party_renown_destination_not_verified',
   'xp_progression_and_online_commit_not_verified',
   'atomic_inbox_delivery_not_implemented',
  ],
 };
}
const warrior=partyEventRewardBundle({
 difficulty:'standard',personalPoints:15,performanceBand:4,
 choice:'warrior',
});
const artisan=partyEventRewardBundle({
 difficulty:'standard',personalPoints:15,performanceBand:4,
 choice:'artisan',
});
async function plan(reward=warrior,opts?:{
 difficulty?:'standard'|'veteran'|'heroic';
 state?:GameState;skill?:SkillId;requestId?:string;receiptId?:string;
 inboxId?:string;accountId?:string;revision?:number;gold?:number;
}){
 const state=opts?.state??fresh();
 return planPrivatePartyEventAtomicPacketV29({
  trustedAccountId:opts?.accountId??account,
  requestId:opts?.requestId??requestId,
  receiptId:opts?.receiptId??receiptId,
  inboxId:opts?.inboxId??inboxId,
  evidence:evidence(reward,opts?.difficulty),
  lockedState:state,
  lockedOnlineRevision:opts?.revision??5,
  lockedWalletGold:opts?.gold??state.character!.gold,
  lockedCharacterGold:state.character!.gold,
  ...(opts?.skill?{professionSkillTarget:opts.skill}:{}),
 });
}
async function test(){
 assert(!PARTY_EVENT_ATOMIC_PACKET_V29_RELEASED,'release remains disabled');
 const before=fresh(),snapshot=JSON.stringify(before);
 const a=await plan();
 assert(a.previewOnly&&a.committed===false&&a.rewardsGranted===false
  &&a.inboxDelivered===false&&a.requestRecorded===false
  &&a.releaseEnabled===false,'packet never pays');
 assert(a.futureReceipt.id===receiptId&&a.futureReceipt.inboxId===inboxId
  &&a.futureInbox.id===inboxId&&a.futureInbox.receiptId===receiptId
  &&a.futureReceipt.offerId===a.futureInbox.offerId
  &&a.futureReceipt.accountId===a.futureInbox.accountId
  &&a.futureReceipt.eventStartsAt===a.futureInbox.eventStartsAt
  &&a.futureReceipt.rewardHash===a.futureInbox.rewardHash
  &&a.futureReceipt.rewardJson===a.futureInbox.rewardJson,
  'future receipt and Inbox reference each other');
 assert(a.futureReceipt.sourceRevision===5
  &&a.futureReceipt.settledRevision===6
  &&/^[0-9a-f]{64}$/.test(a.futureReceipt.stateAfterHash),
  'revision and immutable proposed-state digest');
 assert(a.futureReceipt.goldDelta===warrior.gold
  &&a.futureReceipt.combatXpDelta===warrior.combatXp
  &&a.proposedState.character!.gold===1000+warrior.gold
  &&a.proposedState.account.partyRenown===10+warrior.partyRenown,
  'canonical v28 credit routes');
 assert(JSON.stringify(before)===snapshot,'source state remains unchanged');
 const second=await plan();
 assert(second.futureReceipt.stateAfterHash===
  a.futureReceipt.stateAfterHash,
  'same canonical state must produce same SHA');
 const ar=await plan(artisan,{skill:'enchanting'});
 assert(ar.futureReceipt.professionSkillId==='enchanting'
  &&ar.futureReceipt.professionXpDelta===artisan.skillXp
  &&ar.futureReceipt.combatXpDelta===0
  &&ar.futureReceipt.gemDustDelta===artisan.materials.GEM_DUST,
  'artisan quote and verified profession target');

 await denied(()=>plan(warrior,{requestId:'bad'}),'invalid_request_id');
 await denied(()=>plan(warrior,{receiptId:inboxId}),'invalid_identity');
 await denied(()=>plan(warrior,{accountId:character}),'event_account_mismatch');
 await denied(()=>plan(warrior,{revision:6}),'online_revision_conflict');
 await denied(()=>plan(warrior,{gold:999}),'gold_sources_conflict');
 await denied(()=>plan(artisan), 'profession_target_required');
 await denied(()=>plan(warrior,{skill:'mining'}),'unexpected_profession_target');
 await denied(()=>plan({...warrior,gold:9999}),
  'quote_model_mismatch');
 const wrongChar=fresh();
 wrongChar.character!.id=account;
 await denied(()=>plan(warrior,{state:wrongChar}),
  'character_not_frozen');
 const badInventory=fresh();
 badInventory.inventory={stacks:[{itemId:'GEM_DUST',quantity:99998}],
  capacity:1};
 await denied(()=>plan(artisan,{skill:'mining',state:badInventory}),
  'inventory_full');
 await denied(()=>commitPrivatePartyEventAtomicPacketV29(),
  'atomic_commit_not_released');
 let tested=0;
 for(const difficulty of ['standard','veteran','heroic'] as const)
  for(let band=1;band<=6;band++)
   for(const kind of ['warrior','artisan','companion','participation'] as const){
    const reward=partyEventRewardBundle({
     difficulty,performanceBand:band,
     personalPoints:kind==='participation'?5:15,
     choice:kind==='participation'?undefined:kind,
    });
    const v=await plan(reward,{
      difficulty,
      ...(kind==='artisan'?{skill:'smithing' as SkillId}:{}),
    });
    assert(v.futureReceipt.goldDelta===reward.gold
      &&v.futureReceipt.rewardKind===kind
      &&v.futureInbox.rewardJson.gold===reward.gold
      &&v.futureReceipt.offerId===offer
      &&v.proposedState.character!.gold===1000+reward.gold,
      'reward/Inbox parity '+difficulty+' '+band+' '+kind);
    tested++;
   }
 console.log('Party Events v29: '+tested+
  ' canonical receipt/Inbox packets, cross-links, identity, replay request ID, SHA stability, rollback-safe nonpayment and fail-closed guards');
}
void test().catch(error=>{console.error(error);process.exitCode=1;});
