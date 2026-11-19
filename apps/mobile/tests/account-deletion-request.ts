import {ACCOUNT_DELETION_CONFIRMATION,validAccountDeletionConfirmation,normalizeAccountDeletionRequest} from '../src/core/account-deletion-request';
function ok(value:unknown,message:string){if(!value)throw new Error(message);}
function equal(value:unknown,expected:unknown,message:string){if(value!==expected)throw new Error(message+' (expected '+expected+', got '+value+')');}
function rejects(value:unknown,message:string){let rejected=false;try{normalizeAccountDeletionRequest(value);}catch{rejected=true;}ok(rejected,message);}

ok(validAccountDeletionConfirmation(ACCOUNT_DELETION_CONFIRMATION),'Exact confirmation accepted');
for(const wrong of ['', 'delete account', 'DELETE ACCOUNT ', 'DELETE  ACCOUNT', 'DELETE CHARACTER','KEEP ACCOUNT']){
 ok(!validAccountDeletionConfirmation(wrong),'Incorrect typed confirmation rejected: '+wrong);
}
const identity='00000000-0000-4000-8000-000000000001';
const time=1790000000000;
const pending={status:'pending_review',requestId:identity,requestedAtMs:time,erasureCompleted:false};
const accepted=normalizeAccountDeletionRequest(pending);
equal(accepted.status,'pending_review','Pending request state');
equal(accepted.requestId,identity,'Opaque request ID preserved');
equal(accepted.requestedAtMs,time,'Request timestamp preserved');
equal(normalizeAccountDeletionRequest({status:'none',erasureCompleted:false}).status,'none','No request exists');
equal(normalizeAccountDeletionRequest({status:'cancelled',erasureCompleted:false}).status,'cancelled','Cancel receipt has no request ID');
for(const status of ['reviewing','erasure_blocked']){
 equal(normalizeAccountDeletionRequest({...pending,status}).status,status,'Manual review status accepted');
 rejects({status,erasureCompleted:false},'Active request must include receipt identity and time: '+status);
}
for(const invalid of [
 null,undefined,true,{},[],{status:'none'}, {status:'none',erasureCompleted:true},
 {...pending,status:'completed'}, {...pending,status:'deleted'}, {...pending,erasureCompleted:true},
 {...pending,requestId:'not-a-uuid'}, {...pending,requestId:44},
 {...pending,requestedAtMs:'today'}, {...pending,requestedAtMs:Number.NaN},
 {...pending,requestedAtMs:Infinity}, {...pending,requestedAtMs:-1},
 {...pending,requestId:undefined},{...pending,requestedAtMs:undefined},
]){
 rejects(invalid,'Fail closed on invalid or misleading account-deletion receipt');
}
console.log('PASS: account deletion request receipts cannot imply user erasure and require exact owner-state metadata');
