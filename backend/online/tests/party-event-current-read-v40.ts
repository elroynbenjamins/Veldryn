import {
 PARTY_EVENT_CURRENT_READ_V40_RELEASED,
 PARTY_EVENT_DAY8_READ_WINDOW_MS_V40,
 checkPartyEventCurrentStatusV40,
 createPartyEventCurrentStatusReaderV40,
} from '../party-event-current-read-v40';
import type {PartyEventReadOnlyStatusV33} from '../party-event-readonly-status-v33';

function check(x:unknown,name:string):asserts x {
 if(!x)throw Error('party_event_v40_test_'+name);
}
const start='2026-11-09T00:00:00.000Z';
const end='2026-11-16T00:00:00.000Z';
const now=Date.parse('2026-11-11T12:00:00Z');
const base:PartyEventReadOnlyStatusV33={
 schema:'party-event-readonly-status-v33',eventStartsAt:start,eventEndsAt:end,
 serverTime:new Date(now).toISOString(),family:'broken_caravan',
 variation:'bandits_crossing',difficulty:'standard',status:'active',stage:2,
 rosterSize:2,completedActions:['scout_route'],
 orders:[],votes:{stage2:null,stage3:null,myStage2Ballot:false,myStage3Ballot:false},
 canClaim:false,canContribute:false,canFight:false,
};
function rejected(value:unknown,clock:number,label:string){
 try{checkPartyEventCurrentStatusV40(value,clock);throw Error('unexpected_success');}
 catch(e){check(String(e).includes('party_event_v'),label);}
}
async function run(){
 check(PARTY_EVENT_CURRENT_READ_V40_RELEASED===false,'flag_off');
 check(PARTY_EVENT_DAY8_READ_WINDOW_MS_V40===86400000,'only_day8');
 check(checkPartyEventCurrentStatusV40(base,now)?.stage===2,'current_week');
 const staleDate=Date.parse('2026-11-30T12:00:00Z');
 check(checkPartyEventCurrentStatusV40({...base,serverTime:new Date(staleDate).toISOString()},staleDate)===null,'historical_week_hidden');
 const futureDate=Date.parse('2026-11-08T12:00:00Z');
 check(checkPartyEventCurrentStatusV40({...base,serverTime:new Date(futureDate).toISOString()},futureDate)===null,'future_week_hidden');
 const day8=Date.parse(end)+2*3600000;
 const settled={...base,status:'settled' as const,stage:3 as const,
  votes:{stage2:'safe_pass',stage3:'brace_wagons',myStage2Ballot:true,myStage3Ballot:true},
  serverTime:new Date(day8).toISOString()};
 check(checkPartyEventCurrentStatusV40(settled,day8)?.status==='settled','day8_results_readonly');
 const close={...settled,status:'closed' as const};
 check(checkPartyEventCurrentStatusV40(close,day8)?.status==='closed','unfinished_day8_readable');
 const after=Date.parse(end)+86400000;
 check(checkPartyEventCurrentStatusV40({...close,serverTime:new Date(after).toISOString()},after)===null,'no_expired_day8');
 rejected({...base,serverTime:new Date(now-120001).toISOString()},now,'stale_database_denied');
 rejected({...base,serverTime:new Date(now+30001).toISOString()},now,'future_database_denied');
 rejected({...base,status:'closed'},now,'early_closed_denied');
 rejected({...base,status:'settled',stage:3},now,'early_settled_denied');
 const expired=Date.parse(end)+500;
 rejected({...base,serverTime:new Date(expired).toISOString()},expired,'unclosed_week_denied');
 rejected({...settled,serverTime:new Date(expired).toISOString()},expired,'early_day8_settlement_denied');
 rejected({...base,canClaim:true},now,'forged_claim_denied');
 rejected({...base,eventEndsAt:'2026-11-15T00:00:00Z'},now,'wrong_week_denied');
 rejected(base,Number.NaN,'untrusted_clock_denied');
 // All accepted status fixtures must correspond to the canonical event cycle.
 const week=7*86400000;
 for(const [index,family,variation] of [
  [0,'broken_caravan','bandits_crossing'],
  [1,'nightfall_hunt','moonfang_pack'],
  [2,'broken_wards','overgrown_runestones'],
  [3,'lost_reliquary','sunken_archive'],
  [4,'broken_caravan','fogbound_trail'],
 ] as const){
  const starts=Date.parse(start)+index*3*week;
  const ends=starts+week;
  const event={...base,family,variation,eventStartsAt:new Date(starts).toISOString(),
   eventEndsAt:new Date(ends).toISOString()};
  for(const at of [starts,ends-1]){
   check(checkPartyEventCurrentStatusV40({...event,serverTime:new Date(at).toISOString()},at)?.family===family,'cycle_boundary_'+index);
  }
  check(checkPartyEventCurrentStatusV40({...event,status:'closed',serverTime:new Date(ends).toISOString()},ends)?.status==='closed','day8_start_'+index);
  const settle=ends+3600000;
  check(checkPartyEventCurrentStatusV40({...event,status:'settled',stage:3,
   votes:{stage2:'safe_pass',stage3:'brace_wagons',myStage2Ballot:true,myStage3Ballot:true},
   serverTime:new Date(settle).toISOString()},settle)?.status==='settled','day8_settlement_'+index);
 }
 for(const shift of [86400000,week,2*week,-3*week]){
  const begins=Date.parse(start)+shift;
  const clock=begins+3600000;
  rejected({...base,eventStartsAt:new Date(begins).toISOString(),
   eventEndsAt:new Date(begins+week).toISOString(),
   serverTime:new Date(clock).toISOString()},clock,'noncanonical_cycle_'+shift);
 }
 rejected({...base,family:'nightfall_hunt',variation:'moonfang_pack'},now,'wrong_family');
 rejected({...base,variation:'moonfang_pack'},now,'wrong_family_variation');
 rejected({...base,variation:'unknown_variant'},now,'unknown_variation');
 let calls=0;
 const owner='11111111-1111-4111-8111-111111111111';
 const reader=createPartyEventCurrentStatusReaderV40({
  readForTrustedAccount:async id=>{
   calls++;check(id===owner,'server_owned_identity_preserved');return base;
  },
 },()=>now);
 check((await reader.readForTrustedAccount(owner))?.family==='broken_caravan','typed_reader');
 check(calls===1,'single_select_forwarded');
 console.log('PARTY_EVENTS_V40_CURRENT_OK: stale/week/Day8 guard, one trusted owner read, no writes');
}
void run().catch(e=>{console.error(e);process.exitCode=1});
