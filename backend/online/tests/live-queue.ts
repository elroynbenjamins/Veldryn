import assert from 'node:assert/strict';
import {createCharacter,newGame} from '../../../apps/mobile/src/core/game';
import {noviceItemId,noviceSetFor} from '../../../apps/mobile/src/content/novice-sets';
import {coopHandler} from '../coop';
import {GameplayError} from '../gameplay';

async function main(){
 const account='11111111-1111-4111-8111-111111111111',ticket='22222222-2222-4222-8222-222222222222';
 const state=createCharacter(newGame(0),'IRONWARDEN','Live Tank');state.character!.level=25;
 state.character!.equipment=Object.fromEntries(noviceSetFor('IRONWARDEN').slots.map(slot=>[slot,noviceItemId('IRONWARDEN',slot)]));
 const calls:Array<{name:string;args:Record<string,unknown>}>=[];
 let prior:{requestHash:string;response:unknown}|null=null,version=7,receiptOnSecondRead=false,reads=0;
 const handler=coopHandler({authenticate:async token=>token==='valid'?account:null,randomId:()=>ticket,randomRoll:()=>0,
  rpc:async<T>(name:string,args:Record<string,unknown>):Promise<T>=>{
   calls.push({name,args});
   if(name==='read_online_coop_receipt_server_v1'){reads++;return (receiptOnSecondRead&&reads===1?null:prior) as T;}
   if(name==='load_online_game_server_v1')return {state,version} as T;
   if(name==='join_online_live_queue_server_v1'){
    prior={requestHash:args.p_request_hash as string,response:{ticket:{ticketId:ticket,status:'queued'}}};return prior.response as T;
   }
   if(name==='online_live_queue_state_server_v1')return {ticket:null} as T;
   if(name==='online_live_candidates_server_v1')return {tickets:[],requiredTicketIds:[],refillId:null,serverNow:0} as T;
   if(name==='online_live_quick_match_demand_server_v1')return {serverNow:1000,demands:[{expeditionId:'EXP_001',tank:0,damage:2,support:1,oldestQueuedAtMs:0},{expeditionId:'EXP_002',tank:0,damage:0,support:0,oldestQueuedAtMs:0}]} as T;
   if(name==='command_online_live_queue_server_v1'){
    if(args.p_ticket_id!==ticket)throw new GameplayError('ticket_not_owned',403);
    return {ticketId:ticket,status:args.p_action==='cancel'?'cancelled':'queued'} as T;
   }
   throw new Error('unexpected_rpc:'+name);
  }});
 const request=(path:string,body?:unknown,token='valid')=>new Request('https://test.invalid/coop/'+path,{method:body===undefined?'GET':'POST',headers:{authorization:'Bearer '+token},body:body===undefined?undefined:JSON.stringify(body)});
 const body={requestId:'live-start-001',dungeonId:'EXP_001',tier:5,characterId:state.character!.id,loadoutId:'current',loadoutRevision:7};
 assert.equal((await handler(request('queue',body,'bad'))).status,401);assert.equal(calls.length,0);
 for(const extra of [{accountId:'other'},{role:'support'},{stats:{}},{normalizedReadiness:999},{now:999},{serviceRegion:'other'},{echoAllowed:true}])assert.equal((await handler(request('queue',{...body,...extra}))).status,400);
 assert.equal(calls.length,0);
 assert.equal((await handler(request('queue',{...body,dungeonId:'EXP_005'}))).status,400);
 assert.equal((await handler(request('queue',{...body,characterId:'other'}))).status,403);
 assert.equal((await handler(request('queue',{...body,loadoutRevision:6}))).status,409);
 const quick={requestId:'quick-start-001',characterId:state.character!.id,loadoutId:'current',loadoutRevision:7};
 const quickResponse=await handler(request('quick-queue',quick));assert.equal(quickResponse.status,200);
 const quickWrite=calls.filter(row=>row.name==='join_online_live_queue_server_v1').at(-1)!;
 assert.equal(quickWrite.args.p_expedition_id,'EXP_001','Quick Match should send the Tank to the nearly complete dungeon pool');
 assert.equal(quickWrite.args.p_tier,3,'Quick Match still stores the authoritative maximum eligible tier');
 prior=null;reads=0;calls.length=0;
 const first=await handler(request('queue',body));assert.equal(first.status,200);
 const write=calls.find(row=>row.name==='join_online_live_queue_server_v1')!;
 const frozen=write.args.p_snapshot as {accountId:string;readiness:{role:string;ready:boolean}};
 assert.equal(frozen.accountId,account);assert.equal(frozen.readiness.role,'tank');assert.equal(frozen.readiness.ready,true);
 assert.equal(write.args.p_game_version,7);assert.equal(write.args.p_ticket_id,ticket);assert.equal(write.args.p_tier,3,'live queue must ignore the requested tier and store the server-derived maximum eligible tier');
 version=8;
 assert.deepEqual(await (await handler(request('queue',body))).json(),await first.json(),'uncertain join replays after gameplay advances');
 receiptOnSecondRead=true;reads=0;
 assert.equal((await handler(request('queue',body))).status,200,'concurrent commit visible after stale load');
 receiptOnSecondRead=false;
 assert.equal((await handler(request('queue',{...body,tier:2}))).status,409);
 assert.equal((await handler(request('queue'))).status,200);
 assert.equal((await handler(request('queue/'+ticket+'/heartbeat',{requestId:'heartbeat-001',now:1}))).status,400);
 assert.equal((await handler(request('queue/'+ticket+'/heartbeat',{requestId:'heartbeat-001'}))).status,200);
 assert.equal((await handler(request('queue/'+account+'/cancel',{requestId:'cancel-001'}))).status,403);
 assert.equal((await handler(request('queue/'+ticket+'/cancel',{requestId:'cancel-001'}))).status,200);
 assert.equal((await handler(request('queue/'+ticket+'/cancel'))).status,405);
 assert.equal(calls.filter(row=>row.name==='join_online_live_queue_server_v1').length,1);
 console.log('PASS Live queue authentication, server-derived role/equipment, ownership, content gates, replay/race/conflict, status, heartbeat and cancellation boundary');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
