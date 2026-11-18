import {
 PARTY_EVENT_READ_ROUTE_V39_MOUNTED,createPrivatePartyEventReadHttpAdapterV39,
} from '../party-event-read-route-v39';
import type {PartyEventReadOnlyStatusV33} from '../party-event-readonly-status-v33';
const alice='11111111-1111-4111-8111-111111111111';
const bob='22222222-2222-4222-8222-222222222222';
const jwtA='eyJhbGciOiJub25lIn0.aaaaabbbbbccccddd.eeeeffff111222';
const jwtB='eyJhbGciOiJub25lIn0.bbbbbcccccddddeee.ffff1111222233';
function check(condition:unknown,why:string):asserts condition{
 if(!condition)throw Error('v39_http_test_'+why);
}
const status:PartyEventReadOnlyStatusV33={
 schema:'party-event-readonly-status-v33',
 eventStartsAt:'2026-11-16T00:00:00Z',eventEndsAt:'2026-11-23T00:00:00Z',
 serverTime:'2026-11-18T12:00:00Z',
 family:'nightfall_hunt',variation:'nightfall_woods',difficulty:'standard',
 status:'active',stage:2,rosterSize:3,
 completedActions:['scout_route','secure_approach'],orders:[],
 votes:{stage2:'cautious_route',stage3:null,myStage2Ballot:true,myStage3Ballot:false},
 canClaim:false,canContribute:false,canFight:false,
};
let authCalls=0,reads:string[]=[];
const adapter=createPrivatePartyEventReadHttpAdapterV39({
 auth:{getUser:async token=>{
  authCalls++;
  if(token===jwtA)return {data:{user:{id:alice}},error:null};
  if(token===jwtB)return {data:{user:{id:bob}},error:null};
  throw Error('private auth failure with sensitive details');
 }},
},{readForTrustedAccount:async account=>{reads.push(account);return account===alice?status:null;}},()=>Date.parse('2026-11-18T12:00:00Z'));
async function run(){
 check(PARTY_EVENT_READ_ROUTE_V39_MOUNTED===false,'unmounted');
 const method=await adapter.handle({method:'POST',authorization:'Bearer '+jwtA});
 check(method.status===405&&method.headers.Allow==='GET','strict_get');
 check(reads.length===0&&authCalls===0,'no_write_method_auth');
 const missing=await adapter.handle({method:'GET'});
 check(missing.status===401&&reads.length===0,'missing_auth_rejected');
 const attacker=await adapter.handle({method:'GET',authorization:'Bearer '+jwtA+'\nX-Account: '+bob});
 check(attacker.status===401&&reads.length===0,'header_smuggling_rejected');
 const owner=await adapter.handle({method:'GET',authorization:'Bearer '+jwtA});
 check(owner.status===200&&'event' in owner.body&&owner.body.event?.family==='nightfall_hunt','owner_scoped_status');
 check(owner.headers['Cache-Control']==='private, no-store'&&owner.headers.Vary==='Authorization'
  &&owner.headers['X-Content-Type-Options']==='nosniff','strict_cache_and_type');
 check('event' in owner.body&&owner.body.claimsEnabled===false
  &&owner.body.donationsEnabled===false&&owner.body.combatEnabled===false,'no_write_unlock');
 const other=await adapter.handle({method:'GET',authorization:'Bearer '+jwtB});
 check(other.status===200&&'event' in other.body&&other.body.event===null,'other_account_empty');
 check(reads.join('|')===alice+'|'+bob&&authCalls===2,'fresh_auth_per_request');
 const reject=await adapter.handle({method:'GET',authorization:'Bearer invalid-invalid-invalid'});
 check(reject.status===401&&JSON.stringify(reject).indexOf('sensitive')<0,'safe_auth_error');
 const backend=createPrivatePartyEventReadHttpAdapterV39({
  auth:{getUser:async()=>({data:{user:{id:alice}},error:null})},
 },{readForTrustedAccount:async()=>{throw Error('private SQL customer secret');}},()=>Date.parse('2026-11-18T12:00:00Z'));
 const outage=await backend.handle({method:'GET',authorization:'Bearer '+jwtA});
 check(outage.status===503&&!JSON.stringify(outage).includes('customer secret'),'sql_error_sanitized');
 check(outage.headers['Cache-Control']==='private, no-store','error_never_cached');

 const stale=createPrivatePartyEventReadHttpAdapterV39({
  auth:{getUser:async()=>({data:{user:{id:alice}},error:null})},
 },{readForTrustedAccount:async()=>({
  ...status,serverTime:'2026-12-01T12:00:00Z'
 })},()=>Date.parse('2026-12-01T12:00:00Z'));
 const old=await stale.handle({method:'GET',authorization:'Bearer '+jwtA});
 check(old.status===200&&'event' in old.body&&old.body.event===null,
  'old_week_not_exposed_as_current');
 const inconsistent=createPrivatePartyEventReadHttpAdapterV39({
  auth:{getUser:async()=>({data:{user:{id:alice}},error:null})},
 },{readForTrustedAccount:async()=>({...status,status:'settled'})},
 ()=>Date.parse('2026-11-18T12:00:00Z'));
 const malformed=await inconsistent.handle({method:'GET',authorization:'Bearer '+jwtA});
 check(malformed.status===503,'premature_settlement_rejected');

 console.log('PARTY_EVENTS_V39_HTTP_OK: GET only, remote auth, owner isolation, no-store, sanitized errors, no writes');
}
void run().catch(e=>{console.error(e);process.exitCode=1});
