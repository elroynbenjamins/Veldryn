// Explicitly opt-in: sends one real email to the address supplied on the command line.
// This checks provider acceptance only. Inbox delivery and link completion need separate evidence.
import {randomBytes} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {api,projectKeys,root,project} from './online-context.mjs';

const [operation,email]=process.argv.slice(2);
if(!['confirmation','recovery'].includes(operation)||!/^\S+@\S+\.\S+$/.test(email??'')){
  throw new Error('Usage: node tools/test-auth-email-delivery.mjs confirmation|recovery <authorized-email>');
}
const {anon,service}=projectKeys();
// Never overwrite an existing account or reset its password during a delivery check.
let existing=false;
for(let page=1;;page++){
  const response=await api(`/auth/v1/admin/users?page=${page}&per_page=1000`,service);
  if(!response.ok)throw new Error('Account existence check failed');
  const users=response.data.users;
  if(!Array.isArray(users))throw new Error('Unexpected account listing response');
  if(users.some(user=>user.email?.toLowerCase()===email.toLowerCase())){existing=true;break;}
  if(users.length<1000)break;
}
if(operation==='confirmation'&&existing)throw new Error('Account already exists; use the app to resend its confirmation.');
if(operation==='recovery'&&!existing)throw new Error('Recovery delivery cannot be verified for a missing account.');
const response=await api(`/auth/v1/${operation==='confirmation'?'signup':'recover'}?redirect_to=${encodeURIComponent('veldryn://auth')}`,anon,{
  method:'POST',body:operation==='confirmation'
    ?{email,password:randomBytes(36).toString('base64url')+'aA1!',data:{display_name:'Veldryn Email Test'}}
    :{email},
});
// Never log response bodies: successful Auth responses can contain session credentials.
const report={checkedAt:new Date().toISOString(),project,operation,httpStatus:response.status,
  providerAccepted:response.ok,providerError:response.ok?null:response.data.error_code??response.data.code??'unknown',
  inboxDelivery:'UNVERIFIED',nativeCallback:'UNVERIFIED',passwordChanged:false};
const destination=path.join(root,'docs/implementation/online-verification',`email-${operation}.json`);
fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
if(!response.ok)process.exitCode=1;
