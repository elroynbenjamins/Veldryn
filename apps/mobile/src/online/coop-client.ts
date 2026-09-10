import {supabase} from './supabase';
import type {CoopMode,CoopRunView} from '../core/coop-presentation';
import type {CoopDungeonProjection} from '../core/coop-dungeon-browsing';
import type {CoopLoadoutProjection} from '../core/coop-loadout-presentation';
import type {CoopQModeServerProjection} from '../core/coop-qmode';
import type {CoopEventExpeditionPreview} from '../core/coop-event-expeditions';
declare const process:{env:Record<string,string|undefined>};
const apiBase=process.env.EXPO_PUBLIC_COOP_API_URL?.replace(/\/$/,'');
export const coopRogueliteEnabled=process.env.EXPO_PUBLIC_COOP_ROGUELITE_V1==='true';
export const coopOnlineConfigured=Boolean(coopRogueliteEnabled&&apiBase&&supabase);
export interface CoopEntryData {dungeons:CoopDungeonProjection[];eventExpeditions?:CoopEventExpeditionPreview[];loadouts:CoopLoadoutProjection[];activeRun?:CoopRunView;}
export interface CoopStartBody {requestId:string;dungeonId:string;tier:1|2|3|4|5;characterId:string;loadoutId:string;loadoutRevision:number;}
export interface CoopDecisionBody {requestId:string;decisionId:string;decisionRevision:number;optionId:string;}
export interface CoopReadyBody {requestId:string;rosterRevision:number;accept:boolean;}
async function request<T>(path:string,method='GET',body?:unknown):Promise<T>{
 if(!supabase||!apiBase)throw new Error('Co-op server is not configured.');
 const session=(await supabase.auth.getSession()).data.session;if(!session)throw new Error('Sign in to use co-op expeditions.');
 const response=await fetch(`${apiBase}${path}`,{method,headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const payload=await response.json();if(!response.ok)throw new Error(payload?.message??payload?.code??'Co-op request failed.');return payload as T;
}
export const coopClient={
 entry:()=>request<CoopEntryData>('/coop/entry'),
 start:(mode:CoopMode,body:CoopStartBody)=>request<CoopRunView|CoopQModeServerProjection|{ticketId:string;status:string}>(mode==='qmode'?'/coop/qmode':'/coop/queue','POST',body),
 run:(runId:string)=>request<CoopRunView|CoopQModeServerProjection>(`/coop/runs/${runId}`),
 choose:(runId:string,body:CoopDecisionBody)=>request<CoopRunView>(`/coop/runs/${runId}/choose`,'POST',body),
 vote:(runId:string,body:CoopDecisionBody)=>request<CoopRunView>(`/coop/runs/${runId}/vote`,'POST',body),
 ready:(checkId:string,body:CoopReadyBody)=>request<CoopRunView|{status:string}>(`/coop/ready/${checkId}`,'POST',body),
 chat:(partyId:string,text:string)=>request<{ok:boolean;body?:string}>(`/coop/parties/${partyId}/chat`,'POST',{requestId:`chat-${Date.now()}`,text}),
};
