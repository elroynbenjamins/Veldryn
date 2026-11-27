import assert from 'node:assert/strict';
import {executeAuthenticatedMarketReadV25} from '../market-read-gateway-v25';
import {createMarketSqlReadServicesV26} from '../market-sql-reader-v26';

const actor='10000000-0000-4000-8000-000000000001';
const other='10000000-0000-4000-8000-000000000002';
const endpoint='https://test.supabase.co';
const calls:Array<{url:string;init:RequestInit;payload:Record<string,unknown>|null}>=[];
let sqlError:string|null=null;
let sessionValid=true;
const fakeFetch:typeof fetch=async(input,init)=>{
  const url=String(input);
  const payload=init?.body?JSON.parse(String(init.body)) as Record<string,unknown>:null;
  calls.push({url,init:init??{},payload});
  if(url===endpoint+'/auth/v1/user')
    return new Response(sessionValid?JSON.stringify({id:actor}):'{}',
      {status:sessionValid?200:401});
  assert.equal(url,endpoint+'/rest/v1/rpc/market_read_gateway_v26');
  if(sqlError)return new Response(JSON.stringify({message:sqlError,
      code:'P0001',privateData:'secret'}),{status:400});
  if(payload?.p_action==='browse')
    return new Response(JSON.stringify({
      entries:[],total:0,offset:payload.p_offset,limit:payload.p_limit,
      hasMore:false,debugPrivate:'not-returned',
    }),{status:200});
  if(payload?.p_action==='inbox')
    return new Response(JSON.stringify({entries:[],total:0,pendingCount:0}),
      {status:200});
  return new Response('{}',{status:500});
};
function incoming(action:string,token='real-jwt',method:'GET'|'POST'='GET',body?:unknown){
  return new Request('https://example.invalid/functions/v1/gameplay?view=market&'+action,{
    method,headers:{Authorization:token?'Bearer '+token:'',
      'Content-Type':'application/json'},
    ...(method==='POST'?{body:JSON.stringify(body)}:{}),
  });
}
const run=async(request:Request)=>{
  const services=createMarketSqlReadServicesV26(request,{
    supabaseUrl:endpoint+'/',anonKey:'publishable-test-only',
    fetchImpl:fakeFetch,
  });
  return executeAuthenticatedMarketReadV25(request,services);
};
async function main(){
  const browse=await run(incoming('action=browse&kind=resource&limit=12&offset=3'
    +'&minGold=20&maxGold=90&sort=newest&search=ORE'));
  assert.equal(browse.status,200);
  assert.deepEqual(await browse.json(),{
    entries:[],total:0,offset:3,limit:12,hasMore:false,
  });
  const req=calls.at(-1)!;
  assert.equal(req.url,endpoint+'/rest/v1/rpc/market_read_gateway_v26');
  assert.equal((req.init.headers as Record<string,string>).Authorization,'Bearer real-jwt');
  assert.equal((req.init.headers as Record<string,string>).apikey,'publishable-test-only');
  assert.deepEqual(req.payload,{
    p_action:'browse',p_kind:'resource',p_item_id:null,p_search:'ORE',
    p_sort:'newest',p_min_total_gold:20,p_max_total_gold:90,
    p_limit:12,p_offset:3,
  });
  assert.equal(Object.hasOwn(req.payload??{},'p_account_id'),false,'no caller-supplied actor');
  assert.equal(Object.hasOwn(req.payload??{},'sellerAccountId'),false);
  assert.equal(Object.hasOwn(req.payload??{},'serviceKey'),false);
  assert.equal((req.init.headers as Record<string,string>)['Accept-Profile'],undefined);

  const inbox=await run(incoming('action=inbox&history=true'));
  assert.equal(inbox.status,200);
  assert.deepEqual(calls.at(-1)!.payload,{
    p_action:'inbox',p_history:true,p_offset:0,
  });
  assert.equal(calls.at(-1)!.payload?.p_account_id,undefined);

  const before=calls.length;
  const spoof=await run(incoming('action=inbox&accountId='+other));
  assert.equal(spoof.status,400);
  assert.equal(calls.length,before+1,'auth may be checked, never send SQL on spoof');
  const badRead=await run(incoming('action=browse&kind=illegal'));
  assert.equal(badRead.status,400);
  assert(!calls.slice(before).some(call=>call.url.includes('/rest/v1/rpc/')));

  sessionValid=false;
  const invalid=await run(incoming('action=inbox'));
  assert.equal(invalid.status,401);
  sessionValid=true;

  for(const [error,status,publicError] of [
    ['market_rate_limited',429,'market_rate_limited'],
    ['market_disabled',404,'not_found'],
    ['private_sql_record secret schema',503,'market_unavailable'],
  ] as const){
    sqlError=error;
    const response=await run(incoming('action=browse'));
    assert.equal(response.status,status);
    const body=await response.json();
    assert.deepEqual(body,{error:publicError});
    assert(!JSON.stringify(body).includes('secret'));
  }
  sqlError=null;
  const writes=await run(incoming('action=publish','real-jwt','POST',{
    holdId:'10000000-0000-4000-8000-000000000003',
    unitPrice:12,quantity:1,requestKey:'publish-123456',
  }));
  assert.equal(writes.status,404);
  assert.equal(calls.at(-1)!.url,endpoint+'/auth/v1/user',
    'unsupported writes must never reach SQL');

  console.log('PASS: V26 SQL adapter preserves user JWT, omits actor IDs, enforces filters, sanitizes failures, and never exposes Market writes');
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
