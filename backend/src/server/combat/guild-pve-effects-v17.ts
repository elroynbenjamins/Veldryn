/**
 * Guild PvE V17 — HIDDEN, phase-local effectful combat QA.
 *
 * The real deterministic Veldryn engine computes all damage, shields and
 * cleanses. Authored V13 cues can only mirror observed cast_start/complete
 * events. NOT wired into V9 persistent HP, the 36-beat runtime interpreter,
 * inventory, account allowances, guild Pressure or payouts.
 *
 * Tactics MUST come from server-verified frozen guild objective/boon state,
 * never player JSON. Charges returned here are *proposals*, not debits.
 */
import {createHash} from 'node:crypto';
import {simulateCombat} from './engine';
import type {AbilityDefinition,CombatEvent,CombatantDefinition} from './types';
import {GUILD_PVE_V8_MANIFEST} from './guild-pve-shared-v8';
import {
 draftBrokenForgeGuardianV7,verifyGuildPveReferenceV7,GUILD_PVE_V7_PHASES,
 type GuildPveBossV7,type GuildPvePhaseV7,type GuildPveDifficultyV7,
 type GuildPveReferenceV7,type GuildPveStanceV7,
} from './guild-pve-broken-forge-v7';
import {guildPveV13PhaseCues} from './guild-pve-cues-v13';

export const GUILD_PVE_V17_LIVE=false as const;
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
const round=(x:number)=>Number(Math.max(0,x).toFixed(2));
function fail(s:string):never{throw Error('guild_pve_v17_'+s);}
export type GuildPveV17Shrine='warding'|'cleansing'|'insight';
export interface GuildPveV17ServerTactics {
 /** Exact server-frozen node-cleared flags, NOT a list from the attacking user. */
 clearedNodes:Readonly<Record<string,boolean>>;
 pressure:number;
 shrineChoice:GuildPveV17Shrine|null;
 /** Owned, durable finite shared charge budgets still to be implemented. */
 protectionCharges:number;
 cleanseCharges:number;
 insightCharges:number;
}
export type GuildPveV17ObservedCue={
 id:string;abilityId:string;phase:GuildPvePhaseV7;
 kind:'warning'|'resolve';atMs:number;
};
type WarningPair={phase:GuildPvePhaseV7;warning:string;resolve:string;abilityId:string};
const PAIRS:readonly WarningPair[]=[
 {phase:'iron_skin',warning:'slam_warning',resolve:'slam_impact',abilityId:'GX_GATE_SLAM'},
 {phase:'gate_collapse',warning:'sunder_warning',resolve:'sunder_apply',abilityId:'GX_GATE_SUNDER'},
 {phase:'gate_collapse',warning:'rubble_warning',resolve:'rubble_impact',abilityId:'GX_GATE_RUBBLE'},
 {phase:'open_gate',warning:'charge_warning',resolve:'charge_impact',abilityId:'GX_GATE_CHARGE'},
 {phase:'ash_veil',warning:'ash_warning',resolve:'burn_apply',abilityId:'GX_SEER_ASH'},
 {phase:'curse_web',warning:'mark_warning',resolve:'mark_apply',abilityId:'GX_SEER_CURSE'},
 {phase:'curse_web',warning:'web_warning',resolve:'web_burst',abilityId:'GX_SEER_WEB'},
 {phase:'emberfall',warning:'eruption_warning',resolve:'eruption_resolve',abilityId:'GX_SEER_ERUPTION'},
 {phase:'armoured',warning:'plate_warning',resolve:'plate_impact',abilityId:'GX_WARDEN_STRIKE'},
 {phase:'overload',warning:'pressure_warning',resolve:'pressure_impact',abilityId:'GX_WARDEN_SHOCK'},
 {phase:'overload',warning:'slam_warning',resolve:'slam_impact',abilityId:'GX_WARDEN_BURN'},
 {phase:'exposed_core',warning:'detonation_warning',resolve:'detonation_resolve',abilityId:'GX_WARDEN_DETONATE'},
] as const;
const phaseOwner=(phase:GuildPvePhaseV7):GuildPveBossV7=>{
 const owner=(Object.keys(GUILD_PVE_V7_PHASES) as GuildPveBossV7[])
  .find(b=>GUILD_PVE_V7_PHASES[b].includes(phase));
 if(!owner)fail('unknown_phase');
 return owner;
};
export function verifyGuildPveV17CueBindings(){
 const seen=new Set<string>();
 for(const p of PAIRS){
  const cues=guildPveV13PhaseCues({
   phase:p.phase,boss:phaseOwner(p.phase),difficulty:'Scout',
  });
  if(!cues.some(c=>c.id.endsWith('.'+p.warning)&&c.kind==='warning')||
   !cues.some(c=>c.id.endsWith('.'+p.resolve)&&c.kind==='resolve')||
   seen.has(p.phase+':'+p.abilityId))
   fail('invalid_cue_mapping');
  seen.add(p.phase+':'+p.abilityId);
 }
 if(seen.size!==12)fail('incomplete_cue_bindings');
 return seen.size;
}
verifyGuildPveV17CueBindings();
export function observedGuildPveV17Cues(input:{
 boss:GuildPveBossV7;phase:GuildPvePhaseV7;
 enemyId:string;events:readonly CombatEvent[];
}):GuildPveV17ObservedCue[]{
 if(!GUILD_PVE_V7_PHASES[input.boss].includes(input.phase))fail('cue_phase_mismatch');
 const pairs=PAIRS.filter(p=>p.phase===input.phase);
 const pending=new Map<string,number>();
 const cues:GuildPveV17ObservedCue[]=[];
 for(const event of input.events){
  if(event.actorId!==input.enemyId||
   (event.type!=='cast_start'&&event.type!=='cast_complete'))continue;
  const pair=pairs.find(p=>p.abilityId===event.abilityId);
  if(!pair)continue;
  const key=pair.abilityId;
  const id=input.boss+'.'+input.phase+'.';
  if(event.type==='cast_start'){
   // Only an actual engine cast may produce the warning; no fake telegraphs.
   if(pending.has(key))fail('duplicate_cast_start');
   pending.set(key,event.atMs);
   cues.push({id:id+pair.warning,abilityId:key,phase:input.phase,
    kind:'warning',atMs:event.atMs});
  }else{
   if(!pending.has(key))fail('resolve_without_cast');
   if(event.atMs<pending.get(key)!)fail('time_order');
   pending.delete(key);
   cues.push({id:id+pair.resolve,abilityId:key,phase:input.phase,
    kind:'resolve',atMs:event.atMs});
  }
 }
 // Unfinished cast is intentionally a warning without a fabricated hit.
 return cues;
}
const prepAbility=(id:string,kind:'shield'|'cleanse',flat=0):AbilityDefinition=>({
 id,name:id,priority:140,cooldownMs:90_000,castTimeMs:0,target:'self',
 aiCondition:kind==='cleanse'?'ally_below_50_or_dot':'always',
 effects:kind==='shield'?[{kind:'shield',flat}]:[{kind:'cleanse'}],
});
function validateTactics(tactics:GuildPveV17ServerTactics){
 const manifest=new Map(GUILD_PVE_V8_MANIFEST.map(n=>[String(n.id),n] as const));
 if(!tactics||!tactics.clearedNodes||typeof tactics.clearedNodes!=='object'||
  !Number.isFinite(tactics.pressure)||tactics.pressure<0||tactics.pressure>100||
  ![null,'warding','cleansing','insight'].includes(tactics.shrineChoice)||
  ![tactics.protectionCharges,tactics.cleanseCharges,tactics.insightCharges]
    .every(n=>Number.isSafeInteger(n)&&n>=0&&n<=2))
  fail('invalid_tactics');
 const cleared=new Set<string>();
 for(const [id,val] of Object.entries(tactics.clearedNodes)){
  if(!manifest.has(id)||typeof val!=='boolean')fail('unknown_or_invalid_node');
  if(val)cleared.add(id);
 }
 if(!cleared.has('C1-01'))fail('missing_start');
 for(const id of cleared){
  const n=manifest.get(id)!;
  if(!n.all.every(p=>cleared.has(p))||
   (n.any?.length&&!n.any.some(p=>cleared.has(p))))
   fail('forged_objective_path');
 }
 if((tactics.shrineChoice!==null)!==cleared.has('C2-04'))
  fail('shrine_out_of_sync');
 if(tactics.shrineChoice!=='warding'&&tactics.protectionCharges>0&&
  !cleared.has('C2-03'))fail('orphan_protection_charge');
 if(tactics.shrineChoice!=='cleansing'&&tactics.cleanseCharges>0)
  fail('orphan_cleanse_charge');
 if(tactics.shrineChoice!=='insight'&&tactics.insightCharges>0)
  fail('orphan_insight_charge');
 return cleared;
}
function prepareV17Player(actor:CombatantDefinition,stance:GuildPveStanceV7){
 if(actor.team!=='players'||!['tank','damage','support'].includes(actor.role)||
  !Number.isFinite(actor.stats.attackPower)||actor.stats.attackPower<=0)
  fail('untrusted_actor');
 const player=structuredClone(actor);
 if(stance==='Assault')return player;
 if(stance==='Guard'){
  player.stats.attackPower*=.80;
  player.stats.defense*=1.20;
  player.abilities.unshift(prepAbility('GX_V7_GUARD','shield',player.stats.maxHp*.14));
  player.abilities[0].priority=130;
  player.abilities[0].cooldownMs=30_000;
  return player;
 }
 if(stance==='Rally'){
  player.stats.attackPower*=.75;
  player.stats.healingPower*=1.20;
  const rally=prepAbility('GX_V7_RALLY','cleanse');
  rally.priority=130;rally.cooldownMs=5500;
  rally.effects.push({kind:'heal',coeff:.55});
  player.abilities.unshift(rally);
  return player;
 }
 return fail('invalid_stance');
}
export interface GuildPveV17CombatProof {
 boss:GuildPveBossV7;phase:GuildPvePhaseV7;stance:GuildPveStanceV7;
 rawPlayerDamage:number;bossHpRemoved:number;playerHpLost:number;
 effectiveHealing:number;absorbedShield:number;cleanseEvents:number;
 survived:boolean;reason:'victory'|'wipe'|'timeout';
 observedCues:GuildPveV17ObservedCue[];
 appliedTactics:readonly string[];
 /** Spending these still needs a durable server-side guild action transaction. */
 proposedChargeUses:{protection:0|1;cleanse:0|1;insight:0|1};
 deterministicEvidenceHash:string;
 rewardMinted:false;inventorySpent:false;serverPersisted:false;
}
/** Diagnostics use the REAL engine, but do NOT commit to the V9 shared run. */
export function previewGuildPveV17EffectfulAttempt(input:{
 player:CombatantDefinition;
 boss:GuildPveBossV7;phase:GuildPvePhaseV7;stance:GuildPveStanceV7;
 difficulty:GuildPveDifficultyV7;reference:GuildPveReferenceV7;
 tactics:GuildPveV17ServerTactics;seed:string;
}):GuildPveV17CombatProof {
 verifyGuildPveReferenceV7(input.reference);
 if(!GUILD_PVE_V7_PHASES[input.boss]?.includes(input.phase)||
  typeof input.seed!=='string'||input.seed.length<4||input.seed.length>160)
  fail('invalid_encounter');
 const cleared=validateTactics(input.tactics);
 const boss=draftBrokenForgeGuardianV7(input);
 const player=prepareV17Player(input.player,input.stance);
 const applied:string[]=[];
 const effect=(id:string,apply:()=>void)=>{applied.push(id);apply()};
 const isFinal=input.boss==='warden';
 // Currently the older V7 engine has no armour-regeneration state: these
 // bounded defense reductions are explicitly PROXIES awaiting a real hook.
 if(isFinal&&cleared.has('C1-06'))effect('gatekeeper_armour_proxy',()=>{
  boss.stats.defense*=.90;
 });
 if(isFinal&&cleared.has('C2-02'))effect('armoury_armour_proxy',()=>{
  boss.stats.defense*=.90;
 });
 if(isFinal&&cleared.has('C2-06'))effect('seer_affliction_cooldown',()=>{
  boss.abilities=boss.abilities.map(a=>a.effects.some(f=>f.kind==='dot')?
   {...a,cooldownMs:Math.round(a.cooldownMs*1.20)}:a);
 });
 if(isFinal&&cleared.has('C3-04')&&input.phase==='exposed_core')
  effect('stabilizer_detonation_reduction',()=>{
   boss.abilities=boss.abilities.map(a=>a.id==='GX_WARDEN_DETONATE'?
    {...a,effects:a.effects.map(f=>f.kind==='damage'?
     {...f,coeff:(f.coeff??0)*.85}:f)}:a);
  });
 if(isFinal&&cleared.has('C3-05')&&input.phase==='exposed_core')
  effect('elite_exposed_window_proxy',()=>{boss.stats.defense*=.93});
 if(isFinal&&input.tactics.pressure>0)
  effect('pressure_attack_risk',()=>{boss.stats.attackPower*=
   1+clamp(input.tactics.pressure*.0015,0,.15)});
 // Real engine damage-taken debuff: at most three 9-second Sunder casts
 // can overlap in a typical 18-second encounter; the live cap needs tests.
 if(input.phase==='gate_collapse')
  effect('sunder_damage_taken_debuff',()=>{
   boss.abilities=boss.abilities.map(a=>a.id==='GX_GATE_SUNDER'?
    {...a,effects:[...a.effects,{
     kind:'debuff' as const,tag:'damage_taken',value:.04,durationMs:9000,
    }]}:a);
  });
 if(input.phase==='curse_web')
  effect('seer_mark_damage_taken',()=>{
   boss.abilities=boss.abilities.map(a=>a.id==='GX_SEER_CURSE'?
    {...a,effects:[...a.effects,{
     kind:'debuff' as const,tag:'damage_taken',value:.05,durationMs:6000,
    }]}:a);
  });
 if(cleared.has('C2-03')&&input.tactics.protectionCharges>0)
  effect('rescue_protection_shield',()=>{
   player.abilities.unshift(prepAbility(
    'GX_V17_RESCUE_WARD','shield',player.stats.maxHp*.12));
  });
 if(input.tactics.shrineChoice==='warding'&&input.tactics.protectionCharges>0)
  effect('shrine_warding',()=>{
   // One proposed protection charge can only trigger ONE ward source.
   player.abilities=player.abilities.filter(a=>a.id!=='GX_V17_RESCUE_WARD');
   player.abilities.unshift(prepAbility(
    'GX_V17_SHRINE_WARD','shield',player.stats.maxHp*.16));
  });
 if(input.tactics.shrineChoice==='cleansing'&&input.tactics.cleanseCharges>0)
  effect('shrine_cleanse',()=>{
   player.abilities.unshift(prepAbility('GX_V17_SHRINE_CLEANSE','cleanse'));
  });
 if(input.tactics.shrineChoice==='insight'&&input.tactics.insightCharges>0&&
  isFinal&&input.phase==='exposed_core')
  effect('shrine_exposed_insight',()=>{player.stats.attackPower*=1.08});
 const r=simulateCombat({
  seed:input.seed,players:[player],enemies:[boss],
  maxDurationMs:18_000,tickMs:100,
 });
 const self=r.players[0],enemy=r.enemies[0],events=r.events;
 const shieldEvents=events.filter(e=>
  e.type==='shield'&&e.actorId===player.id&&
  ['GX_V17_RESCUE_WARD','GX_V17_SHRINE_WARD'].includes(e.abilityId??''));
 const cleanseEvents=events.filter(e=>
  e.type==='status_remove'&&e.actorId===player.id&&
  e.abilityId==='GX_V17_SHRINE_CLEANSE');
 const insightUsed=applied.includes('shrine_exposed_insight')&&
  events.some(e=>e.type==='damage'&&e.actorId===player.id&&e.amount&&e.amount>0);
 const cues=observedGuildPveV17Cues({
  boss:input.boss,phase:input.phase,enemyId:boss.id,events,
 });
 const chargeUses={
  protection:Number(shieldEvents.length>0) as 0|1,
  cleanse:Number(cleanseEvents.length>0) as 0|1,
  insight:Number(insightUsed) as 0|1,
 };
 const evidence=createHash('sha256').update(JSON.stringify([
  input.seed,input.reference.digest,input.boss,input.phase,input.difficulty,
  input.stance,input.tactics,player,boss,events,chargeUses,
 ])).digest('hex');
 return {
  boss:input.boss,phase:input.phase,stance:input.stance,
  rawPlayerDamage:round(self.damageDone),
  bossHpRemoved:round(boss.stats.maxHp-enemy.hp),
  playerHpLost:round(player.stats.maxHp-self.hp),
  effectiveHealing:round(self.healingDone),
  absorbedShield:round(events.filter(e=>e.type==='damage'&&e.targetId===player.id)
   .reduce((n,e)=>n+(e.absorbed??0),0)),
  cleanseEvents:events.filter(e=>e.type==='status_remove'&&
   e.actorId===player.id).length,
  survived:self.alive,reason:r.reason,observedCues:cues,
  appliedTactics:applied,proposedChargeUses:chargeUses,
  deterministicEvidenceHash:evidence,
  rewardMinted:false,inventorySpent:false,serverPersisted:false,
 };
}
