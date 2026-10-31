import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {gameplayHandler,GameplayError,type GameplayServices} from '../gameplay';
import {createCharacter,newGame} from '../../../apps/mobile/src/core/game';
import type {GameState} from '../../../apps/mobile/src/core/types';

/**
 * CI-only synthetic concurrency: no Supabase/production traffic.
 * The in-memory RPC imitates the optimistic, atomic commit and account-scoped
 * receipt contract. This cannot measure database locks or real network latency.
 */
async function main(){
 const epoch=Date.UTC(2026,9,31),accountCount=24,contenders=5,rounds=2;
 const sessions=new Map<string,{state:GameState;version:number;commits:number}>();
 const receipts=new Map<string,{requestHash:string;response:unknown}>();
 const observed:{read:number[];write:number[]}={read:[],write:[]};
 let conflicts=0,committed=0,replayed=0;
 for(let index=0;index<accountCount;index++){
  const id='load-account-'+index;
  const state=createCharacter(newGame(epoch),'IRONWARDEN','Load Character '+index);
  state.character!.gold=5000;state.bank.gold=500;
  sessions.set(id,{state,version:0,commits:0});
 }
 const services:GameplayServices={
  authenticate:async token=>sessions.has(token)?token:null,
  randomId:()=> '11111111-1111-4111-8111-111111111111',
  randomRoll:()=>0.5,
  rpc:async<T>(name:string,args:Record<string,unknown>):Promise<T>=>{
   const accountId=args.p_account_id as string;
   if(name==='record_online_command_outcome_server_v1'){
    if(args.p_outcome==='committed')committed++;
    if(args.p_outcome==='replayed')replayed++;
    if(args.p_outcome==='conflict')conflicts++;
    return null as T;
   }
   if(name==='record_player_activity_server_v1'||name==='guild_quest_record_contributions_v1')return null as T;
   const current=sessions.get(accountId);
   if(!current)throw new Error('account_not_found');
   if(name==='read_online_game_receipt_server_v1')return (receipts.get(accountId+':'+args.p_request_id)??null) as T;
   if(name==='load_online_game_server_v1')return {
    state:structuredClone(current.state),version:current.version,
    serverNow:epoch+1000,characterId:current.state.character?.id??null,
    walletGold:current.state.character?.gold??null,guildMember:false,communityProgress:{},
   } as T;
   if(name==='commit_online_game_guild_pve_v1'){
    // This synchronous compare-and-swap models the database RPC's transaction
    // boundary. A real database stress test is still separately required.
    if(current.version!==args.p_expected_version)throw new GameplayError('stale_state',409);
    const key=accountId+':'+args.p_request_id;
    const existing=receipts.get(key);
    if(existing){
     if(existing.requestHash!==args.p_request_hash)throw new GameplayError('idempotency_key_conflict',409);
     return existing.response as T;
    }
    const response=args.p_response as {state:GameState;version:number;accountId:string};
    assert.equal(response.accountId,accountId,'commit may never target a different account');
    assert.equal(response.version,current.version+1,'commits increment one server version');
    current.state=structuredClone(response.state);current.version=response.version;current.commits++;
    receipts.set(key,{requestHash:String(args.p_request_hash),response});
    return response as T;
   }
   throw new Error('unexpected_mock_rpc_'+name);
  },
 };
 const handle=gameplayHandler(services);
 async function send(accountId:string,method:'GET'|'POST',body?:unknown){
  const start=performance.now();
  const response=await handle(new Request('https://synthetic.invalid/gameplay',{
   method,headers:{authorization:'Bearer '+accountId,...(body?{'Content-Type':'application/json'}:{})},
   body:body?JSON.stringify(body):undefined,
  }));
  observed[method==='GET'?'read':'write'].push(performance.now()-start);
  return response;
 }
 const percentiles=(values:number[])=>{
  const sorted=[...values].sort((a,b)=>a-b);
  const p=(fraction:number)=>Math.round((sorted[Math.max(0,Math.ceil(fraction*sorted.length)-1)]??0)*100)/100;
  return {count:sorted.length,p50Ms:p(.5),p95Ms:p(.95)};
 };
 for(let round=0;round<rounds;round++){
  const outcomes=await Promise.all([...sessions.keys()].map(async accountId=>{
   const state=sessions.get(accountId)!;
   const expected=state.version;
   const requests=Array.from({length:contenders},(_,index)=>({
    requestId:'synthetic-r'+round+'-a'+index,
    expectedVersion:expected,
    command:{type:'bank_gold_deposit',args:{amount:100+index}},
   }));
   const responses=await Promise.all(requests.map(body=>send(accountId,'POST',body)));
   const statuses=responses.map(row=>row.status);
   assert.equal(statuses.filter(status=>status===200).length,1,'one bank transfer must commit per account and round');
   assert.equal(statuses.filter(status=>status===409).length,contenders-1,'all competing stale versions are rejected');
   const winner=statuses.indexOf(200),accepted=requests[winner];
   assert.equal((await send(accountId,'POST',accepted)).status,200,'server receipt must replay');
   assert.equal((await send(accountId,'POST',{...accepted,command:{type:'bank_gold_withdraw',args:{amount:1}}})).status,409,'reusing a receipt with different content is rejected');
   assert.equal(state.version,round+1);
   assert.equal(state.commits,round+1,'one actual commit despite races and replays');
   assert.equal(state.state.character!.gold+(state.state.bank.gold??0),5500,'Gold conserved across all competing deposits');
   assert.ok(state.state.character!.gold>=0&&(state.state.bank.gold??0)>=0,'no negative balances');
   return [accountId,winner] as const;
  }));
  assert.equal(outcomes.length,accountCount);
  // Two readers per account, interleaved across all accounts. No state or
  // receipt is shared by a different account even when IDs match.
  const reads=await Promise.all([...sessions.keys()].flatMap(accountId=>[
   send(accountId,'GET'),send(accountId,'GET'),
  ]));
  for(let i=0;i<reads.length;i++){
   assert.equal(reads[i].status,200);
   const payload=await reads[i].json() as {accountId:string;version:number;state:GameState};
   const expected=[...sessions.keys()][Math.floor(i/2)];
   assert.equal(payload.accountId,expected,'GET cannot leak another account');
   assert.equal(payload.version,round+1);
   assert.equal(payload.state.character!.gold+(payload.state.bank.gold??0),5500);
  }
 }
 assert.equal(committed,accountCount*rounds,'exact count of real commits');
 assert.equal(replayed,accountCount*rounds,'each accepted operation has one successful receipt replay');
 assert.ok(conflicts>=accountCount*rounds*(contenders-1),'every losing version is fenced');
 assert.equal(receipts.size,accountCount*rounds,'one receipt per committed wallet mutation');
 const invalid=await handle(new Request('https://synthetic.invalid/gameplay',{
  method:'POST',headers:{authorization:'Bearer not-owned', 'Content-Type':'application/json'},
  body:JSON.stringify({requestId:'not-owned-001',expectedVersion:0,command:{type:'bank_gold_deposit',args:{amount:1}}}),
 }));
 assert.equal(invalid.status,401,'unowned bearer cannot access another account');
 console.log('PASS synthetic gameplay load: '+accountCount+' accounts × '+rounds+' rounds × '+contenders+' parallel contenders; '+committed+' Gold commits, '+replayed+' replays, '+conflicts+' fenced conflicts and scoped reads.');
 console.log('PROFILE synthetic in-process handler (NOT real DB/device/network): '+JSON.stringify({reads:percentiles(observed.read),writes:percentiles(observed.write),accounts:accountCount}));
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
