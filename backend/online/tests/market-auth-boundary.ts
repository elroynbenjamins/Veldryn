import assert from 'node:assert/strict';
import {
  MARKET_EDGE_TRANSPORT_RELEASED,
  bindAuthenticatedMarketRequest,
  createHiddenMarketHandler,
  MarketRequestError,
} from '../market-auth-boundary';

const actor='00000000-0000-4000-8000-000000000002';
let authenticationCalls=0;
const services={
  authenticate:async(token:string)=>{
    authenticationCalls++;
    return token==='valid'?actor:null;
  },
};
const path='https://example.invalid/functions/v1/gameplay?view=market';
function req(action:string,method:'GET'|'POST',body?:unknown,token='valid'){
  return new Request(path+'&action='+action,{
    method,headers:{authorization:token?'Bearer '+token:'','content-type':'application/json'},
    ...(method==='POST'?{body:JSON.stringify(body)}:{}),
  });
}
async function denied(makeRequest:()=>Request,code:string){
  await assert.rejects(
    ()=>bindAuthenticatedMarketRequest(makeRequest(),services),
    (error:unknown)=>error instanceof MarketRequestError&&error.code===code,
    code,
  );
}

async function main(){
  assert.equal(MARKET_EDGE_TRANSPORT_RELEASED,false);
  const handler=createHiddenMarketHandler(services);
  for(const method of ['GET','POST'] as const){
    const response=await handler(req('inbox',method,{accountId:actor}));
    assert.equal(response.status,404);
    assert.equal(response.headers.get('Cache-Control'),'no-store');
    assert.deepEqual(await response.json(),{error:'not_found'});
  }
  assert.equal(authenticationCalls,0,'unreleased route cannot even authenticate or query');

  const get=await bindAuthenticatedMarketRequest(req('inbox','GET'),services);
  assert.equal(get.actorAccountId,actor,'actor must come from authenticated session');
  assert.deepEqual(get.operation,{kind:'inbox',history:false,offset:0});
  const history=await bindAuthenticatedMarketRequest(
    new Request(path+'&action=my_offers&history=true&offset=40',{
      headers:{authorization:'Bearer valid'},
    }),services);
  assert.deepEqual(history.operation,{kind:'my_offers',history:true,offset:40});

  const claim=await bindAuthenticatedMarketRequest(req('claim','POST',{
    deliveryId:'10000000-0000-4000-8000-000000000001',
    deliveryKind:'purchased',destination:'gem_pouch',
    requestKey:'claim-key-001',
  }),services);
  assert.equal(claim.actorAccountId,actor);
  assert.deepEqual(claim.operation,{
    kind:'claim',deliveryId:'10000000-0000-4000-8000-000000000001',
    deliveryKind:'purchased',destination:'gem_pouch',requestKey:'claim-key-001',
  });

  const publish=await bindAuthenticatedMarketRequest(req('publish','POST',{
    holdId:'10000000-0000-4000-8000-000000000002',unitPrice:50,
    quantity:10,requestKey:'publish-key-001',
  }),services);
  assert.equal(publish.operation.kind,'publish');

  const buy=await bindAuthenticatedMarketRequest(req('buy','POST',{
    offerId:'10000000-0000-4000-8000-000000000003',
    unitPrice:60,quantity:3,buyerRevision:10,sellerRevision:25,
    requestKey:'buyer-key-001',
  }),services);
  assert.equal(buy.operation.kind,'buy');
  assert.equal(buy.actorAccountId,actor);

  await denied(()=>req('inbox','GET',undefined,''),'auth_required');
  await denied(()=>req('inbox','GET',undefined,'invalid'),'invalid_session');
  await denied(()=>req('publish','POST',{
    holdId:'10000000-0000-4000-8000-000000000002',unitPrice:50,
    quantity:10,requestKey:'publish-key-001',sellerAccountId:'someone-else',
  }),'market_invalid_request');
  await denied(()=>req('buy','POST',{
    offerId:'10000000-0000-4000-8000-000000000003',
    unitPrice:60,quantity:3,buyerRevision:10,sellerRevision:25,
    requestKey:'buyer-key-001',buyerAccountId:actor,
  }),'market_invalid_request');
  await denied(()=>new Request(path+'&action=inbox&accountId='+actor,{
    headers:{authorization:'Bearer valid'},
  }),'market_invalid_request');
  await denied(()=>new Request(path+'&action=inbox&action=buy',{
    headers:{authorization:'Bearer valid'},
  }),'market_invalid_request');
  await denied(()=>req('claim','POST',{
    deliveryId:'10000000-0000-4000-8000-000000000001',deliveryKind:'returned',
    destination:'equipment_pouch',requestKey:'claim-key-002',
  }),'market_invalid_request');
  await denied(()=>req('buy','POST',{
    offerId:'10000000-0000-4000-8000-000000000003',
    unitPrice:0,quantity:1,buyerRevision:10,sellerRevision:25,
    requestKey:'buyer-key-002',
  }),'market_invalid_request');
  await denied(()=>req('publish','POST',{
    holdId:'10000000-0000-4000-8000-000000000002',
    unitPrice:1000000000000,quantity:2147483647,requestKey:'publish-key-002',
  }),'market_invalid_request');
  await denied(()=>new Request(path+'&action=my_offers&history=true&offset=-1',{
    headers:{authorization:'Bearer valid'},
  }),'market_invalid_request');
  await denied(()=>new Request(path+'&action=buy',{
    method:'POST',headers:{authorization:'Bearer valid','content-type':'application/json'},
    body:'x'.repeat(2500),
  }),'market_request_too_large');
  assert(authenticationCalls>=10);
  console.log('PASS: hidden market auth boundary never mounts or calls RPC; strict request binding rejects actor spoofing');
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
