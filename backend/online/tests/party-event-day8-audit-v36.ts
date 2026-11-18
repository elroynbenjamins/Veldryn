import {auditPartyEventDay8ReadinessV36,
 PARTY_EVENT_DAY8_V36_PAYOUT_RELEASED,settlePartyEventDay8V36,
 type PartyEventDay8AuditInputV36} from '../party-event-day8-audit-v36';
function must(v:unknown,label:string):asserts v{
 if(!v)throw Error('party_event_v36_test_'+label);
}
const account='11111111-1111-4111-8111-111111111111';
const offer='22222222-2222-4222-8222-222222222222';
const party='33333333-3333-4333-8333-333333333333';
const character='44444444-4444-4444-8444-444444444444';
const starts='2026-11-09T00:00:00Z';
const ends='2026-11-16T00:00:00Z';
const hash='a'.repeat(64);
const orders:PartyEventDay8AuditInputV36['snapshot']['orders']=
 ([1,2,3] as const).flatMap(stage=>(['wood','ore','herb'] as const)
  .map(category=>({
    stage,itemId:category+'_ITEM',category,kind:'required' as const,
    target:15,donated:15,
  })));
const base:PartyEventDay8AuditInputV36={
 trustedAccountId:account,
 snapshot:{
  schema:'party-event-readonly-status-v33',
  eventStartsAt:starts,eventEndsAt:ends,serverTime:'2026-11-16T02:00:00Z',
  family:'broken_caravan',variation:'bandits_crossing',
  difficulty:'standard',status:'closed',stage:3,rosterSize:4,
  completedActions:['scout_route','secure_approach','support_expedition','prepare_finale'],
  orders,
  votes:{stage2:'safe_pass',stage3:'brace_wagons',
    myStage2Ballot:true,myStage3Ballot:true},
  canClaim:false,canContribute:false,canFight:false,
 },
 evidence:{
  trustedAccountId:account,offerId:offer,partyId:party,
  eventStartsAt:starts,frozenCharacterId:character,quoteHash:hash,
  onlineRevision:12,evidenceReconciled:true,payoutEnabled:false,
  claimed:false,economyApplied:false,inboxDelivered:false,
 },
 locked:{
  accountId:account,offerId:offer,partyId:party,
  eventStartsAt:starts,frozenCharacterId:character,
  quoteHash:hash,onlineRevision:12,walletGold:5000,characterGold:5000,
  previewOnly:true,paid:false,locksHeld:false,
  requiresRevalidationInsidePaymentTransaction:true,
 },
 recovery:{
  status:'not_recorded',accountId:account,offerId:offer,
  retryAuthorized:false,clientSuccessAllowed:false,
  economyIndependentlyVerified:false,payoutWriterReleased:false,
  inspectionOnly:true,
 },
 schema:{ready:true,missingOrMismatched:[],unsafeGrants:[],rolloutApproved:false},
};
function denies(value:PartyEventDay8AuditInputV36,expected:string){
 const result=auditPartyEventDay8ReadinessV36(value);
 must(!result.previewEvidenceCoherent&&result.issues.includes(expected),
  'failure_'+expected);
 must(result.canGrant===false&&result.payoutAuthorized===false
  &&result.claimReady===false,'no_payout_even_when_rejected');
}
async function run(){
 must(PARTY_EVENT_DAY8_V36_PAYOUT_RELEASED===false,'release_off');
 const valid=auditPartyEventDay8ReadinessV36(base);
 must(valid.previewEvidenceCoherent===true&&valid.issues.length===0,
  'coherent_dry_run_inputs');
 must(valid.canGrant===false&&valid.payoutAuthorized===false
  &&valid.claimReady===false&&valid.readOnly===true
  &&valid.requiresAtomicWriter===true,'never_a_paid_claim');
 denies({...base,trustedAccountId:character},'identity_or_offer_mismatch');
 denies({...base,evidence:{...base.evidence,onlineRevision:13}},
  'revision_quote_or_gold_mismatch');
 denies({...base,locked:{...base.locked,quoteHash:'f'.repeat(64)}},
  'revision_quote_or_gold_mismatch');
 denies({...base,locked:{...base.locked,locksHeld:true} as unknown as typeof base.locked},
  'stale_or_privileged_locked_snapshot');
 denies({...base,recovery:{...base.recovery,status:'paired_receipt_present'}},
  'receipt_already_present_or_untrusted');
 denies({...base,snapshot:{...base.snapshot,status:'active'}},
  'event_not_final');
 denies({...base,snapshot:{...base.snapshot,serverTime:ends}},
  'settlement_window_not_open');
 denies({...base,snapshot:{...base.snapshot,votes:{...base.snapshot.votes,stage3:null}}},
  'final_ballots_not_locked');
 denies({...base,snapshot:{...base.snapshot,orders:orders.map((o,i)=>
  i===0?{...o,donated:o.target-1}:o)}},
  'stage_1_supplies_not_verified');
 denies({...base,snapshot:{...base.snapshot,orders:orders.filter(o=>o.stage!==3)}},
  'stage_3_supplies_not_verified');
 denies({...base,schema:{...base.schema,ready:false}},
  'private_schema_not_verified');
 denies({...base,schema:{...base.schema,unsafeGrants:['anon_execute']}},
  'private_schema_not_verified');
 denies({...base,evidence:{...base.evidence,payoutEnabled:true} as unknown as typeof base.evidence},
  'reward_evidence_inconsistent');
 denies({...base,snapshot:{...base.snapshot,eventStartsAt:'2026-11-02T00:00:00Z'}},
  'event_window_identity_mismatch');
 denies({...base,snapshot:null as unknown as typeof base.snapshot},
  'invalid_event_snapshot');
 try{await settlePartyEventDay8V36();throw Error('unexpected_payout');}
 catch(e){must(String(e).includes('atomic_settlement_unreleased'),
  'explicitly_blocked_live_writer');}
 console.log('PARTY_EVENTS_V36_DAY8_OK: 15 negative cases, full-stage supplies, votes, account/revision/receipt gates; zero payout');
}
void run().catch(e=>{console.error(e);process.exitCode=1;});
