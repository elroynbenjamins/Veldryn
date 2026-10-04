import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {generateKeyPairSync,sign,webcrypto} from 'node:crypto';
import vm from 'node:vm';

// Execute the real Edge handler and Google parser with isolated transport/DB fakes.
// No credentials, network calls, purchases or database writes leave this process.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
const ts=require(path.join(root,'apps/mobile/node_modules/typescript'));
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const oidcKey={...publicKey.export({format:'jwk'}),kid:'isolated-pubsub-key'};
const env={SUPABASE_URL:'https://test.invalid',SUPABASE_ANON_KEY:'public-test',SUPABASE_SERVICE_ROLE_KEY:'private-test',
  GOOGLE_PLAY_SERVICE_ACCOUNT_JSON:JSON.stringify({client_email:'test@example.invalid',private_key:privateKey.export({type:'pkcs8',format:'pem'})})};
const purchases=new Map(),googleResponses=new Map(),historicalOwners=new Map(),accountLinks=new Map(),processedMessages=new Set();
let handler,anonymous=false,authValid=true;
let acknowledgements=0,oauthRequests=0,recordCalls=0,rpcCalls=0;
const accountId='test-account';
let signedInAccount=accountId;
const obfuscated=Buffer.from(await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode('veldryn:'+accountId))).toString('hex');
function entitlements(){
  const rows=[...purchases.values()].filter(row=>row.p_account_id===signedInAccount);
  const active=id=>rows.some(row=>row.p_product_id===id&&row.p_entitlement_active);
  const plus=active('vip_plus');
  const sub=rows.find(row=>row.p_product_id==='supporter_monthly'&&row.p_entitlement_active&&Date.parse(row.p_expires_at)>Date.now());
  return {vip:active('vip'),vipPlus:plus,supporter:!!sub,supporterExpiresAt:sub?.p_expires_at??null};
}
const client={
  auth:{getUser:async()=>({data:{user:authValid?{id:signedInAccount,is_anonymous:anonymous}:null},error:null})},
  rpc:async(name,args)=>{
    rpcCalls++;
    if(name==='google_play_register_account_link_v1'){accountLinks.set(args.p_obfuscated_account_id,args.p_account_id);return {data:null,error:null};}
    if(name==='google_play_purchase_owner_v1')return {data:purchases.get(args.p_purchase_token)?.p_account_id??historicalOwners.get(args.p_purchase_token)??null,error:null};
    if(name==='google_play_account_from_obfuscated_v1')return {data:accountLinks.get(args.p_obfuscated_account_id)??null,error:null};
    if(name==='google_play_rtdn_processed_v1')return {data:processedMessages.has(args.p_message_id),error:null};
    if(name==='google_play_mark_rtdn_processed_v1'){processedMessages.add(args.p_message_id);return {data:null,error:null};}
    if(name==='commerce_entitlements_self_v1')return {data:entitlements(),error:null};
    if(name==='google_play_tokens_for_account_v1')return {data:[...purchases.values()].filter(row=>row.p_account_id===args.p_account_id).map(row=>({purchase_token:row.p_purchase_token,product_id:row.p_product_id,product_type:row.p_product_type})),error:null};
    if(name==='google_play_record_purchase_v1'){
      assert.ok(['vip','vip_plus','supporter_monthly'].includes(args.p_product_id),'Database only accepts the active catalog');
      const previous=purchases.get(args.p_purchase_token);
      if(previous&&previous.p_account_id!==args.p_account_id)return {error:{message:'GOOGLE_PLAY_PURCHASE_ALREADY_BOUND'}};
      if(args.p_obfuscated_account_id&&accountLinks.get(args.p_obfuscated_account_id)!==args.p_account_id)return {error:{message:'GOOGLE_PLAY_ACCOUNT_MISMATCH'}};
      recordCalls++;
      purchases.set(args.p_purchase_token,args);return {error:null};
    }
    throw new Error('Unexpected RPC '+name);
  },
};
const context=vm.createContext({console,Response,Request,URLSearchParams,TextEncoder,TextDecoder,Uint8Array,Date,Error,atob,btoa,crypto:webcrypto,
  Deno:{env:{get:name=>env[name]},serve:fn=>{handler=fn;}},
  fetch:async(url,init)=>{
    if(url==='https://oauth2.googleapis.com/token'){oauthRequests++;return Response.json({access_token:'test-token',expires_in:3600});}
    if(url==='https://www.googleapis.com/oauth2/v3/certs')return Response.json({keys:[oidcKey]});
    assert.ok(url.startsWith('https://androidpublisher.googleapis.com/'),'Unexpected external request');
    if(url.endsWith(':acknowledge')){
      const token=decodeURIComponent(url.split('/tokens/')[1].slice(0,-':acknowledge'.length));
      assert.ok(purchases.get(token)?.p_entitlement_active,'Acknowledge only after recording active access');
      acknowledgements++;
      const body=googleResponses.get(token)?.body;
      if(body){body.acknowledgementState='ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED';delete body.outOfAppPurchaseContext;}
      return new Response(null,{status:204});
    }
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
const billingHandler=handler;
function oneTime(token,productId,state='PURCHASED',owner=obfuscated){
  googleResponses.set(token,{body:{productLineItem:[{productId}],purchaseStateContext:{purchaseState:state},obfuscatedExternalAccountId:owner,acknowledgementState:'ACKNOWLEDGEMENT_STATE_PENDING'}});
  return {purchaseToken:token,productId,productType:'in-app'};
}
async function call(body){
  const response=await billingHandler(new Request('https://test.invalid/play-billing',{method:'POST',headers:{authorization:'Bearer test'},body:JSON.stringify(body)}));
  return {status:response.status,body:await response.json()};
}
// A catalog may load on-device even while the verification service is unconfigured.
// Account status must still work, but no new checkout may open in that state.
const configuredCredentials=env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
for(const invalidCredentials of [undefined,'{"private_key":"fixture-secret-fragment"',JSON.stringify({client_email:'fixture@example.invalid'})]){
  if(invalidCredentials===undefined)delete env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  else env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=invalidCredentials;
  const status=await call({action:'context'});
  assert.equal(status.status,200,'Existing account benefits do not require Google credentials');
  assert.equal(status.body.checkoutAvailable,false,'Unconfigured checkout is explicit');
  assert.equal(status.body.entitlements.vip,false,'Unavailable billing never grants benefits');
  const prepared=await call({action:'prepare',productId:'vip'});
  assert.equal(prepared.status,400,'Unconfigured verification blocks new checkout');
  assert.equal(prepared.body.error,'GOOGLE_PLAY_BILLING_NOT_CONFIGURED');
  assert.ok(!JSON.stringify(prepared.body).includes('fixture-secret-fragment'),'Credential fragments never escape');
}
assert.equal(oauthRequests,0,'Invalid credential configuration never contacts Google');
env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=JSON.stringify({client_email:'fixture@example.invalid',private_key:'-----BEGIN PRIVATE KEY-----\nnot-a-key\n-----END PRIVATE KEY-----'});
assert.equal((await call({action:'prepare',productId:'vip'})).body.error,'GOOGLE_PLAY_BILLING_NOT_CONFIGURED','Invalid signing keys block checkout before payment');
env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=configuredCredentials;
assert.equal((await call({action:'context'})).body.checkoutAvailable,true,'Configured checkout is declared separately from owned benefits');
await assert.rejects(()=>google.verifyGooglePubSubOidc(new Request('https://test.invalid/play-billing-rtdn')),/GOOGLE_PLAY_RTDN_AUDIENCE/,'Missing webhook authentication fails closed');

const vip=oneTime('vip-token','vip'),plus=oneTime('plus-token','vip_plus');
assert.equal((await call({action:'prepare',productId:'vip_plus'})).status,200);
assert.equal((await call({action:'prepare',productId:'vip_plus_upgrade'})).status,400,'Retired upgrade cannot open checkout');
assert.equal((await call({action:'verify',purchase:{...vip,productId:'vip_plus_upgrade'}})).status,400,'Retired upgrade cannot be recorded');
let result=await call({action:'restore',purchases:[plus,vip]});
assert.equal(result.status,200);assert.equal(result.body.entitlements.vipPlus,true);
assert.equal(acknowledgements,2,'Both purchases acknowledged after recording');
assert.equal((await call({action:'prepare',productId:'vip_plus'})).status,400,'Owned VIP+ blocked');
assert.equal((await call({action:'prepare',productId:'vip'})).status,400,'Owned VIP blocked');
assert.equal((await call({action:'restore',purchases:[plus,vip]})).status,200,'Duplicate restore is safe');
assert.equal(purchases.size,2,'Duplicate callbacks do not duplicate tokens');
oneTime('vip-token','vip','CANCELLED');
result=await call({action:'status'});
assert.equal(result.status,200);assert.equal(result.body.entitlements.vip,false,'VIP refund removes only VIP');
assert.equal(result.body.entitlements.vipPlus,true,'VIP refund preserves independently purchased VIP+');
purchases.clear();
result=await call({action:'verify',purchase:plus});
assert.equal(result.body.entitlements.vip,false,'VIP+ alone does not grant VIP');
assert.equal(result.body.entitlements.vipPlus,true,'VIP+ is independent');
assert.equal((await call({action:'prepare',productId:'vip'})).status,200,'VIP+ owner may buy VIP independently');
purchases.clear();
const pending=oneTime('pending','vip','PENDING');
const before=acknowledgements;
result=await call({action:'restore',purchases:[pending]});
assert.equal(result.body.entitlements.vip,false);assert.equal(result.body.verifiedProductIds.length,0,'Pending is not reported as restored');
assert.equal(acknowledgements,before,'Pending must never be acknowledged');
oneTime('pending','vip');
result=await call({action:'verify',purchase:pending});
assert.equal(result.body.entitlements.vip,true,'Completed pending payment grants VIP');
assert.equal((await call({action:'prepare',productId:'vip_plus'})).status,200,'VIP owner may buy VIP+ independently');
googleResponses.set('pending',{status:503,body:{error:'outage'}});
assert.equal((await call({action:'prepare',productId:'vip_plus'})).status,400,'Outage fails checkout closed');
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

// Google omits linkedPurchaseToken for re-subscriptions bought in the Play Store
// after expiry. Its owner hints disappear after acknowledgement, so exercise the
// actual webhook and client handler before and after that transition.
env.GOOGLE_PLAY_RTDN_AUDIENCE='https://test.invalid/play-billing-rtdn';
env.GOOGLE_PLAY_RTDN_PUSH_SERVICE_ACCOUNT_EMAIL='pubsub@example.invalid';
load(path.join(root,'backend/supabase/functions/play-billing-rtdn/index.ts'));
const rtdnHandler=handler;
const issuedAt=Math.floor(Date.now()/1000);
const jwtPart=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const unsigned=jwtPart({alg:'RS256',kid:oidcKey.kid})+'.'+jwtPart({iss:'https://accounts.google.com',aud:env.GOOGLE_PLAY_RTDN_AUDIENCE,email:env.GOOGLE_PLAY_RTDN_PUSH_SERVICE_ACCOUNT_EMAIL,email_verified:true,iat:issuedAt,exp:issuedAt+3600});
const oidcToken=unsigned+'.'+sign('RSA-SHA256',Buffer.from(unsigned),privateKey).toString('base64url');
let nextMessage=0;
async function rtdn(token,authorization='Bearer '+oidcToken){
  const data=Buffer.from(JSON.stringify({packageName:'com.elroybenjamins.veldryn',subscriptionNotification:{notificationType:4,purchaseToken:token}})).toString('base64');
  const response=await rtdnHandler(new Request('https://test.invalid/play-billing-rtdn',{method:'POST',headers:{authorization,'content-type':'application/json'},body:JSON.stringify({message:{data,messageId:'isolated-message-'+(++nextMessage)}})}));
  return {status:response.status,text:await response.text()};
}
function subscription(token,overrides={}){
  googleResponses.set(token,{body:{subscriptionState:'SUBSCRIPTION_STATE_ACTIVE',acknowledgementState:'ACKNOWLEDGEMENT_STATE_PENDING',lineItems:[{productId:'supporter_monthly',expiryTime:future,offerDetails:{basePlanId:'monthly'}}],...overrides}});
  return {purchaseToken:token,productId:'supporter_monthly',productType:'subs'};
}
const accountB='other-account',obfuscatedB=await google.googlePlayObfuscatedAccountId(accountB);
accountLinks.set(obfuscatedB,accountB);
historicalOwners.set('expired-a',accountId);
historicalOwners.set('expired-b',accountB);
historicalOwners.set('linked-a',accountId);
historicalOwners.set('linked-b',accountB);
purchases.clear();

const expiredTokenPurchase=subscription('resubscribe-expired-token',{outOfAppPurchaseContext:{expiredPurchaseToken:'expired-a'}});
const beforeRtdnAuth=rpcCalls;
assert.equal((await rtdn(expiredTokenPurchase.purchaseToken,'Bearer invalid')).status,401,'The webhook authenticates before resolving any owner');
assert.equal(rpcCalls,beforeRtdnAuth,'An unauthenticated notification never reaches the database');
assert.equal((await rtdn(expiredTokenPurchase.purchaseToken)).status,204,'Known expired token binds a Play Store re-subscription');
const bound=purchases.get(expiredTokenPurchase.purchaseToken);
assert.equal(bound.p_account_id,accountId);
assert.equal(bound.p_obfuscated_account_id,obfuscated,'The canonical account link is persisted before acknowledgement');
assert.equal(googleResponses.get(expiredTokenPurchase.purchaseToken).body.outOfAppPurchaseContext,undefined,'Google removes the temporary owner context after acknowledgement');
assert.equal((await call({action:'verify',purchase:expiredTokenPurchase})).status,200,'Client verification can use the saved token owner after Google removes context');
assert.equal((await call({action:'status'})).status,200,'Later account refresh accepts the already-bound subscription');
assert.equal((await rtdn(expiredTokenPurchase.purchaseToken)).status,204,'Later notifications resolve the saved token owner');
signedInAccount=accountB;
const savedRecordCalls=recordCalls,savedAcknowledgements=acknowledgements;
assert.equal((await call({action:'verify',purchase:expiredTokenPurchase})).status,409,'An arbitrary caller cannot claim a saved subscription with no current Google account ID');
assert.equal(recordCalls,savedRecordCalls);assert.equal(acknowledgements,savedAcknowledgements);
signedInAccount=accountId;

const expiredIdPurchase=subscription('resubscribe-expired-id',{outOfAppPurchaseContext:{expiredExternalAccountIdentifiers:{obfuscatedExternalAccountId:obfuscated}}});
assert.equal((await call({action:'verify',purchase:expiredIdPurchase})).status,200,'Registered expired external ID can bind through authenticated verification');
assert.equal((await call({action:'restore',purchases:[expiredIdPurchase]})).status,200,'Restore works after the temporary context has gone');
const allAgree=subscription('resubscribe-all-agree',{externalAccountIdentifiers:{obfuscatedExternalAccountId:obfuscated},linkedPurchaseToken:'linked-a',outOfAppPurchaseContext:{expiredPurchaseToken:'expired-a',expiredExternalAccountIdentifiers:{obfuscatedExternalAccountId:obfuscated}}});
assert.equal((await rtdn(allAgree.purchaseToken)).status,204,'All owner evidence may consistently name the same account');

for(const [name,overrides,existingOwner] of [
  ['current-versus-expired-id',{externalAccountIdentifiers:{obfuscatedExternalAccountId:obfuscatedB},outOfAppPurchaseContext:{expiredExternalAccountIdentifiers:{obfuscatedExternalAccountId:obfuscated}}}],
  ['expired-token-versus-id',{outOfAppPurchaseContext:{expiredPurchaseToken:'expired-b',expiredExternalAccountIdentifiers:{obfuscatedExternalAccountId:obfuscated}}}],
  ['linked-token-versus-id',{linkedPurchaseToken:'linked-b',outOfAppPurchaseContext:{expiredExternalAccountIdentifiers:{obfuscatedExternalAccountId:obfuscated}}}],
  ['existing-token-versus-id',{outOfAppPurchaseContext:{expiredExternalAccountIdentifiers:{obfuscatedExternalAccountId:obfuscated}}},accountB],
  ['current-id-versus-expired-token',{externalAccountIdentifiers:{obfuscatedExternalAccountId:obfuscatedB},outOfAppPurchaseContext:{expiredPurchaseToken:'expired-a'}}],
  ['unmapped-current-id-versus-token',{externalAccountIdentifiers:{obfuscatedExternalAccountId:'f'.repeat(64)},outOfAppPurchaseContext:{expiredPurchaseToken:'expired-a'}}],
]){
  const purchase=subscription('conflict-'+name,overrides);
  if(existingOwner)historicalOwners.set(purchase.purchaseToken,existingOwner);
  const recordsBefore=recordCalls,acksBefore=acknowledgements;
  assert.equal((await call({action:'verify',purchase})).status,409,name+' must reject client verification');
  const notification=await rtdn(purchase.purchaseToken);
  assert.equal(notification.status,500,name+' must reject notification processing');
  assert.equal(notification.text,'GOOGLE_PLAY_ACCOUNT_MISMATCH');
  assert.equal(recordCalls,recordsBefore,name+' must never write a purchase');
  assert.equal(acknowledgements,acksBefore,name+' must never acknowledge');
}
const unknown=subscription('unlinked-resubscribe',{outOfAppPurchaseContext:{expiredPurchaseToken:'unknown-expired-token'}});
const unknownRecords=recordCalls,unknownAcks=acknowledgements;
assert.equal((await rtdn(unknown.purchaseToken)).status,503,'Unknown owners remain retryable and ungranted');
assert.equal((await call({action:'verify',purchase:{...unknown,expiredPurchaseToken:'expired-a',obfuscatedAccountId:obfuscated}})).status,409,'Caller-supplied owner hints cannot replace Google-verified context');
assert.equal(recordCalls,unknownRecords);assert.equal(acknowledgements,unknownAcks);

const pendingResubscribe=subscription('pending-resubscribe',{subscriptionState:'SUBSCRIPTION_STATE_PENDING',outOfAppPurchaseContext:{expiredPurchaseToken:'expired-a'}});
const beforePendingAck=acknowledgements;
assert.equal((await rtdn(pendingResubscribe.purchaseToken)).status,204);
assert.equal(purchases.get(pendingResubscribe.purchaseToken).p_entitlement_active,false,'Resolving a known owner never grants pending access');
assert.equal(acknowledgements,beforePendingAck,'Pending re-subscriptions remain unacknowledged');

console.log('PASS: real billing and RTDN handlers + Google parser, mocked transports: credential readiness, independent tiers, retired products, pending/acknowledgement, refunds/outages, 9 subscription states, authenticated Play Store re-subscription, ownership persistence after acknowledgement, conflicting owner rejection and unknown-owner retries');
