import {
  PARTY_EVENT_CLAIM_SQL_V25_RELEASED,
  PARTY_EVENT_PREPARE_CLAIM_QUOTE_SQL_V25,
  PARTY_EVENT_CLAIM_QUOTE_INBOX_SQL_V25,
  createTrustedPartyClaimQuoteRepositoryV25,
} from '../party-event-reward-claim-v25';
import {partyEventRewardBundle}
  from '../../src/server/party/weekly-party-rewards-v2';
import {
  preparePrivatePartyClaimQuoteV25,readPrivatePartyClaimQuoteInboxV25,
} from '../../src/server/party/weekly-party-reward-claim-v25';

function assert(ok:unknown,what:string):asserts ok{
  if(!ok)throw Error('party_event_v25_online: '+what);
}
const offer='33333333-3333-4333-8333-333333333333';
const account='11111111-1111-4111-8111-111111111111';
const character='22222222-2222-4222-8222-222222222222';
const quote=partyEventRewardBundle({
  difficulty:'standard',performanceBand:1,personalPoints:15,choice:'artisan',
});
const stored={
  replayed:false,offerId:offer,accountId:account,characterId:character,
  difficulty:'standard',quote,quoteHash:'a'.repeat(64),
  storageShapeVerified:true,inventoryCapacityVerified:false,
  claimEnabled:false,claimed:false,entitlementsCreated:false,
  economyApplied:false,inboxDelivered:false,
};
async function verify(){
  assert(PARTY_EVENT_CLAIM_SQL_V25_RELEASED===false,
    'private v25 SQL adapter not released');
  let readCalls=0,writeCalls=0;
  const repo=createTrustedPartyClaimQuoteRepositoryV25({
    queryOne:async(sql,params)=>{
      if(sql===PARTY_EVENT_PREPARE_CLAIM_QUOTE_SQL_V25){
        writeCalls++;
        assert(params.length===4&&params[0]===offer
          &&params[1]===account&&params[2]===character
          &&params[3]==='party-event-v25-quote:'+offer,
          'single parameterized quote SQL with frozen account/character');
        return {result:stored};
      }
      assert(sql===PARTY_EVENT_CLAIM_QUOTE_INBOX_SQL_V25
        &&params.length===1&&params[0]===account,
        'service-only Inbox must only request one trusted account');
      readCalls++;
      return {result:{
        claimsEnabled:false,economyApplied:false,entitlementsCreated:false,
        quoteCount:1,quotes:[{
          offerId:offer,characterId:character,
          eventStartsAt:'2026-11-09T00:00:00Z',
          rewardKind:'artisan',difficulty:'standard',rewardBand:1,
          quote,quoteHash:'a'.repeat(64),
          status:'blocked_economy_not_audited',
          claimable:false,claimed:false,inboxDelivered:false,
        }],
      }};
    },
  });
  const prepared=await preparePrivatePartyClaimQuoteV25({
    gateEnabled:true,offerId:offer,trustedAccountId:account,
    frozenCharacterId:character,repository:repo,
  });
  const inbox=await readPrivatePartyClaimQuoteInboxV25({
    gateEnabled:true,trustedAccountId:account,repository:repo,
  });
  assert(writeCalls===1&&readCalls===1
    &&prepared.claimEnabled===false
    &&prepared.economyApplied===false
    &&inbox.quotes[0]!.status==='blocked_economy_not_audited',
    'v25 private quote adapter must never grant rewards');
  const missing=createTrustedPartyClaimQuoteRepositoryV25({
    queryOne:async()=>null,
  });
  let failed=false;
  try{
    await preparePrivatePartyClaimQuoteV25({
      gateEnabled:true,offerId:offer,trustedAccountId:account,
      frozenCharacterId:character,repository:missing,
    });
  }catch(e){
    failed=String(e).includes('party_event_v25_missing_private_claim_quote');
  }
  assert(failed,'missing database row cannot be treated as successful claim');
  console.log('Party Events online v25: server-only parameterized quote and blocked claim Inbox validated');
}
void verify().catch(e=>{console.error(e);process.exitCode=1;});
