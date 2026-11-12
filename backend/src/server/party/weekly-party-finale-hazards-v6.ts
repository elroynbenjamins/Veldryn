/**
 * Party Events v6 -- hidden finale family-hazard prototype.
 *
 * This module is NOT imported by the authoritative Day 8 settlement or any
 * endpoint. It supplies deterministic, real combat-engine abilities for
 * replay/calibration of the four event families and both route ballots.
 * No EP, rewards, supplies, achievements or leaderboard writes occur here.
 */
import {simulateCombat} from '../combat/engine';
import type {AbilityDefinition,CombatantDefinition,CombatResult,DamageType} from '../combat/types';
import {WEEKLY_PARTY_EVENT_FAMILIES,type WeeklyPartyFamily} from './weekly-party-events-v2';

export const PARTY_EVENT_FINALE_HAZARDS_V6_RELEASED=false;

type FamilyMetric='escort_integrity'|'tracking_marks'|'ward_stability'|'seal_pressure';
type Pair=readonly [string,string];
interface FamilyHazardConfig{
 metric:FamilyMetric;
 name:string;
 stage2:Pair;stage3:Pair;
 first:{name:string;type:DamageType;coeff:number;cooldownMs:number;castTimeMs:number};
 second:{name:string;type:DamageType;coeff:number;cooldownMs:number;castTimeMs:number};
 counterplay:string;
}
const FAMILY_HAZARDS:Readonly<Record<WeeklyPartyFamily,FamilyHazardConfig>>={
 broken_caravan:{
  metric:'escort_integrity',name:'Raider charge and cargo breach',
  stage2:['safe_pass','fast_pass'],stage3:['brace_wagons','disrupt_raiders'],
  first:{name:'Telegraphed Raider Charge',type:'physical',coeff:.50,cooldownMs:17000,castTimeMs:3600},
  second:{name:'Cargo Breach',type:'physical',coeff:.38,cooldownMs:29000,castTimeMs:4200},
  counterplay:'Brace with supplies, shield or heal through a charge, or race the convoy threat',
 },
 nightfall_hunt:{
  metric:'tracking_marks',name:'Howl and exposed prey',
  stage2:['clear_trail','shadow_trail'],stage3:['hold_ground','hunt_alpha'],
  first:{name:'Nightfall Howl',type:'shadow',coeff:.43,cooldownMs:18000,castTimeMs:4100},
  second:{name:'Tracking Mark',type:'shadow',coeff:.31,cooldownMs:28000,castTimeMs:3500},
  counterplay:'Prepare against the howl or exploit a short vulnerability opening',
 },
 broken_wards:{
  metric:'ward_stability',name:'Runestone pulse and ward overload',
  stage2:['ground_spires','charge_sigils'],stage3:['protect_wards','overload_wards'],
  first:{name:'Runestone Pulse',type:'arcane',coeff:.47,cooldownMs:19000,castTimeMs:4300},
  second:{name:'Ward Overload',type:'arcane',coeff:.37,cooldownMs:31000,castTimeMs:4500},
  counterplay:'Stabilize with defenses and provisions or break the ward before overcharge',
 },
 lost_reliquary:{
  metric:'seal_pressure',name:'Mirrored sweep and seal overflow',
  stage2:['quiet_passage','deep_passage'],stage3:['preserve_seals','break_seals'],
  first:{name:'Mirrored Sweep',type:'nature',coeff:.45,cooldownMs:18000,castTimeMs:3800},
  second:{name:'Seal Overflow',type:'nature',coeff:.42,cooldownMs:30000,castTimeMs:4500},
  counterplay:'Preserve seals with protection or take a faster, riskier opening',
 },
};
export interface HiddenPartyFinaleHazardInput{
 family:WeeklyPartyFamily;
 variation:string;
 stage2Choice:string;
 stage3Choice:string;
 tier:number;
 baseline:CombatantDefinition;
}
export interface HiddenPartyFinaleHazard{
 readonly kind:'non_rewarding_hazard_preview';
 readonly metric:FamilyMetric;
 readonly name:string;
 readonly counterplay:string;
 readonly telegraphs:readonly {abilityId:string;castTimeMs:number}[];
 readonly boss:CombatantDefinition;
}
/**
 * Both options are viable: defensive paths reduce incoming hazard pressure at
 * a small HP cost; aggressive paths shorten the fight but add pressure.
 * These are DRAFT factors, explicitly uncalibrated, and never affect v5 payout.
 * Variation changes telegraph cadence only, not boss HP/attack/rewards.
 */
export function buildHiddenPartyFinaleHazard(input:HiddenPartyFinaleHazardInput):HiddenPartyFinaleHazard{
 const config=FAMILY_HAZARDS[input.family];
 const family=WEEKLY_PARTY_EVENT_FAMILIES[input.family];
 if(!config||!family||!family.variations.includes(input.variation))
  throw Error('party_finale_invalid_family_variation');
 if(!Number.isInteger(input.tier)||input.tier<1||input.tier>12)
  throw Error('party_finale_invalid_tier');
 if(!config.stage2.includes(input.stage2Choice)||!config.stage3.includes(input.stage3Choice))
  throw Error('party_finale_unresolved_vote');
 if(input.baseline.team!=='enemies'||!input.baseline.boss)
  throw Error('party_finale_invalid_server_boss');
 const defensive=(input.stage2Choice===config.stage2[0]?1:0)
  +(input.stage3Choice===config.stage3[0]?1:0);
 // 2 defensive: 0.92 incoming hazard / 1.04 HP; 2 aggressive: 1.08 / 0.96.
 const hazardPressure=1.08-.08*defensive;
 const bossHp=1-.02*(2-defensive)+.02*defensive;
 const variantIndex=family.variations.indexOf(input.variation);
 const abilities:AbilityDefinition[]=[config.first,config.second].map((a,index):AbilityDefinition=>({
  id:'PE_V6_'+input.family.toUpperCase()+'_'+(index===0?'WARNING':'PRESSURE'),
  name:a.name,
  cooldownMs:a.cooldownMs+variantIndex*600,
  castTimeMs:a.castTimeMs,
  target:index===0?'all_enemies':'current_target',
  priority:index===0?91:86,
  interruptible:true,
  effects:[{kind:'damage',damageType:a.type,coeff:a.coeff*hazardPressure}],
 }));
 const baseline=structuredClone(input.baseline);
 const boss:CombatantDefinition={
  ...baseline,
  stats:{...baseline.stats,maxHp:Math.max(1,Math.round(baseline.stats.maxHp*bossHp))},
  abilities:[...baseline.abilities,...abilities],
 };
 return {
  kind:'non_rewarding_hazard_preview',metric:config.metric,name:config.name,
  counterplay:config.counterplay,
  telegraphs:abilities.map(ability=>({abilityId:ability.id,castTimeMs:ability.castTimeMs})),
  boss,
 };
}
/** Simulates existing verified combat actors. The result is TEST-ONLY. */
export function previewHiddenPartyFinaleHazardFight(input:{
 hazard:HiddenPartyFinaleHazard;
 players:readonly CombatantDefinition[];
 seed:string;
 maxDurationMs?:number;
}):{kind:'non_rewarding_hazard_preview';combat:CombatResult;hazardCasts:number;hazardInterrupts:number}{
 if(input.players.length<2||input.players.length>4
  ||new Set(input.players.map(p=>p.id)).size!==input.players.length
  ||input.players.some(p=>p.team!=='players'||p.role==='enemy'))
  throw Error('party_finale_invalid_roster');
 if(!input.seed)throw Error('party_finale_invalid_seed');
 const result=simulateCombat({seed:input.seed,players:input.players.map(p=>structuredClone(p)),
  enemies:[structuredClone(input.hazard.boss)],maxDurationMs:input.maxDurationMs??90000});
 const ids=new Set(input.hazard.telegraphs.map(t=>t.abilityId));
 const hazardCasts=result.events.filter(e=>e.type==='cast_start'&&ids.has(e.abilityId??'')).length;
 const hazardInterrupts=result.events.filter(e=>e.type==='interrupt'&&ids.has(e.interruptedAbilityId??'')).length;
 return {kind:'non_rewarding_hazard_preview',combat:result,hazardCasts,hazardInterrupts};
}
