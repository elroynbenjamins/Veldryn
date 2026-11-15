import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {OnlineQModeRuntime} from '../qmode-runtime';
import {generateCoopRouteGraph} from '../../src/server/expeditions/route-generation';
import {initialPersistentRunState} from '../../src/server/expeditions/node-resolution';
import {launchPlayer} from '../../src/server/combat/content/launch-combat';
import type {QModeRun} from '../../src/server/coop/qmode';

async function main(){
 const player=launchPlayer('Ironwarden',25),runId='00000000-0000-4000-8000-000000000001',accountId='controller';
 // New dungeon routes must never generate a Merchant room.
 for(let seed=0;seed<25;seed++){
  const candidate=generateCoopRouteGraph('merchant-retirement','EXP_001',runId+'-'+seed,'content-v1','balance-v1');
  assert.ok(candidate.nodes.every(node=>node.kind!=='merchant'),'new Q-Mode routes must not sell Merchant offers');
 }
 // Reconstruct an *existing* historical Merchant node to keep old account
 // receipts and replay safety covered without introducing new Merchant rooms.
 const freshGraph=generateCoopRouteGraph('merchant-seed','EXP_001',runId,'content-v1','balance-v1');
 const historicalNode=freshGraph.nodes.find(node=>node.kind==='event')??freshGraph.nodes.find(node=>node.kind==='battle');
 if(!historicalNode)throw new Error('historical_room_fixture_missing');
 const graph={...freshGraph,nodes:freshGraph.nodes.map(node=>node.nodeId===historicalNode.nodeId?{...node,kind:'merchant' as const,contentId:'COOP_HISTORICAL_MERCHANT'}:node)};
 const merchantNode=graph.nodes.find(node=>node.kind==='merchant')!;
 const state={...initialPersistentRunState([player]),resources:5,visitedNodeIds:[merchantNode.nodeId]};
 const run:QModeRun={id:runId,requestId:'run-create-01',controllerAccountId:accountId,expeditionId:'EXP_001',tier:1,graph,currentNodeId:merchantNode.nodeId,phase:'awaiting_choice',players:[player],persistentState:state,echoSourceAccountIds:[]};
 const offerId=merchantNode.contentId+':boon',request={requestId:'merchant-purchase-001',expectedVersion:5,offerId};
 const hash=createHash('sha256').update(JSON.stringify(request)).digest('hex');
 let receipt:{requestHash:string;response:unknown}|null=null,commits=0,loads=0;
 const runtime=new OnlineQModeRuntime({randomId:()=>{throw new Error('unexpected_random');},rpc:async<T>(name:string,args:Record<string,unknown>):Promise<T>=>{
  if(name==='read_online_coop_receipt_server_v1')return receipt as T;
  if(name==='load_online_qmode_server_v1'){loads++;return {stateVersion:5,privateState:{run,seed:'merchant-seed'}} as T;}
  if(name==='purchase_online_qmode_merchant_server_v1'){
   commits++;
   assert.equal(args.p_offer_id,offerId);
   assert.equal(args.p_actor_id,player.id);
   assert.equal(args.p_expected_version,5);
   const client=args.p_client_projection as {merchantShop?:{resources:number;offers:Array<{id:string;purchased:boolean}>};lastRoomOutcome?:{kind:string;resourcesDelta:number;boonCount:number}};
   assert.equal(client.merchantShop?.resources,3);
   assert.equal(client.merchantShop?.offers.find(offer=>offer.id===offerId)?.purchased,true);
   assert.equal(client.lastRoomOutcome?.kind,'merchant_purchase');
   assert.equal(client.lastRoomOutcome?.resourcesDelta,-2);
   assert.equal(client.lastRoomOutcome?.boonCount,1);
   receipt={requestHash:hash,response:client};
   return client as T;
  }
  throw new Error('unexpected_rpc:'+name);
 }});
 const purchased=await runtime.purchaseMerchant(accountId,runId,request);
 assert.equal((purchased as {merchantShop?:{resources:number}}).merchantShop?.resources,3);
 assert.deepEqual(await runtime.purchaseMerchant(accountId,runId,request),purchased);
 assert.equal(commits,1);
 assert.equal(loads,1);
 await assert.rejects(()=>runtime.purchaseMerchant(accountId,runId,{...request,offerId:merchantNode.contentId+':artifact'}),/idempotency_key_conflict/);
 console.log('PASS Q-Mode: Merchant rooms retired for new runs; historical server receipts remain replay-safe');
}
void main();
