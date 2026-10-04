const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
function load(file,dependencies={}){
 const box={exports:{},URL,URLSearchParams,require:name=>{if(!(name in dependencies))throw Error(`Unexpected dependency ${name}`);return dependencies[name];}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,box);
 return box.exports;
}
const callback=load('core/auth-callback.ts'),link=load('core/auth-account-link.ts',{'./auth-callback':callback}),flag=link.GUEST_PASSWORD_PENDING;
const copy=value=>JSON.parse(JSON.stringify(value));
const guest=()=>({id:'guest-a',is_anonymous:true,email:'',user_metadata:{display_name:'Aster'}});
const verified=()=>({...guest(),email:'aster@example.test',is_anonymous:false,email_confirmed_at:'2026-10-04T20:00:00Z'});
const token=user=>`header.${Buffer.from(JSON.stringify({is_anonymous:Boolean(user.is_anonymous),email:user.email||''})).toString('base64url')}.signature`;
const sessionFor=user=>({access_token:token(user),refresh_token:'test-refresh',user:copy(user)});
function fixture(initial=guest()){
 const f={server:copy(initial),session:sessionFor(initial),writes:[],refreshes:0,resends:0,signups:0,exchanges:0,readFailure:null,writeFailure:null,refreshFailure:null};
 const auth={
  getSession:async()=>({data:{session:f.session},error:null}),
  getUser:async()=>({data:{user:copy(f.server)},error:f.readFailure}),
  updateUser:async(attributes,options)=>{
   f.writes.push(copy({attributes,options}));
   if(f.writeFailure){const error=f.writeFailure;f.writeFailure=null;return {data:{user:null},error};}
   if(attributes.email)f.server.new_email=attributes.email;
   if(attributes.data)f.server.user_metadata={...f.server.user_metadata,...attributes.data};
   f.session={...f.session,user:copy(f.server)};
   return {data:{user:copy(f.server)},error:null};
  },
  refreshSession:async()=>{f.refreshes++;if(f.refreshFailure)return {data:{session:null},error:f.refreshFailure};f.session=sessionFor(f.server);return {data:{session:f.session},error:null};},
  resend:async()=>{f.resends++;return {error:null};},
  signUp:async()=>{f.signups++;throw Error('Unexpected account creation');},
  exchangeCodeForSession:async()=>{f.exchanges++;return {error:null};},
 };
 const client={auth,from:()=>{throw Error('Account linking must not depend on a profile write');}};
 f.api=load('online/account.ts',{'expo-linking':{createURL:()=> 'veldryn://auth'},'./supabase':{supabase:client},'../core/auth-callback':callback,'../core/auth-account-link':link});
 return f;
}
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
(async()=>{
 let checks=0;
 assert.equal(link.accountLinkStep(guest()),'guest');
 assert.equal(link.accountLinkStep({...guest(),user_metadata:{email_verified:true}}),'guest','editable metadata cannot verify a guest');
 assert.equal(link.accountLinkStep(verified()),'linked','accounts linked by older builds stay linked');
 assert.equal(link.accountLinkStep({...verified(),user_metadata:{[flag]:'true'}}),'linked','only a boolean flag requests password setup');checks++;

 const f=fixture();
 await f.api.upgradeGuestAccount(' Aster@Example.Test ',' Aster ','guest-a');
 assert.equal(f.writes.length,1);assert.equal(f.writes[0].attributes.email,'aster@example.test');
 assert.equal(f.writes[0].attributes.password,undefined,'email step never sends or stores a password');
 assert.deepEqual(f.writes[0].attributes.data,{display_name:'Aster',[flag]:true});
 assert.equal(f.writes[0].options.emailRedirectTo,'veldryn://auth');
 assert.equal(f.session.user.id,'guest-a');assert.equal(link.accountLinkStep(copy(f.session.user)),'verify_email','pending setup survives session serialization/restart');checks++;

 await f.api.resendGuestAccountConfirmation('guest-a');
 assert.equal(f.resends,0,'guest resend must use the authenticated pending email update, not unauthenticated email lookup');
 assert.equal(f.writes.length,2);assert.deepEqual(f.writes[1].attributes,{email:'aster@example.test'});
 assert.equal(f.writes[1].options.emailRedirectTo,'veldryn://auth');assert.equal(f.session.user.user_metadata[flag],true);checks++;

 await assert.rejects(()=>f.api.finishGuestAccount('Asterfall9!','guest-a'),/Confirm your email/);
 assert.equal(f.writes.length,2,'unverified password rejected before auth mutation');checks++;

 // Confirming in a browser changes the server user but does not update the app's
 // cached getSession result. The next startup/resume/manual check must renew it.
 f.server={...verified(),user_metadata:{display_name:'Aster',[flag]:true}};
 assert.equal(f.session.user.is_anonymous,true);
 const linked=await f.api.refreshCurrentAccountSession();
 assert.equal(linked.user.id,'guest-a');assert.equal(linked.user.is_anonymous,false);assert.equal(f.refreshes,1);
 assert.equal(link.accountLinkStep(linked.user),'set_password');assert.equal(link.accountTokenNeedsRefresh(linked,f.server),false);checks++;

 const unchanged=await f.api.refreshCurrentAccountSession();assert.equal(unchanged,linked);assert.equal(f.refreshes,1,'ordinary foreground checks do not force another token refresh');checks++;

 await f.api.finishGuestAccount('Asterfall9!','guest-a');
 assert.equal(f.writes.at(-1).attributes.password,'Asterfall9!');assert.deepEqual(f.writes.at(-1).attributes.data,{[flag]:false});
 assert.equal(f.session.user.id,'guest-a');assert.equal(link.accountLinkStep(f.session.user),'linked');assert.equal(f.signups,0);checks++;

 const passwordFailure=fixture({...verified(),user_metadata:{[flag]:true}});
 passwordFailure.writeFailure=Object.assign(Error('Password service unavailable'),{code:'unexpected_failure'});
 await assert.rejects(()=>passwordFailure.api.finishGuestAccount('Asterfall9!','guest-a'),/unavailable/);
 assert.equal(passwordFailure.session.user.user_metadata[flag],true,'failed password writes keep the resumable prompt');
 await passwordFailure.api.finishGuestAccount('Asterfall9!','guest-a');assert.equal(passwordFailure.session.user.user_metadata[flag],false);checks++;

 const samePassword=fixture({...verified(),user_metadata:{[flag]:true}});
 samePassword.writeFailure=Object.assign(Error('New password should be different'),{code:'same_password'});
 await samePassword.api.finishGuestAccount('Asterfall9!','guest-a');
 assert.equal(samePassword.writes.length,2);assert.deepEqual(samePassword.writes[1].attributes,{data:{[flag]:false}});assert.equal(link.accountLinkStep(samePassword.session.user),'linked');checks++;

 const exists=fixture();exists.writeFailure=Object.assign(Error('Already registered'),{code:'email_exists'});
 await assert.rejects(()=>exists.api.upgradeGuestAccount('other@example.test','Aster','guest-a'),/already in use/);
 assert.equal(exists.session.user.id,'guest-a');assert.equal(exists.session.user.email,'');assert.equal(exists.signups,0);
 await assert.rejects(()=>exists.api.createOnlineAccount('other@example.test','Asterfall9!','Aster'),/keep your progress/);assert.equal(exists.signups,0);checks++;

 const wrongAccount=fixture();
 await assert.rejects(()=>wrongAccount.api.upgradeGuestAccount('aster@example.test','Aster','different-user'),/account changed/);
 await assert.rejects(()=>wrongAccount.api.finishGuestAccount('Asterfall9!','different-user'),/account changed/);
 assert.equal(wrongAccount.writes.length,0);checks++;

 const oldJwt=fixture(verified());oldJwt.session.access_token=token(guest());
 await oldJwt.api.refreshCurrentAccountSession();assert.equal(oldJwt.refreshes,1,'USER_UPDATED may save a permanent user while its JWT still identifies a guest');checks++;

 const unicodeUser={...verified(),email:'élroy@example.test'};
 assert.equal(link.accountTokenNeedsRefresh(sessionFor(unicodeUser),unicodeUser),false,'UTF-8 claims work without browser atob/TextDecoder globals');checks++;

 const failedRefresh=fixture();failedRefresh.server=verified();failedRefresh.refreshFailure=Error('offline');
 await assert.rejects(()=>failedRefresh.api.refreshCurrentAccountSession(),/offline/);assert.equal(failedRefresh.session.user.is_anonymous,true);
 failedRefresh.refreshFailure=null;await failedRefresh.api.refreshCurrentAccountSession();assert.equal(failedRefresh.refreshes,2);assert.equal(failedRefresh.session.user.is_anonymous,false);checks++;

 for(const replacement of [null,sessionFor({...verified(),id:'different-user'})]){
  let current=sessionFor(guest()),started=deferred(),release=deferred(),renewals=0;
  const request=link.reconcileAccountSession({readSession:async()=>current,readUser:async()=>{started.resolve();return release.promise;},refreshSession:async()=>{renewals++;return null;}});
  await started.promise;current=replacement;release.resolve(verified());
  assert.equal(await request,replacement);assert.equal(renewals,0,'an old user read cannot refresh after sign-out/account switch');checks++;
 }

 let current=sessionFor(guest()),started=deferred(),release=deferred();
 const userUpdate=link.reconcileAccountSession({readSession:async()=>current,readUser:async()=>{started.resolve();return release.promise;},refreshSession:async()=>{throw Error('Do not replace newer user state');}});
 await started.promise;current={...current,user:{...guest(),new_email:'fresh@example.test',user_metadata:{[flag]:true}}};release.resolve(guest());
 assert.equal(await userUpdate,current,'a later USER_UPDATED event wins over an older user fetch');checks++;

 for(const replacement of [null,sessionFor({...verified(),id:'different-user'})]){
  let current=sessionFor(guest()),started=deferred(),release=deferred();
  const request=link.reconcileAccountSession({readSession:async()=>current,readUser:async()=>verified(),refreshSession:async()=>{started.resolve();return release.promise;}});
  await started.promise;current=replacement;release.resolve(sessionFor(verified()));
  assert.equal(await request,replacement,'late token refresh completion cannot restore the previous account');checks++;
 }

 await assert.rejects(()=>link.reconcileAccountSession({readSession:async()=>sessionFor(guest()),readUser:async()=>({...verified(),id:'wrong-id'}),refreshSession:async()=>{throw Error('Unexpected refresh');}}),/account changed/);checks++;

 assert.equal(callback.authCallbackCode('not a url','veldryn://auth'),null);
 assert.equal(callback.authCallbackCode('https://evil.example/auth?code=steal','veldryn://auth'),null);
 assert.equal(callback.authCallbackCode('veldryn://credentials@auth?code=steal','veldryn://auth'),null);
 assert.equal(callback.authCallbackCode('veldryn://auth/other?code=steal','veldryn://auth'),null);
 assert.equal(callback.authCallbackCode('veldryn://auth?code=confirmed','veldryn://auth'),'confirmed');
 assert.throws(()=>callback.authCallbackCode('veldryn://auth#error_code=otp_expired&error_description=Use%20the%20latest%20email','veldryn://auth'),/latest email/);
 assert.throws(()=>callback.authCallbackCode('veldryn://auth?error=access_denied','veldryn://auth'),/could not be verified/);checks++;

 const codeLess=fixture();codeLess.server=verified();
 await codeLess.api.completeMagicLink('veldryn://auth');assert.equal(codeLess.exchanges,0);
 assert.equal((await codeLess.api.refreshCurrentAccountSession()).user.is_anonymous,false,'a code-less callback can discover external verification using the same guest');checks++;
 console.log(`PASS: ${checks} guest account linking, authenticated resend, verified password, stale JWT, callback and account-switch regressions`);
})().catch(error=>{console.error(error);process.exitCode=1;});
