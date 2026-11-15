/**
 * Hidden V25: 14 authored World Boss rounds with 1–5 verified owned
 * characters, distinct local Guard and role-attributed utility.
 *
 * This is a pure engineering prototype, NOT wired into the V23 HP settlement
 * worker, live events, public routes, account inventory or World Sigils.
 * Only trusted server-frozen V12/V22 data may enter this boundary.
 */
import {sha256} from '@noble/hashes/sha256';
import {bytesToHex} from '@noble/hashes/utils';
import {simulateWorldBossAccountRoundsV25,
 type WorldBossRoundEvent,type WorldBossRoundResult,
 type WorldBossId,type WorldBossPhase,type WorldBossOrder} from
 './world-boss-round-prototype';
import {WORLD_BOSS_V22_ENGINE_VERSION,worldBossAccountDamageV22,
 type WorldBossAccountRosterV22} from './world-boss-account-raid-v22';
import {deriveWorldBossWarCampEffectsV11,
 type WorldBossWarCampSnapshotV11} from './world-boss-war-camp-v11';
import {verifyWorldBossEncounterProfileV13,
 type WorldBossEncounterProfileV13} from './world-boss-encounter-profile-v13';

export const WORLD_BOSS_V25_AUTHORED_ENCOUNTERS_LIVE=false as const;
export const WORLD_BOSS_V25_ENGINE_VERSION='world-boss-account-rounds-v25-prototype' as const;
const ID=/^[A-Za-z0-9][A-Za-z0-9:_-]{0,159}$/;
const DIGEST=/^[a-f0-9]{64}$/;
const finite=(x:number)=>Number.isFinite(x)&&x>=0;
const hash=(obj:unknown)=>bytesToHex(sha256(new TextEncoder().encode(JSON.stringify(obj))));
const near=(a:number,b:number)=>Math.abs(a-b)<=.05;

export interface WorldBossAccountRoleLedgerV25{
 characterId:string;role:'tank'|'damage'|'support';
 bossHpDamage:number;localGuardDamage:number;
 effectiveHealing:number;shieldConsumed:number;
 tankProtection:number;cleansePrevented:number;
 interrupts:number;survived:boolean;
}
export interface WorldBossAccountEncounterOutputV25{
 schema:'world-boss-v25-authored-account-rounds';
 engineVersion:typeof WORLD_BOSS_V25_ENGINE_VERSION;
 eventId:string;accountId:string;requestId:string;
 boss:WorldBossId;phase:WorldBossPhase;order:WorldBossOrder;
 rosterDigest:string;encounterDigest:string;warCampDigest:string|null;
 roundsCompleted:number;survived:boolean;
 /** Damage to local boss HP only, distinct from local Guard depletion. */
 rawBossHpDamage:number;
 /** Preview ONLY: bounded account-wide shared-boss contribution. */
 proposedWorldHpDamage:number;
 localGuardDamage:number;remainingGuard:number;guardRestored:number;
 /** Fully replayable, authored, server-seeded 14-round event log. */
 events:readonly WorldBossRoundEvent[];
 characterLedger:readonly WorldBossAccountRoleLedgerV25[];
 result:WorldBossRoundResult;
 persisted:false;rewarded:false;
}
export function simulateWorldBossAuthoredAccountEncounterV25(input:{
 eventId:string;requestId:string;roster:WorldBossAccountRosterV22;
 order:WorldBossOrder;boss:WorldBossId;phase:WorldBossPhase;
 serverSeed:string;encounter:WorldBossEncounterProfileV13;
 warCamp?:WorldBossWarCampSnapshotV11;
}):WorldBossAccountEncounterOutputV25{
 if(!input||!ID.test(input.eventId)||!ID.test(input.requestId)||
  !ID.test(input.serverSeed)||input.serverSeed.length<24||
  !['steady_assault','hold_line','break_armor'].includes(input.order)||
  !['hollowroot','sunscar','frostmarch'].includes(input.boss)||
  !['armored','exposed','enraged'].includes(input.phase))
  throw Error('world_boss_v25_invalid_account_encounter');
 const {roster}=input;
 if(!roster||!ID.test(roster.accountId)||
  !Number.isSafeInteger(roster.capturedAtUtcMs)||roster.capturedAtUtcMs<=0||
  !Array.isArray(roster.characters)||roster.characters.length<1||
  roster.characters.length>5||!DIGEST.test(roster.rosterDigest))
  throw Error('world_boss_v25_invalid_frozen_roster');
 const characters=roster.characters;
 const ids=new Set<string>();
 for(const c of characters){
  if(!c||!ID.test(c.characterId)||ids.has(c.characterId)||
   !ID.test(c.snapshotId)||!DIGEST.test(c.sourceHash)||
   !Number.isSafeInteger(c.sourceRevision)||c.sourceRevision<1||
   !c.combatant||c.combatant.id!==c.characterId||
   c.combatant.team!=='players'||
   !['tank','damage','support'].includes(c.combatant.role)||
   !finite(c.combatant.stats.maxHp)||c.combatant.stats.maxHp<=0||
   !finite(c.combatant.stats.attackPower)||c.combatant.stats.attackPower<=0)
   throw Error('world_boss_v25_invalid_verified_character');
  ids.add(c.characterId);
 }
 const expected=hash({version:WORLD_BOSS_V22_ENGINE_VERSION,
  accountId:roster.accountId,
  characters:characters.map(c=>({
   id:c.characterId,snapshotId:c.snapshotId,
   sourceRevision:c.sourceRevision,sourceHash:c.sourceHash,
   combatant:c.combatant,
  }))});
 if(expected!==roster.rosterDigest)
  throw Error('world_boss_v25_roster_digest_mismatch');
 verifyWorldBossEncounterProfileV13(
  input.encounter,input.boss,input.phase,input.eventId);
 if(input.warCamp&&input.warCamp.eventId!==input.eventId)
  throw Error('world_boss_v25_foreign_war_camp');
 deriveWorldBossWarCampEffectsV11(input.warCamp);
 const result=simulateWorldBossAccountRoundsV25({
  seed:[WORLD_BOSS_V25_ENGINE_VERSION,input.eventId,roster.accountId,
   input.serverSeed].join(':'),
  boss:input.boss,phase:input.phase,order:input.order,
  players:characters.map(c=>structuredClone(c.combatant)),
  serverEncounterProfile:input.encounter,
  serverWarCamp:input.warCamp,
 });
 const characterLedger:WorldBossAccountRoleLedgerV25[]=characters.map(c=>{
  const row=result.participants[c.characterId];
  if(!row||!finite(row.bossHpDamage)||!finite(row.guardDamage)||
   !finite(row.effectiveHealing)||!finite(row.shieldConsumed)||
   !finite(row.tankProtection)||!finite(row.cleansePrevented)||
   !Number.isSafeInteger(row.interrupts)||row.interrupts<0||
   typeof row.survived!=='boolean')
   throw Error('world_boss_v25_untrusted_round_ledger');
  return {
   characterId:c.characterId,role:c.combatant.role as 'tank'|'damage'|'support',
   bossHpDamage:row.bossHpDamage,
   localGuardDamage:row.guardDamage,effectiveHealing:row.effectiveHealing,
   shieldConsumed:row.shieldConsumed,tankProtection:row.tankProtection,
   cleansePrevented:row.cleansePrevented,interrupts:row.interrupts,
   survived:row.survived,
  };
 });
 if(Object.keys(result.participants).length!==characters.length||
  result.roundsCompleted<1||result.roundsCompleted>14||
  !finite(result.bossHpDamage)||!finite(result.localGuardDamage)||
  !finite(result.remainingGuard)||!finite(result.guardRestored)||
  !near(characterLedger.reduce((s,c)=>s+c.bossHpDamage,0),
   result.bossHpDamage)||
  !near(characterLedger.reduce((s,c)=>s+c.localGuardDamage,0),
   result.localGuardDamage))
  throw Error('world_boss_v25_incoherent_authored_results');
 const proposedWorldHpDamage=worldBossAccountDamageV22(
  characterLedger.map(c=>({
   characterId:c.characterId,rawDamage:c.bossHpDamage,
  })));
 return {
  schema:'world-boss-v25-authored-account-rounds',
  engineVersion:WORLD_BOSS_V25_ENGINE_VERSION,
  eventId:input.eventId,accountId:roster.accountId,requestId:input.requestId,
  boss:input.boss,phase:input.phase,order:input.order,
  rosterDigest:roster.rosterDigest,encounterDigest:input.encounter.digest,
  warCampDigest:input.warCamp?.digest??null,
  roundsCompleted:result.roundsCompleted,survived:result.survived,
  rawBossHpDamage:result.bossHpDamage,
  proposedWorldHpDamage,localGuardDamage:result.localGuardDamage,
  remainingGuard:result.remainingGuard,guardRestored:result.guardRestored,
  events:result.events,characterLedger,result,
  persisted:false,rewarded:false,
 };
}
