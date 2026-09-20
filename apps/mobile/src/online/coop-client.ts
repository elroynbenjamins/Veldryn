import {supabase} from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {CoopCommandJournal,CoopRequestError,type PendingCoopCommand} from '../core/coop-command-journal';
import type {CoopMode,CoopRunView} from '../core/coop-presentation';
import type {CoopDungeonProjection} from '../core/coop-dungeon-browsing';
import type {CoopLoadoutProjection} from '../core/coop-loadout-presentation';
import type {CoopQModeServerProjection} from '../core/coop-qmode';
import type {CoopEventExpeditionPreview,CoopEventRunServerProjection} from '../core/coop-event-expeditions';
import type {LiveQueueView,LiveReadyView} from '../core/coop-live-lobby';
declare const process:{env:Record<string,string|undefined>};
const apiBase=process.env.EXPO_PUBLIC_COOP_API_URL?.replace(/\/$/,'');
export const coopRogueliteEnabled=process.env.EXPO_PUBLIC_COOP_ROGUELITE_V1==='true';
export const coopOnlineConfigured=Boolean(coopRogueliteEnabled&&apiBase&&supabase);
// Internal lobby validation only; keep off until Live run/recovery gates pass.
export const coopLiveReadyEnabled=process.env.EXPO_PUBLIC_COOP_LIVE_READY_V1==='true';
export interface CoopEntryData {dungeons:CoopDungeonProjection[];eventExpeditions?:CoopEventExpeditionPreview[];loadouts:CoopLoadoutProjection[];activeRun?:CoopRunView;activeRunProjection?:CoopQModeServerProjection;activeEventRunProjection?:CoopEventRunServerProjection;echoSharing?:boolean;gameVersion?:number;}
export interface CoopStartBody {requestId:string;dungeonId:string;tier:1|2|3|4|5;characterId:string;loadoutId:string;loadoutRevision:number;}
export interface CoopEventStartBody {requestId:string;eventExpeditionId:string;characterId:string;loadoutId:string;loadoutRevision:number;}
export interface CoopDecisionBody {requestId:string;decisionId:string;decisionRevision:number;optionId:string;}
export interface CoopReadyBody {requestId:string;rosterRevision:number;accept:boolean;}
async function request<T>(path:string,method='GET',body?:unknown,expectedAccount?:string):Promise<T>{
 if(!supabase||!apiBase||!coopOnlineConfigured)throw new Error('Co-op server is not configured.');
 const session=(await supabase.auth.getSession()).data.session;if(!session)throw new Error('Sign in to use co-op expeditions.');
 if(expectedAccount&&session.user.id!==expectedAccount)throw new Error('Please sign in again.');
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),25000);
 try{
  const response=await fetch(`${apiBase}${path}`,{method,signal:controller.signal,headers:{Authorization:`Bearer ${session.access_token}`,apikey:process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY??'','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  const payload=await response.json();
  if((await supabase.auth.getSession()).data.session?.user.id!==session.user.id)throw new Error('Account changed.');
  if(!response.ok)throw new CoopRequestError(payload?.error??payload?.message??payload?.code??'Co-op request failed.',response.status>=400&&response.status<500&&![408,429].includes(response.status));return payload as T;
 }finally{clearTimeout(timeout);}
}
const journals=new Map<string,CoopCommandJournal>();
async function journal(){
 const accountId=(await supabase?.auth.getSession())?.data.session?.user.id;if(!accountId)throw new Error('Sign in to use co-op expeditions.');
 let value=journals.get(accountId);if(!value){const key=`veldryn.coop.pending.${accountId}`;value=new CoopCommandJournal({read:async()=>{const raw=await AsyncStorage.getItem(key);return raw?JSON.parse(raw):null;},write:async command=>{if(command)await AsyncStorage.setItem(key,JSON.stringify(command));else await AsyncStorage.removeItem(key);}},command=>request(command.path,'POST',command.body,accountId));journals.set(accountId,value);}return value;
}
const mutate=async<T>(path:string,body:object)=>(await (await journal()).execute({path,body:body as PendingCoopCommand['body']})) as T;
export const coopRequestId=()=>`coop-${Date.now()}-${Math.random().toString(36).slice(2,12)}`;
export const coopClient={
 entry:()=>request<CoopEntryData>('/coop/entry'),
 liveQueue:()=>request<LiveQueueView>('/coop/queue'),
 joinLive:(body:CoopStartBody)=>mutate<LiveQueueView>('/coop/queue',body),
 heartbeatLive:(ticketId:string)=>request(`/coop/queue/${ticketId}/heartbeat`,'POST',{requestId:coopRequestId()}),
 cancelLive:(ticketId:string)=>mutate(`/coop/queue/${ticketId}/cancel`,{requestId:coopRequestId()}),
 liveReady:(checkId:string)=>request<LiveReadyView>(`/coop/ready/${checkId}`),
 start:(mode:CoopMode,body:CoopStartBody)=>mutate<CoopRunView|CoopQModeServerProjection|{ticketId:string;status:string}>(mode==='qmode'?'/coop/qmode':'/coop/queue',body),
 startEvent:(body:CoopEventStartBody)=>mutate<CoopEventRunServerProjection>('/coop/event-expeditions',body),
 run:(runId:string)=>request<CoopRunView|CoopQModeServerProjection>(`/coop/runs/${runId}`),
 eventRun:(runId:string)=>request<CoopEventRunServerProjection>(`/coop/event-runs/${runId}`),
 choose:(runId:string,body:CoopDecisionBody)=>mutate<CoopQModeServerProjection>(`/coop/runs/${runId}/choose`,body),
 chooseEvent:(runId:string,body:CoopDecisionBody)=>mutate<CoopEventRunServerProjection>(`/coop/event-runs/${runId}/choose`,body),
 claimEvent:(runId:string)=>mutate<CoopEventRunServerProjection>(`/coop/event-runs/${runId}/claim`,{requestId:coopRequestId()}),
 vote:(runId:string,body:CoopDecisionBody)=>mutate<CoopRunView>(`/coop/runs/${runId}/vote`,body),
 ready:(checkId:string,body:CoopReadyBody)=>mutate<LiveReadyView>(`/coop/ready/${checkId}`,body),
 chat:(partyId:string,text:string)=>request<{ok:boolean;body?:string}>(`/coop/parties/${partyId}/chat`,'POST',{requestId:`chat-${Date.now()}`,text}),
 hasPending:async()=>(await journal()).pending(),
 retryPending:async()=>(await journal()).execute(),
 shareEcho:(expectedVersion:number,share:boolean)=>mutate<{sharing:boolean}>('/coop/echo',{requestId:coopRequestId(),expectedVersion,share}),
 rewards:async(runId:string)=>{if(!supabase)throw new Error('Sign in first.');const {data,error}=await supabase.from('coop_reward_entitlements').select('id,claimed_at,reward_json').eq('run_id',runId);if(error)throw error;return data??[];},
 claim:async(id:string)=>{if(!supabase)throw new Error('Sign in first.');const {data,error}=await supabase.rpc('claim_coop_reward',{p_entitlement_id:id,p_request_id:coopRequestId()});if(error)throw error;return data as {marks:number};},
};
