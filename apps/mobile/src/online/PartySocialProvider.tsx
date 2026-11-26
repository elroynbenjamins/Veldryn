import React,{createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';
import {AppState} from 'react-native';
import {partySocialProjection,type PartySocialSnapshot} from './party-social';
import {supabase} from './supabase';
import {useAuthSession} from './AuthSessionProvider';

type SocialState=PartySocialSnapshot&{accountId:string;characterId:string|null;error:string;loading:boolean;refresh:()=>Promise<void>};
const empty={party:null,contracts:[],serverTime:''};
const PARTY_REFRESH_MS=30_000,IDLE_SOCIAL_REFRESH_MS=120_000;
const Context=createContext<SocialState>({...empty,accountId:'',characterId:null,error:'',loading:false,refresh:async()=>{}});
export function PartySocialProvider({children}:{children:React.ReactNode}){
 const {session}=useAuthSession(),accountId=session?.user.id??'';
 const [state,setState]=useState<Omit<SocialState,'refresh'>>({...empty,accountId:'',characterId:null,error:'',loading:true});
 const generation=useRef(0),activeAccount=useRef(accountId),inFlight=useRef<{accountId:string;promise:Promise<void>;refreshAgain:boolean}|null>(null),partyRef=useRef(state.party);
 activeAccount.current=accountId;
 partyRef.current=state.accountId===accountId?state.party:null;
 const rearmPoll=useRef<(()=>void)|null>(null);
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
    const {identity,snapshot}=await partySocialProjection(accountId);
    if(identity.accountId!==accountId)throw new Error('Account session changed while refreshing social details.');
    if(current===generation.current&&activeAccount.current===accountId){const changed=!!partyRef.current!==!!snapshot.party;partyRef.current=snapshot.party;if(changed)rearmPoll.current?.();setState({...snapshot,accountId,characterId:identity.characterId,error:'',loading:false});}
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
  if(!accountId||!supabase)return;
  let previous=AppState.currentState,disposed=false,cycle=0;
  let timer:ReturnType<typeof setTimeout>|undefined;
  const clearTimer=()=>{if(timer!==undefined){clearTimeout(timer);timer=undefined;}};
  const isActive=()=>AppState.currentState==='active'||AppState.currentState===null;
  const poll=async(force=false)=>{
   clearTimer();const current=++cycle;
   if(disposed||!isActive()||activeAccount.current!==accountId)return;
   await refresh(force);
   if(!disposed&&current===cycle&&isActive()&&activeAccount.current===accountId){
    // No idle ticks or overlapping automatic requests. Preserve joined-party
    // freshness even while the player is elsewhere in the game.
    timer=setTimeout(()=>void poll(),partyRef.current?PARTY_REFRESH_MS:IDLE_SOCIAL_REFRESH_MS);
   }
  };
  rearmPoll.current=()=>{if(timer!==undefined&&isActive()){clearTimer();timer=setTimeout(()=>void poll(),partyRef.current?PARTY_REFRESH_MS:IDLE_SOCIAL_REFRESH_MS);}};
  void poll();
  const foreground=AppState.addEventListener('change',next=>{
   const resumed=previous!=='active'&&next==='active';previous=next;
   if(next!=='active'){cycle++;clearTimer();}
   else if(resumed)void poll(true);
  });
  return()=>{disposed=true;cycle++;rearmPoll.current=null;generation.current++;inFlight.current=null;clearTimer();foreground.remove();};
 },[accountId,refresh]);
 const visibleState=state.accountId===accountId?state:{...empty,accountId,characterId:null,error:'',loading:!!accountId};
 return <Context.Provider value={{...visibleState,refresh}}>{children}</Context.Provider>;
}
export function usePartySocial(){return useContext(Context);}
