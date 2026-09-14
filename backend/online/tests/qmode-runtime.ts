import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {OnlineQModeRuntime} from '../qmode-runtime';

async function main(){
 const request={requestId:'concurrent-choice-01',decisionId:'entry',decisionRevision:1,optionId:'room-1'};
 const hash=createHash('sha256').update(JSON.stringify(request)).digest('hex');
 const saved={runId:'run',phase:'resolving_node',options:[],stateVersion:2};
 let reads=0;
 const runtime=new OnlineQModeRuntime({randomId:()=>{throw new Error('unexpected_random');},rpc:async<T>(name:string):Promise<T>=>{
  if(name==='read_online_coop_receipt_server_v1')return (++reads===1?null:{requestHash:hash,response:saved}) as T;
  if(name==='load_online_qmode_server_v1')return {privateState:{pending:{}}} as T;
  throw new Error('unexpected_mutation');
 }});
 assert.deepEqual(await runtime.choose('actor','run',request),saved);
 assert.equal(reads,2);
 await assert.rejects(()=>runtime.choose('actor','run',{...request,optionId:'changed'}),/idempotency_key_conflict/);
 console.log('PASS QMode concurrent receipt visibility and changed-intent conflict');
}
void main();
