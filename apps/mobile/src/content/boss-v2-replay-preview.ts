/**
 * Hidden-only, read-only Bosses 2.0 replay projection.
 * Input must originate from a server-verified persisted SOLO V2 encounter.
 * This projection is never a rules engine or an authority boundary.
 * No wall-clock extrapolation: countdown advances only with server replay cursor.
 */
import {BOSS_V2_CAST_IDS} from './boss-v2-preview-locales';

// Typed map kept distinct from game data. No user-authored ability name may be
// used to add UI authority or alter combat outcomes.
export const BOSS_V2_PRESENTATION_IDS:Readonly<Record<string,Readonly<{
 casts:readonly string[];phases:readonly string[];
}>>>={
 BOSS_EXP_ROOT:{casts:['ROOT_V2_LIVING_BARK'],
  phases:['ROOT_V2_PHASE_70','ROOT_V2_PHASE_35']},
 BOSS_EXP_BELL:{casts:['BELL_V2_SOUL_CURSE','BELL_V2_VEIL_MIRROR'],
  phases:['BELL_V2_PHASE_70','BELL_V2_PHASE_35']},
 BOSS_EXP_SOLAR:{casts:['SOLAR_V2_SUNFALL'],
  phases:['SOLAR_V2_PHASE_70','SOLAR_V2_PHASE_35']},
 BOSS_EXP_SPHINX:{casts:['SPHINX_V2_MIRAGE'],
  phases:['SPHINX_V2_PHASE_70','SPHINX_V2_PHASE_35']},
 BOSS_EXP_BELLBEAST:{casts:['BELLBEAST_V2_SHATTER'],
  phases:['BELLBEAST_V2_PHASE_70','BELLBEAST_V2_PHASE_35']},
 BOSS_EXP_CANTOR:{casts:['CANTOR_V2_DISSONANCE'],
  phases:['CANTOR_V2_PHASE_70','CANTOR_V2_PHASE_35']},
};
export interface BossV2SafeCast {
 readonly abilityId:string;readonly castMs:number;readonly interruptible:boolean;
 // Authored source labels intentionally NOT used for client UI; localized IDs only.
 readonly name:string;readonly tell:string;readonly counter:string;readonly fallback:string;
}
export interface BossV2SafePreview{
 readonly bossId:string;readonly bossName:string;
 readonly casts:readonly BossV2SafeCast[];
 readonly phases:readonly {phaseId:string;name:string;hpPercent:number}[];
}
export interface BossV2ReplayEvent{
 readonly atMs:number;readonly type:string;
 readonly actorId?:string;readonly targetId?:string;
 readonly abilityId?:string;readonly interruptedAbilityId?:string;
}
export interface BossV2ReplayView{
 readonly currentCast:null|{abilityId:string;remainingMs:number;durationMs:number};
 readonly latestPhase:null|{phaseId:string;hpPercent:number};
 readonly currentAtMs:number;
}
const safeInt=(n:unknown)=>Number.isSafeInteger(n)&&(n as number)>=0;
export function projectBossV2Replay(
 preview:BossV2SafePreview|null,
 events:readonly BossV2ReplayEvent[],serverCursorMs:number,
):BossV2ReplayView|null{
 if(!preview||!Array.isArray(preview.casts)||!Array.isArray(preview.phases)||
    !Array.isArray(events)||events.length>5000||!safeInt(serverCursorMs)||
    serverCursorMs>180000)return null;
 const expected=BOSS_V2_PRESENTATION_IDS[preview.bossId];
 if(!expected||preview.casts.length!==expected.casts.length||
    preview.phases.length!==2||
    preview.casts.some((c,i)=>c.abilityId!==expected.casts[i]||
      !(BOSS_V2_CAST_IDS as readonly string[]).includes(c.abilityId)||
      !safeInt(c.castMs)||c.castMs<1100||c.castMs>5000||
      typeof c.interruptible!=='boolean')||
    preview.phases.some((p,i)=>p.phaseId!==expected.phases[i]||
      p.hpPercent!==(i===0?70:35)))return null;
 let at=-1;
 let pending:null|{abilityId:string;startedAt:number;endsAt:number}=null;
 let latestPhase:null|{phaseId:string;hpPercent:number}=null;
 for(const event of events){
  if(!event||!safeInt(event.atMs)||event.atMs<at||event.atMs>180000)
   return null;
  at=event.atMs;
  if(event.atMs>serverCursorMs)continue;
  if(event.actorId===preview.bossId&&event.type==='cast_start'){
   const cast=preview.casts.find(c=>c.abilityId===event.abilityId);
   if(cast){
    pending={abilityId:cast.abilityId,startedAt:event.atMs,
     endsAt:event.atMs+cast.castMs};
   }
  }else if(event.actorId===preview.bossId&&
      event.type==='cast_complete'&&pending?.abilityId===event.abilityId){
   pending=null;
  }else if(event.type==='interrupt'&&event.targetId===preview.bossId&&
      pending?.abilityId===event.interruptedAbilityId){
   pending=null;
  }else if(event.actorId===preview.bossId&&
      (event.type==='death'||event.type==='down')){
   pending=null;
  }else if(event.actorId===preview.bossId&&event.type==='phase'){
   const phase=preview.phases.find(p=>p.phaseId===event.abilityId);
   if(phase)latestPhase={phaseId:phase.phaseId,hpPercent:phase.hpPercent};
  }
 }
 const currentCast=pending===null?null:{
  abilityId:pending.abilityId,
  durationMs:pending.endsAt-pending.startedAt,
  remainingMs:Math.max(0,pending.endsAt-serverCursorMs),
 };
 return {currentCast,latestPhase,currentAtMs:serverCursorMs};
}
