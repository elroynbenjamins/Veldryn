import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {generateKeyPairSync,webcrypto} from 'node:crypto';
import vm from 'node:vm';

// Execute the real Edge handler and Google parser with isolated transport/DB fakes.
// No credentials, network calls, purchases or database writes leave this process.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
const ts=require(path.join(root,'apps/mobile/node_modules/typescript'));
const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const env={SUPABASE_URL:'https://test.invalid',SUPABASE_ANON_KEY:'public-test',SUPABASE_SERVICE_ROLE_KEY:'private-test',
  GOOGLE_PLAY_SERVICE_ACCOUNT_JSON:JSON.stringify({client_email:'test@example.invalid',private_key:privateKey.export({type:'pkcs8',format:'pem'})})};
const purchases=new Map(),googleResponses=new Map();
let handler,anonymous=false,authValid=true;
let acknowledgements=0;
const accountId='test-account';
const obfuscated=Buffer.from(await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode('veldryn:'+accountId))).toString('hex');
function entitlements(){
  const rows=[...purchases.values()];
  const active=id=>rows.some(row=>row.p_product_id===id&&row.p_entitlement_active);
  const plus=active('vip_plus')||(active('vip')&&active('vip_plus_upgrade'));
  const sub=rows.find(row=>row.p_product_id==='supporter_monthly'&&row.p_entitlement_active&&Date.parse(row.p_expires_at)>Date.now());
  return {vip:active('vip')||plus,vipPlus:plus,supporter:!!sub,supporterExpiresAt:sub?.p_expires_at??null};
}
const client={
  auth:{getUser:async()=>({data:{user:authValid?{id:accountId,is_anonymous:anonymous}:null},error:null})},
  rpc:async(name,args)=>{
    if(name==='google_play_register_account_link_v1')return {data:null,error:null};
    if(name==='commerce_entitlements_self_v1')return {data:entitlements(),error:null};
    if(name==='google_play_tokens_for_account_v1')return {data:[...purchases.values()].map(row=>({purchase_token:row.p_purchase_token,product_id:row.p_product_id,product_type:row.p_product_type})),error:null};
    if(name==='google_play_record_purchase_v1'){
      if(args.p_product_id==='vip_plus_upgrade'&&args.p_entitlement_active&&![...purchases.values()].some(row=>row.p_product_id==='vip'&&row.p_entitlement_active))return {error:{message:'VIP_REQUIRED_FOR_UPGRADE'}};
      purchases.set(args.p_purchase_token,args);return {error:null};
    }
    throw new Error('Unexpected RPC '+name);
  },
};
const context=vm.createContext({console,Response,Request,URLSearchParams,TextEncoder,TextDecoder,Uint8Array,Date,Error,atob,btoa,crypto:webcrypto,
  Deno:{env:{get:name=>env[name]},serve:fn=>{handler=fn;}},
  fetch:async(url,init)=>{
    if(url==='https://oauth2.googleapis.com/token')return Response.json({access_token:'test-token',expires_in:3600});
    assert.ok(url.startsWith('https://androidpublisher.googleapis.com/'),'Unexpected external request');
    if(url.endsWith(':acknowledge')){acknowledgements++;return new Response(null,{status:204});}
    const token=decodeURIComponent(url.split('/tokens/')[1]);
    const fixture=googleResponses.get(token);
    assert.ok(fixture,'No Google fixture for '+token);
    return Response.json(fixture.body,{status:fixture.status??200});
  },
});
const cache=new Map();
function load(file){
  if(cache.has(file))return cache.get(file).exports;
  const module={exports:{}};cache.set(file,module);
  const js=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  const fn=vm.runInContext('(function(require,module,exports){'+js+'\n})',context,{filename:file});
  fn(id=>id.startsWith('npm:@supabase/supabase-js')?{createClient:()=>client}:load(path.resolve(path.dirname(file),id)),module,module.exports);
  return module.exports;
}
const google=load(path.join(root,'backend/supabase/functions/_shared/google-play.ts'));
load(path.join(root,'backend/supabase/functions/play-billing/index.ts'));
function oneTime(token,productId,state='PURCHASED',owner=obfuscated){
  googleResponses.set(token,{body:{productLineItem:[{productId}],purchaseStateContext:{purchaseState:state},obfuscatedExternalAccountId:owner,acknowledgementState:'ACKNOWLEDGEMENT_STATE_PENDING'}});
  return {purchaseToken:token,productId,productType:'in-app'};
}
async function call(body){
  const response=await handler(new Request('https://test.invalid/play-billing',{method:'POST',headers:{authorization:'Bearer test'},body:JSON.stringify(body)}));
  return {status:response.status,body:await response.json()};
}
const vip=oneTime('vip-token','vip'),upgrade=oneTime('upgrade-token','vip_plus_upgrade');
assert.equal((await call({action:'prepare',productId:'vip_plus'})).status,200);
assert.equal((await call({action:'prepare',productId:'vip_plus_upgrade'})).status,400);
let result=await call({action:'restore',purchases:[upgrade,vip]});
assert.equal(result.status,200);assert.equal(result.body.entitlements.vipPlus,true);
assert.equal(acknowledgements,2,'Both purchases acknowledged after recording');
assert.equal((await call({action:'prepare',productId:'vip_plus'})).status,400,'Owned bundle blocked');
assert.equal((await call({action:'prepare',productId:'vip'})).status,400,'Owned VIP blocked');
assert.equal((await call({action:'restore',purchases:[upgrade,vip]})).status,200,'Duplicate restore is safe');
assert.equal(purchases.size,2,'Duplicate callbacks do not duplicate tokens');
oneTime('vip-token','vip','CANCELLED');
result=await call({action:'status'});
assert.equal(result.status,200);assert.equal(result.body.entitlements.vipPlus,false,'VIP refund removes dependent upgrade');
purchases.clear();
const pending=oneTime('pending','vip','PENDING');
const before=acknowledgements;
result=await call({action:'restore',purchases:[pending]});
assert.equal(result.body.entitlements.vip,false);assert.equal(result.body.verifiedProductIds.length,0,'Pending is not reported as restored');
assert.equal(acknowledgements,before,'Pending must never be acknowledged');
oneTime('pending','vip');
result=await call({action:'verify',purchase:pending});
assert.equal(result.body.entitlements.vip,true,'Completed pending payment grants VIP');
assert.equal((await call({action:'prepare',productId:'vip_plus_upgrade'})).status,200,'Paid VIP can upgrade');
googleResponses.set('pending',{status:503,body:{error:'outage'}});
assert.equal((await call({action:'prepare',productId:'vip_plus_upgrade'})).status,400,'Outage fails checkout closed');
assert.equal((await call({action:'status'})).status,400,'Status must not silently claim successful refresh');
googleResponses.set('pending',{status:404,body:{error:'missing'}});
result=await call({action:'status'});assert.equal(result.body.entitlements.vip,false,'Missing purchase revokes access');
const wrongAccount=oneTime('wrong-account','vip','PURCHASED','different-account');
assert.equal((await call({action:'verify',purchase:wrongAccount})).status,409,'Account binding enforced');
assert.ok(!purchases.has('wrong-account'));
assert.equal((await call({action:'verify',purchase:{...vip,productType:'subs'}})).status,409,'Wrong product type rejected');
anonymous=true;assert.equal((await call({action:'context'})).status,403);anonymous=false;
authValid=false;assert.equal((await call({action:'context'})).status,401);authValid=true;

const future=new Date(Date.now()+3600000).toISOString(),past=new Date(Date.now()-3600000).toISOString();
for(const [state,expiry,active] of [
  ['SUBSCRIPTION_STATE_ACTIVE',future,true],['SUBSCRIPTION_STATE_IN_GRACE_PERIOD',future,true],
  ['SUBSCRIPTION_STATE_CANCELED',future,true],['SUBSCRIPTION_STATE_ON_HOLD',future,false],
  ['SUBSCRIPTION_STATE_PAUSED',future,false],['SUBSCRIPTION_STATE_PENDING',future,false],
  ['SUBSCRIPTION_STATE_EXPIRED',past,false],['SUBSCRIPTION_STATE_ACTIVE',past,false],
  ['SUBSCRIPTION_STATE_ACTIVE','invalid',false],
]){
  googleResponses.set('sub',{body:{subscriptionState:state,externalAccountIdentifiers:{obfuscatedExternalAccountId:obfuscated},lineItems:[{productId:'supporter_monthly',expiryTime:expiry,offerDetails:{basePlanId:'monthly'}}]}});
  const parsed=await google.verifyGooglePlayPurchase('sub','subs','supporter_monthly');
  assert.equal(parsed.entitlementActive,active,state+' with '+expiry);
}
console.log('PASS: real billing handler + Google parser, mocked transports: eligibility, restore ordering, idempotency, pending, acknowledgement, refunds, outages, account binding and 9 subscription lifecycle cases');
