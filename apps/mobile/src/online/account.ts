import type {Session,User} from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import {supabase} from './supabase';
import {accountEmail,accountPassword,authCallbackCode} from '../core/auth-callback';
import {beginGuestAccountLink,finishGuestAccountLink,pendingAccountEmail,reconcileAccountSession,verifiedAccountEmail,type GuestAccountAuth} from '../core/auth-account-link';
export const accountRedirect=()=>Linking.createURL('auth');

// Supabase saves the session captured by updateUser when its network request
// finishes. Serialize explicit auth intents so an older password/email response
// cannot restore an account after a later sign-in or sign-out. Keep this at the
// public-operation boundary: helpers below must never enqueue recursively.
let accountMutation:Promise<unknown>=Promise.resolve();
function mutateAccount<T>(action:()=>Promise<T>){
 const request=accountMutation.then(action);
 accountMutation=request.catch(()=>{});return request;
}

export async function currentSession():Promise<Session|null>{
  if(!supabase)return null;
  const {data,error}=await supabase.auth.getSession();
  if(error)throw error;
  return data.session;
}

/** getSession alone does not see email verification completed in a browser. */
export async function refreshCurrentAccountSession():Promise<Session|null>{
 const client=supabase;if(!client)return null;
 let before:{id:string;accessToken:string;refreshToken:string;user:string}|undefined;
 return reconcileAccountSession<Session>({
  readSession:async()=>{
   const next=await currentSession();
   if(!before&&next)before={id:next.user.id,accessToken:next.access_token,refreshToken:next.refresh_token,user:JSON.stringify(next.user)};
   return next;
  },
  readUser:async accessToken=>{const {data,error}=await client.auth.getUser(accessToken);if(error)throw error;if(!data.user)throw new Error('Sign in first.');return data.user;},
  refreshSession:()=>mutateAccount(async()=>{
   // The network read stays concurrent. Its identity/token snapshot must still
   // own the session when a queued refresh is finally allowed to mutate it.
   const latest=await currentSession();
   if(!before||!latest||latest.user.id!==before.id||latest.access_token!==before.accessToken||latest.refresh_token!==before.refreshToken||JSON.stringify(latest.user)!==before.user)return latest;
   const {data,error}=await client.auth.refreshSession();if(error)throw error;return data.session;
  }),
 });
}

function accountFailure(error:unknown):never{
 const code=error&&typeof error==='object'&&'code' in error?error.code:'';
 if(['email_exists','identity_already_exists','user_already_exists'].includes(String(code)))throw new Error('This email is already in use. Choose another email to secure this guest account.');
 if(['over_email_send_rate_limit','over_request_rate_limit'].includes(String(code)))throw new Error('Please wait a minute before requesting another email.');
 throw error;
}
function guestAccountAuth(accountId:string):GuestAccountAuth<User>{
 const client=supabase;if(!client)throw new Error('Online services are not configured in this build.');
 const checkSession=async()=>{const session=await currentSession();if(!session||session.user.id!==accountId)throw new Error('Your signed-in account changed. Reopen Account and try again.');return session;};
 return {
  readUser:async()=>{const session=await checkSession();const {data,error}=await client.auth.getUser(session.access_token);if(error)accountFailure(error);if(!data.user)throw new Error('Sign in first.');return data.user;},
  updateUser:async(attributes,options)=>{await checkSession();const {data,error}=await client.auth.updateUser(attributes,options);if(error)accountFailure(error);if(!data.user)throw new Error('Sign in first.');return data.user;},
 };
}

export async function sendMagicLink(email:string){
 return mutateAccount(async()=>{
  if(!supabase)throw new Error('Online services are not configured in this build.');
  const clean=email.trim().toLowerCase();
  if(!/^\S+@\S+\.\S+$/.test(clean))throw new Error('Enter a valid email address.');
  const {error}=await supabase.auth.signInWithOtp({email:clean,options:{
    shouldCreateUser:true,
    emailRedirectTo:Linking.createURL('auth'),
  }});
  if(error)throw error;
 });
}

/** Completes the PKCE callback when the sign-in email opens Veldryn. */
export async function completeMagicLink(url:string){
 return mutateAccount(async()=>{
  if(!supabase)return null;
  const code=authCallbackCode(url,accountRedirect());if(!code)return currentSession();
  const {error}=await supabase.auth.exchangeCodeForSession(code);
  if(error)throw error;
  return currentSession();
 });
}

export async function signOut(){
 return mutateAccount(async()=>{
  if(!supabase)return;
  const {error}=await supabase.auth.signOut();
  if(error)throw error;
 });
}

export async function signInAsGuest(){
 return mutateAccount(async()=>{
  if(!supabase)throw new Error('Online services are not configured in this build.');
  const existing=await currentSession();if(existing)return existing.user;
  const {data,error}=await supabase.auth.signInAnonymously();
  if(error)throw error;
  return data.user;
 });
}

export async function signInWithPassword(email:string,password:string){
 return mutateAccount(async()=>{
  if(!supabase)throw new Error('Online services are not configured in this build.');
  const {error}=await supabase.auth.signInWithPassword({email:accountEmail(email),password});
  if(error)throw error;
 });
}

export async function createOnlineAccount(email:string,password:string,displayName:string){
 return mutateAccount(async()=>{
 if(!supabase)throw new Error('Online services are not configured in this build.');
 if(await currentSession())throw new Error('Secure your guest account from Account to keep your progress.');
 const name=displayName.trim();if(name.length<3||name.length>20)throw new Error('Username must be 3–20 characters.');
 const {data,error}=await supabase.auth.signUp({email:accountEmail(email),password:accountPassword(password),options:{emailRedirectTo:accountRedirect(),data:{display_name:name}}});
 if(error)throw error;return {confirmed:Boolean(data.session)};
 });
}
export async function requestPasswordRecovery(email:string){
 return mutateAccount(async()=>{
 if(!supabase)throw new Error('Online services are not configured in this build.');
 const {error}=await supabase.auth.resetPasswordForEmail(accountEmail(email),{redirectTo:accountRedirect()});if(error)throw error;
 });
}
export async function updateAccountPassword(password:string,accountId:string){
 return mutateAccount(async()=>{
 if(!supabase)throw new Error('Online services are not configured in this build.');
 return finishGuestAccountLink(guestAccountAuth(accountId),accountId,password);
 });
}
export async function resendAccountConfirmation(email:string){
 return mutateAccount(async()=>{
 if(!supabase)throw new Error('Online services are not configured in this build.');
 const {error}=await supabase.auth.resend({type:'signup',email:accountEmail(email),options:{emailRedirectTo:accountRedirect()}});if(error)throw error;
 });
}

/** Keep the guest UUID/progress; verify email first, then choose a password. */
export async function upgradeGuestAccount(email:string,displayName:string,accountId:string){
 return mutateAccount(()=>beginGuestAccountLink(guestAccountAuth(accountId),accountId,email,displayName,accountRedirect()));
}
export async function finishGuestAccount(password:string,accountId:string){
 return mutateAccount(()=>finishGuestAccountLink(guestAccountAuth(accountId),accountId,password));
}
export async function resendGuestAccountConfirmation(accountId:string){
 return mutateAccount(async()=>{
 const client=supabase;if(!client)throw new Error('Online services are not configured in this build.');
 const auth=guestAccountAuth(accountId),user=await auth.readUser();
 if(verifiedAccountEmail(user))return;
 const email=pendingAccountEmail(user);if(!email)throw new Error('Enter a valid email address.');
 // resend(email_change) locates a user by their current email. A guest only has
 // new_email, so repeat the authenticated update to resend and renew PKCE.
 if(user.is_anonymous||user.new_email){await auth.updateUser({email:accountEmail(email)},{emailRedirectTo:accountRedirect()});return;}
 const {error}=await client.auth.resend({type:'signup',email:accountEmail(email),options:{emailRedirectTo:accountRedirect()}});
 if(error)accountFailure(error);
 });
}
