import React,{createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';
import {AppState} from 'react-native';
import {partySocialIdentity,partySocialSnapshot,type PartySocialSnapshot} from './party-social';
import {supabase} from './supabase';
import {useAuthSession} from './AuthSessionProvider';

type SocialState=PartySocialSnapshot&{accountId:string;characterId:string|null;error:string;loading:boolean;refresh:()=>Promise<void>};
const empty={party:null,contracts:[],serverTime:''};
const Context=createContext<SocialState>({...empty,accountId:'',characterId:null,error:'',loading:false,refresh:async()=>{}});
export function PartySocialProvider({children}:{children:React.ReactNode}){
 const {session}=useAuthSession(),accountId=session?.user.id??'';
 const [state,setState]=useState<Omit<SocialState,'refresh'>>({...empty,accountId:'',characterId:null,error:'',loading:true});
 const generation=useRef(0),activeAccount=useRef(accountId),inFlight=useRef<{accountId:string;promise:Promise<void>;refreshAgain:boolean}|null>(null);
 activeAccount.current=accountId;
 const refresh=useCallback((force=true)=>{
  if(activeAccount.current!==accountId)return Promise.resolve();
  if(!supabase||!accountId){setState({...empty,accountId,characterId:null,error:!supabase?'Online services are not configured.':'',loading:false});return Promise.resolve();}
  if(inFlight.current?.accountId===accountId){if(force)inFlight.current.refreshAgain=true;return inFlight.current.promise;}
  const current=++generation.current;
  const request={accountId,promise:Promise.resolve(),refreshAgain:false};
  inFlight.current=request;
  const promise=(async()=>{
   do{
    request.refreshAgain=false;
   try{
    const identity=await partySocialIdentity();
    if(identity?.accountId!==accountId)throw new Error('Account session changed while refreshing social details.');
    const snapshot=await partySocialSnapshot();
    if(current===generation.current&&activeAccount.current===accountId)setState({...snapshot,accountId,characterId:identity.characterId,error:'',loading:false});
   }catch(error){
    // A refresh failure or token renewal is not evidence that the player left a party.
    if(current===generation.current&&activeAccount.current===accountId)setState(previous=>({...previous,error:error instanceof Error?error.message:'Social service unavailable.',loading:false}));
   }
   }while(request.refreshAgain&&current===generation.current&&activeAccount.current===accountId);
  })();
  request.promise=promise;
  void promise.finally(()=>{if(inFlight.current===request)inFlight.current=null;});
  return promise;
 },[accountId]);
 useEffect(()=>{
  generation.current++;
  setState({...empty,accountId,characterId:null,error:'',loading:!!accountId});
  void refresh(false);
  let previous=AppState.currentState;
  const timer=setInterval(()=>{if(AppState.currentState==='active')void refresh(false);},30000);
  const foreground=AppState.addEventListener('change',next=>{const resumed=previous!=='active'&&next==='active';previous=next;if(resumed)void refresh();});
  return()=>{generation.current++;inFlight.current=null;clearInterval(timer);foreground.remove();};
 },[accountId,refresh]);
 const visibleState=state.accountId===accountId?state:{...empty,accountId,characterId:null,error:'',loading:!!accountId};
 return <Context.Provider value={{...visibleState,refresh}}>{children}</Context.Provider>;
}
export function usePartySocial(){return useContext(Context);}
