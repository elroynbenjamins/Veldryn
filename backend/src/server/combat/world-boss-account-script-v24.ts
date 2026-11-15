/**
 * World Boss V24 — hidden, authored 14-round account raid prototype.
 *
 * Reuses the V6/V13 boss-specific cue scripts, real telegraph/interrupt
 * counterplay and local guard/HP arithmetic, not V22's generic time enemy.
 * Exactly 1–5 server-verified characters share one account-side encounter.
 * Every event/account/seed/roster/profile is immutable at reservation; nothing
 * here reads a client GameState, writes community HP, or grants World Sigils.
 *
 * This is a NEW replay format, intentionally NOT usable by the V23 worker
 * before a separate server/database versioned rollout.
 */
import {
 simulateWorldBossRounds,validateWorldBossScripts,
 type WorldBossId,type WorldBossPhase,type WorldBossOrder,
 type WorldBossRoundResult,type WorldBossRoleLedger,
} from './world-boss-round-prototype';
import {
 verifyFrozenWorldBossAccountRosterV22,worldBossAccountDamageV22,
 type WorldBossAccountRosterV22,
} from './world-boss-account-raid-v22';
import {
 verifyWorldBossEncounterProfileV13,
 type WorldBossEncounterProfileV13,
} from './world-boss-encounter-profile-v13';
import {
 deriveWorldBossWarCampEffectsV11,
 type WorldBossWarCampSnapshotV11,
} from './world-boss-war-camp-v11';

export const WORLD_BOSS_V24_AUTHORED_ACCOUNT_RAID_LIVE=false as const;
export const WORLD_BOSS_V24_ENGINE_VERSION='world-boss-account-raid-v24-scripted-prototype' as const;
export const WORLD_BOSS_V24_MAX_ROUNDS=14 as const;
const ID=/^[A-Za-z0-9][A-Za-z0-9:_-]{0,159}$/;
const SEED=/^[A-Za-z0-9:_-]{24,512}$/;
const money=(n:number)=>Math.round(n*100)/100;
const orderList:readonly WorldBossOrder[]=['steady_assault','hold_line','break_armor'];
const bossList:readonly WorldBossId[]=['hollowroot','sunscar','frostmarch'];
const phaseList:readonly WorldBossPhase[]=['armored','exposed','enraged'];

/**
 * Solo or two-character accounts are not punished as if five bodies are
 * available to absorb scripted hits. This pressure only scales BOSS attack,
 * not guard/defense, so single-character contribution can still compete.
 *
 * Values are candidate calibration, NOT approved live balance:
 * 1=70%, 2=77.5%, 3=85%, 4=92.5%, 5=100%.
 */
export function worldBossAccountPressureV24(size:number):number{
 if(!Number.isInteger(size)||size<1||size>5)
  throw Error('world_boss_v24_invalid_raid_size');
 return money(.70+(size-1)*.075);
}
export interface WorldBossAccountRoleLedgerV24 extends WorldBossRoleLedger{
 characterId:string;
}
export interface WorldBossAccountRaidV24{
 schema:'world-boss-v24-scripted-account-raid';
 engineVersion:typeof WORLD_BOSS_V24_ENGINE_VERSION;
 eventId:string;requestId:string;accountId:string;
 boss:WorldBossId;phase:WorldBossPhase;order:WorldBossOrder;
 rosterDigest:string;encounterDigest:string;warCampDigest:string|null;
 rosterSize:number;bossPressure:number;roundsCompleted:number;
 roundEncounter:WorldBossRoundResult;
 /** Raw HP damage excludes guard; still fully visible in the actual replay. */
 rawBossHpDamage:number;
 localGuardDamage:number;
 /** One normalized account-wide community HP contribution, not per fighter. */
 proposedWorldHpDamage:number;
 characterLedger:readonly WorldBossAccountRoleLedgerV24[];
 persisted:false;
}
export function simulateWorldBossAccountRaidV24(input:{
 eventId:string;requestId:string;roster:WorldBossAccountRosterV22;
 boss:WorldBossId;phase:WorldBossPhase;order:WorldBossOrder;
 serverSeed:string;encounter:WorldBossEncounterProfileV13;
 warCamp?:WorldBossWarCampSnapshotV11;
}):WorldBossAccountRaidV24{
 const {eventId,requestId,roster,boss,phase,order,serverSeed,encounter,warCamp}=input;
 if(!ID.test(eventId)||!ID.test(requestId)||!SEED.test(serverSeed)||
  !bossList.includes(boss)||!phaseList.includes(phase)||!orderList.includes(order))
  throw Error('world_boss_v24_invalid_server_battle_request');
 verifyFrozenWorldBossAccountRosterV22(roster);
 verifyWorldBossEncounterProfileV13(encounter,boss,phase,eventId);
 if(warCamp&&warCamp.eventId!==eventId)
  throw Error('world_boss_v24_foreign_war_camp');
 deriveWorldBossWarCampEffectsV11(warCamp);
 validateWorldBossScripts();
 const pressure=worldBossAccountPressureV24(roster.characters.length);
 // The same verified classes, equipment, companions and traits now perform
 // their real 14-round attacks, guard breaks, heals, cleanses and interrupts.
 const roundEncounter=simulateWorldBossRounds({
  seed:[WORLD_BOSS_V24_ENGINE_VERSION,eventId,roster.accountId,serverSeed].join(':'),
  boss,phase,order,
  players:roster.characters.map(c=>structuredClone(c.combatant)),
  pressure,
  accountRaidV24:true,
  serverEncounterProfile:encounter,
  ...(warCamp?{serverWarCamp:warCamp}:{}),
 });
 const ledger:WorldBossAccountRoleLedgerV24[]=roster.characters.map(c=>{
  const row=roundEncounter.participants[c.characterId];
  if(!row||!Number.isFinite(row.bossHpDamage)||row.bossHpDamage<0||
   !Number.isFinite(row.guardDamage)||row.guardDamage<0)
   throw Error('world_boss_v24_incomplete_character_ledger');
  return {characterId:c.characterId,...row};
 });
 const rawBossHpDamage=money(ledger.reduce((sum,c)=>sum+c.bossHpDamage,0));
 const proposedWorldHpDamage=worldBossAccountDamageV22(ledger.map(row=>({
  characterId:row.characterId,rawDamage:row.bossHpDamage,
 })));
 if(!Number.isSafeInteger(proposedWorldHpDamage)||
  proposedWorldHpDamage>rawBossHpDamage)
  throw Error('world_boss_v24_invalid_world_contribution');
 if(roundEncounter.roundsCompleted<1||
  roundEncounter.roundsCompleted>WORLD_BOSS_V24_MAX_ROUNDS||
  Math.abs(roundEncounter.bossHpDamage-rawBossHpDamage)>.03)
  throw Error('world_boss_v24_invalid_round_damage_tally');
 return {
  schema:'world-boss-v24-scripted-account-raid',
  engineVersion:WORLD_BOSS_V24_ENGINE_VERSION,
  eventId,requestId,accountId:roster.accountId,boss,phase,order,
  rosterDigest:roster.rosterDigest,
  encounterDigest:encounter.digest,warCampDigest:warCamp?.digest??null,
  rosterSize:roster.characters.length,bossPressure:pressure,
  roundsCompleted:roundEncounter.roundsCompleted,
  roundEncounter,rawBossHpDamage,
  localGuardDamage:roundEncounter.localGuardDamage,
  proposedWorldHpDamage,characterLedger:ledger,persisted:false,
 };
}
