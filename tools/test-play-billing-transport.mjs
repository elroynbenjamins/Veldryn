import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

// Exercise the real mobile transport with a fake Supabase client. This process
// has no native purchase runtime, network transport or production credentials.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
const ts=require(path.join(root,'apps/mobile/node_modules/typescript'));
const source=path.join(root,'apps/mobile/src/online/play-billing.ts');
const accountA='11111111-1111-4111-8111-111111111111';
const accountB='22222222-2222-4222-8222-222222222222';
const originalToken='isolated-test-token-a';
const entitlements={vip:true,vipPlus:true,supporter:true,supporterExpiresAt:null};
const obfuscatedAccountId='a'.repeat(64);
const contextResult={obfuscatedAccountId,entitlements,checkoutAvailable:true};
const verificationResult={entitlements,verifiedProductIds:['vip','vip_plus','supporter_monthly']};
const purchase={productId:'vip',store:'google',purchaseToken:'  isolated-purchase-token  ',purchaseState:'purchased'};
const plain=value=>JSON.parse(JSON.stringify(value));
const session=(id=accountA,token=originalToken)=>({access_token:token,user:{id,is_anonymous:false}});
const compiled=new Map();
const tests=[];
function test(name,run){tests.push({name,run});}
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}

function harness({initialSession=session(),configured=true}={}){
  const state={session:initialSession,sessionError:null};
  const calls={auth:0,rpc:[],invoke:[]};
  const started=deferred();
  let rpcResult=()=>({data:entitlements,error:null});
  let functionResult=request=>({data:['context','prepare'].includes(request.body.action)?contextResult:verificationResult,error:null});
  const client={
    auth:{getSession:async()=>{calls.auth++;return {data:{session:state.session},error:state.sessionError};}},
    rpc(name,args){
      const request={name,args,headers:{}};
      calls.rpc.push(request);
      return {
        setHeader(key,value){request.headers[key]=value;return this;},
        then(resolve,reject){
          started.resolve({kind:'rpc',request});
          return Promise.resolve().then(()=>rpcResult(request)).then(resolve,reject);
        },
      };
    },
    functions:{invoke(name,options){
      const request={name,...options};calls.invoke.push(request);
      started.resolve({kind:'function',request});
      return Promise.resolve().then(()=>functionResult(request));
    }},
  };
  const sandbox=vm.createContext({console,Response,Headers,Date,Error,URL,TextEncoder,TextDecoder});
  const cache=new Map();
  function load(file){
    if(cache.has(file))return cache.get(file).exports;
    const module={exports:{}};cache.set(file,module);
    if(!compiled.has(file))compiled.set(file,ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText);
    const execute=vm.runInContext('(function(require,module,exports){'+compiled.get(file)+'\n})',sandbox,{filename:file});
    execute(id=>{
      if(file===source&&id==='./supabase')return {supabase:configured?client:null};
      assert.ok(id.startsWith('.'),'Unexpected runtime import: '+id);
      const target=path.resolve(path.dirname(file),id);
      return load(existsSync(target)?target:target+'.ts');
    },module,module.exports);
    return module.exports;
  }
  return {api:load(source),calls,state,started:started.promise,
    setRpcResult:value=>{rpcResult=typeof value==='function'?value:()=>value;},
    setFunctionResult:value=>{functionResult=typeof value==='function'?value:()=>value;},
  };
}

function authorization(headers){return new Headers(headers).get('authorization');}
async function failure(operation){
  try{await operation();}catch(error){return error;}
  assert.fail('Expected the operation to reject.');
}
function readableError(api,error,meaning){
  const message=api.googlePlayBillingErrorMessage(error);
  assert.equal(typeof message,'string');
  assert.match(message,meaning);
  assert.doesNotMatch(message,/ACCOUNT_CHANGED|AUTH_REQUIRED|INVALID_COMMERCE_RESPONSE|RECOVERABLE_ACCOUNT_REQUIRED|GOOGLE_PLAY_[A-Z_]+/,'UI must receive a readable diagnostic.');
  return message;
}

const endpoints=[
  {name:'account benefits',kind:'rpc',call:(api,owner)=>api.loadAccountCommerceEntitlements(owner),result:entitlements},
  {name:'billing context',action:'context',call:(api,owner)=>api.loadGooglePlayBillingContext(owner),result:contextResult},
  {name:'checkout preparation',action:'prepare',call:(api,owner)=>api.prepareGooglePlayPurchase('vip',owner),result:contextResult},
  {name:'purchase verification',action:'verify',call:(api,owner)=>api.verifyGooglePlayPurchase(purchase,owner),result:verificationResult},
  {name:'purchase restore',action:'restore',call:(api,owner)=>api.restoreGooglePlayPurchases([purchase],owner),result:verificationResult},
  {name:'purchase refresh',action:'status',call:(api,owner)=>api.refreshGooglePlayEntitlements(owner),result:verificationResult},
];

test('all account-scoped requests pin the captured access token and return validated data',async()=>{
  for(const endpoint of endpoints){
    const h=harness();
    const actual=await endpoint.call(h.api,accountA);
    assert.deepEqual(plain(actual),endpoint.result,endpoint.name);
    if(endpoint.kind==='rpc'){
      assert.equal(h.calls.invoke.length,0,'Reading redeemed benefits must not depend on Play billing availability.');
      assert.equal(h.calls.rpc.length,1);
      assert.equal(h.calls.rpc[0].name,'commerce_entitlements_self_v1');
      assert.equal(authorization(h.calls.rpc[0].headers),'Bearer '+originalToken);
    }else{
      assert.equal(h.calls.invoke.length,1);
      const request=h.calls.invoke[0];
      assert.equal(request.name,'play-billing');
      assert.equal(request.body.action,endpoint.action);
      assert.equal(authorization(request.headers),'Bearer '+originalToken,endpoint.name);
      if(endpoint.action==='prepare')assert.equal(request.body.productId,'vip');
      if(endpoint.action==='verify')assert.deepEqual(plain(request.body.purchase),{purchaseToken:'isolated-purchase-token',productId:'vip',productType:'in-app'});
      if(endpoint.action==='restore')assert.equal(request.body.purchases.length,1);
    }
  }
});

test('missing sessions, guests and mismatched owners never issue account requests',async()=>{
  for(const endpoint of endpoints){
    for(const initialSession of [null,{...session(),user:{id:accountA,is_anonymous:true}},session(accountB)]){
      const h=harness({initialSession});
      await failure(()=>endpoint.call(h.api,accountA));
      assert.equal(h.calls.rpc.length+h.calls.invoke.length,0,endpoint.name+' must stop before dispatch.');
    }
  }
  const h=harness({configured:false});
  await failure(()=>h.api.loadAccountCommerceEntitlements(accountA));
  assert.equal(h.calls.auth,0);
});

test('responses arriving after account switches or sign-out are rejected for every endpoint',async()=>{
  for(const endpoint of endpoints){
    for(const nextSession of [session(accountB),null]){
      const h=harness(),reply=deferred();
      if(endpoint.kind==='rpc')h.setRpcResult(()=>reply.promise);else h.setFunctionResult(()=>reply.promise);
      const request=endpoint.call(h.api,accountA);
      const rejected=failure(()=>request);
      await h.started;
      h.state.session=nextSession;
      reply.resolve({data:endpoint.result,error:null});
      readableError(h.api,await rejected,/account|sign in|signed out/i);
    }
  }
});

test('same-owner token refresh preserves the pinned request and accepts the valid response',async()=>{
  for(const endpoint of endpoints){
    const h=harness(),reply=deferred();
    if(endpoint.kind==='rpc')h.setRpcResult(()=>reply.promise);else h.setFunctionResult(()=>reply.promise);
    const pending=endpoint.call(h.api,accountA);
    const {request}=await h.started;
    h.state.session=session(accountA,'isolated-refreshed-token');
    reply.resolve({data:endpoint.result,error:null});
    assert.deepEqual(plain(await pending),endpoint.result,endpoint.name);
    assert.equal(authorization(request.headers),'Bearer '+originalToken);
  }
});

test('optional owner arguments still bind the response to the original session',async()=>{
  for(const endpoint of endpoints.filter(row=>row.kind!=='rpc')){
    const h=harness(),reply=deferred();h.setFunctionResult(()=>reply.promise);
    const pending=endpoint.call(h.api,undefined),rejected=failure(()=>pending);
    await h.started;h.state.session=session(accountB);reply.resolve({data:endpoint.result,error:null});
    readableError(h.api,await rejected,/account/i);
  }
});

test('benefit flags and expiry data are strict; the server boolean remains the authority',async()=>{
  const malformed=[null,[],{},
    {...entitlements,vip:'true'},{...entitlements,vipPlus:1},{...entitlements,supporter:'false'},
    {...entitlements,supporterExpiresAt:123},{...entitlements,supporterExpiresAt:'not-a-date'},
    {...entitlements,supporterExpiresAt:''},
  ];
  const missingExpiry={...entitlements};delete missingExpiry.supporterExpiresAt;malformed.push(missingExpiry);
  for(const value of malformed){
    const h=harness();h.setRpcResult({data:value,error:null});
    readableError(h.api,await failure(()=>h.api.loadAccountCommerceEntitlements(accountA)),/benefits|invalid|response|try again/i);
  }
  for(const value of [
    {...entitlements,supporterExpiresAt:'2020-01-01T00:00:00.000Z'},
    {...entitlements,supporter:false,supporterExpiresAt:'2099-01-01T00:00:00.000Z'},
    {...entitlements,supporterExpiresAt:null},
  ]){
    const h=harness();h.setRpcResult({data:value,error:null});
    assert.deepEqual(plain(await h.api.loadAccountCommerceEntitlements(accountA)),value,'The client must not invent access or revoke a lifetime grant based on its own clock.');
  }
});

test('context and checkout responses reject malformed identities, flags and availability',async()=>{
  const malformed=[null,[],{},
    {...contextResult,obfuscatedAccountId:''},{...contextResult,obfuscatedAccountId:'a'.repeat(63)},
    {...contextResult,obfuscatedAccountId:'A'.repeat(64)},{...contextResult,obfuscatedAccountId:'g'.repeat(64)},
    {...contextResult,entitlements:{...entitlements,vip:'true'}},
    {...contextResult,checkoutAvailable:'false'},{...contextResult,checkoutAvailable:null},
  ];
  for(const endpoint of endpoints.filter(row=>['context','prepare'].includes(row.action))){
    for(const value of malformed){
      const h=harness();h.setFunctionResult({data:value,error:null});
      await failure(()=>endpoint.call(h.api,accountA));
    }
    for(const available of [false,true,undefined]){
      const expected={obfuscatedAccountId,entitlements};if(available!==undefined)expected.checkoutAvailable=available;
      const h=harness();h.setFunctionResult({data:expected,error:null});
      if(endpoint.action==='prepare'&&available===false){
        readableError(h.api,await failure(()=>endpoint.call(h.api,accountA)),/unavailable/i);
        continue;
      }
      const result=await endpoint.call(h.api,accountA);
      assert.equal(result.obfuscatedAccountId,obfuscatedAccountId);
      assert.deepEqual(plain(result.entitlements),entitlements);
      assert.equal(result.checkoutAvailable,available,'Older servers may omit checkoutAvailable.');
    }
  }
});

test('verification, restore and refresh reject malformed result data and unrecognized products',async()=>{
  const malformed=[null,[],{},
    {...verificationResult,entitlements:{...entitlements,supporter:1}},
    {...verificationResult,verifiedProductIds:null},{...verificationResult,verifiedProductIds:'vip'},
    {...verificationResult,verifiedProductIds:['vip',42]},
    {...verificationResult,verifiedProductIds:['unknown_product']},
  ];
  for(const endpoint of endpoints.filter(row=>['verify','restore','status'].includes(row.action))){
    for(const value of malformed){
      const h=harness();h.setFunctionResult({data:value,error:null});
      await failure(()=>endpoint.call(h.api,accountA));
    }
    const h=harness();h.setFunctionResult({data:{entitlements,verifiedProductIds:[]},error:null});
    assert.deepEqual(plain((await endpoint.call(h.api,accountA)).verifiedProductIds),[],'A successful refresh may verify no store purchases for promo-only accounts.');
  }
});

test('missing billing endpoint and known server errors produce useful safe diagnostics',async()=>{
  const diagnostics=[
    {status:404,payload:{code:'NOT_FOUND',message:'Requested function was not found'},meaning:/unavailable/i},
    {status:503,payload:{error:'GOOGLE_PLAY_BILLING_NOT_CONFIGURED'},meaning:/unavailable/i},
    {status:401,payload:{error:'AUTH_REQUIRED'},meaning:/sign in/i},
    {status:403,payload:{error:'RECOVERABLE_ACCOUNT_REQUIRED'},meaning:/guest|secure|email/i},
    {status:409,payload:{error:'GOOGLE_PLAY_ACCOUNT_MISMATCH'},meaning:/account/i},
  ];
  for(const diagnostic of diagnostics){
    const h=harness();h.setFunctionResult({data:null,error:{message:'Edge Function returned a non-2xx status code',context:Response.json(diagnostic.payload,{status:diagnostic.status})}});
    const error=await failure(()=>h.api.loadGooglePlayBillingContext(accountA));
    readableError(h.api,error,diagnostic.meaning);
  }
  const h=harness();h.setFunctionResult({data:{error:'GOOGLE_PLAY_ACCOUNT_MISMATCH'},error:null});
  readableError(h.api,await failure(()=>h.api.loadGooglePlayBillingContext(accountA)),/account/i);
  h.setFunctionResult({data:null,error:{context:{status:409,json:async()=>({error:'GOOGLE_PLAY_ACCOUNT_MISMATCH'})}}});
  readableError(h.api,await failure(()=>h.api.loadGooglePlayBillingContext(accountA)),/account/i);
  for(const message of ['VIP is already owned.','VIP+ is already owned.','Supporter is already active. Manage your subscription in Google Play.']){
    h.setFunctionResult({data:null,error:{context:Response.json({error:message},{status:400})}});
    readableError(h.api,await failure(()=>h.api.prepareGooglePlayPurchase('vip',accountA)),/already owned|already active/i);
  }
  readableError(h.api,{code:'item-unavailable',message:'Native internal product lookup failure'},/not.*available|unavailable/i);
});

test('unknown transport failures never expose raw response details to players',async()=>{
  const sensitive='private-test@example.invalid isolated-sensitive-token database_internal_relation';
  const h=harness();
  for(const value of [new Error(sensitive),{message:sensitive},sensitive,null,undefined]){
    const message=h.api.googlePlayBillingErrorMessage(value);
    assert.equal(typeof message,'string');assert.ok(message.trim().length>0);
    for(const fragment of sensitive.split(' '))assert.ok(!message.includes(fragment));
  }
  for(const payload of [{error:sensitive},{message:sensitive},{error:{message:sensitive}}]){
    h.setFunctionResult({data:null,error:{message:sensitive,context:Response.json(payload,{status:500})}});
    const message=h.api.googlePlayBillingErrorMessage(await failure(()=>h.api.refreshGooglePlayEntitlements(accountA)));
    for(const fragment of sensitive.split(' '))assert.ok(!message.includes(fragment));
  }
  h.state.sessionError=new Error(sensitive);
  const before=h.calls.invoke.length;
  const error=await failure(()=>h.api.loadGooglePlayBillingContext(accountA));
  assert.equal(h.calls.invoke.length,before,'Failed authentication must stop dispatch.');
  assert.ok(!h.api.googlePlayBillingErrorMessage(error).includes(sensitive));
});

test('purchase evidence validates store, token and catalog; pending evidence cannot create local access',async()=>{
  const h=harness();
  for(const invalid of [
    {...purchase,store:'apple'},{...purchase,purchaseToken:null},{...purchase,purchaseToken:'   '},
    {...purchase,productId:'unknown_product'},
  ]){
    assert.throws(()=>h.api.googlePlayPurchaseEvidence(invalid));
    await failure(()=>h.api.verifyGooglePlayPurchase(invalid,accountA));
  }
  assert.equal(h.calls.invoke.length,0,'Invalid evidence must never reach verification.');
  assert.deepEqual(plain(h.api.googlePlayPurchaseEvidence({...purchase,productId:'supporter_monthly'})),{purchaseToken:'isolated-purchase-token',productId:'supporter_monthly',productType:'subs'});
  const pending={...purchase,purchaseState:'pending'};
  const inactive={vip:false,vipPlus:false,supporter:false,supporterExpiresAt:null};
  h.setFunctionResult({data:{entitlements:inactive,verifiedProductIds:[]},error:null});
  const result=await h.api.verifyGooglePlayPurchase(pending,accountA);
  assert.deepEqual(plain(result.entitlements),inactive,'Only the server result can supply paid access.');
  await h.api.restoreGooglePlayPurchases([purchase,{...purchase,store:'apple'},{...purchase,purchaseToken:''},{...purchase,productId:'unknown_product'}],accountA);
  assert.equal(h.calls.invoke.at(-1).body.purchases.length,1,'Restore ignores evidence that this store cannot verify.');
});

let failed=0;
for(const {name,run} of tests){
  try{await run();console.log('PASS: '+name);}catch(error){failed++;console.error('FAIL: '+name);console.error(error);}
}
if(failed){console.error(String(failed)+' billing transport groups failed.');process.exitCode=1;}
else console.log('PASS: '+tests.length+' billing transport groups; no network, native purchases or database writes.');
