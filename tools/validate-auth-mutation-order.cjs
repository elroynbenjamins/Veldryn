// Actual account adapter and installed Supabase SDK, with synthetic fetch/storage.
// No account, email, token or network service outside this process is used.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const app=path.resolve(__dirname,'../apps/mobile'),requireApp=Module.createRequire(path.join(app,'package.json'));
const sdk=requireApp('@supabase/supabase-js'),ts=requireApp('typescript');
const A='11111111-1111-1111-1111-111111111111',B='22222222-2222-2222-2222-222222222222';
const password='Synthetic9!';
let harnessSequence=0;
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const turn=()=>new Promise(setImmediate);
const copy=value=>JSON.parse(JSON.stringify(value));
function user(id=A,kind='linked'){
 const anonymous=kind==='guest';
 return {id,aud:'authenticated',role:'authenticated',email:anonymous?'':`${id===A?'alpha':'bravo'}@example.test`,is_anonymous:anonymous,
  ...(anonymous?{}:{email_confirmed_at:'2026-10-05T06:00:00Z'}),user_metadata:{veldryn_guest_password_pending:kind==='pending'}};
}
function syntheticSession(account,generation=0){
 const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
 const expires=Math.floor(Date.now()/1000)+3600;
 return {access_token:`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:account.id,exp:expires,is_anonymous:account.is_anonymous,email:account.email,generation})}.synthetic-signature`,
  refresh_token:`synthetic-refresh:${account.id}:${generation}`,expires_at:expires,expires_in:3600,token_type:'bearer',user:copy(account)};
}
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});

function harness(kind='linked'){
 const key=`veldryn-synthetic-auth-order-${++harnessSequence}`,url='https://veldryn-auth-test.invalid';
 const stored=new Map([[key,JSON.stringify(syntheticSession(user(A,kind)))]]),users=new Map([[A,user(A,kind)],[B,user(B)]]),loaded=new Map();
 const requests=[],events=[],gates=[];let client,authOptions;
 const storage={getItem:async name=>stored.get(name)??null,setItem:async(name,value)=>stored.set(name,value),removeItem:async name=>stored.delete(name)};
 function hold(match){const entered=deferred(),reply=deferred(),gate={match,entered,reply,used:false};gates.push(gate);return {entered:entered.promise,release:reply.resolve};}
 async function fetchMock(address,options={}){
  const parsed=new URL(address);assert.equal(parsed.origin,url,'all SDK traffic stays inside the synthetic fetch');
  const method=options.method??'GET',body=options.body?JSON.parse(options.body):{},bearer=new Headers(options.headers).get('authorization');
  let accountId=null;
  if(bearer?.startsWith('Bearer ')){try{accountId=JSON.parse(Buffer.from(bearer.slice(7).split('.')[1],'base64url')).sub;}catch{}}
  const grant=parsed.searchParams.get('grant_type');
  const type=parsed.pathname.endsWith('/user')?(method==='PUT'?'update':'read'):parsed.pathname.endsWith('/logout')?'signout':parsed.pathname.endsWith('/recover')?'recover':parsed.pathname.endsWith('/token')?grant:'unknown';
  const request={type,accountId,body};requests.push(request);
  // Capture server user before a delayed GET resolves, matching an old network result.
  let result=accountId?copy(users.get(accountId)):null;
  const gate=gates.find(item=>!item.used&&item.match(request));
  if(gate){gate.used=true;gate.entered.resolve(request);const override=await gate.reply.promise;if(override)return override;}
  if(type==='read')return json(result);
  if(type==='update'){
   assert.ok(accountId&&result,'account mutation requires an existing synthetic identity');
   result={...result,user_metadata:{...result.user_metadata,...body.data}};
   if(body.email)result.new_email=body.email;
   users.set(accountId,copy(result));return json(result);
  }
  if(type==='password'||type==='pkce'){
   const id=type==='pkce'||body.email===users.get(B).email?B:A;return json(syntheticSession(users.get(id)));
  }
  if(type==='refresh_token'){
   const [,id,generation]=body.refresh_token.split(':');assert.ok(users.has(id));
   return json(syntheticSession(users.get(id),Number(generation)+1));
  }
  if(type==='signout'||type==='recover')return json({});
  throw new Error(`Unexpected synthetic auth route: ${method} ${parsed.pathname}`);
 }
 const mocks=new Map([
  ['@supabase/supabase-js',{...sdk,createClient:(address,publicKey,options)=>{
   assert.equal(address,url);assert.equal(publicKey,'synthetic-public-key');authOptions=options.auth;
   // Keep the real production auth options (including its SDK lock). Replace
   // only native storage and network, and drive automatic refresh explicitly.
   const warning=console.warn;
   console.warn=(...args)=>{if(!String(args[0]).includes('The "lock" option is deprecated'))warning(...args);};
   try{client=sdk.createClient(address,publicKey,{...options,auth:{...options.auth,storage,storageKey:key,autoRefreshToken:false},global:{fetch:fetchMock}});return client;}
   finally{console.warn=warning;}
  }}],
  ['expo-linking',{createURL:()=> 'veldryn://auth'}],
  ['expo-secure-store',{getItemAsync:storage.getItem,setItemAsync:storage.setItem,deleteItemAsync:storage.removeItem}],
  ['@react-native-async-storage/async-storage',storage],['react-native',{Platform:{OS:'android'}}],
 ]);
 function load(file){
  file=path.resolve(file);if(!path.extname(file))file+='.ts';if(loaded.has(file))return loaded.get(file).exports;
  const mod={exports:{}};loaded.set(file,mod);
  const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  const req=name=>mocks.has(name)?mocks.get(name):name.startsWith('.')?load(path.resolve(path.dirname(file),name)):requireApp(name);
  new Function('require','module','exports','process',source)(req,mod,mod.exports,{env:{EXPO_PUBLIC_SUPABASE_URL:url,EXPO_PUBLIC_SUPABASE_ANON_KEY:'synthetic-public-key'}});
  return mod.exports;
 }
 const api=load(path.join(app,'src/online/account'));
 const subscription=client.auth.onAuthStateChange((event,session)=>{events.push({event,id:session?.user.id??null});});
 return {api,client,requests,events,users,hold,authOptions,
  snapshot:()=>stored.has(key)?JSON.parse(stored.get(key)):null,
  ready:async()=>{await client.auth.getSession();await turn();},
  cleanup:async()=>{for(const gate of gates)gate.reply.resolve();subscription.data.subscription.unsubscribe();await client.auth.dispose();},
 };
}

async function passwordThenNewIdentity(){
 for(const successor of ['signin','signout','callback']){
  const h=harness();
  try{
   await h.ready();
   if(successor==='callback')await h.api.requestPasswordRecovery('bravo@example.test');
   const put=h.hold(request=>request.type==='update');
   const save=h.api.updateAccountPassword(password,A);await put.entered;
   const later=successor==='signin'?h.api.signInWithPassword('bravo@example.test',password):successor==='signout'?h.api.signOut():h.api.completeMagicLink('veldryn://auth?code=synthetic-code');
   await turn();
   assert.equal(h.requests.filter(request=>['password','pkce','signout'].includes(request.type)).length,0,'later explicit identity intent waits for the pending password mutation');
   put.release();await save;await later;
   assert.equal(h.snapshot()?.user.id??null,successor==='signout'?null:B,'old password completion cannot restore an account after later sign-in/sign-out/callback');
   if(successor==='callback')assert.ok(h.events.some(event=>event.event==='PASSWORD_RECOVERY'&&event.id===B),'real PKCE recovery callback retains its auth event');
  }finally{await h.cleanup();}
 }
 console.log('PASS auth mutation order: held password response cannot undo later sign-in, sign-out or PKCE recovery; actual SDK and account adapter');
}

async function queuedOldOwnerAndFailure(){
 const h=harness();
 try{
  await h.ready();
  const login=h.hold(request=>request.type==='password'),signIn=h.api.signInWithPassword('bravo@example.test',password);await login.entered;
  const oldSave=h.api.updateAccountPassword(password,A).then(()=>({ok:true}),error=>({error}));
  await turn();assert.equal(h.requests.filter(request=>request.type==='update').length,0);
  login.release();await signIn;
  const result=await oldSave;assert.match(result.error?.message??'',/account changed/);
  assert.equal(h.requests.filter(request=>request.type==='update').length,0,'expected account is rechecked inside the queue before any wrong-user PUT');
  assert.equal(h.snapshot().user.id,B);

  const put=h.hold(request=>request.type==='update');
  const failure=h.api.updateAccountPassword(password,B).then(()=>({ok:true}),error=>({error}));await put.entered;
  const nextLogin=h.api.signInWithPassword('alpha@example.test',password),thenLogout=h.api.signOut();
  put.release(json({msg:'Synthetic password rejected',code:'weak_password'},422));
  assert.match((await failure).error?.message??'',/Synthetic password rejected/);
  await nextLogin;await thenLogout;assert.equal(h.snapshot(),null,'a rejected operation does not poison the queue or reorder multiple later intents');
  const identityEvents=h.events.filter(event=>event.event==='SIGNED_IN'||event.event==='SIGNED_OUT');
  assert.deepEqual(identityEvents.slice(-2),[{event:'SIGNED_IN',id:A},{event:'SIGNED_OUT',id:null}]);
 }finally{await h.cleanup();}
 console.log('PASS queued auth ownership: stale account save rejected before mutation, SDK error recovery and ordered subsequent intents');
}

async function guestMutationsThenSignIn(){
 for(const kind of ['guest','pending']){
  const h=harness(kind);
  try{
   await h.ready();const put=h.hold(request=>request.type==='update');
   const guestAction=kind==='guest'?h.api.upgradeGuestAccount('alpha@example.test','Adventurer',A):h.api.finishGuestAccount(password,A);
   const request=await put.entered;
   assert.equal(request.accountId,A);
   assert.equal(request.body.data.veldryn_guest_password_pending,kind==='guest','guest metadata changes remain tied to the correct securing step');
   const switchAccount=h.api.signInWithPassword('bravo@example.test',password);await turn();
   assert.equal(h.requests.filter(value=>value.type==='password').length,0,'new sign-in waits for guest email/password mutation');
   put.release();const updated=await guestAction;await switchAccount;
   assert.equal(updated.id,A,'linking keeps the original guest identity');assert.equal(h.snapshot().user.id,B);
  }finally{await h.cleanup();}
 }
 console.log('PASS guest auth ordering: email-first linking and verified first-password completion preserve UUID and cannot overwrite later sign-in');
}

async function staleVerificationRefresh(){
 // Slow getUser remains concurrent; a later account must win before its result returns.
 const delayed=harness('guest');
 try{
  await delayed.ready();delayed.users.set(A,user(A));
  const read=delayed.hold(request=>request.type==='read'),refresh=delayed.api.refreshCurrentAccountSession();await read.entered;
  await delayed.api.signInWithPassword('bravo@example.test',password);read.release();await refresh;
  assert.equal(delayed.snapshot().user.id,B);
  assert.equal(delayed.requests.filter(request=>request.type==='refresh_token').length,0,'stale server verification cannot refresh or overwrite a different account');
 }finally{await delayed.cleanup();}
 // A refresh can pass its initial checks while another identity intent is already queued.
 const queued=harness('guest');
 try{
  await queued.ready();queued.users.set(A,user(A));
  const login=queued.hold(request=>request.type==='password'),switchAccount=queued.api.signInWithPassword('bravo@example.test',password);await login.entered;
  const refresh=queued.api.refreshCurrentAccountSession();await turn();
  assert.ok(queued.requests.some(request=>request.type==='read'&&request.accountId===A));
  login.release();await switchAccount;await refresh;
  assert.equal(queued.snapshot().user.id,B);
  assert.equal(queued.requests.filter(request=>request.type==='refresh_token').length,0,'refresh rechecks the original identity/token/user after reaching the front of the mutation queue');
 }finally{await queued.cleanup();}
 console.log('PASS auth verification races: delayed reads and queued refresh mutations cannot refresh a replacement session');
}

async function automaticRefreshDuringPassword(){
 const originalNow=Date.now;let clock=originalNow();Date.now=()=>clock;
 const h=harness();
 try{
  await h.ready();const put=h.hold(request=>request.type==='update'),save=h.api.updateAccountPassword(password,A);await put.entered;
  clock+=3540000;
  // Drive the SDK through its public native foreground API. Its immediate tick
  // executes on the next timer turn; the 30-second ticker is disposed below.
  await h.client.auth.startAutoRefresh();await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(h.requests.filter(request=>request.type==='refresh_token').length,0,'automatic token renewal waits while updateUser owns its captured session');
  put.release();await save;await turn();
  const current=h.snapshot();
  assert.equal(h.requests.filter(request=>request.type==='refresh_token').length,1);
  assert.ok(current.refresh_token.endsWith(':1'),'the password response cannot overwrite the automatically rotated refresh token');
  assert.equal(current.user.id,A);
 }finally{await h.cleanup();Date.now=originalNow;}
 console.log('PASS actual native auth config: automatic SDK refresh and password response preserve the latest refresh token');
}

module.exports=async()=>{await passwordThenNewIdentity();await queuedOldOwnerAndFailure();await guestMutationsThenSignIn();await staleVerificationRefresh();await automaticRefreshDuringPassword();};
if(require.main===module)module.exports().catch(error=>{console.error(error);process.exitCode=1;});
