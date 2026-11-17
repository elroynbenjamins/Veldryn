import {
  PARTY_EVENT_CLAIM_INTENTS_V25_RELEASED,
  quotePrivatePartyClaimV25,
  preparePrivatePartyClaimIntentV25,
  readPrivatePartyClaimInboxV25,
  claimPrivatePartyRewardV25,
  type TrustedPrivateClaimIntentsRepositoryV25,
  type PrivateClaimIntentInboxV25,
} from '../weekly-party-claim-intents-v25';
import {partyEventRewardBundle} from '../weekly-party-rewards-v2';

function must(ok:unknown,s:string):asserts ok {
 if(!ok)throw Error('party-v25-test: '+s);
}
async function rejects(fn:()=>Promise<unknown>,expected:string):Promise<void>{
 try{await fn();throw Error('unexpected_success');}
 catch(e){must(String(e).includes(expected),'expected '+expected+' got '+String(e));}
}
const id='11111111-1111-4111-8111-111111111111',
 account='22222222-2222-4222-8222-222222222222',
 intent='33333333-3333-4333-8333-333333333333';
must(PARTY_EVENT_CLAIM_INTENTS_V25_RELEASED===false,'feature stays hidden');
const expected=partyEventRewardBundle({difficulty:'standard',performanceBand:1,
 personalPoints:15,choice:'artisan'});
const incoming=partyEventRewardBundle({difficulty:'standard',performanceBand:1,
 personalPoints:5});
let quotes=0,reserves=0,reads=0;
const repo:TrustedPrivateClaimIntentsRepositoryV25={
 quoteOffer:async(offerId,owner)=>{
  quotes++;must(offerId===id&&owner===account,'trusted quote identity');
  return structuredClone(expected);
 },
 reserveIntent:async(offerId,owner,requestId)=>{
  reserves++;
  must(offerId===id&&owner===account
   &&requestId==='party-event-v25-intent:'+id,
   'server-derived, fixed claim ID only');
  return {intentId:intent,offerId:id,replayed:reserves>1,
   quoteHash:'f'.repeat(64),claimReady:false,
   claimable:false,claimed:false,rewardsGranted:false};
 },
 readInbox:async(owner)=>{
  reads++;must(owner===account,'account-scoped preview');
  return {items:[{intentId:intent,offerId:id,reservationId:id,
   rewardKind:'artisan',quoteHash:'f'.repeat(64),
   state:'blocked_unreleased',claimable:false,
   claimed:false,rewardsGranted:false}],
   claimEnabled:false,rewardsGranted:false,economyTransfers:0};
 }
};
async function test(){
 for(const [kind,points,choice] of [
  ['participation',5,undefined],
  ['warrior',15,'warrior'],['artisan',15,'artisan'],
  ['companion',15,'companion'],
 ] as const){
  const result=partyEventRewardBundle({
   difficulty:'standard',performanceBand:1,
   personalPoints:points,choice});
  must(result.kind===kind,'v2 choice model parity');
 }
 must(expected.gold===1700&&expected.skillXp===2250
  &&expected.materials.GEM_DUST===4
  &&incoming.gold===420,'v25 SQL economic formula cross-check');
 await rejects(()=>quotePrivatePartyClaimV25({
  gateEnabled:false,offerId:id,trustedAccountId:account,repository:repo,
 }), 'release_gate_disabled');
 await rejects(()=>preparePrivatePartyClaimIntentV25({
  gateEnabled:false,offerId:id,trustedAccountId:account,repository:repo,
 }), 'release_gate_disabled');
 await rejects(()=>readPrivatePartyClaimInboxV25({
  gateEnabled:false,trustedAccountId:account,repository:repo,
 }), 'release_gate_disabled');
 must(quotes===0&&reserves===0&&reads===0,'off switch must avoid DB');
 await rejects(()=>preparePrivatePartyClaimIntentV25({
  gateEnabled:true,offerId:'client-id',trustedAccountId:account,repository:repo,
 }), 'invalid_offer');
 must(reserves===0,'malformed identity cannot cause write');
 const q=await quotePrivatePartyClaimV25({
  gateEnabled:true,offerId:id,trustedAccountId:account,repository:repo,
 });
 must(JSON.stringify(q)===JSON.stringify(expected),'quote must come from trusted v2 model');
 const first=await preparePrivatePartyClaimIntentV25({
  gateEnabled:true,offerId:id,trustedAccountId:account,repository:repo,
 });
 const retry=await preparePrivatePartyClaimIntentV25({
  gateEnabled:true,offerId:id,trustedAccountId:account,repository:repo,
 });
 must(!first.replayed&&retry.replayed&&reserves===2
  &&!first.claimReady&&!first.claimed&&!first.claimable,
  'one-time claim intent and safe duplicate retry');
 const inbox=await readPrivatePartyClaimInboxV25({
  gateEnabled:true,trustedAccountId:account,repository:repo,
 });
 must(inbox.items.length===1&&!inbox.claimEnabled&&inbox.economyTransfers===0,
  'claim reservation is not a payout');
 await rejects(()=>claimPrivatePartyRewardV25({offerId:id,trustedAccountId:account}),
  'payout_not_released');

 await rejects(()=>quotePrivatePartyClaimV25({
  gateEnabled:true,offerId:id,trustedAccountId:account,
  repository:{...repo,quoteOffer:async()=>({...expected,gold:1000001})},
 }), 'invalid_quote_amount');
 await rejects(()=>quotePrivatePartyClaimV25({
  gateEnabled:true,offerId:id,trustedAccountId:account,
  repository:{...repo,quoteOffer:async()=>({...expected,materials:{GEM_DUST:5,INVENTED:1}})},
 }), 'unapproved_material');
 await rejects(()=>quotePrivatePartyClaimV25({
  gateEnabled:true,offerId:id,trustedAccountId:account,
  repository:{...repo,quoteOffer:async()=>({...expected,kind:'participation'})},
 }), 'inconsistent_reward_eligibility');
 await rejects(()=>preparePrivatePartyClaimIntentV25({
  gateEnabled:true,offerId:id,trustedAccountId:account,
  repository:{...repo,reserveIntent:async()=>({
   intentId:intent,offerId:id,replayed:false,claimReady:true as unknown as false,
   claimable:false,claimed:false,rewardsGranted:false,
  })},
 }), 'claim_intent_receipt_not_blocked');
 const malformed:PrivateClaimIntentInboxV25={
  items:[{intentId:intent,offerId:id,reservationId:id,
   rewardKind:'artisan',quoteHash:'f'.repeat(64),
   state:'blocked_unreleased',claimable:false,
   claimed:false,rewardsGranted:true as unknown as false}],
  claimEnabled:false,rewardsGranted:false,economyTransfers:0,
 };
 await rejects(()=>readPrivatePartyClaimInboxV25({
  gateEnabled:true,trustedAccountId:account,
  repository:{...repo,readInbox:async()=>malformed},
 }), 'invalid_claim_intent_item');
 console.log('Party Events v25: v2 model parity, fixed account/request IDs, exact retry, no payout, fail-closed malicious flags');
}
void test().catch(e=>{console.error(e);process.exitCode=1;});
