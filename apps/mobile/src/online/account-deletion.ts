import * as Crypto from 'expo-crypto';
import {supabase} from './supabase';
import {ONLINE_ACCOUNT_DELETION_REQUESTS_RELEASED} from '../core/release-flags';

import {ACCOUNT_DELETION_CANCELLATION,normalizeAccountDeletionRequest,validAccountDeletionConfirmation} from '../core/account-deletion-request';
export {ACCOUNT_DELETION_CONFIRMATION,validAccountDeletionConfirmation} from '../core/account-deletion-request';
export type {AccountDeletionRequestSnapshot} from '../core/account-deletion-request';

async function accountClient(accountId:string){
 if(!ONLINE_ACCOUNT_DELETION_REQUESTS_RELEASED)throw new Error('Online account deletion requests are not yet available.');
 if(!supabase)throw new Error('Online services are unavailable in this build.');
 const {data,error}=await supabase.auth.getSession();
 if(error)throw error;
 if(!data.session||data.session.user.id!==accountId||data.session.user.is_anonymous)
  throw new Error('Sign in to your linked VELDRYN account first.');
 // Re-read the user from Auth rather than trusting the cached session profile.
 const verified=await supabase.auth.getUser(data.session.access_token);
 if(verified.error||verified.data.user?.id!==accountId||verified.data.user.is_anonymous)
  throw new Error('Your session needs verification. Sign in again.');
 return supabase;
}
export async function readOnlineAccountDeletionRequest(accountId:string):Promise<AccountDeletionRequestSnapshot>{
 const client=await accountClient(accountId);
 const {data,error}=await client.rpc('online_account_deletion_request_status_v1',{p_expected_account_id:accountId});
 if(error)throw new Error('Unable to read the account deletion request. Please try again.');
 return normalizeAccountDeletionRequest(data);
}
export async function requestOnlineAccountDeletion(accountId:string,confirmation:string):Promise<AccountDeletionRequestSnapshot>{
 if(!validAccountDeletionConfirmation(confirmation))throw new Error('Type DELETE ACCOUNT exactly to continue.');
 const client=await accountClient(accountId);
 const {data,error}=await client.rpc('submit_online_account_deletion_request_v1',{
  p_expected_account_id:accountId,p_confirmation:confirmation,p_request_id:Crypto.randomUUID(),
 });
 if(error)throw new Error('Unable to submit the account deletion request. Your account was not deleted.');
 return normalizeAccountDeletionRequest(data);
}
export async function cancelOnlineAccountDeletionRequest(accountId:string):Promise<AccountDeletionRequestSnapshot>{
 const client=await accountClient(accountId);
 const {data,error}=await client.rpc('cancel_online_account_deletion_request_v1',{
  p_expected_account_id:accountId,p_confirmation:ACCOUNT_DELETION_CANCELLATION,
 });
 if(error)throw new Error('Unable to withdraw the deletion request. Please try again.');
 return normalizeAccountDeletionRequest(data);
}
