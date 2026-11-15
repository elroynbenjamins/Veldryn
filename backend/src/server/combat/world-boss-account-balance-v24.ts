/**
 * World Boss V24: test-only evidence from a V22 deterministic server replay.
 * NOT a live damage/reward formula, leaderboards score, or player endpoint.
 * Observe role utility but do not invent Tank damage prevention or credit
 * unused shields / overhealing as rewardable contribution.
 */
import type {CombatRole} from './types';
import {worldBossAccountDamageV22,type WorldBossAccountRaidOutputV22} from
 './world-boss-account-raid-v22';

export const WORLD_BOSS_V24_BALANCE_LIVE=false as const;
const WEIGHTS=[1,.12,.07,.05,.04] as const;
const finite=(n:number)=>Number.isFinite(n)&&n>=0;
export interface WorldBossCharacterEvidenceV24{
 characterId:string;
 role:Exclude<CombatRole,'enemy'>;
 rawDamage:number;
 /** The engine credits effective healing rather than attempted overheal. */
 effectiveHealing:number;
 interruptions:number;
 damageTaken:number;
 survived:boolean;
 /** Actual boss-damage contribution, NOT a payout or per-character credit. */
 provisionalWeightedDamage:number;
}
export interface WorldBossAccountEvidenceV24{
 status:'test_only_not_approved';
 eventId:string;boss:WorldBossAccountRaidOutputV22['boss'];
 phase:WorldBossAccountRaidOutputV22['phase'];
 accountSize:number;
 strongestDamage:number;
 rawPartyDamage:number;
 proposedWorldHpDamage:number;
 /** Total additional contribution relative to strongest real fighter. */
 secondaryBonusDamage:number;
 secondaryBonusFraction:number;
 effectiveHealing:number;
 interrupts:number;
 survivors:number;
 /** Shield absorbed by party members; attribution unavailable, NO impact credit. */
 unattributedShieldAbsorbed:number;
 /** Shield applied != shield consumed, and earns no credit. */
 uncreditedShieldApplied:number;
 protectedRoleAttribution:'not_available_do_not_score';
 victory:boolean;
 characters:readonly WorldBossCharacterEvidenceV24[];
 creditedRewards:false;
 persisted:false;
}
export function auditWorldBossAccountReplayV24(
 raid:WorldBossAccountRaidOutputV22,
):WorldBossAccountEvidenceV24{
 if(!raid||raid.schema!=='world-boss-v22-account-raid-prototype'||
  raid.persisted!==false||!raid.combat||!Array.isArray(raid.combat.players)||
  !Array.isArray(raid.combat.events)||!Array.isArray(raid.characterLedger)||
  raid.combat.players.length<1||raid.combat.players.length>5||
  raid.combat.players.length!==raid.characterLedger.length||
  !finite(raid.rawPartyDamage)||!finite(raid.proposedWorldHpDamage))
  throw Error('world_boss_v24_invalid_replay');
 const states=new Map(raid.combat.players.map(p=>[p.definition.id,p]));
 const ids=new Set<string>();
 const values=raid.characterLedger.map(row=>{
  const state=states.get(row.characterId);
  if(!state||state.definition.team!=='players'||
   !['damage','tank','support'].includes(state.definition.role)||
   ids.has(row.characterId)||
   !finite(row.rawDamage)||!finite(row.rawHealing)||
   !finite(row.damageTaken)||!Number.isSafeInteger(row.interrupts)||
   row.interrupts<0||typeof row.survived!=='boolean'||
   row.rawDamage!==state.damageDone||
   row.rawHealing!==state.healingDone||
   row.damageTaken!==state.damageTaken||
   row.interrupts!==state.interrupts||
   row.survived!==state.alive)
   throw Error('world_boss_v24_unverified_character_ledger');
  ids.add(row.characterId);
  return {
   characterId:row.characterId,
   role:state.definition.role as Exclude<CombatRole,'enemy'>,
   rawDamage:row.rawDamage,
   effectiveHealing:row.rawHealing,
   interruptions:row.interrupts,
   damageTaken:row.damageTaken,
   survived:row.survived,
  };
 });
 if(states.size!==values.length)
  throw Error('world_boss_v24_duplicate_combat_actor');
 const rawDamage=values.reduce((sum,v)=>sum+v.rawDamage,0);
 const damage=worldBossAccountDamageV22(values);
 if(rawDamage!==raid.rawPartyDamage||damage!==raid.proposedWorldHpDamage)
  throw Error('world_boss_v24_world_damage_mismatch');
 const sorted=[...values].sort((a,b)=>b.rawDamage-a.rawDamage||
  a.characterId.localeCompare(b.characterId));
 const ranked=new Map(sorted.map((v,i)=>[v.characterId,v.rawDamage*WEIGHTS[i]]));
 const strongestDamage=sorted[0].rawDamage;
 const secondaryBonusDamage=Math.max(0,damage-Math.floor(strongestDamage));
 const secondaryBonusFraction=strongestDamage>0?
  Math.max(0,damage/strongestDamage-1):0;
 if(!finite(secondaryBonusFraction)||secondaryBonusFraction>.28+1e-8||
  damage>rawDamage||damage>Number.MAX_SAFE_INTEGER)
  throw Error('world_boss_v24_diminishing_return_invariant_failed');
 let shieldAbsorbed=0,shieldApplied=0;
 for(const e of raid.combat.events){
  if(!e||!Number.isSafeInteger(e.atMs)||e.atMs<0)
   throw Error('world_boss_v24_invalid_event_timing');
  if(e.type==='damage'||e.type==='dot_tick'){
   if(ids.has(e.targetId??'')){
    if(e.absorbed!==undefined&&!finite(e.absorbed))
     throw Error('world_boss_v24_invalid_absorption');
    shieldAbsorbed+=e.absorbed??0;
   }
  } else if(e.type==='shield'&&ids.has(e.targetId??'')){
   if(e.amount!==undefined&&!finite(e.amount))
    throw Error('world_boss_v24_invalid_shield');
   shieldApplied+=e.amount??0;
  }
 }
 const characters:WorldBossCharacterEvidenceV24[]=values.map(v=>({
  ...v,provisionalWeightedDamage:ranked.get(v.characterId)??0,
 }));
 return {
  status:'test_only_not_approved',eventId:raid.eventId,boss:raid.boss,
  phase:raid.phase,accountSize:characters.length,
  strongestDamage,rawPartyDamage:raid.rawPartyDamage,
  proposedWorldHpDamage:damage,secondaryBonusDamage,secondaryBonusFraction,
  effectiveHealing:characters.reduce((sum,c)=>sum+c.effectiveHealing,0),
  interrupts:characters.reduce((sum,c)=>sum+c.interruptions,0),
  survivors:characters.filter(c=>c.survived).length,
  unattributedShieldAbsorbed:shieldAbsorbed,
  uncreditedShieldApplied:shieldApplied,
  protectedRoleAttribution:'not_available_do_not_score',
  victory:raid.combat.victory,characters,creditedRewards:false,persisted:false,
 };
}
