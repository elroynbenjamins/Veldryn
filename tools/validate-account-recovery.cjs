// Real auth provider, account adapters and recovery storage. Only native IO and
// the Supabase SDK are replaced; no credentials, emails or live users are used.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const app=path.resolve(__dirname,'../apps/mobile'),requireApp=Module.createRequire(path.join(app,'package.json'));
const React=requireApp('react'),{act,create}=requireApp('react-test-renderer'),ts=requireApp('typescript');
global.IS_REACT_ACT_ENVIRONMENT=true;
const storageKey='veldryn.account-recovery.v1';
const user=(id='account-a',pending=false)=>({id,email:'aster@example.test',is_anonymous:false,email_confirmed_at:'2026-10-05T06:00:00Z',user_metadata:{veldryn_guest_password_pending:pending}});
const session=account=>account?{user:account,access_token:'test-access-'+account.id,refresh_token:'test-refresh-'+account.id}:null;
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};

function harness({account=user(),device=new Map(),readPending=null,startupPending=null,writePending=null}={}){
 let tree,value,inAuthCallback=false,sessionReads=0;
 const states=[],authListeners=new Set(),links=new Set(),foreground=new Set(),loaded=new Map();
 const state={session:session(account),readPending,startupPending,writePending,passwordError:null,userPending:null,writeError:null,removeError:null};
 const calls={writes:[],removes:0,updates:[],authDuringCallback:0};
 const outsideAuthLock=()=>{if(inAuthCallback)calls.authDuringCallback++;assert.equal(inAuthCallback,false,'provider never calls another auth API inside the synchronous SDK event callback');};
 const sdk={
  onAuthStateChange:listener=>{authListeners.add(listener);return {data:{subscription:{unsubscribe:()=>authListeners.delete(listener)}}};},
  getSession:async()=>{outsideAuthLock();if(sessionReads++===0&&state.startupPending)return state.startupPending;return {data:{session:state.session},error:null};},
  getUser:async()=>{outsideAuthLock();const current=state.session?.user??null;if(state.userPending)await state.userPending;return {data:{user:current},error:null};},
  refreshSession:async()=>{outsideAuthLock();return {data:{session:state.session},error:null};},
  startAutoRefresh:async()=>{outsideAuthLock();},stopAutoRefresh:async()=>{outsideAuthLock();},
  updateUser:async attributes=>{
   outsideAuthLock();calls.updates.push(attributes);
   if(state.passwordError)return {data:{user:null},error:state.passwordError};
   state.session={...state.session,user:{...state.session.user,user_metadata:{...state.session.user.user_metadata,...attributes.data}}};
   return {data:{user:state.session.user},error:null};
  },
 };
 const storage={
  getItem:async key=>{assert.equal(key,storageKey);const stored=device.get(key)??null;if(state.readPending)await state.readPending;return stored;},
  setItem:async(key,stored)=>{assert.equal(key,storageKey);calls.writes.push(stored);if(state.writePending)await state.writePending;if(state.writeError)throw state.writeError;device.set(key,stored);},
  removeItem:async key=>{assert.equal(key,storageKey);calls.removes++;if(state.removeError)throw state.removeError;device.delete(key);},
 };
 const native={Alert:{alert:()=>{}},AppState:{currentState:'active',addEventListener:(event,listener)=>{assert.equal(event,'change');foreground.add(listener);return {remove:()=>foreground.delete(listener)};}}};
 const linking={createURL:()=> 'veldryn://auth',getInitialURL:async()=>null,addEventListener:(event,listener)=>{assert.equal(event,'url');links.add(listener);return {remove:()=>links.delete(listener)};}};
 const mocks=new Map([['react',React],['react-native',native],['expo-linking',linking],['@react-native-async-storage/async-storage',storage],[path.join(app,'src/online/supabase'),{supabase:{auth:sdk},onlineConfigured:true}]]);
 function load(file){
  file=path.resolve(file);if(mocks.has(file))return mocks.get(file);
  if(!path.extname(file))file+=fs.existsSync(file+'.tsx')?'.tsx':'.ts';
  if(loaded.has(file))return loaded.get(file).exports;
  const mod={exports:{}};loaded.set(file,mod);
  const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  const localRequire=name=>mocks.has(name)?mocks.get(name):name.startsWith('.')?load(path.resolve(path.dirname(file),name)):requireApp(name);
  new Function('require','module','exports',source)(localRequire,mod,mod.exports);return mod.exports;
 }
 const {AuthSessionProvider,useAuthSession}=load(path.join(app,'src/online/AuthSessionProvider'));
 const api=load(path.join(app,'src/online/account')),recoveryStorage=load(path.join(app,'src/online/account-recovery'));
 function Probe(){value=useAuthSession();states.push({id:value.session?.user.id??null,loading:value.loading,recovering:value.recovering});return null;}
 async function mount(){await act(async()=>{tree=create(React.createElement(AuthSessionProvider,null,React.createElement(Probe)));});}
 async function emit(event,account){
  await act(async()=>{
   state.session=session(account);inAuthCallback=true;
   try{for(const listener of [...authListeners])assert.equal(listener(event,state.session),undefined,'auth event handler stays synchronous');}
   finally{inAuthCallback=false;}
  });
 }
 async function clear(fn=value.clearRecovery,id=value.session?.user.id){await act(async()=>{fn(id);});}
 async function flush(){await act(async()=>{await Promise.resolve();});}
 async function cleanup(){if(tree)await act(async()=>{tree.unmount();tree=null;});assert.equal(authListeners.size,0);assert.equal(links.size,0);assert.equal(foreground.size,0);assert.equal(calls.authDuringCallback,0);}
 return {state,states,device,calls,api,recoveryStorage,mount,emit,clear,flush,cleanup,get auth(){return value;}};
}

async function resumesAcrossRestart(){
 for(const pendingGuest of [false,true]){
  const device=new Map(),account=user('account-a',pendingGuest),first=harness({account,device});
  try{
   await first.mount();assert.equal(first.auth.recovering,false);
   await first.emit('PASSWORD_RECOVERY',account);assert.equal(first.auth.recovering,true);
   assert.deepEqual(JSON.parse(device.get(storageKey)),{accountId:account.id},'only the account ID is stored');
   assert.ok(!device.get(storageKey).includes('test-access')&&!device.get(storageKey).includes(account.email),'intent contains no session token or email');
  }finally{await first.cleanup();}
  const restarted=harness({account,device});
  try{
   await restarted.mount();assert.equal(restarted.auth.recovering,true,'same-account recovery survives a fresh provider and storage module');
   assert.equal(restarted.auth.loading,false);assert.equal(restarted.auth.session.user.id,account.id);
   assert.ok(!restarted.states.some(state=>state.id===account.id&&!state.loading&&!state.recovering),'startup does not route to ordinary gameplay before recovery hydration');
   await restarted.clear();assert.equal(restarted.auth.recovering,false);assert.equal(device.has(storageKey),false);
   assert.equal(restarted.auth.session.user.user_metadata.veldryn_guest_password_pending,pendingGuest,'cancel never marks a guest password complete');
  }finally{await restarted.cleanup();}
  const canceled=harness({account,device});try{await canceled.mount();assert.equal(canceled.auth.recovering,false,'canceled recovery stays canceled after another restart');}finally{await canceled.cleanup();}
 }
 console.log('PASS recovery restart: linked and verified-guest flows resume before routing; only account ID persists; cancel keeps identity and guest password state');
}

async function hydrationIsolation(){
 const wrong=harness({account:user('account-b'),device:new Map([[storageKey,JSON.stringify({accountId:'account-a'})]])});
 try{await wrong.mount();assert.equal(wrong.auth.recovering,false);assert.equal(wrong.device.has(storageKey),false,'another account cannot inherit the stored prompt');}finally{await wrong.cleanup();}
 for(const event of ['SIGNED_OUT','SIGNED_IN']){
  const read=deferred(),account=user('account-a'),h=harness({account,device:new Map([[storageKey,JSON.stringify({accountId:account.id})]]),readPending:read.promise});
  try{
   await h.mount();assert.equal(h.auth.loading,true,'auth may restore before local intent, but startup remains loading');
   await h.emit(event,event==='SIGNED_OUT'?null:user('account-b'));
   await act(async()=>{read.resolve();});
   assert.equal(h.auth.recovering,false);assert.equal(h.auth.loading,false);assert.equal(h.device.has(storageKey),false,'a late storage read cannot undo sign-out or account switch');
   assert.equal(h.auth.session?.user.id??null,event==='SIGNED_OUT'?null:'account-b');
  }finally{read.resolve();await h.cleanup();}
 }
 const startup=deferred(),h=harness({account:user('account-a'),device:new Map([[storageKey,JSON.stringify({accountId:'account-a'})]]),startupPending:startup.promise});
 try{
  await h.mount();assert.equal(h.auth.loading,true);
  await h.emit('INITIAL_SESSION',user('account-b'));
  await act(async()=>{startup.resolve({data:{session:session(user('account-a'))},error:null});});
  assert.equal(h.auth.session.user.id,'account-b','late getSession never replaces an auth event');assert.equal(h.auth.recovering,false);assert.equal(h.device.has(storageKey),false);
 }finally{startup.resolve({data:{session:null},error:null});await h.cleanup();}
 const unsigned=harness({account:{...user(),is_anonymous:true,email_confirmed_at:undefined},device:new Map([[storageKey,JSON.stringify({accountId:'account-a'})]])});
 try{await unsigned.mount();assert.equal(unsigned.auth.recovering,false,'a UI hint cannot make an unverified guest a password-recovery session');}finally{await unsigned.cleanup();}
 console.log('PASS recovery hydration: delayed auth and device reads respect newer sessions, sign-out and account changes; unverified guests gain no password route');
}

async function staleCompletionsAndWrites(){
 const h=harness();
 try{
  await h.mount();await h.emit('PASSWORD_RECOVERY',user());const oldClear=h.auth.clearRecovery;
  await h.emit('PASSWORD_RECOVERY',user());await h.clear(oldClear,'account-a');
  assert.equal(h.auth.recovering,true,'completion from an older recovery cannot clear a newer recovery for the same account');
  const beforeSwitch=h.auth.clearRecovery;
  await h.emit('SIGNED_IN',user('account-b'));assert.equal(h.auth.recovering,false);
  await h.emit('PASSWORD_RECOVERY',user());await h.clear(beforeSwitch,'account-a');
  assert.equal(h.auth.recovering,true,'switching away and back cannot revive an old completion callback');
  await h.clear(h.auth.clearRecovery,'account-b');assert.equal(h.auth.recovering,true,'clear requires the expected account');
  await h.emit('TOKEN_REFRESHED',user());assert.equal(h.auth.recovering,true,'ordinary token refresh retains recovery');
  await h.clear();assert.equal(h.auth.recovering,false);assert.equal(h.device.has(storageKey),false);
 }finally{await h.cleanup();}
 const write=deferred(),slow=harness({writePending:write.promise});
 try{
  await slow.mount();await slow.emit('PASSWORD_RECOVERY',user());assert.equal(slow.calls.writes.length,1);
  await slow.clear();assert.equal(slow.auth.recovering,false);
  await slow.emit('PASSWORD_RECOVERY',user('account-b'));
  await act(async()=>{write.resolve();});await slow.flush();
  assert.deepEqual(JSON.parse(slow.device.get(storageKey)),{accountId:'account-b'},'a delayed write cannot resurrect canceled account A over new account B');
  await slow.emit('SIGNED_OUT',null);assert.equal(slow.device.has(storageKey),false);assert.equal(slow.auth.recovering,false);
 }finally{write.resolve();await slow.cleanup();}
 const read=deferred(),broken=harness({readPending:read.promise});
 try{
  await broken.mount();await act(async()=>{read.reject(Error('Device storage unavailable'));});
  assert.equal(broken.auth.loading,false);assert.equal(broken.auth.session.user.id,'account-a');
  await broken.emit('PASSWORD_RECOVERY',user());assert.equal(broken.auth.recovering,true);assert.equal(broken.device.has(storageKey),true,'one failed read does not poison later writes');
 }finally{await broken.cleanup();}
 console.log('PASS recovery races: same-account replacement, account round trips, stale clear callbacks, serialized slow writes, sign-out and storage failure recovery');
}

async function verifiedPasswordUpdates(){
 const h=harness({account:user('account-a',true)});
 try{
  await h.mount();await h.emit('PASSWORD_RECOVERY',user('account-a',true));
  h.state.passwordError=Error('Password service unavailable');
  await assert.rejects(()=>h.api.updateAccountPassword('Asterfall9!','account-a'),/unavailable/);
  assert.equal(h.auth.recovering,true);assert.equal(h.device.has(storageKey),true,'failed save keeps the resumable intent');
  assert.equal(h.state.session.user.user_metadata.veldryn_guest_password_pending,true);
  h.state.passwordError=null;
  await h.api.updateAccountPassword('Asterfall9!','account-a');await h.clear();
  assert.equal(h.auth.recovering,false);assert.equal(h.device.has(storageKey),false);assert.equal(h.state.session.user.user_metadata.veldryn_guest_password_pending,false);
  const writes=h.calls.updates.length;
  await assert.rejects(()=>h.api.updateAccountPassword('Asterfall9!','account-b'),/account changed/);assert.equal(h.calls.updates.length,writes,'wrong-account save is rejected before mutation');
 }finally{await h.cleanup();}
 const read=deferred(),switched=harness();
 try{
  await switched.mount();switched.state.userPending=read.promise;
  const save=switched.api.updateAccountPassword('Asterfall9!','account-a');await Promise.resolve();await Promise.resolve();
  await switched.emit('SIGNED_IN',user('account-b'));read.resolve();
  await assert.rejects(()=>save,/account changed/);assert.equal(switched.calls.updates.length,0,'switch during server verification does not mutate the new account');
 }finally{read.resolve();await switched.cleanup();}
 console.log('PASS recovery password authority: real account adapter requires the original verified account, retains failed recovery, and completes guest metadata only after a successful save');
}

async function persistenceAndStartupFailures(){
 const write=harness();
 try{
  await write.mount();write.state.writeError=Error('Device write unavailable');await write.emit('PASSWORD_RECOVERY',user());
  assert.equal(write.auth.recovering,true);assert.equal(write.auth.loading,false);assert.equal(write.auth.session.user.id,'account-a');assert.equal(write.device.has(storageKey),false,'failed persistence does not pretend the hint was saved');
  write.state.writeError=null;await write.emit('PASSWORD_RECOVERY',user());assert.equal(write.device.has(storageKey),true,'a healthy write works after rejection');
 }finally{await write.cleanup();}
 const device=new Map(),remove=harness({device});
 try{
  await remove.mount();await remove.emit('PASSWORD_RECOVERY',user());remove.state.removeError=Error('Device delete unavailable');
  await remove.clear();assert.equal(remove.auth.recovering,false,'Cancel still leaves the in-memory editor');assert.equal(remove.auth.session.user.id,'account-a');
  assert.equal(device.has(storageKey),true,'a rejected delete can leave only the same-account navigation hint for the next launch');
 }finally{await remove.cleanup();}
 const retry=harness({device});
 try{await retry.mount();assert.equal(retry.auth.recovering,true,'restart resumes the hint whose deletion the device rejected');await retry.clear();assert.equal(retry.device.has(storageKey),false,'Cancel persists once device storage works again');}finally{await retry.cleanup();}
 for(const newerSession of [false,true]){
  const startup=deferred(),failed=harness({startupPending:startup.promise});
  try{
   await failed.mount();assert.equal(failed.auth.loading,true);
   if(newerSession)await failed.emit('PASSWORD_RECOVERY',user('account-b'));
   await act(async()=>{startup.reject(Error('Session restore unavailable'));});
   assert.equal(failed.auth.loading,false,'failed startup read releases loading');
   assert.equal(failed.auth.session?.user.id??null,newerSession?'account-b':null);
   assert.equal(failed.auth.error,newerSession?'':'Session restore unavailable','an older rejected startup read cannot overwrite a newer auth event');
   assert.equal(failed.auth.recovering,newerSession);
  }finally{await failed.cleanup();}
 }
 console.log('PASS recovery failure handling: rejected device writes/deletes keep auth usable, healthy retries persist, startup failures release loading, and late failures respect newer sessions');
}

module.exports=async()=>{await resumesAcrossRestart();await hydrationIsolation();await staleCompletionsAndWrites();await verifiedPasswordUpdates();await persistenceAndStartupFailures();};
if(require.main===module)module.exports().catch(error=>{console.error(error);process.exitCode=1;});
