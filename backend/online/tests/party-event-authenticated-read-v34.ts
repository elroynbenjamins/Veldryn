import {
 PARTY_EVENT_AUTH_READ_V34_RELEASED,
 createPrivatePartyAuthenticatedReaderV34,
 type PartyEventTrustedStatusReaderV34,
} from '../party-event-authenticated-read-v34';
import type {PartyEventReadOnlyStatusV33} from '../party-event-readonly-status-v33';

function check(value:unknown,label:string):asserts value {
 if(!value)throw Error('party_event_v34_test_'+label);
}
const alpha='11111111-1111-4111-8111-111111111111';
const beta='22222222-2222-4222-8222-222222222222';
const tokenA='eyJhbGciOiJub25lIn0.aaaaabbbbbccccddd.eeeeffff111222';
const tokenB='eyJhbGciOiJub25lIn0.bbbbbcccccddddeee.ffff1111222233';
const header=(jwt:string)=>'Bearer '+jwt;
let verificationCount=0,reads:string[]=[];
const reader:PartyEventTrustedStatusReaderV34={
 readForTrustedAccount:async id=>{
  reads.push(id);
  return id===alpha?{
   schema:'party-event-readonly-status-v33',
   eventStartsAt:'2026-11-09T00:00:00Z',
   eventEndsAt:'2026-11-16T00:00:00Z',
   serverTime:'2026-11-10T00:00:00Z',
   family:'broken_caravan',variation:'bandits_crossing',
   difficulty:'standard',status:'active',stage:1,rosterSize:2,
   completedActions:[],orders:[],
   votes:{stage2:null,stage3:null,myStage2Ballot:false,myStage3Ballot:false},
   canClaim:false,canContribute:false,canFight:false,
  } satisfies PartyEventReadOnlyStatusV33:null;
 },
};
const service=createPrivatePartyAuthenticatedReaderV34({
 auth:{getUser:async token=>{
  verificationCount++;
  if(token===tokenA)return {data:{user:{id:alpha}},error:null};
  if(token===tokenB)return {data:{user:{id:beta}},error:null};
  return {data:null,error:new Error('expired_or_forged_jwt')};
 }},
},reader);
async function rejected(input:string|null|undefined){
 const before=reads.length;
 try{await service.readWithAuthorizationHeader(input);throw Error('unexpected_access');}
 catch(e){check(String(e).includes('party_event_v34_unauthorized'),
  'reject_missing_forged_or_expired_token');}
 check(reads.length===before,'no_private_read_before_auth');
}
async function test(){
 check(PARTY_EVENT_AUTH_READ_V34_RELEASED===false,'gate_remains_off');
 for(const bad of [null,undefined,'',alpha,header(alpha),'bearer '+tokenA,
  'Basic '+tokenA,header(tokenA)+'\nX-Account: '+beta,
  header(tokenA)+' '+beta,header('not_a_verified_token_aaaaaaaaa')]){
  await rejected(bad);
 }
 const first=await service.readWithAuthorizationHeader(header(tokenA));
 check(first.event?.family==='broken_caravan','verified_owner_a');
 check(first.kind==='party-event-authenticated-read-v34','typed_response');
 check(first.cachePolicy==='private, no-store','cache_must_be_disabled');
 check(first.claimsEnabled===false&&first.donationsEnabled===false
  &&first.combatEnabled===false,'no_write_permissions');
 const second=await service.readWithAuthorizationHeader(header(tokenB));
 check(second.event===null,'different_owner_no_data');
 check(reads[reads.length-1]===beta,'never_reuse_old_account');
 await service.readWithAuthorizationHeader(header(tokenA));
 check(reads.join('|')===[alpha,beta,alpha].join('|'),'account_switch_no_cache');
 check(verificationCount>=4,'every_authenticated_read_verifies_token');
 const remoteFail=createPrivatePartyAuthenticatedReaderV34({
  auth:{getUser:async()=>{throw Error('sensitive_token_do_not_leak');}},
 },reader);
 try{await remoteFail.readWithAuthorizationHeader(header(tokenA));throw Error('unexpected_access');}
 catch(e){check(String(e)==='Error: party_event_v34_unauthorized',
  'auth_failure_is_sanitized');}
 console.log('PARTY_EVENTS_V34_AUTH_OK: remote getUser each read, owner isolation, no auth header reflection, no store and zero writes');
}
void test().catch(e=>{console.error(e);process.exitCode=1;});
