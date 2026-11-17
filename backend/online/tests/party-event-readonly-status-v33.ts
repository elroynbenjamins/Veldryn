import {
 PARTY_EVENT_READONLY_STATUS_V33_RELEASED,
 PARTY_EVENT_READONLY_STATUS_SQL_V33,
 createPrivatePartyStatusReaderV33,
 parsePartyEventReadOnlyStatusV33,
} from '../party-event-readonly-status-v33';
function must(value:unknown,label:string):asserts value{
 if(!value)throw Error('party_event_v33_test_'+label);
}
const account='22222222-2222-4222-8222-222222222222';
const base={
 schema:'party-event-readonly-status-v33',
 eventStartsAt:'2026-11-09T00:00:00Z',
 eventEndsAt:'2026-11-16T00:00:00Z',
 serverTime:'2026-11-10T18:00:00Z',
 family:'broken_caravan',variation:'bandits_crossing',
 difficulty:'standard',status:'active',stage:2,rosterSize:4,
 completedActions:['scout_route','secure_approach'],
 orders:[{stage:2,itemId:'IRON_ORE',category:'ore',kind:'required',target:15,donated:5}],
 votes:{stage2:'safe_pass',stage3:null,myStage2Ballot:true,myStage3Ballot:false},
 canClaim:false,canContribute:false,canFight:false,
};
const sql=PARTY_EVENT_READONLY_STATUS_SQL_V33;
must(PARTY_EVENT_READONLY_STATUS_V33_RELEASED===false,'hidden_flag');
must(sql.includes('where r.account_id=$1::uuid'),'trusted_account_scoping');
must(sql.includes('private.party_event_roster_v11')&&sql.includes('private.party_event_weeks_v11')
 &&sql.includes('private.party_event_supply_orders_v16')
 &&sql.includes('private.party_event_ballots_v17')
 &&sql.includes('private.party_event_receipts_v11'),'private_sources_only');
must(sql.includes('order by w.event_starts_at desc')&&sql.includes('limit 1'),'latest_unambiguous');
must(!/\b(insert|update|delete|truncate|grant|revoke|perform|call)\s+(into|from|on|table|private)\b/i.test(sql),
 'read_must_not_write');
must(!/\$2|auth\.users|public\.chat_messages/i.test(sql),'no_client_party_ids_or_other_scopes');
function deny(value:unknown,label:string){
 try{parsePartyEventReadOnlyStatusV33(value);throw Error('unexpected_acceptance');}
 catch(e){must(String(e).includes('party_event_v33_'),'reject_'+label);}
}
must(parsePartyEventReadOnlyStatusV33(base).rosterSize===4,'valid_4_member_party');
for(const p of [
 {...base,rosterSize:5}, {...base,stage:0}, {...base,canClaim:true},
 {...base,completedActions:['scout_route','scout_route']},
 {...base,completedActions:['client_grant']},
 {...base,orders:[{...base.orders[0],donated:16}]},
 {...base,orders:[base.orders[0],base.orders[0]]},
 {...base,votes:{...base.votes,stage3:'future_vote'}},
 {...base,eventEndsAt:'2026-11-15T00:00:00Z'},
 {...base,orders:[{...base.orders[0],category:'client_fake'}]},
])deny(p,'forged_or_inconsistent_status');
const validStageOne={...base,stage:1,completedActions:[],
 votes:{stage2:null,stage3:null,myStage2Ballot:false,myStage3Ballot:false}};
must(parsePartyEventReadOnlyStatusV33(validStageOne).stage===1,'stage_one_read');
async function run(){
 let queried=0;
 const reader=createPrivatePartyStatusReaderV33({
  queryOne:async(query,params)=>{
   queried++;
   must(query===sql&&params.length===1&&params[0]===account,'parameterized_account');
   return queried===1?{snapshot:base}:null;
  },
 });
 must((await reader.readForTrustedAccount(account))?.family==='broken_caravan','owner_snapshot');
 must(await reader.readForTrustedAccount(account)===null,'no_active_or_enrolled_week');
 try{await reader.readForTrustedAccount('untrusted_user');throw Error('unexpected_acceptance');}
 catch(e){must(String(e).includes('invalid_trusted_account'),'reject_invalid_account');}
 must(queried===2,'never_query_for_bad_account');
 console.log('PARTY_EVENTS_V33_READONLY_OK: owner scope, single MVCC select, strict source boundaries, 10 adversarial contracts, zero writes');
}
void run().catch(e=>{console.error(e);process.exitCode=1;});
