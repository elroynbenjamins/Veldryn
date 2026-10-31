import assert from 'node:assert/strict';
import {validateStagingProfileConfig,profileStagingGameplay} from './profile-staging-gameplay.mjs';

const stage='a'.repeat(20),prod='b'.repeat(20);
const accounts=[{email:'qa+perf.one@example.net',password:'test-one'},{email:'qa+perf.two@example.net',password:'test-two'}];
const env={
 STAGING_PROFILE_CONFIRM:'I_CONFIRM_ISOLATED_STAGING_LOAD_TEST',
 STAGING_PROFILE_PROJECT_REF:stage,STAGING_PROFILE_PRODUCTION_REF:prod,
 STAGING_PROFILE_CONFIRM_REF:stage,STAGING_PROFILE_URL:'https://'+stage+'.supabase.co',
 STAGING_PROFILE_TEST_EMAIL_MARKER:'+perf',STAGING_PROFILE_ACCOUNTS_JSON:JSON.stringify(accounts),
};
assert.equal(validateStagingProfileConfig(env).accounts.length,2);
for(const entry of [
 {STAGING_PROFILE_CONFIRM:'no'},
 {STAGING_PROFILE_PROJECT_REF:prod},
 {STAGING_PROFILE_CONFIRM_REF:prod},
 {STAGING_PROFILE_URL:'https://'+prod+'.supabase.co'},
 {STAGING_PROFILE_URL:'http://'+stage+'.supabase.co'},
 {STAGING_PROFILE_ACCOUNTS_JSON:JSON.stringify([accounts[0]])},
 {STAGING_PROFILE_ACCOUNTS_JSON:JSON.stringify([accounts[0],accounts[0]])},
 {STAGING_PROFILE_TEST_EMAIL_MARKER:'+not-a-perf-account'},
 {STAGING_PROFILE_ROUNDS:'3'},
 ]){
  assert.throws(()=>validateStagingProfileConfig({...env,...entry}),/staging|confirm|accounts|distinct|rounds|marker|project|test|URL|ref|write/i);
}
const sessions=new Map();
const receipt=new Map();
for(let i=0;i<accounts.length;i++){
 const id='account-'+i;
 sessions.set(id,{version:3,gold:1000+i,bank:200});
}
let writes=0,reads=0;
const mockFetch=async(url,{method,headers,body,signal})=>{
 assert.ok(url.startsWith('https://'+stage+'.supabase.co/'),'No request escapes staging hostname');
 assert.ok(signal,'Each request must have a strict timeout');
 const data=body?JSON.parse(body):undefined;
 let status=200,response;
 if(url.includes('/auth/v1/token')){
   const i=accounts.findIndex(a=>a.email===data.email);
   status=i>=0?200:401;
   response=i>=0?{access_token:'token-'+i,user:{id:'account-'+i}}:{error:'invalid_credentials'};
 }else{
   const id=headers.Authorization.replace('Bearer token-','account-');
   const session=sessions.get(id);
   assert.ok(session,'Never permit requests to an unlisted owner');
   if(method==='GET'){
     reads++;
     response={accountId:id,version:session.version,state:{character:{gold:session.gold},bank:{gold:session.bank},settings:{volume:1},activity:null}};
   }else{
     writes++;
     if(data.expectedVersion!==session.version){status=409;response={error:'stale_state'};}
     else{
       session.version++;
       response={accountId:id,version:session.version,state:{character:{gold:session.gold},bank:{gold:session.bank},settings:{volume:1}}};
       receipt.set(id+':'+data.requestId,response);
     }
     if(receipt.has(id+':'+data.requestId)){status=200;response=receipt.get(id+':'+data.requestId);}
   }
 }
 return {status,json:async()=>response};
};
const config={...validateStagingProfileConfig({...env,STAGING_PROFILE_ROUNDS:'2'}),anonKey:'public-anon-test-key'};
const result=await profileStagingGameplay(config,{fetchImpl:mockFetch,uuid:(()=>{let i=0;return()=>String(++i).padStart(32,'0');})()});
assert.equal(result.status,'PASS');
assert.equal(result.committed,4);
assert.equal(result.staleConflicts,4);
assert.equal(result.receiptReplays,4);
assert.equal(result.timings.write.calls,8);
assert.equal(writes,12,'Two attempts and one replay per account/round');
assert.ok(reads>=6);
assert.ok(!JSON.stringify(result).includes('example.net'),'No test email leaves the local harness');
console.log('PASS staging safety gates, mocked CAS contention, receipt replay, isolated accounts and redacted timings');
