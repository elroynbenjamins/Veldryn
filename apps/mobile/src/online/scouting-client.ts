import {versionedFetch as fetch} from './versioned-fetch';
import {supabase} from './supabase';
import type {ScoutingClaimResult,ScoutingDispatchCommand,ScoutingDispatchResult,ScoutingSnapshotProjection} from '../../../../backend/src/server/exploration/scouting-types';
declare const process:{env:Record<string,string|undefined>};
const base=(process.env.EXPO_PUBLIC_SCOUTING_API_URL??process.env.EXPO_PUBLIC_PROFILE_API_URL??process.env.EXPO_PUBLIC_COOP_API_URL)?.replace(/\/$/,'');
export const scoutingOnlineConfigured=Boolean(process.env.EXPO_PUBLIC_SCOUTING_2==='true'&&base&&supabase);
async function request<T>(path:string,init?:RequestInit){
 if(!scoutingOnlineConfigured||!base||!supabase)throw Error('Scouting 2.0 server is not configured.');
 const session=(await supabase.auth.getSession()).data.session;if(!session)throw Error('Sign in to use Scouting.');
 const response=await fetch(base+path,{...init,headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json',...(init?.headers??{})}});
 const payload=await response.json();if(!response.ok)throw Error(payload?.message??payload?.code??'Scouting request failed.');return payload as T;
}
export const scoutingClient={
 snapshot:(characterId:string)=>request<ScoutingSnapshotProjection>(`/scouting?characterId=${encodeURIComponent(characterId)}`),
 dispatch:(characterId:string,command:ScoutingDispatchCommand,requestId:string)=>request<ScoutingDispatchResult>(`/scouting/dispatch?characterId=${encodeURIComponent(characterId)}`,{method:'POST',body:JSON.stringify({...command,requestId})}),
 claim:(characterId:string,assignmentId:string,requestId:string)=>request<ScoutingClaimResult>(`/scouting/claim?characterId=${encodeURIComponent(characterId)}`,{method:'POST',body:JSON.stringify({assignmentId,requestId})}),
};
