import assert from 'node:assert/strict';
import {createHiddenMarketHandler} from '../market-auth-boundary';
import {executeMarketReceiptReview,type MarketReceiptReviewServices} from '../market-receipt-recovery-review';
const actor='10000000-0000-4000-8000-000000000001',foreign='10000000-0000-4000-8000-000000000002';
const key='request-key-1',receiptId='20000000-0000-4000-8000-000000000001';
let row:unknown={actorAccountId:actor,requestKey:key,status:'committed',operation:'buy',revision:4,receiptId,privateMint:{secret:true}};
let reads=0,auths=0,allow=true,throws=false;
const services:MarketReceiptReviewServices={
 authenticate:async token=>{auths++;return token==='valid'?actor:null;},
 allowReceiptRead:async a=>{assert.equal(a,actor);return allow;},
 readCommittedReceipt:async(a,k)=>{reads++;assert.equal(a,actor);assert.equal(k,key);if(throws)throw Error('private SQL failure');return row;}
};
const req=(body:unknown={requestKey:key},token='valid',action='receipt_status')=>new Request('https://example.invalid/gameplay?view=market&action='+action,{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(body)});
async function main(){
 assert.equal((await createHiddenMarketHandler(services)(req())).status,404);assert.equal(auths,0);
 const good=await executeMarketReceiptReview(req(),services);
 assert.equal(good.status,200);assert.equal(good.headers.get('Cache-Control'),'private, no-store');
 assert.deepEqual(await good.json(),{status:'committed',requestKey:key,operation:'buy',revision:4,receiptId});
 row=null;assert.deepEqual(await (await executeMarketReceiptReview(req(),services)).json(),{status:'unknown',requestKey:key});
 for(const bad of [
  {actorAccountId:foreign,requestKey:key,status:'committed',operation:'buy',revision:4,receiptId},
  {actorAccountId:actor,requestKey:'other-key',status:'committed',operation:'buy',revision:4,receiptId},
  {actorAccountId:actor,requestKey:key,status:'pending',operation:'buy',revision:4,receiptId},
  {actorAccountId:actor,requestKey:key,status:'committed',operation:'buy',revision:4,receiptId:'bad'},
  {actorAccountId:actor,requestKey:key,status:'committed',operation:['buy'],revision:4,receiptId},
 ]){
  row=bad;assert.equal((await executeMarketReceiptReview(req(),services)).status,503);
 }
 const before=reads;
 assert.equal((await executeMarketReceiptReview(req({requestKey:key,actorAccountId:foreign}),services)).status,400);
 assert.equal((await executeMarketReceiptReview(req({requestKey:key},'invalid'),services)).status,401);
 assert.equal((await executeMarketReceiptReview(req({offerId:receiptId,requestKey:key},'valid','cancel'),services)).status,404);
 allow=false;assert.equal((await executeMarketReceiptReview(req(),services)).status,429);
 assert.equal(reads,before);
 allow=true;throws=true;const failure=await executeMarketReceiptReview(req(),services);
 assert.equal(failure.status,503);assert.deepEqual(await failure.json(),{error:'market_unavailable'});
 console.log('PASS: hidden receipt recovery account scope, unknown status, projection, throttling and no write');
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
