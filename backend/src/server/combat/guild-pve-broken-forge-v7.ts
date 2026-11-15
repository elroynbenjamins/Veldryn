/**
 * Guild PvE / Broken Forge V7 — DISABLED source-derived combat diagnostics.
 * Reuses the real deterministic engine. NO routes, settlement, scheduler,
 * inventory mutation, currency grants, live guild state or user data.
 *
 * Each preview models one character fighting a frozen phase-local guardian.
 * It is NOT the final asynchronous multi-account shared-HP encounter engine.
 */
import {createHash} from 'node:crypto';
import {simulateCombat} from './engine';
import type {AbilityDefinition,CombatantDefinition} from './types';

export const GUILD_PVE_V7_LIVE=false as const;
export const GUILD_PVE_V7_BOSSES=['gatekeeper','seer','warden'] as const;
export type GuildPveBossV7=(typeof GUILD_PVE_V7_BOSSES)[number];
export type GuildPveTierV7='T1'|'T2'|'T3'|'T4';
export type GuildPveDifficultyV7='Scout'|'Veteran'|'Mythic';
export type GuildPveStanceV7='Assault'|'Guard'|'Rally';
export type GuildPvePhaseV7=
 'iron_skin'|'gate_collapse'|'open_gate'|
 'ash_veil'|'curse_web'|'emberfall'|
 'armoured'|'overload'|'exposed_core';

export const GUILD_PVE_V7_PHASES:Record<GuildPveBossV7,readonly GuildPvePhaseV7[]>={
 gatekeeper:['iron_skin','gate_collapse','open_gate'],
 seer:['ash_veil','curse_web','emberfall'],
 warden:['armoured','overload','exposed_core'],
};

type DamageType='physical'|'fire'|'arcane';
const ability=(id:string,coeff:number,castTimeMs:number,cooldownMs:number,
 target:'current_target'|'all_enemies'='current_target',damageType:DamageType='physical'):AbilityDefinition=>({
 id,name:id,priority:90,cooldownMs,castTimeMs,target,interruptible:true,
 effects:[{kind:'damage',coeff,damageType}],
});
const burn=(id:string,coeff:number,castTimeMs:number,cooldownMs:number,
 type:DamageType='fire'):AbilityDefinition=>({
 id,name:id,priority:92,cooldownMs,castTimeMs,target:'current_target',interruptible:true,
 effects:[{kind:'damage',coeff,damageType:type},
  {kind:'dot',coeff:.18,durationMs:6000,tickMs:2000,damageType:type,tag:'expedition_burn'}],
});
const buff=(id:string,value:number):AbilityDefinition=>({
 id,name:id,priority:80,cooldownMs:11000,castTimeMs:0,target:'self',
 effects:[{kind:'buff',tag:'damage_taken',value,durationMs:4200}],
});

/** V5 phase identity and warning-led mechanics. Values are test hypotheses. */
function phaseAbilities(boss:GuildPveBossV7,phase:GuildPvePhaseV7):AbilityDefinition[]{
 switch(phase){
  case 'iron_skin':return [ability('GX_GATE_SLAM',1.40,1100,5800),buff('GX_GATE_PLATES',-.08)];
  case 'gate_collapse':return [burn('GX_GATE_SUNDER',.85,950,6000,'physical'),ability('GX_GATE_RUBBLE',1.05,1200,7400,'all_enemies')];
  case 'open_gate':return [ability('GX_GATE_CHARGE',1.70,1400,6700),ability('GX_GATE_CORE_PULSE',.72,900,5200)];
  case 'ash_veil':return [burn('GX_SEER_ASH',.78,1150,5500),ability('GX_SEER_SPARK',.78,800,4800,'current_target','fire')];
  case 'curse_web':return [burn('GX_SEER_CURSE',.95,1100,6100,'arcane'),ability('GX_SEER_WEB',1.08,1200,7200,'all_enemies','arcane')];
  case 'emberfall':return [ability('GX_SEER_ERUPTION',1.50,1700,7500,'all_enemies','fire'),burn('GX_SEER_CINDERS',.75,1100,6600)];
  case 'armoured':return [buff('GX_WARDEN_PLATES',-.12),ability('GX_WARDEN_STRIKE',1.22,1100,5600)];
  case 'overload':return [ability('GX_WARDEN_SHOCK',1.45,1350,6300,'all_enemies','fire'),burn('GX_WARDEN_BURN',.90,1150,5600)];
  case 'exposed_core':return [ability('GX_WARDEN_DETONATE',1.70,1850,7500,'all_enemies','fire'),burn('GX_WARDEN_COIL',.90,1100,6400,'arcane')];
  default:throw Error('guild_pve_v7_unknown_phase:'+boss);
 }
}
export interface GuildPveReferenceV7{
 version:'guild-pve-reference-v7-test';
 gearTier:GuildPveTierV7;
 /** Fixed once per tier from a trusted synthetic *reference cohort*, never the attacking player. */
 attack:number;defense:number;maxHp:number;
 digest:string;
}
function referenceDigest(p:Omit<GuildPveReferenceV7,'digest'>){
 return createHash('sha256').update(JSON.stringify([
  p.version,p.gearTier,p.attack,p.defense,p.maxHp,
 ])).digest('hex');
}
const valid=(x:number)=>Number.isFinite(x)&&x>0&&x<=1e8;
export function makeGuildPveReferenceV7(gearTier:GuildPveTierV7,input:{
 attack:number;defense:number;maxHp:number;
}):GuildPveReferenceV7{
 if(!['T1','T2','T3','T4'].includes(gearTier)||!valid(input.attack)||
  !Number.isFinite(input.defense)||input.defense<0||input.defense>1e8||!valid(input.maxHp))
  throw Error('guild_pve_v7_invalid_reference');
 const p:Omit<GuildPveReferenceV7,'digest'>={
  version:'guild-pve-reference-v7-test',gearTier,
  attack:Number(input.attack.toFixed(2)),
  defense:Number(input.defense.toFixed(2)),
  maxHp:Number(input.maxHp.toFixed(2)),
 };
 return {...p,digest:referenceDigest(p)};
}
export function verifyGuildPveReferenceV7(p:GuildPveReferenceV7){
 if(!p||p.version!=='guild-pve-reference-v7-test'||
  !['T1','T2','T3','T4'].includes(p.gearTier)||
  !valid(p.attack)||!Number.isFinite(p.defense)||p.defense<0||p.defense>1e8||
  !valid(p.maxHp)||!/^[a-f0-9]{64}$/.test(p.digest)||
  p.digest!==referenceDigest(p))
  throw Error('guild_pve_v7_reference_tampered');
}
const difficultyFactor:Record<GuildPveDifficultyV7,number>={
 Scout:1,Veteran:1.10,Mythic:1.20,
};
/** Phase-local combat opponent: NOT an approved final boss HP or damage budget. */
export function draftBrokenForgeGuardianV7(input:{
 boss:GuildPveBossV7;phase:GuildPvePhaseV7;
 difficulty:GuildPveDifficultyV7;reference:GuildPveReferenceV7;
}):CombatantDefinition{
 verifyGuildPveReferenceV7(input.reference);
 if(!GUILD_PVE_V7_PHASES[input.boss]?.includes(input.phase)||
  !Object.hasOwn(difficultyFactor,input.difficulty))
  throw Error('guild_pve_v7_invalid_boss_or_phase');
 const f=difficultyFactor[input.difficulty];
 const phaseNo=GUILD_PVE_V7_PHASES[input.boss].indexOf(input.phase);
 const hpFactor=input.boss==='warden'?1.4:input.boss==='seer'?1.12:1;
 const attackFactor=input.boss==='warden'?1.08:input.boss==='seer'?0.95:1;
 return {
  id:'GX_'+input.boss+'_'+input.phase,
  name:input.boss==='gatekeeper'?'Ironbound Gatekeeper':
   input.boss==='seer'?'Emberbound Seer':'The Hollow Warden',
  team:'enemies',role:'enemy',level:25, boss:true,
  basicAttackMs:3000,basicAttackCoeff:.55+phaseNo*.05,
  stats:{
   maxHp:Math.max(2500,input.reference.attack*60*hpFactor*f),
   attackPower:input.reference.attack*.9*attackFactor*f,
   healingPower:0,
   defense:Math.max(0,input.reference.defense*.70*f),
   accuracy:700,evasion:130,critChance:.03,critMultiplier:1.5,haste:0,
  },
  abilities:phaseAbilities(input.boss,input.phase),
  // Current engine reports true phase-local attacks. Cross-phase shared boss
  // HP/Pressure and V5 36-cue ordering are separate future server work.
  tags:['guild-pve-v7-test',input.phase],
 };
}
function preparedActor(actor:CombatantDefinition,stance:GuildPveStanceV7):CombatantDefinition{
 if(actor.team!=='players'||!['tank','damage','support'].includes(actor.role)||
  !Number.isFinite(actor.stats.attackPower)||actor.stats.attackPower<=0)
  throw Error('guild_pve_v7_invalid_verified_actor');
 if(stance==='Assault')return actor;
 const stats={...actor.stats,
  attackPower:actor.stats.attackPower*(stance==='Guard'?0.80:0.75),
  defense:actor.stats.defense*(stance==='Guard'?1.20:1),
  healingPower:actor.stats.healingPower*(stance==='Rally'?1.20:1),
 };
 if(stance==='Guard'){
  const shield:AbilityDefinition={
   id:'GX_V7_GUARD',name:'Expedition Guard (test)',priority:130,
   target:'self',cooldownMs:30000,castTimeMs:0,
   effects:[{kind:'shield',flat:actor.stats.maxHp*.14}],
  };
  return {...actor,stats,abilities:[shield,...actor.abilities]};
 }
 if(stance==='Rally'){
  const cleanse:AbilityDefinition={
   id:'GX_V7_RALLY',name:'Expedition Rally (test)',priority:130,
   target:'self',cooldownMs:5500,castTimeMs:0,
   aiCondition:'ally_below_50_or_dot',
   effects:[{kind:'cleanse'},{kind:'heal',coeff:.55}],
  };
  return {...actor,stats,abilities:[cleanse,...actor.abilities]};
 }
 throw Error('guild_pve_v7_invalid_stance');
}
export interface GuildPvePreviewV7{
 boss:GuildPveBossV7;phase:GuildPvePhaseV7;difficulty:GuildPveDifficultyV7;
 tier:GuildPveTierV7;stance:GuildPveStanceV7;classId:string;
 durationMs:number;reason:'victory'|'wipe'|'timeout';survived:boolean;
 /** True engine actual guardian HP removed, independent of overkill attack sum. */
 bossHpRemoved:number;rawPlayerDamage:number;
 playerHpLost:number;effectiveHealing:number;
 /** Total absorbed shield damage; NOT attributable solely to Guard. */
 shieldAbsorbed:number;cleanseEvents:number;castWarnings:number;reelEvents:number;
 /** V3 pending shared-pressure proposal only; not persisted. */
 pressureDeltaProposal:number;
 rewardGranted:false;sealSpent:false;serverPersisted:false;
}
/** Returns measured engine combat, never a claim receipt or live attack. */
export function previewBrokenForgeAttemptV7(input:{
 player:CombatantDefinition;boss:GuildPveBossV7;phase:GuildPvePhaseV7;
 difficulty:GuildPveDifficultyV7;reference:GuildPveReferenceV7;
 stance:GuildPveStanceV7;seed:string;
}):GuildPvePreviewV7{
 if(typeof input.seed!=='string'||input.seed.length<4||input.seed.length>160)
  throw Error('guild_pve_v7_invalid_seed');
 const player=preparedActor(input.player,input.stance);
 const boss=draftBrokenForgeGuardianV7(input);
 const r=simulateCombat({seed:input.seed,players:[player],enemies:[boss],
  maxDurationMs:18000,tickMs:100});
 const self=r.players[0],enemy=r.enemies[0];
 const delta=(input.stance==='Assault'?15:input.stance==='Guard'?-12:-8)-4;
 const num=(v:number)=>Number(Math.max(0,v).toFixed(2));
 return {
  boss:input.boss,phase:input.phase,difficulty:input.difficulty,
  tier:input.reference.gearTier,stance:input.stance,classId:player.classId??'',
  durationMs:r.durationMs,reason:r.reason,survived:self.alive,
  bossHpRemoved:num(boss.stats.maxHp-enemy.hp),
  rawPlayerDamage:num(self.damageDone),
  playerHpLost:num(player.stats.maxHp-self.hp),
  effectiveHealing:num(self.healingDone),
  shieldAbsorbed:num(r.events.filter(e=>e.type==='damage'&&e.targetId===player.id)
   .reduce((n,e)=>n+(e.absorbed??0),0)),
  cleanseEvents:r.events.filter(e=>e.type==='status_remove'&&e.actorId===player.id).length,
  castWarnings:r.events.filter(e=>e.type==='cast_start'&&e.actorId===boss.id).length,
  reelEvents:r.events.length,
  pressureDeltaProposal:delta,
  rewardGranted:false,sealSpent:false,serverPersisted:false,
 };
}
