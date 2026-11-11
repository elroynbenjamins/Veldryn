import {versionedFetch as fetch} from './versioned-fetch';
import {supabase,supabasePublicEndpoint} from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {noteCoopEntryMutation} from '../core/coop-dungeon-browse-cache';
import {CoopCommandJournal,CoopRequestError,type PendingCoopCommand} from '../core/coop-command-journal';
import type {CoopMode,CoopRunView} from '../core/coop-presentation';
import type {DungeonMarksShopSnapshot} from '../core/dungeon-marks-shop-types';
import type {CoopDungeonProjection} from '../core/coop-dungeon-browsing';
import type {CoopLoadoutProjection} from '../core/coop-loadout-presentation';
import type {CoopQModeServerProjection} from '../core/coop-qmode';
import type {CoopEventExpeditionPreview,CoopEventRunServerProjection} from '../core/coop-event-expeditions';
import type {LiveQueueView,LiveReadyView} from '../core/coop-live-lobby';
import type {CoopLiveRecruitmentPost} from '../core/coop-live-recruitment';
declare const process:{env:Record<string,string|undefined>};
const isDevelopment=typeof __DEV__==='undefined'||__DEV__;
const productionApiBase=supabasePublicEndpoint?`${supabasePublicEndpoint.replace(/\/$/,'')}/functions/v1/coop`:undefined;
const apiBase=(process.env.EXPO_PUBLIC_COOP_API_URL??(!isDevelopment?productionApiBase:undefined))?.replace(/\/$/,'');
export const coopRogueliteEnabled=process.env.EXPO_PUBLIC_COOP_ROGUELITE_V1===undefined?!isDevelopment:process.env.EXPO_PUBLIC_COOP_ROGUELITE_V1==='true';
export const coopOnlineConfigured=Boolean(coopRogueliteEnabled&&apiBase&&supabase);
// Production has a deployed Live backend. An explicit false still provides an
// emergency build-time kill switch for either co-op surface.
export const coopLiveReadyEnabled=process.env.EXPO_PUBLIC_COOP_LIVE_READY_V1===undefined?!isDevelopment:process.env.EXPO_PUBLIC_COOP_LIVE_READY_V1==='true';
export interface CoopEntryData {rewardBudget?:{charges:number;chargeCapacity:number;weeklyRemaining:number;weeklyCapacity:number;nextChargeAtMs?:number|null;failureConsolationRemaining?:number;failureConsolationCapacity?:number};dungeons:CoopDungeonProjection[];eventExpeditions?:CoopEventExpeditionPreview[];loadouts:CoopLoadoutProjection[];liveRecruitment?:CoopLiveRecruitmentPost[];liveFellowshipRemaining?:number;serverNow?:number;activeRun?:CoopRunView;activeRunProjection?:CoopQModeServerProjection;activeEventRunProjection?:CoopEventRunServerProjection;echoSharing?:boolean;gameVersion?:number;}
export interface CoopStartBody {requestId:string;dungeonId:string;tier:1|2|3|4|5;characterId:string;loadoutId:string;loadoutRevision:number;}
export interface CoopQuickStartBody {requestId:string;characterId:string;loadoutId:string;loadoutRevision:number;}
export interface CoopLfgPublishBody {requestId:string;dungeonId:string;note?:string;}
export interface CoopEventStartBody {requestId:string;eventExpeditionId:string;tier?:1|2|3|4|5;characterId:string;loadoutId:string;loadoutRevision:number;}
export interface CoopDecisionBody {requestId:string;decisionId:string;decisionRevision:number;optionId:string;boonId?:string;}
export interface CoopMerchantPurchaseBody {requestId:string;expectedVersion:number;offerId:string;}
export interface CoopReadyBody {requestId:string;rosterRevision:number;accept:boolean;}
export interface CoopChatMessage {id:string;senderName:string;body:string;createdAt:number;}
export interface CoopChatResponse {sent:boolean;messageId?:string;messages:CoopChatMessage[];}
export interface CoopLiveRematchState {status:'open'|'committed'|'declined'|'expired';readyCheckId?:string|null;runId?:string|null;closesAtMs?:number|null;serverNow:number;members:Array<{accountId:string;characterId:string;role:'tank'|'damage'|'support';self:boolean;accepted:boolean}>;}
/** Never render an unstructured rejected value as "[object Object]" in a dungeon notice. */
export function coopErrorMessage(error:unknown,fallback='Dungeons are temporarily unavailable. Try again.'){
 const message=error instanceof Error?error.message:typeof error==='string'?error:undefined;
 if(message==='chapter_one_required')return 'Defeat the Fallen Knight (Chapter I) to unlock Sunscar dungeons.';
 if(message==='dungeon_level_requirement')return 'Requires level 10 for Asterfall or level 25 for Sunscar.';
 if(message==='dungeon_power_requirement')return 'Your Combat Power is below the selected dungeon tier requirement.';
 if(message==='dungeon_unavailable')return 'This dungeon is no longer open for new runs.';
 if(error instanceof Error&&error.message.trim())return error.message;
 if(typeof error==='string'&&error.trim())return error;
 if(error&&typeof error==='object'){
  const row=error as Record<string,unknown>;
  for(const key of ['message','error','code']){const value=row[key];if(typeof value==='string'&&value.trim())return value;}
 }
 return fallback;
}
async function request<T>(path:string,method='GET',body?:unknown,expectedAccount?:string):Promise<T>{
 if(!supabase||!apiBase||!coopOnlineConfigured)throw new Error('Co-op server is not configured.');
 const session=(await supabase.auth.getSession()).data.session;if(!session)throw new Error('Sign in to use co-op expeditions.');
 if(expectedAccount&&session.user.id!==expectedAccount)throw new Error('Please sign in again.');
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),25000);
 try{
  let response:Response;
  try{
   response=await fetch(`${apiBase}${path}`,{method,signal:controller.signal,headers:{Authorization:`Bearer ${session.access_token}`,apikey:process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY??'','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  }catch(error){
   if(error instanceof Error&&error.name==='AbortError')throw new CoopRequestError('Dungeon request timed out. Try again.');
   throw new CoopRequestError('Could not reach dungeons. Check your connection and try again.');
  }
  const payload=await response.json().catch(()=>null);
  if((await supabase.auth.getSession()).data.session?.user.id!==session.user.id)throw new Error('Account changed.');
  if(!response.ok){
   const message=response.status===503?(method==='GET'?'Dungeons are temporarily unavailable. Try again.':'Could not confirm the co-op action. Retry it.'):response.status===401?'Session expired. Sign in again.':payload?.error??payload?.message??payload?.code??'Co-op request failed.';
   throw new CoopRequestError(message,response.status>=400&&response.status<500&&![408,426,429].includes(response.status));
  }
  if(payload===null)throw new CoopRequestError('Invalid dungeon server response. Try again.');
  return payload as T;
 }finally{clearTimeout(timeout);}
}
const journals=new Map<string,CoopCommandJournal>();
async function journal(){
 const accountId=(await supabase?.auth.getSession())?.data.session?.user.id;if(!accountId)throw new Error('Sign in to use co-op expeditions.');
 let value=journals.get(accountId);if(!value){const key=`veldryn.coop.pending.${accountId}`;value=new CoopCommandJournal({read:async()=>{const raw=await AsyncStorage.getItem(key);return raw?JSON.parse(raw):null;},write:async command=>{if(command)await AsyncStorage.setItem(key,JSON.stringify(command));else await AsyncStorage.removeItem(key);}},command=>request(command.path,'POST',command.body,accountId));journals.set(accountId,value);}return value;
}
const mutate=async<T>(path:string,body:object)=>{
 // The request may settle even when the response times out. Invalidate
 // recent entry snapshots before submitting any gameplay mutation.
 noteCoopEntryMutation();
 return (await (await journal()).execute({path,body:body as PendingCoopCommand['body']})) as T;
};
export const coopRequestId=()=>`coop-${Date.now()}-${Math.random().toString(36).slice(2,12)}`;
async function publicProfilePower(accountId:string):Promise<{combatPower:number}|null>{
 if(!supabase||!apiBase)throw new Error('Profile score service is not configured.');
 const session=(await supabase.auth.getSession()).data.session;if(!session)throw new Error('Sign in to view player profiles.');
 const response=await fetch(`${apiBase}/coop/profiles/${accountId}/power`,{headers:{Authorization:`Bearer ${session.access_token}`,apikey:process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY??'','Content-Type':'application/json'}});
 const payload=await response.json();if(!response.ok)throw new Error(payload?.error??'Profile score unavailable.');
 return payload as {combatPower:number}|null;
}
export const coopClient={
 entry:()=>request<CoopEntryData>('/coop/entry'),
 dungeonMarksShop:()=>request<DungeonMarksShopSnapshot>('/coop/shop'),
 purchaseDungeonMarksShop:(offerId:string,requestId:string)=>mutate<{status:'purchased'|'already_owned';balance:number}>('/coop/shop',{offerId,requestId}),
 profilePower:publicProfilePower,
 liveQueue:()=>request<LiveQueueView>('/coop/queue'),
 liveRecruitment:()=>request<CoopLiveRecruitmentPost[]>('/coop/lfg'),
 joinLive:(body:CoopStartBody)=>mutate<LiveQueueView>('/coop/queue',body),
 quickLive:(body:CoopQuickStartBody)=>mutate<LiveQueueView>('/coop/quick-queue',body),
 publishLiveRecruitment:(body:CoopLfgPublishBody)=>mutate<CoopLiveRecruitmentPost>('/coop/lfg',body),
 closeLiveRecruitment:()=>mutate<{closed:boolean}>('/coop/lfg/close',{requestId:coopRequestId()}),
 heartbeatLive:(ticketId:string)=>request(`/coop/queue/${ticketId}/heartbeat`,'POST',{requestId:coopRequestId()}),
 cancelLive:(ticketId:string)=>mutate(`/coop/queue/${ticketId}/cancel`,{requestId:coopRequestId()}),
 liveReady:(checkId:string)=>request<LiveReadyView>(`/coop/ready/${checkId}`),
 start:(mode:CoopMode,body:CoopStartBody)=>mutate<CoopRunView|CoopQModeServerProjection|{ticketId:string;status:string}>(mode==='qmode'?'/coop/qmode':'/coop/queue',body),
 startEvent:(body:CoopEventStartBody)=>mutate<CoopEventRunServerProjection>('/coop/event-expeditions',body),
 run:(runId:string)=>request<CoopRunView|CoopQModeServerProjection>(`/coop/runs/${runId}`),
 eventRun:(runId:string)=>request<CoopEventRunServerProjection>(`/coop/event-runs/${runId}`),
 purchaseMerchant:(runId:string,body:CoopMerchantPurchaseBody)=>mutate<CoopQModeServerProjection>(`/coop/runs/${runId}/merchant`,body),
 useHealingPotion:(runId:string)=>mutate<CoopQModeServerProjection>(`/coop/runs/${runId}/potion`,{requestId:coopRequestId()}),
 prepareTonic:(runId:string,potionId:string)=>mutate<CoopQModeServerProjection>(`/coop/runs/${runId}/tonic`,{requestId:coopRequestId(),potionId}),
 choose:(runId:string,body:CoopDecisionBody)=>mutate<CoopQModeServerProjection>(`/coop/runs/${runId}/choose`,body),
 chooseEvent:(runId:string,body:CoopDecisionBody)=>mutate<CoopEventRunServerProjection>(`/coop/event-runs/${runId}/choose`,body),
 claimEvent:(runId:string)=>mutate<CoopEventRunServerProjection>(`/coop/event-runs/${runId}/claim`,{requestId:coopRequestId()}),
 vote:(runId:string,body:CoopDecisionBody)=>mutate<CoopQModeServerProjection>(`/coop/runs/${runId}/vote`,body),
 ready:(checkId:string,body:CoopReadyBody)=>mutate<LiveReadyView>(`/coop/ready/${checkId}`,body),
 chat:(runId:string,text:string)=>request<CoopChatResponse>(`/coop/runs/${runId}/chat`,'POST',{requestId:coopRequestId(),text}),
 partyChat:(runId:string)=>request<CoopChatResponse>(`/coop/runs/${runId}/chat`),
 liveRematch:(runId:string)=>request<CoopLiveRematchState>(`/coop/runs/${runId}/rematch`),
 respondLiveRematch:(runId:string,accept:boolean)=>mutate<CoopLiveRematchState>(`/coop/runs/${runId}/rematch`,{requestId:coopRequestId(),accept}),
 hasPending:async()=>(await journal()).pending(),
 retryPending:async()=>{noteCoopEntryMutation();return (await journal()).execute();},
 shareEcho:(expectedVersion:number,share:boolean)=>mutate<{sharing:boolean}>('/coop/echo',{requestId:coopRequestId(),expectedVersion,share}),
 rewards:async(runId:string)=>{if(!supabase)throw new Error('Sign in first.');const {data,error}=await supabase.from('coop_reward_entitlements').select('id,claimed_at,reward_json').eq('run_id',runId);if(error)throw error;return data??[];},
 claim:async(id:string)=>{if(!supabase)throw new Error('Sign in first.');noteCoopEntryMutation();const {data,error}=await supabase.rpc('claim_coop_reward',{p_entitlement_id:id,p_request_id:coopRequestId()});if(error)throw error;return data as {marks:number;live_fellowship_bonus?:number;live_fellowship_applied?:boolean};},
};
