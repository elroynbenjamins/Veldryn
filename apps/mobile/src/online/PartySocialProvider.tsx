import React,{createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';
import {AppState} from 'react-native';
import {partySocialIdentity,partySocialSnapshot,type PartySocialSnapshot} from './party-social';
import {supabase} from './supabase';

type SocialState=PartySocialSnapshot&{accountId:string;characterId:string|null;error:string;loading:boolean;refresh:()=>Promise<void>};
const empty={party:null,contracts:[],serverTime:''};
const Context=createContext<SocialState>({...empty,accountId:'',characterId:null,error:'',loading:false,refresh:async()=>{}});
export function PartySocialProvider({children}:{children:React.ReactNode}){
 const [state,setState]=useState<Omit<SocialState,'refresh'>>({...empty,accountId:'',characterId:null,error:'',loading:true});
 const generation=useRef(0);
 const refresh=useCallback(async()=>{const current=++generation.current;
  if(!supabase){setState({...empty,accountId:'',characterId:null,error:'Online services are not configured.',loading:false});return;}
  try{const identity=await partySocialIdentity();const snapshot=identity?await partySocialSnapshot():empty;
   if(current===generation.current)setState({...snapshot,accountId:identity?.accountId??'',characterId:identity?.characterId??null,error:'',loading:false});
  }catch(error){if(current===generation.current)setState(previous=>({...previous,...empty,error:error instanceof Error?error.message:'Social service unavailable.',loading:false}));}
 },[]);
 useEffect(()=>{void refresh();const timer=setInterval(()=>{if(AppState.currentState==='active')void refresh();},15000);
  const foreground=AppState.addEventListener('change',next=>{if(next==='active')void refresh();else {generation.current++;setState(previous=>({...previous,...empty}));}});
  const auth=supabase?.auth.onAuthStateChange(()=>{generation.current++;setState({...empty,accountId:'',characterId:null,error:'',loading:true});setTimeout(()=>void refresh(),0);});
  return()=>{generation.current++;clearInterval(timer);foreground.remove();auth?.data.subscription.unsubscribe();};
 },[refresh]);
 return <Context.Provider value={{...state,refresh}}>{children}</Context.Provider>;
}
export function usePartySocial(){return useContext(Context);}
