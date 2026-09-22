import {supabase} from './supabase';
declare const process:{env:Record<string,string|undefined>};
const url=process.env.EXPO_PUBLIC_SUPABASE_URL;
const key=process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export {SUNSCAR_REGIONAL_ENCOUNTERS_V1} from '../core/regional-combat-catalog-v1';
export type {RegionalCombatEncounterV1,RegionalCombatKindV1} from '../core/regional-combat-catalog-v1';
import type {RegionalCombatCadenceStatusV1,RegionalCombatKindV1} from '../core/regional-combat-catalog-v1';

export interface RegionalCombatCadenceProjectionV1{
 serverNow:number;
 encounters:RegionalCombatCadenceStatusV1[];
}
export interface RegionalCombatResultV1{
 receiptId:string;
 result:{receiptId:string;victory:boolean;reason:'victory'|'wipe'|'timeout';durationMs:number;eventDigest:string;damageDone:number;healingDone:number;playerHp:number;playerMaxHp:number;playerName:string;enemyHp:number;enemyMaxHp:number;enemyName:string;replayCues:Array<{atMs:number;type:'cast'|'phase'|'interrupt'|'damage'|'heal'|'shield'|'down'|'victory'|'wipe'|'timeout';actorName?:string;targetName?:string;abilityName?:string;amount?:number;critical?:boolean;absorbed?:number}>};
 reward:null|{eligible:boolean;duplicate?:boolean;sourceId?:string;gemItemId?:string;pityTriggered?:boolean;recipeUnlockedId?:string;duplicateRecipeDust?:number;regionalCatalysts?:number};
 duplicate:boolean;
}
async function token(){
 if(!supabase||!url||!key)throw new Error('Online services are not configured.');
 const {data:{session},error}=await supabase.auth.getSession();if(error)throw error;
 if(!session)throw new Error('Please sign in again.');
 return session.access_token;
}
async function request(path:string,init:RequestInit){
 const accessToken=await token(),controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),30000);
 try{
  const response=await fetch(`${url}/functions/v1/gameplay${path}`,{...init,signal:controller.signal,headers:{Authorization:`Bearer ${accessToken}`,apikey:key!,'Content-Type':'application/json',...(init.headers??{})}});
  const payload=await response.json();if(!response.ok){const code=String(payload.error??'');const friendly:Record<string,string>={regional_story_locked:'Advance the Sunscar story before challenging this encounter.',regional_zone_not_active:'This Sunscar zone is not active on the server yet.',regional_encounter_not_active:'This regional encounter is not active on the server yet.',character_below_level:'Raise your character level before challenging this encounter.',illegal_equipment:'Your current equipment loadout is not eligible for this encounter.',character_not_owned:'Switch back to the selected character and retry.',regional_combat_cooldown:'This encounter is recovering. Try again shortly.',regional_boss_daily_cap:'Today’s Sand Tyrant clears are complete. The limit resets at 00:00 UTC.'};throw new Error(friendly[code]??payload.error??'Regional combat unavailable.');}
  return payload;
 }finally{clearTimeout(timeout);}
}
export async function fetchRegionalCombatCadenceV1(){return request('/regional-combat/status',{method:'GET'}) as Promise<RegionalCombatCadenceProjectionV1>;}
export async function startRegionalCombatV1(characterId:string,encounterId:string){
 const requestId=`regional-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
 return request('/regional-combat',{method:'POST',body:JSON.stringify({requestId,characterId,encounterId})}) as Promise<{receiptId:string;encounterId:string;zoneId:string;kind:RegionalCombatKindV1;contentId:string;status:'ready_to_resolve'}>;
}
export async function resolveRegionalCombatV1(receiptId:string){return request('/regional-combat/'+encodeURIComponent(receiptId),{method:'POST'}) as Promise<RegionalCombatResultV1>;}
export async function runRegionalCombatV1(characterId:string,encounterId:string){const started=await startRegionalCombatV1(characterId,encounterId);return resolveRegionalCombatV1(started.receiptId);}
