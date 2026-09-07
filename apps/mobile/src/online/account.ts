import type {Session} from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import {supabase} from './supabase';

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
  const {error}=await supabase.auth.exchangeCodeForSession(url);
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
  const {error}=await supabase.auth.signInWithPassword({email:email.trim().toLowerCase(),password});
  if(error)throw error;
}

/** Links a guest identity to a recoverable official email/password account. */
export async function upgradeGuestAccount(email:string,password:string,displayName:string){
  if(!supabase)throw new Error('Online services are not configured in this build.');
  const cleanEmail=email.trim().toLowerCase(),cleanName=displayName.trim();
  if(!/^\S+@\S+\.\S+$/.test(cleanEmail))throw new Error('Enter a valid email address.');
  if(password.length<8)throw new Error('Choose a password with at least 8 characters.');
  if(cleanName.length<3||cleanName.length>20)throw new Error('Username must be 3–20 characters.');
  const {data:{user},error:userError}=await supabase.auth.getUser();
  if(userError)throw userError;
  if(!user)throw new Error('Sign in first.');
  const {error}=await supabase.auth.updateUser({email:cleanEmail,password});
  if(error)throw error;
  const {error:profileError}=await supabase.from('player_profiles').upsert({account_id:user.id,display_name:cleanName,updated_at:new Date().toISOString()});
  if(profileError)throw profileError;
}
