const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createHash}=require('node:crypto');
const ts=require('typescript');

const source=fs.readFileSync(path.join(__dirname,'../src/online/google-signin.ts'),'utf8');
const sha256=value=>createHash('sha256').update(value,'utf8').digest('hex');
let attempt=0,configured=[],checks=0,signIns=0;
let nextResponse={type:'success',data:{idToken:'google-test-id-token',user:{email:'test@example.invalid',name:'Test Adventurer'}}};
let failRandom=false;
const native={
 GoogleOneTapSignIn:{
  configure:options=>configured.push(options),
  checkPlayServices:async showDialog=>{assert.equal(showDialog,true);checks++;},
  signIn:async()=>{signIns++;return nextResponse;},
  createAccount:async()=>{throw Error('Unexpected account creation');},
  presentExplicitSignIn:async()=>{throw Error('Unexpected explicit sign-in');},
 },
 isNoSavedCredentialFoundResponse:response=>response.type==='noSavedCredential',
 isCancelledResponse:response=>response.type==='cancelled',
 isSuccessResponse:response=>response.type==='success',
};
const mocks={
 'react-native':{Platform:{OS:'android'}},
 'expo-crypto':{
  getRandomBytesAsync:async count=>{
   assert.equal(count,32);
   if(failRandom)throw Error('Native secure randomness unavailable');
   attempt++;
   return Uint8Array.from({length:32},(_,i)=>(i+attempt)%256);
  },
  CryptoDigestAlgorithm:{SHA256:'SHA256'},
  digestStringAsync:async(algorithm,nonce)=>{
   assert.equal(algorithm,'SHA256');
   return sha256(nonce);
  },
 },
 'react-native-nitro-google-signin':native,
};
const context={exports:{},process:{env:{EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID:'1011264688445-testid.apps.googleusercontent.com'}},
 require:name=>{assert.ok(name in mocks,'Unexpected dependency '+name);return mocks[name];}};
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
const api=context.exports;
(async()=>{
 assert.equal(api.googleSignInConfigured,true);
 assert.equal(api.googleAccountLinkingEnabled,false,'Public Google UI stays hidden until explicitly enabled in a tested build');
 for(let i=0;i<2;i++){
  const identity=await api.requestNativeGoogleIdentity();
  const nonce=Buffer.from(Uint8Array.from({length:32},(_,k)=>(k+i+1)%256)).toString('hex');
  assert.equal(identity.nonce,nonce,'Unhashed nonce is returned to Supabase');
  assert.equal(identity.idToken,'google-test-id-token');
  assert.equal(configured[i].nonce,sha256(nonce),'Only the SHA-256 digest is passed to Google');
  assert.equal(configured[i].webClientId,context.process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
  assert.equal(configured[i].autoSelectOnSignIn,false);
 }
 assert.notEqual(configured[0].nonce,configured[1].nonce,'Each picker attempt gets a fresh nonce');
 assert.equal(checks,2);
 assert.equal(signIns,2);

 nextResponse={type:'cancelled',data:null};
 await assert.rejects(()=>api.requestNativeGoogleIdentity(),/cancelled/);
 const before=signIns;
 failRandom=true;
 await assert.rejects(()=>api.requestNativeGoogleIdentity(),/secure randomness unavailable/);
 assert.equal(signIns,before,'No Google picker opens after a nonce generation failure');
 console.log('PASS: native Google nonce generation, SHA-256 binding, per-attempt freshness, cancellation and fail-closed behavior');
})().catch(error=>{console.error(error);process.exitCode=1;});
