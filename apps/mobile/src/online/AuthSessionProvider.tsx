import React,{createContext,useCallback,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {Alert,AppState} from 'react-native';
import * as Linking from 'expo-linking';
import type {Session} from '@supabase/supabase-js';
import {isAuthCallbackUrl} from '../core/auth-callback';
import {verifiedAccountEmail} from '../core/auth-account-link';
import {accountRedirect,completeMagicLink,currentSession,refreshCurrentAccountSession} from './account';
import {accountRecoveryStorage} from './account-recovery';
import {supabase} from './supabase';

interface AuthContext {
 session:Session|null;loading:boolean;error:string;recovering:boolean;refreshing:boolean;
 clearRecovery:(accountId:string)=>void;refreshAccount:()=>Promise<Session|null>;
}
const Context=createContext<AuthContext>({session:null,loading:true,error:'',recovering:false,refreshing:false,clearRecovery:()=>{},refreshAccount:async()=>null});
export function AuthSessionProvider({children}:{children:React.ReactNode}){
 const [session,setSession]=useState<Session|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[refreshing,setRefreshing]=useState(false);
 const [recovery,setRecovery]=useState<{accountId:string|null;revision:number}>({accountId:null,revision:0}),[recoveryLoading,setRecoveryLoading]=useState(true);
 const active=useRef(false),current=useRef<Session|null>(null),accountGeneration=useRef(0),refreshRequest=useRef<Promise<Session|null>|null>(null);
 const recoveryCurrent=useRef(recovery),sessionKnown=useRef(false);
 const publishRecovery=useCallback((accountId:string|null,persist=true)=>{
  const next={accountId,revision:recoveryCurrent.current.revision+1};
  recoveryCurrent.current=next;setRecovery(next);
  // This hint never grants account access. Keep auth usable if device storage
  // is temporarily unavailable; the linked-account password entry remains usable.
  if(persist)void accountRecoveryStorage.write(accountId).catch(()=>{});
 },[]);
 const publish=useCallback((next:Session|null,signedOut=false)=>{
  const changed=current.current?.user.id!==next?.user.id;
  if(changed){accountGeneration.current++;refreshRequest.current=null;setRefreshing(false);}
  if(signedOut||(sessionKnown.current&&changed)||(recoveryCurrent.current.accountId&&recoveryCurrent.current.accountId!==next?.user.id))publishRecovery(null);
  sessionKnown.current=true;
  current.current=next;
  setSession(previous=>previous?.access_token===next?.access_token&&previous?.refresh_token===next?.refresh_token&&previous?.expires_at===next?.expires_at&&JSON.stringify(previous?.user)===JSON.stringify(next?.user)?previous:next);
 },[publishRecovery]);
 const refreshAccount=useCallback(()=>{
  if(refreshRequest.current)return refreshRequest.current;
  if(!supabase)return Promise.resolve(null);
  const generation=accountGeneration.current;
  if(active.current)setRefreshing(true);
  const request=refreshCurrentAccountSession().then(next=>{
   if(!active.current||generation!==accountGeneration.current)return current.current;
   publish(next);setError('');return next;
  }).catch(cause=>{
   if(active.current&&generation===accountGeneration.current)setError(cause instanceof Error?cause.message:'Unable to check account verification. Please try again.');
   throw cause;
  }).finally(()=>{if(refreshRequest.current===request){refreshRequest.current=null;if(active.current)setRefreshing(false);}});
  refreshRequest.current=request;return request;
 },[publish]);
 useEffect(()=>{
  active.current=true;let alive=true,authChanged=false;const seen=new Set<string>();
  const recoveryRevision=recoveryCurrent.current.revision;
  void accountRecoveryStorage.read().then(accountId=>{
   if(!alive||recoveryRevision!==recoveryCurrent.current.revision)return;
   const belongsHere=!sessionKnown.current||accountId===current.current?.user.id;
   publishRecovery(belongsHere?accountId:null,false);
   if(accountId&&!belongsHere)void accountRecoveryStorage.write(null).catch(()=>{});
  }).catch(()=>{}).finally(()=>{if(alive)setRecoveryLoading(false);});
  const consume=async(url:string)=>{
   if(!isAuthCallbackUrl(url,accountRedirect())||seen.has(url))return;
   seen.add(url);let previous=current.current;
   try{previous??=await currentSession();await completeMagicLink(url);await refreshAccount();}
   catch(cause){
    // A code is single use and a failed exchange discards its verifier. Retry
    // through a new confirmation email, not duplicate delivery of the same URL.
    // Email verification can finish before a PKCE callback fails (for example
    // when the email opened in another browser). Keep and check the same guest.
    const refreshed=await refreshAccount().catch(()=>null);
    if(previous?.user.is_anonymous&&refreshed?.user.id===previous.user.id&&verifiedAccountEmail(refreshed.user))return;
    if(alive){const message=cause instanceof Error?cause.message:'Account link could not be verified.';setError(message);Alert.alert('Account link',message);}
   }
  };
  // Keep this callback synchronous. Supabase holds its auth lock while notifying
  // subscribers; any awaited auth/database work here can block other requests.
  const auth=supabase?.auth.onAuthStateChange((event,next)=>{
   authChanged=true;if(!alive)return;
   publish(next,event==='SIGNED_OUT');setLoading(false);
   if(event==='SIGNED_IN'||event==='PASSWORD_RECOVERY'||event==='USER_UPDATED'||event==='TOKEN_REFRESHED')setError('');
   if(event==='PASSWORD_RECOVERY'&&next)publishRecovery(next.user.id);
  });
  void supabase?.auth.getSession().then(({data,error:sessionError})=>{
   if(!alive)return;
   if(!authChanged){publish(data.session);setError(sessionError?.message??'');setLoading(false);}
   if(data.session)void refreshAccount().catch(()=>{});
  }).catch(cause=>{if(alive&&!authChanged){setError(cause instanceof Error?cause.message:'Unable to restore your account.');setLoading(false);}});
  if(!supabase){publish(null);setLoading(false);}
  void Linking.getInitialURL().then(url=>{if(alive&&url)void consume(url);}).catch(()=>{});
  const links=Linking.addEventListener('url',event=>void consume(event.url));
  let previousState=AppState.currentState;
  const autoRefresh=(state:typeof AppState.currentState)=>{
   if(state==='active')void supabase?.auth.startAutoRefresh();else void supabase?.auth.stopAutoRefresh();
  };
  autoRefresh(previousState);
  const foreground=AppState.addEventListener('change',next=>{
   autoRefresh(next);
   if(next==='active'&&previousState!=='active')void refreshAccount().catch(()=>{});
   previousState=next;
  });
  return()=>{alive=false;active.current=false;accountGeneration.current++;refreshRequest.current=null;auth?.data.subscription.unsubscribe();links.remove();foreground.remove();};
 },[publish,publishRecovery,refreshAccount]);
 const clearRecovery=useCallback((accountId:string)=>{
  // A response from a canceled request or an older account/recovery flow cannot
  // dismiss a new password-recovery screen, even after switching away and back.
  if(!active.current||current.current?.user.id!==accountId||recoveryCurrent.current!==recovery)return;
  publishRecovery(null);
 },[publishRecovery,recovery]);
 const recovering=Boolean(recovery.accountId&&session?.user.id===recovery.accountId&&verifiedAccountEmail(session.user));
 const value=useMemo(()=>({session,loading:loading||recoveryLoading,error,recovering,refreshing,clearRecovery,refreshAccount}),[session,loading,recoveryLoading,error,recovering,refreshing,clearRecovery,refreshAccount]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useAuthSession=()=>useContext(Context);
