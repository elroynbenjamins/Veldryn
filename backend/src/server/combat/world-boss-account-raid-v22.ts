/**
 * World Boss V22 — HIDDEN, standalone account-roster combat prototype.
 *
 * One authenticated account may fight with all 1–5 owned characters in the
 * same battle. No other players' Echoes, NPC backfills, forced roles, routes,
 * currency credits, SQL transactions, or deployed World Boss are involved.
 *
 * The owner-only load is private/server-trusted. The result can be shown as
 * an honest local replay, but must never be accepted as global HP damage
 * from a client: only an atomic private DB settlement can credit the world.
 */
import {sha256} from '@noble/hashes/sha256';
import {bytesToHex} from '@noble/hashes/utils';
import {simulateCombat} from './engine';
import {combatantFromVerifiedSnapshot} from './snapshot-adapter';
import type {WorldBossAuthoritativeSnapshotV9} from './world-boss-verified-roster-v9';
import type {CombatantDefinition,CombatResult} from './types';
import type {WorldBossId,WorldBossPhase,WorldBossOrder} from './world-boss-round-prototype';
import {deriveWorldBossWarCampEffectsV11,type WorldBossWarCampSnapshotV11} from './world-boss-war-camp-v11';
import {verifyWorldBossEncounterProfileV13,type WorldBossEncounterProfileV13} from './world-boss-encounter-profile-v13';

export const WORLD_BOSS_V22_ACCOUNT_RAID_LIVE=false as const;
export const WORLD_BOSS_V22_MAX_CHARACTERS=5 as const;
export const WORLD_BOSS_V22_ENGINE_VERSION='world-boss-account-raid-v22-prototype';
const weights=[1,.12,.07,.05,.04] as const; // tentative, NOT approved balance
const ID=/^[A-Za-z0-9][A-Za-z0-9:_-]{0,159}$/;
const DIGEST=/^[a-f0-9]{64}$/;
const maxAge=60000;
const finite=(x:number)=>Number.isFinite(x)&&x>=0;
const safeSeed=(x:string)=>typeof x==='string'&&x.length>=24&&x.length<=512&&ID.test(x.slice(0,160));

export interface WorldBossOwnedCharacterV22 {
 characterId:string;
 snapshotId:string;
 sourceRevision:number;
 sourceHash:string;
 combatant:CombatantDefinition;
}
export interface WorldBossAccountRosterV22{
 accountId:string;capturedAtUtcMs:number;
 characters:readonly WorldBossOwnedCharacterV22[];
 rosterDigest:string;
}
export interface WorldBossAccountRaidOutputV22{
 schema:'world-boss-v22-account-raid-prototype';
 eventId:string;accountId:string;requestId:string;
 boss:WorldBossId;phase:WorldBossPhase;order:WorldBossOrder;
 rosterDigest:string;encounterDigest:string;warCampDigest:string|null;
 engineVersion:typeof WORLD_BOSS_V22_ENGINE_VERSION;
 combat:CombatResult;
 /** Exactly one world impact amount for the whole account, never per character. */
 rawPartyDamage:number;proposedWorldHpDamage:number;
 characterLedger:readonly {
  characterId:string;rawDamage:number;rawHealing:number;
  damageTaken:number;interrupts:number;survived:boolean;
 }[];
 persisted:false;
}
const hash=(value:unknown)=>bytesToHex(sha256(new TextEncoder().encode(JSON.stringify(value))));
/**
 * Accepts ONLY recent V12-derived snapshots from a backend account-ownership
 * reader, not a client roster. Allows repeated classes and any role mixture.
 */
export function freezeWorldBossAccountRosterV22(input:{
 accountId:string;atUtcMs:number;
 verified:readonly {
  snapshot:WorldBossAuthoritativeSnapshotV9;
  sourceHash:string;gameVersion:number;
 }[];
}):WorldBossAccountRosterV22{
 const {accountId,atUtcMs,verified}=input;
 if(!ID.test(accountId)||!Number.isSafeInteger(atUtcMs)||atUtcMs<=0||
  !Array.isArray(verified)||verified.length<1||
  verified.length>WORLD_BOSS_V22_MAX_CHARACTERS)
  throw Error('world_boss_v22_invalid_owned_roster');
 const unique=new Set<string>();
 const characters=verified.map(({snapshot,sourceHash,gameVersion})=>{
  if(!snapshot||snapshot.ownerAccountId!==accountId||!snapshot.eligible||
   !ID.test(snapshot.snapshotId)||!ID.test(snapshot.verified?.characterId)||
   unique.has(snapshot.verified.characterId)||
   !Number.isSafeInteger(snapshot.capturedAtUtcMs)||
   snapshot.capturedAtUtcMs>atUtcMs||
   atUtcMs-snapshot.capturedAtUtcMs>maxAge||
   !Number.isSafeInteger(gameVersion)||gameVersion<1||
   !DIGEST.test(sourceHash))
   throw Error('world_boss_v22_unverified_or_foreign_character');
  unique.add(snapshot.verified.characterId);
  const combatant=combatantFromVerifiedSnapshot(snapshot.verified,
   structuredClone(snapshot.abilities));
  if(combatant.id!==snapshot.verified.characterId||
   combatant.team!=='players'||
   !['tank','damage','support'].includes(combatant.role)||
   !finite(combatant.stats.maxHp)||combatant.stats.maxHp<=0||
   !finite(combatant.stats.attackPower)||combatant.stats.attackPower<=0)
   throw Error('world_boss_v22_invalid_verified_combatant');
  return {characterId:combatant.id,snapshotId:snapshot.snapshotId,
   sourceRevision:gameVersion,sourceHash,combatant:structuredClone(combatant)};
 });
 // Server's character DB selection order must not change battle outputs.
 characters.sort((a,b)=>a.characterId.localeCompare(b.characterId));
 return {
  accountId,capturedAtUtcMs:atUtcMs,characters,
  rosterDigest:hash({version:WORLD_BOSS_V22_ENGINE_VERSION,accountId,
   characters:characters.map(c=>({
    id:c.characterId,snapshotId:c.snapshotId,
    sourceRevision:c.sourceRevision,sourceHash:c.sourceHash,
    combatant:c.combatant,
   }))}),
 };
}
/**
 * Shared integrity boundary for the V22 time engine and V24 authored
 * 14-round account engine. Hash checks accidental mutation of a frozen
 * packet; trust still requires the private server to derive roster origin.
 */
export function verifyFrozenWorldBossAccountRosterV22(
 roster:WorldBossAccountRosterV22,
):void{
 if(!roster||!ID.test(roster.accountId)||
  !Number.isSafeInteger(roster.capturedAtUtcMs)||
  !Array.isArray(roster.characters)||
  roster.characters.length<1||
  roster.characters.length>WORLD_BOSS_V22_MAX_CHARACTERS)
  throw Error('world_boss_v22_frozen_roster_digest_mismatch');
 if(roster.characters.some(c=>!c||!ID.test(c.characterId)||
  c.characterId!==c.combatant?.id||c.combatant?.team!=='players'||
  !['tank','damage','support'].includes(c.combatant?.role)||
  !Number.isSafeInteger(c.sourceRevision)||c.sourceRevision<1||
  !DIGEST.test(c.sourceHash)||!ID.test(c.snapshotId)))
  throw Error('world_boss_v22_frozen_roster_digest_mismatch');
 const expected=hash({version:WORLD_BOSS_V22_ENGINE_VERSION,accountId:roster.accountId,
  characters:roster.characters.map(c=>({
   id:c.characterId,snapshotId:c.snapshotId,
   sourceRevision:c.sourceRevision,sourceHash:c.sourceHash,
   combatant:c.combatant,
  }))});
 if(!DIGEST.test(roster.rosterDigest)||expected!==roster.rosterDigest||
  new Set(roster.characters.map(c=>c.characterId)).size!==roster.characters.length)
  throw Error('world_boss_v22_frozen_roster_digest_mismatch');
}

export function worldBossAccountDamageV22(
 ledger:readonly {characterId:string;rawDamage:number}[],
):number{
 if(!Array.isArray(ledger)||ledger.length<1||ledger.length>5||
  ledger.some(x=>!x||!ID.test(x.characterId)||!finite(x.rawDamage))||
  new Set(ledger.map(x=>x.characterId)).size!==ledger.length)
  throw Error('world_boss_v22_invalid_damage_ledger');
 const sorted=[...ledger].map(x=>x.rawDamage).sort((a,b)=>b-a);
 const scored=sorted.reduce((sum,n,i)=>sum+n*weights[i],0);
 if(!finite(scored)||scored>Number.MAX_SAFE_INTEGER)
  throw Error('world_boss_v22_damage_out_of_range');
 return Math.floor(scored);
}
const bossName:Record<WorldBossId,string>={
 hollowroot:'Hollowroot Colossus',sunscar:'Sunscar Devourer',
 frostmarch:'Frostmarch Warden',
};
/** A time-driven enemy adapted to the real combat engine for offline V22 tests.
 * This is NOT yet the final 14-round authored V6/V13 boss encounter.
 */
function offlineAccountRaidBoss(input:{
 boss:WorldBossId;phase:WorldBossPhase;profile:WorldBossEncounterProfileV13;
 warCamp?:WorldBossWarCampSnapshotV11;
 order:WorldBossOrder;
}):CombatantDefinition{
 const e=deriveWorldBossWarCampEffectsV11(input.warCamp);
 const phaseAttack=input.phase==='enraged'?1.2:input.phase==='exposed'?1.08:1;
 const armorFactor=input.order==='break_armor'?.95:1;
 const defense=input.profile.defense*armorFactor;
 const attack=input.profile.attack*phaseAttack*(1-e.bossDamageReduction)*
  (input.order==='hold_line'?.95:1);
 const areaType=input.boss==='hollowroot'?'nature':
  input.boss==='sunscar'?'fire':'ice';
 return {
  id:'WB22_'+input.boss.toUpperCase(),name:bossName[input.boss],
  team:'enemies',role:'enemy',level:25,boss:true,
  basicAttackMs:2800,basicAttackCoeff:.7,
  stats:{
   maxHp:1_000_000_000,attackPower:attack,healingPower:0,
   defense,accuracy:700,evasion:120,critChance:.05,critMultiplier:1.5,haste:0,
  },
  abilities:[{
   id:'WB22_'+input.boss+'_SWEEP',name:'World Sweep',
   cooldownMs:10000,castTimeMs:900,target:'all_enemies',priority:80,
   interruptible:false,effects:[{kind:'damage',coeff:.42,damageType:areaType}],
  },{
   id:'WB22_'+input.boss+'_CAST',name:'World Cast',
   cooldownMs:16000,castTimeMs:1400,target:'current_target',
   priority:95,interruptible:true,
   effects:[{kind:'damage',coeff:1.15,damageType:areaType}],
  }],
 };
}
/**
 * A single deterministic battle with all owned fighters present. No
 * cross-account borrowing, no mandatory role composition. The result uses
 * the engine's actual per-character damage/healing and replay log.
 */
export function simulateWorldBossAccountRaidV22(input:{
 eventId:string;requestId:string;roster:WorldBossAccountRosterV22;
 order:WorldBossOrder;boss:WorldBossId;phase:WorldBossPhase;
 serverSeed:string;encounter:WorldBossEncounterProfileV13;
 warCamp?:WorldBossWarCampSnapshotV11;
}):WorldBossAccountRaidOutputV22{
 const {eventId,requestId,roster,order,boss,phase,encounter,warCamp}=input;
 if(!ID.test(eventId)||!ID.test(requestId)||!safeSeed(input.serverSeed)||
  !['steady_assault','hold_line','break_armor'].includes(order)||
  !['hollowroot','sunscar','frostmarch'].includes(boss)||
  !['armored','exposed','enraged'].includes(phase)||
  !roster||!ID.test(roster.accountId)||
  roster.characters.length<1||roster.characters.length>5)
  throw Error('world_boss_v22_invalid_account_battle');
 verifyWorldBossEncounterProfileV13(encounter,boss,phase,eventId);
 if(warCamp&&warCamp.eventId!==eventId)
  throw Error('world_boss_v22_foreign_war_camp');
 const effects=deriveWorldBossWarCampEffectsV11(warCamp);
 verifyFrozenWorldBossAccountRosterV22(roster);
 const players=roster.characters.map(c=>({
  ...structuredClone(c.combatant),
  stats:{...c.combatant.stats,
   maxHp:c.combatant.stats.maxHp*effects.startingHpMultiplier,
   healingPower:c.combatant.stats.healingPower*effects.healingMultiplier,
  },
 }));
 const combat=simulateCombat({
  seed:[WORLD_BOSS_V22_ENGINE_VERSION,eventId,roster.accountId,
   input.serverSeed].join(':'),
  players,enemies:[offlineAccountRaidBoss({boss,phase,profile:encounter,warCamp,order})],
  maxDurationMs:80000,tickMs:100,
 });
 const characterLedger=combat.players.map(p=>({
  characterId:p.definition.id,rawDamage:p.damageDone,
  rawHealing:p.healingDone,damageTaken:p.damageTaken,
  interrupts:p.interrupts,survived:p.alive,
 }));
 const rawPartyDamage=characterLedger.reduce((sum,p)=>sum+p.rawDamage,0);
 const proposedWorldHpDamage=worldBossAccountDamageV22(characterLedger);
 return {
  schema:'world-boss-v22-account-raid-prototype',
  eventId,accountId:roster.accountId,requestId,boss,phase,order,
  rosterDigest:roster.rosterDigest,encounterDigest:encounter.digest,
  warCampDigest:warCamp?.digest??null,
  engineVersion:WORLD_BOSS_V22_ENGINE_VERSION,
  combat,rawPartyDamage,proposedWorldHpDamage,
  characterLedger,persisted:false,
 };
}
