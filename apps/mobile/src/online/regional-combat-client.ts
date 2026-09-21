import {supabase} from './supabase';
declare const process:{env:Record<string,string|undefined>};

const supabaseUrl=process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/,'');
const anonKey=process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY??'';
export const regionalCombatEnabled=process.env.EXPO_PUBLIC_REGIONAL_COMBAT_V1==='true'&&Boolean(supabaseUrl&&anonKey&&supabase);

export type RegionalCombatKind='enemy'|'elite'|'regional_boss';
export interface RegionalCombatReplayCue{
  atMs:number;type:'action'|'phase'|'cast'|'victory'|'wipe'|'timeout';actorId?:string;targetId?:string;abilityId?:string;amount?:number;
}
export interface RegionalCombatResult{
  success:boolean;encounterId:string;sourceId:string;kind:RegionalCombatKind;reason:'victory'|'wipe'|'timeout';durationMs:number;playerHp:number;
  enemyHp:Record<string,number>;damageDone:number;healingDone:number;eventDigest:string;eventCount:number;replayCues:RegionalCombatReplayCue[];
}
export interface RegionalCombatRun{
  runId:string;status:'started'|'completed'|'failed'|'expired';encounterId:string;sourceId:string;kind:RegionalCombatKind;characterId:string;expiresAtMs:number;
  result?:RegionalCombatResult;reward?:{eligible?:boolean;duplicate?:boolean;sourceId?:string;gemItemId?:string;pityTriggered?:boolean;recipeUnlockedId?:string;duplicateRecipeDust?:number;regionalCatalysts?:number};
  state?:unknown;version?:number;
}
export const regionalCombatRequestId=()=>`regional-${Date.now()}-${Math.random().toString(36).slice(2,12)}`;

async function request<T>(path:string,method='GET',body?:unknown):Promise<T>{
 if(!regionalCombatEnabled||!supabase||!supabaseUrl)throw new Error('Regional combat server is not configured.');
 const session=(await supabase.auth.getSession()).data.session;if(!session)throw new Error('Sign in to use regional combat.');
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),25000);
 try{
  const response=await fetch(`${supabaseUrl}/functions/v1/regional-combat${path}`,{method,signal:controller.signal,headers:{Authorization:`Bearer ${session.access_token}`,apikey:anonKey,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  const payload=await response.json();if(!response.ok)throw new Error(payload?.error??payload?.message??'Regional combat request failed.');return payload as T;
 }finally{clearTimeout(timeout);}
}
export const regionalCombatClient={
 start:(expectedVersion:number,encounterId:string,requestId=regionalCombatRequestId())=>request<RegionalCombatRun>('/start','POST',{requestId,expectedVersion,encounterId}),
 run:(runId:string)=>request<RegionalCombatRun>(`/runs/${runId}`),
 resolve:(runId:string)=>request<RegionalCombatRun>(`/runs/${runId}/resolve`,'POST',{}),
};
