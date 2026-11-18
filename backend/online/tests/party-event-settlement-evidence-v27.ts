import {
  PARTY_EVENT_EVIDENCE_SQL_V27_RELEASED,
  PARTY_EVENT_EVIDENCE_SELECT_V27,
  createPrivatePartyEvidenceReaderV27,
} from '../party-event-settlement-evidence-v27';

function must(value:unknown,label:string):asserts value{
  if(!value)throw Error('party-v27-sql-test: '+label);
}
const offer='11111111-1111-4111-8111-111111111111';
const account='22222222-2222-4222-8222-222222222222';
const sql=PARTY_EVENT_EVIDENCE_SELECT_V27;
must(PARTY_EVENT_EVIDENCE_SQL_V27_RELEASED===false,'adapter is hidden');
must(sql.includes('where o.id=$1::uuid and o.account_id=$2::uuid'),
  'read must scope by trusted owner and offer');
must(sql.includes('private.party_event_claim_intents_v25')
 &&sql.includes('private.party_event_claim_preflights_v25')
 &&sql.includes('private.party_event_reward_claim_quotes_v25')
 &&sql.includes('private.party_event_boss_replay_attestations_v23'),
 'read must join all independent claim evidence');
must(sql.includes('public.online_game_states')
 &&sql.includes('public.characters')
 &&sql.includes('public.character_wallets'),
 'read must project all three live gold stores');
must(!/\b(insert|update|delete|grant|revoke|truncate)\s+(into|from|on|table)\b/i.test(sql),
 'SQL projection must not write or change grants');
let count=0;
const repo=createPrivatePartyEvidenceReaderV27({
 queryOne:async(query,params)=>{
   count++;
   must(query===sql&&params[0]===offer&&params[1]===account,
     'SQL parameters must be passed without interpolation');
   return count===1?{proof:{offerId:offer,accountId:account}}:null;
 },
});
async function test(){
 const proof=await repo.readEvidence(offer,account);
 must(proof.offerId===offer&&proof.accountId===account,
   'adapter returns private proof without claiming rewards');
 try{await repo.readEvidence(offer,account);throw Error('unexpected_success');}
 catch(e){must(String(e).includes('evidence_not_found'),
   'missing proof is rejected');}
 must(count===2,'only two owner-scoped reads');
 console.log('Party Events v27: readonly, account-scoped SQL binding, no claim/write, missing source fail-closed');
}
void test().catch(e=>{console.error(e);process.exitCode=1;});
