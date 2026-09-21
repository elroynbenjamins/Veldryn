import {supabase} from './supabase';
declare const process:{env:Record<string,string|undefined>};
const url=process.env.EXPO_PUBLIC_SUPABASE_URL;
const key=process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export type RegionalCombatKindV1='standard'|'elite'|'regional_boss';
export interface RegionalCombatEncounterV1{
 id:string;zoneId:'ZONE_006'|'ZONE_007'|'ZONE_008'|'ZONE_009'|'ZONE_010';kind:RegionalCombatKindV1;
 name:string;level:number;contentId:string;summary:string;
}
export const SUNSCAR_REGIONAL_ENCOUNTERS_V1:readonly RegionalCombatEncounterV1[]=[
 {id:'REGCOM_SUN_006_STANDARD',zoneId:'ZONE_006',kind:'standard',name:'Saffron Gate Patrol',level:25,contentId:'SUNMON_001',summary:'A representative Sunscar patrol encounter using your verified current loadout.'},
 {id:'REGCOM_SUN_007_ELITE',zoneId:'ZONE_007',kind:'elite',name:'Sunspine Elite',level:32,contentId:'SUNMON_005',summary:'Hunt the Sunspine Scorpion elite. Eligible clears advance the ZONE_007 Gem pity track.'},
 {id:'REGCOM_SUN_008_ELITE',zoneId:'ZONE_008',kind:'elite',name:'Mirage Basin Elite',level:38,contentId:'SUNMON_010',summary:'Challenge the Shimmer Wraith elite and its arcane pressure.'},
 {id:'REGCOM_SUN_009_ELITE',zoneId:'ZONE_009',kind:'elite',name:'Observatory Elite',level:43,contentId:'SUNMON_014',summary:'Face the Void Lens elite beneath the Buried Observatory.'},
 {id:'REGCOM_SUN_010_BOSS',zoneId:'ZONE_010',kind:'regional_boss',name:'The Sand Tyrant',level:45,contentId:'BOSS_002',summary:'Sunscar regional boss. Verified victories can award Grade III Effect Gems, recipes and Regional Catalysts.'},
] as const;

export interface RegionalCombatResultV1{
 receiptId:string;
 result:{receiptId:string;victory:boolean;reason:'victory'|'wipe'|'timeout';durationMs:number;eventDigest:string;damageDone:number;healingDone:number;playerHp:number;enemyHp:number};
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
  const payload=await response.json();if(!response.ok){const code=String(payload.error??'');const friendly:Record<string,string>={regional_story_locked:'Advance the Sunscar story before challenging this encounter.',regional_zone_not_active:'This Sunscar zone is not active on the server yet.',regional_encounter_not_active:'This regional encounter is not active on the server yet.',character_below_level:'Raise your character level before challenging this encounter.',illegal_equipment:'Your current equipment loadout is not eligible for this encounter.',character_not_owned:'Switch back to the selected character and retry.'};throw new Error(friendly[code]??payload.error??'Regional combat unavailable.');}
  return payload;
 }finally{clearTimeout(timeout);}
}
export async function startRegionalCombatV1(characterId:string,encounterId:string){
 const requestId=`regional-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
 return request('/regional-combat',{method:'POST',body:JSON.stringify({requestId,characterId,encounterId})}) as Promise<{receiptId:string;encounterId:string;zoneId:string;kind:RegionalCombatKindV1;contentId:string;status:'ready_to_resolve'}>;
}
export async function resolveRegionalCombatV1(receiptId:string){return request('/regional-combat/'+encodeURIComponent(receiptId),{method:'GET'}) as Promise<RegionalCombatResultV1>;}
export async function runRegionalCombatV1(characterId:string,encounterId:string){const started=await startRegionalCombatV1(characterId,encounterId);return resolveRegionalCombatV1(started.receiptId);}
