import assert from 'node:assert/strict';
import {
  MARKET_EDGE_TRANSPORT_RELEASED,
  createHiddenMarketHandler,
} from '../market-auth-boundary';
import {
  executeAuthenticatedMarketReadV25,
  type MarketBrowseOperation,
  type MarketReadServices,
} from '../market-read-gateway-v25';

const owner='10000000-0000-4000-8000-000000000001';
const stranger='10000000-0000-4000-8000-000000000002';
let authCalls=0,readCalls=0,limitCalls=0;
let inboxActor:string|null=null;
let browsed:MarketBrowseOperation|null=null;
let throttle=false,unavailable=false;
const services:MarketReadServices={
  authenticate:async token=>{
    authCalls++;
    return token==='owner-token'?owner:token==='stranger-token'?stranger:null;
  },
  allowRead:async(actor,kind)=>{
    limitCalls++;
    assert([owner,stranger].includes(actor));
    assert(['inbox','browse'].includes(kind));
    return !throttle;
  },
  readBrowse:async filters=>{
    readCalls++;browsed=filters;
    if(unavailable)throw new Error('private SQL stack / secret failure');
    return {
      total:3,offset:filters.offset,limit:filters.limit,hasMore:true,
      entries:[{
        offerId:'20000000-0000-4000-8000-000000000001',
        sourceKind:'resale',itemId:'IRON_SWORD',assetKind:'equipment',
        quantity:1,unitGold:125,totalGold:125,
        sellerAccountId:stranger,secretReceipt:{sourceHoldId:'never-expose'},
      }],
      sellerAccountId:stranger,privateDebug:'never-expose',
    };
  },
  readInbox:async(actor,history,offset)=>{
    readCalls++;inboxActor=actor;
    assert.equal(history,true);assert.equal(offset,0);
    if(unavailable)throw new Error('private table name leak');
    return {
      entries:[{id:'purchase:entry',kind:'purchased',itemId:'IRON_SWORD',
        assetKind:'equipment',quantity:1,goldChange:-125,status:'ready',
        createdAt:'2026-11-15T10:00:00Z',
        privateReceipt:{sellerAccountId:stranger},ownerAccountId:stranger}],
      pendingCount:1,total:1,ownerAccountId:actor,
    };
  },
};
const base='https://example.invalid/functions/v1/gameplay?view=market';
const request=(suffix:string,token='owner-token',method:'GET'|'POST'='GET',body?:unknown)=>
  new Request(base+'&'+suffix,{method,
    headers:{authorization:'Bearer '+token,'Content-Type':'application/json'},
    ...(method==='POST'?{body:JSON.stringify(body)}:{})});
const run=async(req:Request)=>executeAuthenticatedMarketReadV25(req,services);

async function main(){
  assert.equal(MARKET_EDGE_TRANSPORT_RELEASED,false);
  const hidden=createHiddenMarketHandler(services);
  assert.equal((await hidden(request('action=browse'))).status,404);
  assert.equal(authCalls,0,'production release gate must not authenticate');

  const browse=await run(request(
    'action=browse&kind=equipment&itemId=IRON_SWORD&sort=price_desc'
    +'&minGold=100&maxGold=200&limit=2&offset=1'));
  assert.equal(browse.status,200);
  assert.equal(browse.headers.get('Vary'),'Authorization');
  assert.equal(browse.headers.get('Cache-Control'),'private, no-store');
  assert.deepEqual(browsed,{
    kind:'browse',assetKind:'equipment',itemId:'IRON_SWORD',
    search:null,sort:'price_desc',minTotalGold:100,maxTotalGold:200,
    limit:2,offset:1,
  });
  const browseBody=await browse.json();
  assert.deepEqual(Object.keys(browseBody).sort(),
    ['entries','total','offset','limit','hasMore'].sort());
  assert.equal(browseBody.entries[0].sellerAccountId,undefined);
  assert.equal(browseBody.entries[0].secretReceipt,undefined);
  assert.equal(browseBody.privateDebug,undefined);
  assert.equal(browseBody.entries[0].unitGold,125);

  const inbox=await run(request('action=inbox&history=true','stranger-token'));
  assert.equal(inbox.status,200);
  assert.equal(inboxActor,stranger,'the Inbox actor must be derived from Auth');
  const inboxBody=await inbox.json();
  assert.equal(inboxBody.entries.length,1);
  assert.equal(inboxBody.entries[0].ownerAccountId,undefined);
  assert.equal(inboxBody.entries[0].privateReceipt,undefined);
  assert.equal(inboxBody.ownerAccountId,undefined);
  assert.equal(inboxBody.pendingCount,1);

  const before=readCalls;
  for(const suffix of [
    'action=browse&sellerAccountId='+owner,
    'action=browse&accountId='+owner,
    'action=inbox&accountId='+owner,
    'action=browse&minGold=200&maxGold=100',
    'action=browse&limit=51',
    'action=browse&offset=1001',
    'action=browse&kind=gem',
    'action=browse&sort=invalid',
    'action=browse&itemId=!',
    'action=browse&search=%3Cscript%3E',
    'action=browse&limit=2&limit=3',
  ]){
    const invalid=await run(request(suffix));
    assert.equal(invalid.status,400,suffix);
  }
  assert.equal(readCalls,before,'invalid input must not reach a database');
  assert.equal((await run(request('action=browse','bad-token'))).status,401);
  assert.equal((await run(new Request(base+'&action=browse'))).status,401);

  const unsupported=await run(request('action=cancel','owner-token','POST',{
    offerId:'20000000-0000-4000-8000-000000000001',
    requestKey:'cancel-only-123',
  }));
  assert.equal(unsupported.status,404,'no writer is reachable through read adapter');
  assert.equal(readCalls,before);

  throttle=true;
  const throttled=await run(request('action=browse'));
  assert.equal(throttled.status,429);
  assert.equal(readCalls,before,'throttled request must not read DB');
  throttle=false;

  unavailable=true;
  const failed=await run(request('action=browse'));
  assert.equal(failed.status,503);
  assert.deepEqual(await failed.json(),{error:'market_unavailable'});
  assert(readCalls>before);
  assert(limitCalls>=3);
  console.log('PASS: Market V25 authenticated read gateway projects only public fields; no write, spoofing, bypass or schema leaks');
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
