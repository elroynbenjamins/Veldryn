import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {OnlineQModeRuntime} from '../qmode-runtime';
import {generateCoopRouteGraph} from '../../src/server/expeditions/route-generation';
import {initialPersistentRunState} from '../../src/server/expeditions/node-resolution';
import {launchPlayer} from '../../src/server/combat/content/launch-combat';
import type {QModeRun} from '../../src/server/coop/qmode';

async function main(){
 const player=launchPlayer('Ironwarden',25),runId='00000000-0000-4000-8000-000000000001',accountId='controller';
 let graph=generateCoopRouteGraph('merchant-seed','EXP_001',runId,'content-v1','balance-v1');
 let merchant=graph.nodes.find(node=>node.kind==='merchant');
 for(let seed=1;!merchant&&seed<100;seed++){
  graph=generateCoopRouteGraph('merchant-seed','EXP_001',runId+'-'+seed,'content-v1','balance-v1');
  merchant=graph.nodes.find(node=>node.kind==='merchant');
 }
 if(!merchant)throw new Error('merchant_fixture_missing');
 const merchantNode=merchant;
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
 console.log('PASS QMode Merchant: server-owned offer, funds, actor, receipt replay and changed-intent conflict');
}
void main();
