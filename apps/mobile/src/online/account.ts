import type {Session} from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import {supabase} from './supabase';
import {accountEmail,accountPassword,authCallbackCode} from '../core/auth-callback';
export const accountRedirect=()=>Linking.createURL('auth');

export async function currentSession():Promise<Session|null>{
  if(!supabase)return null;
  const {data,error}=await supabase.auth.getSession();
  if(error)throw error;
  return data.session;
}

export async function sendMagicLink(email:string){
  if(!supabase)throw new Error('Online services are not configured in this build.');
  const clean=email.trim().toLowerCase();
  if(!/^\S+@\S+\.\S+$/.test(clean))throw new Error('Enter a valid email address.');
  const {error}=await supabase.auth.signInWithOtp({email:clean,options:{
    shouldCreateUser:true,
    emailRedirectTo:Linking.createURL('auth'),
  }});
  if(error)throw error;
}

/** Completes the PKCE callback when the sign-in email opens Veldryn. */
export async function completeMagicLink(url:string){
  if(!supabase)return null;
  const code=authCallbackCode(url,accountRedirect());if(!code)return currentSession();
  const {error}=await supabase.auth.exchangeCodeForSession(code);
  if(error)throw error;
  return currentSession();
}

export async function signOut(){
  if(!supabase)return;
  const {error}=await supabase.auth.signOut();
  if(error)throw error;
}

export async function signInAsGuest(){
  if(!supabase)throw new Error('Online services are not configured in this build.');
  const {data,error}=await supabase.auth.signInAnonymously();
  if(error)throw error;
  return data.user;
}

export async function signInWithPassword(email:string,password:string){
  if(!supabase)throw new Error('Online services are not configured in this build.');
  const {error}=await supabase.auth.signInWithPassword({email:accountEmail(email),password});
  if(error)throw error;
}

export async function createOnlineAccount(email:string,password:string,displayName:string){
 if(!supabase)throw new Error('Online services are not configured in this build.');
 const name=displayName.trim();if(name.length<3||name.length>20)throw new Error('Username must be 3–20 characters.');
 const {data,error}=await supabase.auth.signUp({email:accountEmail(email),password:accountPassword(password),options:{emailRedirectTo:accountRedirect(),data:{display_name:name}}});
 if(error)throw error;return {confirmed:Boolean(data.session)};
}
export async function requestPasswordRecovery(email:string){
 if(!supabase)throw new Error('Online services are not configured in this build.');
 const {error}=await supabase.auth.resetPasswordForEmail(accountEmail(email),{redirectTo:accountRedirect()});if(error)throw error;
}
export async function updateAccountPassword(password:string){
 if(!supabase)throw new Error('Online services are not configured in this build.');
 const {error}=await supabase.auth.updateUser({password:accountPassword(password)});if(error)throw error;
}
export async function resendAccountConfirmation(email:string){
 if(!supabase)throw new Error('Online services are not configured in this build.');
 const {error}=await supabase.auth.resend({type:'signup',email:accountEmail(email),options:{emailRedirectTo:accountRedirect()}});if(error)throw error;
}

/** Links a guest identity to a recoverable official email/password account. */
export async function upgradeGuestAccount(email:string,password:string,displayName:string){
  if(!supabase)throw new Error('Online services are not configured in this build.');
  const cleanEmail=email.trim().toLowerCase(),cleanName=displayName.trim();
  if(!/^\S+@\S+\.\S+$/.test(cleanEmail))throw new Error('Enter a valid email address.');
  const cleanPassword=accountPassword(password);
  if(cleanName.length<3||cleanName.length>20)throw new Error('Username must be 3–20 characters.');
  const {data:{user},error:userError}=await supabase.auth.getUser();
  if(userError)throw userError;
  if(!user)throw new Error('Sign in first.');
  const {error}=await supabase.auth.updateUser({email:cleanEmail,password:cleanPassword,data:{display_name:cleanName}});
  if(error)throw error;
  const {error:profileError}=await supabase.from('player_profiles').upsert({account_id:user.id,display_name:cleanName,updated_at:new Date().toISOString()});
  if(profileError)throw profileError;
}
