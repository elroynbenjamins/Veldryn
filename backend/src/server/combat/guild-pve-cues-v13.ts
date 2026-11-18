/**
 * Guild PvE V13 — HIDDEN authored cue ordering / replay projection.
 * This describes telegraphs for an already-settled V9 engine receipt; it DOES
 * NOT cause hits, cleanses, buffs, Pressure changes, or reward grants.
 * Actual V7 combat remains the source of damage/status/replay values.
 */
import {GUILD_PVE_V7_PHASES,type GuildPveBossV7,type GuildPvePhaseV7,
 type GuildPveDifficultyV7} from './guild-pve-broken-forge-v7';
import {GUILD_PVE_V8_MANIFEST} from './guild-pve-shared-v8';
import type {GuildPveV9Receipt} from './guild-pve-transaction-v9';

export const GUILD_PVE_V13_LIVE=false as const;
export type GuildPveCueKindV13='setup'|'warning'|'resolve'|'opportunity'|'recovery';
type Beat=readonly [string,GuildPveCueKindV13];
const SCRIPTS:Record<GuildPvePhaseV7,readonly Beat[]>={
 iron_skin:[['plate_raise','setup'],['slam_warning','warning'],['slam_impact','resolve'],['seam_open','opportunity']],
 gate_collapse:[['sunder_warning','warning'],['sunder_apply','resolve'],['rubble_warning','warning'],['rubble_impact','resolve']],
 open_gate:[['charge_warning','warning'],['charge_impact','resolve'],['core_open','opportunity'],['core_recover','recovery']],
 ash_veil:[['ash_warning','warning'],['burn_apply','resolve'],['cleansing_window','opportunity'],['ember_strike','resolve']],
 curse_web:[['mark_warning','warning'],['mark_apply','resolve'],['web_warning','warning'],['web_burst','resolve']],
 emberfall:[['eruption_warning','warning'],['eruption_resolve','resolve'],['cooling_window','opportunity'],['ember_surge','setup']],
 armoured:[['plate_warning','warning'],['plate_impact','resolve'],['seam_exposed','opportunity'],['plate_recover','recovery']],
 overload:[['pressure_warning','warning'],['pressure_impact','resolve'],['slam_warning','warning'],['slam_impact','resolve']],
 exposed_core:[['core_exposed','opportunity'],['detonation_warning','warning'],['detonation_resolve','resolve'],['recovery_window','recovery']],
};
const DANGEROUS:Record<string,string>={
 'iron_skin.slam_impact':'slam_warning',
 'gate_collapse.sunder_apply':'sunder_warning',
 'gate_collapse.rubble_impact':'rubble_warning',
 'open_gate.charge_impact':'charge_warning',
 'ash_veil.burn_apply':'ash_warning',
 'curse_web.mark_apply':'mark_warning',
 'curse_web.web_burst':'web_warning',
 'emberfall.eruption_resolve':'eruption_warning',
 'armoured.plate_impact':'plate_warning',
 'overload.pressure_impact':'pressure_warning',
 'overload.slam_impact':'slam_warning',
 'exposed_core.detonation_resolve':'detonation_warning',
};
const OWNER:Record<GuildPvePhaseV7,GuildPveBossV7>={
 iron_skin:'gatekeeper',gate_collapse:'gatekeeper',open_gate:'gatekeeper',
 ash_veil:'seer',curse_web:'seer',emberfall:'seer',
 armoured:'warden',overload:'warden',exposed_core:'warden',
};
const TELEGRAPH_MS:Record<GuildPveDifficultyV7,number>={
 Scout:1700,Veteran:1350,Mythic:1100,
};
export interface GuildPveCueV13 {
 id:string;boss:GuildPveBossV7;phase:GuildPvePhaseV7;
 ordinal:number;kind:GuildPveCueKindV13;warningMs:number;
 /** Important: scripted text is guidance, not an engine damage event. */
 damageSource:'engine-receipt-only';
}
export function verifyGuildPveV13Scripts(){
 const ids=new Set<string>();let count=0;
 for(const boss of ['gatekeeper','seer','warden'] as const){
  for(const phase of GUILD_PVE_V7_PHASES[boss]){
   const beats=SCRIPTS[phase];
   if(OWNER[phase]!==boss||beats.length!==4)
    throw Error('guild_pve_v13_invalid_phase_script');
   const seenWarnings=new Set<string>();
   for(const [id,kind] of beats){
    const full=boss+'.'+phase+'.'+id;
    if(ids.has(full))throw Error('guild_pve_v13_duplicate_cue');
    ids.add(full);count++;
    const required=DANGEROUS[phase+'.'+id];
    if(required&&!seenWarnings.has(required))
      throw Error('guild_pve_v13_resolve_without_warning:'+id);
    if(kind==='warning')seenWarnings.add(id);
   }
  }
 }
 if(count!==36||Object.keys(DANGEROUS).length!==12)
  throw Error('guild_pve_v13_incomplete_cues');
 return count;
}
verifyGuildPveV13Scripts();
export function guildPveV13PhaseCues(input:{
 boss:GuildPveBossV7;phase:GuildPvePhaseV7;difficulty:GuildPveDifficultyV7;
}):GuildPveCueV13[]{
 if(OWNER[input.phase]!==input.boss||
  !Object.hasOwn(TELEGRAPH_MS,input.difficulty))
  throw Error('guild_pve_v13_invalid_phase');
 return SCRIPTS[input.phase].map(([id,kind],index)=>({
  id:input.boss+'.'+input.phase+'.'+id,boss:input.boss,
  phase:input.phase,ordinal:index+1,kind,
  warningMs:kind==='warning'?TELEGRAPH_MS[input.difficulty]:0,
  damageSource:'engine-receipt-only' as const,
 }));
}
export interface GuildPveV13ReceiptReel {
  cues:GuildPveCueV13[];
  /** Only notices. The next phase cannot resolve until a new engine action. */
  nextPhases:GuildPvePhaseV7[];
  actualEngineDamage:number;
  actualHpCredit:number;
  neverCausesGameplayMutation:true;
}
/** Derive presentation ONLY from an immutable committed server receipt. */
export function projectGuildPveV13Receipt(receipt:GuildPveV9Receipt,
 difficulty:GuildPveDifficultyV7):GuildPveV13ReceiptReel{
 const def=GUILD_PVE_V8_MANIFEST.find(node=>node.id===receipt.nodeId);
 if(receipt.kind!=='battle'||receipt.status!=='committed'||
  receipt.costSeals!==1||!receipt.combat||!def?.boss||
  receipt.combat.boss!==def.boss||
  !GUILD_PVE_V7_PHASES[def.boss].includes(receipt.combat.phase)||
  !Number.isFinite(receipt.creditedHp)||
  receipt.creditedHp<0||receipt.creditedHp>receipt.beforeHp||
  receipt.rewardMinted!==false||receipt.inventorySpent!==false)
  throw Error('guild_pve_v13_requires_settled_combat_receipt');
 const phases=GUILD_PVE_V7_PHASES[def.boss];
 const start=phases.indexOf(receipt.combat.phase);
 let last=start;
 for(const transition of receipt.phaseTransitions){
  const index=phases.indexOf(transition);
  if(index!==last+1)throw Error('guild_pve_v13_invalid_phase_transition');
  last=index;
 }
 return {
  cues:guildPveV13PhaseCues({boss:def.boss,phase:receipt.combat.phase,difficulty}),
  nextPhases:[...receipt.phaseTransitions],
  actualEngineDamage:receipt.combat.rawPlayerDamage,
  actualHpCredit:receipt.creditedHp,
  neverCausesGameplayMutation:true,
 };
}
