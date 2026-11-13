import {
  partyEventRewardBundle,type PartyEventCacheChoice,
} from '../weekly-party-rewards-v2';
import type {WeeklyPartyDifficulty} from '../weekly-party-events-v2';
import {
  PARTY_EVENT_REWARD_CLAIM_V25_RELEASED,
  preparePrivatePartyClaimQuoteV25,readPrivatePartyClaimQuoteInboxV25,
  type TrustedPartyRewardClaimQuoteRepositoryV25,
  type PartyRewardClaimQuoteV25,type PartyRewardQuoteInboxV25,
} from '../weekly-party-reward-claim-v25';
function assert(ok:unknown,label:string):asserts ok {
  if(!ok)throw Error('party_event_claim_v25_test: '+label);
}
async function rejects(op:()=>Promise<unknown>,part:string){
  try{await op();throw Error('unexpected_success');}
  catch(e){assert(String(e).includes(part),
    'expected '+part+' got '+String(e));}
}
const account='11111111-1111-4111-8111-111111111111';
const character='22222222-2222-4222-8222-222222222222';
const offer='33333333-3333-4333-8333-333333333333';
const expectedId='party-event-v25-quote:'+offer;
const difficulty:WeeklyPartyDifficulty='standard';
const quote=partyEventRewardBundle({
  difficulty,performanceBand:1,personalPoints:15,choice:'artisan',
});
const result:PartyRewardClaimQuoteV25={
  replayed:false,offerId:offer,accountId:account,characterId:character,
  difficulty,quote,quoteHash:'a'.repeat(64),
  storageShapeVerified:true,inventoryCapacityVerified:false,
  claimEnabled:false,claimed:false,entitlementsCreated:false,
  economyApplied:false,inboxDelivered:false,
};
const inbox:PartyRewardQuoteInboxV25={
  claimsEnabled:false,economyApplied:false,entitlementsCreated:false,
  quoteCount:1,quotes:[{
    offerId:offer,characterId:character,
    eventStartsAt:'2026-11-09T00:00:00Z',
    rewardKind:'artisan',difficulty,rewardBand:1,
    quote,quoteHash:'a'.repeat(64),
    status:'blocked_economy_not_audited',
    claimable:false,claimed:false,inboxDelivered:false,
  }],
};
assert(PARTY_EVENT_REWARD_CLAIM_V25_RELEASED===false,
  'v25 must remain disabled');
for(const d of ['standard','veteran','heroic'] as const){
 for(const band of [1,2,3,4,5,6]){
  for(const points of [5,14,15,60]){
   const choices:(PartyEventCacheChoice|undefined)[]=
    points<15?[undefined]:['warrior','artisan','companion'];
   for(const choice of choices){
    const reward=partyEventRewardBundle({
      difficulty:d,performanceBand:band,personalPoints:points,choice,
    });
    assert(reward.gold>=0&&reward.gold<=100000
      &&reward.partyRenown>=0&&reward.partyRenown<=14
      &&Object.values(reward.materials).every(n=>n>=0&&n<=10),
      'v25 quote canonical economy bounds');
   }
  }
 }
}
let reads=0,writes=0;
const repo:TrustedPartyRewardClaimQuoteRepositoryV25={
  prepareClaimQuote:async(offerId,accountId,characterId,requestId)=>{
    writes++;
    assert(offerId===offer&&accountId===account&&characterId===character
      &&requestId===expectedId,
      'never accept client-created quote identity or request ID');
    return {...result,replayed:writes>1};
  },
  readClaimQuoteInbox:async(accountId)=>{
    reads++;
    assert(accountId===account,'only authenticated account may see quote');
    return structuredClone(inbox);
  },
};
async function test(){
  await rejects(()=>preparePrivatePartyClaimQuoteV25({
    gateEnabled:false,offerId:offer,trustedAccountId:account,
    frozenCharacterId:character,repository:repo,
  }),'release_gate_disabled');
  await rejects(()=>readPrivatePartyClaimQuoteInboxV25({
    gateEnabled:false,trustedAccountId:account,repository:repo,
  }),'release_gate_disabled');
  await rejects(()=>preparePrivatePartyClaimQuoteV25({
    gateEnabled:true,offerId:'client-owned-id',trustedAccountId:account,
    frozenCharacterId:character,repository:repo,
  }),'invalid_quote_identity');
  assert(reads===0&&writes===0,'invalid requests never hit private SQL');
  const first=await preparePrivatePartyClaimQuoteV25({
    gateEnabled:true,offerId:offer,trustedAccountId:account,
    frozenCharacterId:character,repository:repo,
  });
  const retry=await preparePrivatePartyClaimQuoteV25({
    gateEnabled:true,offerId:offer,trustedAccountId:account,
    frozenCharacterId:character,repository:repo,
  });
  assert(first.replayed===false&&retry.replayed===true
    &&first.claimEnabled===false&&first.economyApplied===false
    &&first.inboxDelivered===false&&writes===2,
    'v25 quote retries are safe and never pay');
  const preview=await readPrivatePartyClaimQuoteInboxV25({
    gateEnabled:true,trustedAccountId:account,repository:repo,
  });
  assert(reads===1&&preview.quoteCount===1
    &&preview.quotes[0]!.claimable===false,
    'quote Inbox remains nonclaimable');
  const flagChanged:TrustedPartyRewardClaimQuoteRepositoryV25={
    ...repo,prepareClaimQuote:async()=>({
      ...result,economyApplied:true as unknown as false,
    }),
  };
  await rejects(()=>preparePrivatePartyClaimQuoteV25({
    gateEnabled:true,offerId:offer,trustedAccountId:account,
    frozenCharacterId:character,repository:flagChanged,
  }),'invalid_quote_receipt');
  const impersonated:TrustedPartyRewardClaimQuoteRepositoryV25={
    ...repo,prepareClaimQuote:async()=>({
      ...result,accountId:'44444444-4444-4444-8444-444444444444',
    }),
  };
  await rejects(()=>preparePrivatePartyClaimQuoteV25({
    gateEnabled:true,offerId:offer,trustedAccountId:account,
    frozenCharacterId:character,repository:impersonated,
  }),'invalid_quote_receipt');
  const alteredGold:TrustedPartyRewardClaimQuoteRepositoryV25={
    ...repo,prepareClaimQuote:async()=>({
      ...result,quote:{...quote,gold:quote.gold+1},
    }),
  };
  await rejects(()=>preparePrivatePartyClaimQuoteV25({
    gateEnabled:true,offerId:offer,trustedAccountId:account,
    frozenCharacterId:character,repository:alteredGold,
  }),'quote_model_mismatch');
  const alteredMaterial:TrustedPartyRewardClaimQuoteRepositoryV25={
    ...repo,prepareClaimQuote:async()=>({
      ...result,quote:{...quote,materials:{GEM_DUST:999}},
    }),
  };
  await rejects(()=>preparePrivatePartyClaimQuoteV25({
    gateEnabled:true,offerId:offer,trustedAccountId:account,
    frozenCharacterId:character,repository:alteredMaterial,
  }),'quote_model_mismatch');
  const leakedInbox:TrustedPartyRewardClaimQuoteRepositoryV25={
    ...repo,readClaimQuoteInbox:async()=>({
      ...inbox,quotes:[{
        ...inbox.quotes[0]!,claimed:true as unknown as false,
      }],
    }),
  };
  await rejects(()=>readPrivatePartyClaimQuoteInboxV25({
    gateEnabled:true,trustedAccountId:account,repository:leakedInbox,
  }),'invalid_quote_inbox_row');
  const wrongInbox:TrustedPartyRewardClaimQuoteRepositoryV25={
    ...repo,readClaimQuoteInbox:async()=>({
      ...inbox,quotes:[{
        ...inbox.quotes[0]!,quote:{...quote,skillXp:0},
      }],
    }),
  };
  await rejects(()=>readPrivatePartyClaimQuoteInboxV25({
    gateEnabled:true,trustedAccountId:account,repository:wrongInbox,
  }),'quote_model_mismatch');
  const participation=partyEventRewardBundle({
    difficulty:'heroic',performanceBand:6,personalPoints:5,
  });
  assert(participation.kind==='participation'
    &&participation.skillXp===0&&participation.partyRenown===0
    &&participation.gold===1377,
    'v25 participation quote expected gameplay scaling');
  console.log('Party reward v25: canonical 144 variants, no-claim account quotes, immutable identity, formula protection and fail-closed Inbox passed');
}
void test().catch(e=>{console.error(e);process.exitCode=1;});
