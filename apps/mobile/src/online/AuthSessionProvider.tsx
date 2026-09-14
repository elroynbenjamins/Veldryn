import React,{createContext,useContext,useEffect,useState} from 'react';
import {Alert,AppState} from 'react-native';
import * as Linking from 'expo-linking';
import type {Session} from '@supabase/supabase-js';
import {completeMagicLink} from './account';
import {supabase} from './supabase';
const Context=createContext<{session:Session|null;loading:boolean;error:string;recovering:boolean;clearRecovery:()=>void}>({session:null,loading:true,error:'',recovering:false,clearRecovery:()=>{}});
export function AuthSessionProvider({children}:{children:React.ReactNode}){
 const [session,setSession]=useState<Session|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[recovering,setRecovering]=useState(false);
 useEffect(()=>{let alive=true,authChanged=false;const seen=new Set<string>();
  const consume=async(url:string)=>{if(seen.has(url))return;seen.add(url);try{await completeMagicLink(url);}catch(e){seen.delete(url);if(alive){const message=e instanceof Error?e.message:'Account link could not be verified.';setError(message);Alert.alert('Account link',message);}}};
  void supabase?.auth.getSession().then(({data,error})=>{if(alive&&!authChanged){setSession(data.session);setError(error?.message??'');setLoading(false);}});
  if(!supabase)setLoading(false);
  const auth=supabase?.auth.onAuthStateChange((event,next)=>{authChanged=true;if(alive){setSession(next);setLoading(false);if(event==='SIGNED_IN'||event==='PASSWORD_RECOVERY')setError('');if(event==='PASSWORD_RECOVERY')setRecovering(true);if(event==='SIGNED_OUT')setRecovering(false);}});
  void Linking.getInitialURL().then(url=>{if(url)void consume(url);});const links=Linking.addEventListener('url',event=>void consume(event.url));
  const refresh=()=>{if(AppState.currentState==='active')supabase?.auth.startAutoRefresh();else supabase?.auth.stopAutoRefresh();};refresh();
  const foreground=AppState.addEventListener('change',refresh);
  return()=>{alive=false;auth?.data.subscription.unsubscribe();links.remove();foreground.remove();};
 },[]);
 return <Context.Provider value={{session,loading,error,recovering,clearRecovery:()=>setRecovering(false)}}>{children}</Context.Provider>;
}
export const useAuthSession=()=>useContext(Context);
