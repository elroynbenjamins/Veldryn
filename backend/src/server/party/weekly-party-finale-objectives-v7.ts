/**
 * Hidden Party Events v7 -- objective meters and companion impact from the
 * REAL deterministic combat event stream, not pre-calculated power guesses.
 *
 * Pure replay telemetry only. A settlement worker must not import this for EP,
 * boss victory, payouts or server-account mutation without a separate review.
 */
import type {CombatantDefinition,CombatResult,CombatEvent} from '../combat/types';
import type {WeeklyPartyFamily} from './weekly-party-events-v2';
import type {HiddenPartyFinaleHazard} from './weekly-party-finale-hazards-v6';

export const PARTY_EVENT_FINALE_OBJECTIVES_V7_RELEASED=false;

export interface HiddenPartyCompanionContribution{
 ownerId:string;
 abilityIds:string[];
 damage:number;actualHealing:number;shieldCreated:number;interrupts:number;
}
export interface HiddenPartyFinaleObjectiveTrace{
 readonly kind:'non_rewarding_objective_replay';
 readonly family:WeeklyPartyFamily;
 readonly metric:'escort_integrity'|'tracking_marks'|'ward_stability'|'seal_pressure';
 readonly value:number;
 readonly positiveIsGood:boolean;
 readonly pressure:number;
 readonly hazardCastStarts:number;
 readonly hazardResolvedHits:number;
 readonly hazardInterrupts:number;
 readonly hazardDamage:number;
 readonly hazardShieldAbsorption:number;
 readonly effectiveHealing:number;
 readonly partyBossDamage:number;
 readonly companionContributions:readonly HiddenPartyCompanionContribution[];
 readonly cues:readonly {atMs:number;kind:'warning'|'interrupted'|'impact';text:string}[];
}
function safeAmount(value:number|undefined):number{
 return typeof value==='number'&&Number.isFinite(value)&&value>0?value:0;
}
const round=(n:number)=>Math.round(n*100)/100;
const clamped=(n:number)=>Math.max(0,Math.min(100,n));
/**
 * Objective pressure is reconstructed only from proven engine events:
 * - telegraphed hazard cast starts, and hazard damage that actually landed
 * - genuine boss interrupts, absorbed shield damage, real healing
 * - actual party damage against the boss, including companion-assist strikes.
 * A different companion matters only if its server-derived assist *fires*.
 * All three companion roles remain eligible; no class-specific switch.
 */
export function deriveHiddenPartyFinaleObjectiveReplay(input:{
 family:WeeklyPartyFamily;
 hazard:HiddenPartyFinaleHazard;
 players:readonly CombatantDefinition[];
 combat:CombatResult;
}):HiddenPartyFinaleObjectiveTrace{
 const {family,hazard,players,combat}=input;
 const metricByFamily={
  broken_caravan:'escort_integrity',
  nightfall_hunt:'tracking_marks',
  broken_wards:'ward_stability',
  lost_reliquary:'seal_pressure',
 } as const;
 if(!metricByFamily[family]||metricByFamily[family]!==hazard.metric)
  throw Error('party_finale_objective_mismatch');
 if(players.length<2||players.length>4
  ||new Set(players.map(p=>p.id)).size!==players.length
  ||players.some(p=>p.team!=='players'||p.role==='enemy')
  ||combat.players.length!==players.length)
  throw Error('party_finale_objective_invalid_roster');
 const playerIds=new Set(players.map(p=>p.id));
 const bossId=hazard.boss.id;
 const hazardIds=new Set(hazard.telegraphs.map(t=>t.abilityId));
 const totalHp=Math.max(1,players.reduce((s,p)=>s+p.stats.maxHp,0));
 const bossHp=Math.max(1,hazard.boss.stats.maxHp);
 const companions=new Map<string,HiddenPartyCompanionContribution>();
 const assistOwner=new Map<string,string>();
 for(const player of players){
  const abilities=player.abilities.filter(a=>a.tags?.includes('combat_companion'));
  if(abilities.length){
   companions.set(player.id,{ownerId:player.id,abilityIds:abilities.map(a=>a.id),
    damage:0,actualHealing:0,shieldCreated:0,interrupts:0});
   for(const ability of abilities)assistOwner.set(ability.id,player.id);
  }
 }
 let hazardCastStarts=0,hazardResolvedHits=0,hazardInterrupts=0,
  hazardDamage=0,hazardShieldAbsorption=0,effectiveHealing=0,partyBossDamage=0;
 const cues:HiddenPartyFinaleObjectiveTrace['cues'][number][]=[];
 // Server combat events are already ordered by engine time. Never synthesize a
 // cast / shield / heal if it was not observed in the resolution.
 for(const event of combat.events){
  if(event.type==='cast_start'&&event.actorId===bossId&&hazardIds.has(event.abilityId??'')){
   hazardCastStarts++;
   cues.push({atMs:event.atMs,kind:'warning',text:'Incoming '+(hazard.boss.abilities.find(a=>a.id===event.abilityId)?.name??'hazard')});
  }
  if(event.type==='interrupt'&&hazardIds.has(event.interruptedAbilityId??'')){
   hazardInterrupts++;
   cues.push({atMs:event.atMs,kind:'interrupted',text:'Hazard interrupted'});
  }
  if(event.type==='damage'&&event.actorId===bossId&&playerIds.has(event.targetId??'')
   &&hazardIds.has(event.abilityId??'')){
   hazardResolvedHits++;
   hazardDamage+=safeAmount(event.amount);
   hazardShieldAbsorption+=safeAmount(event.absorbed);
   cues.push({atMs:event.atMs,kind:'impact',text:'Party withstands the impact'});
  }
  if(event.type==='heal'&&playerIds.has(event.actorId??'')&&playerIds.has(event.targetId??'')){
   effectiveHealing+=safeAmount(event.amount);
  }
  if(event.type==='damage'&&playerIds.has(event.actorId??'')&&event.targetId===bossId)
   partyBossDamage+=safeAmount(event.amount);
  const companion=companions.get(assistOwner.get(event.abilityId??'')??'');
  if(companion){
   if(event.type==='damage'&&event.targetId===bossId)companion.damage+=safeAmount(event.amount);
   if(event.type==='heal')companion.actualHealing+=safeAmount(event.amount);
   if(event.type==='shield')companion.shieldCreated+=safeAmount(event.amount);
   if(event.type==='interrupt')companion.interrupts++;
  }
 }
 // Conservative, source-derived display-only pressure. This does not decide
 // victory or rewards: only the authoritative combat result may do that.
 const pressure=clamped(hazardCastStarts*6
  +hazardDamage/totalHp*95
  -hazardInterrupts*7
  -hazardShieldAbsorption/totalHp*45
  -effectiveHealing/totalHp*10
  -partyBossDamage/bossHp*4);
 const positiveIsGood=family==='broken_caravan'||family==='broken_wards';
 return {
  kind:'non_rewarding_objective_replay',family,metric:metricByFamily[family],
  value:round(positiveIsGood?clamped(100-pressure):pressure),
  positiveIsGood,pressure:round(pressure),
  hazardCastStarts,hazardResolvedHits,hazardInterrupts,
  hazardDamage:round(hazardDamage),hazardShieldAbsorption:round(hazardShieldAbsorption),
  effectiveHealing:round(effectiveHealing),partyBossDamage:round(partyBossDamage),
  companionContributions:[...companions.values()].map(row=>({
   ...row,damage:round(row.damage),actualHealing:round(row.actualHealing),
   shieldCreated:round(row.shieldCreated),
  })),
  cues,
 };
}
