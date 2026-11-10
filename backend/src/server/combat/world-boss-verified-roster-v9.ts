/**
 * Veldryn World Boss V9 — DISABLED SERVER-ONLY, VERIFIED LOADOUT BRIDGE.
 *
 * This module is not imported by any public API or deployed Edge route.
 * It deliberately accepts ONLY actor IDs and settings from a trusted server
 * loader, never client-resolved combat stats, power, Echo candidates or seed.
 *
 * A VerifiedCombatSnapshot must already have been checked against actual
 * equipment, socket, gem, skill and companion ownership by the caller's
 * authoritative server resolver. This bridge validates shapes, snapshots,
 * roles, ownership and provenance; it does NOT fetch a user's account.
 */
import {createHash} from 'node:crypto';
import {combatantFromVerifiedSnapshot,type VerifiedCombatSnapshot} from './snapshot-adapter';
import {matchWorldBossEchoesPrototype,type WorldBossEchoCandidatePrototype,type WorldBossPowerBracket} from './world-boss-echo-prototype';
import type {WorldBossAttemptPrototype,WorldBossSnapshotPrototype} from './world-boss-event-prototype';
import type {AbilityDefinition,CombatantDefinition} from './types';
import type {WorldBossOrder} from './world-boss-round-prototype';

export const WORLD_BOSS_V9_SERVER_LOADOUT_ONLY=true as const;
const ECHO_FRESH_MS=7*86400000;
const INITIATOR_FRESH_MS=60000;
const SAFE_ID=/^[A-Za-z0-9][A-Za-z0-9:_-]{0,159}$/;
const invalid=(value:string)=>!SAFE_ID.test(value);
const finite=(x:number)=>Number.isFinite(x)&&x>=0;
const roleSet=new Set(['tank','damage','support']);

export interface WorldBossAuthoritativeSnapshotV9{
  snapshotId:string;ownerAccountId:string;capturedAtUtcMs:number;
  bracket:WorldBossPowerBracket;usageCount:number;eligible:boolean;
  affinity?:'none'|'friend'|'guild';
  /** Only populated from an authenticated, verified server-owned source. */
  verified:VerifiedCombatSnapshot;
  /** Validated server class kit (never the app's selected ability JSON). */
  abilities:readonly AbilityDefinition[];
}
export interface WorldBossRosterLoaderV9{
  /** Must use upstream authenticated principal, never an accountId from client JSON. */
  principalAccountId:string;
  nowUtcMs():number;
  /** Secure server entropy. Do not derive this from the user's request ID. */
  randomSeed():string;
  loadCurrentCharacter(input:{accountId:string;characterId:string}):Promise<WorldBossAuthoritativeSnapshotV9>;
  listEligibleEchoes(input:{eventId:string;accountId:string;atUtcMs:number}):Promise<readonly WorldBossAuthoritativeSnapshotV9[]>;
}
export interface WorldBossRosterRequestV9{
  eventId:string;characterId:string;requestId:string;order:WorldBossOrder;
}
export interface WorldBossPreparedRosterV9{
  /** Output for the test-only serial reducer, NOT a submitted mobile request. */
  command:WorldBossAttemptPrototype;
  /** Server-generated nonce; the final DB receipt must bind it to this request. */
  serverSeed:string;
  snapshotDigest:string;
  npcSlots:number;
  selectedRealEchoIds:readonly string[];
  contentVersion:'v9-verified-roster-prototype';
  /** Snapshot resolution still needs durable DB reservation/locking. */
  persisted:false;
}

function assertSnapshot(value:WorldBossAuthoritativeSnapshotV9,now:number,initiator:boolean):void{
 if(invalid(value.snapshotId)||invalid(value.ownerAccountId)||
  !Number.isSafeInteger(value.capturedAtUtcMs)||value.capturedAtUtcMs>now||
  now-value.capturedAtUtcMs>(initiator?INITIATOR_FRESH_MS:ECHO_FRESH_MS)||
  !Number.isSafeInteger(value.usageCount)||value.usageCount<0||
  ![1,2,3,4,5].includes(value.bracket))throw Error('world_boss_invalid_server_snapshot_metadata');
 const s=value.verified;
 if(invalid(s.characterId)||invalid(s.classId)||!roleSet.has(s.role)||
  !Number.isInteger(s.level)||s.level<1||s.level>100||
  !finite(s.maxHp)||s.maxHp===0||!finite(s.attackPower)||s.attackPower===0||
  !finite(s.healingPower)||!finite(s.defense)||!finite(s.accuracy)||!finite(s.evasion)||
  !finite(s.critChance)||!Number.isFinite(s.haste)||
  (s.critMultiplier!==undefined&&!finite(s.critMultiplier)))
  throw Error('world_boss_invalid_verified_combat_snapshot');
 if(!Array.isArray(value.abilities)||value.abilities.length>32||
  value.abilities.some(a=>invalid(a.id)||!Number.isFinite(a.cooldownMs)||a.cooldownMs<0||
   !Number.isFinite(a.castTimeMs)||a.castTimeMs<0||!Number.isFinite(a.priority)||
   !Array.isArray(a.effects)||a.effects.length>8)||
  new Set(value.abilities.map(a=>a.id)).size!==value.abilities.length)
  throw Error('world_boss_invalid_server_ability_kit');
}
function toPlayer(
 source:WorldBossAuthoritativeSnapshotV9,usedIds:Set<string>,
):CombatantDefinition{
 const actor=combatantFromVerifiedSnapshot(source.verified,[...source.abilities].map(a=>({
  ...a,effects:[...a.effects].map(e=>({...e})),
 })));
 if(actor.team!=='players'||actor.role!==source.verified.role||
   !roleSet.has(actor.role)||actor.stats.maxHp<=0||actor.stats.attackPower<=0)
  throw Error('world_boss_verified_actor_unsupported');
 // The normalized actor id is a character UUID/ID from the trusted server;
 // duplicate ID collisions across different Echo owners are prohibited.
 if(usedIds.has(actor.id))throw Error('world_boss_duplicate_verified_actor');
 usedIds.add(actor.id);
 return actor;
}
const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

/**
 * Internal-only preparation. No call to public auth headers or client-supplied
 * equipment. The verified roster and nonce must be reserved durably before
 * an eventual production attempt is simulated or an attempt slot consumed.
 */
export async function prepareWorldBossRosterV9(
 loader:WorldBossRosterLoaderV9, request:WorldBossRosterRequestV9,
):Promise<WorldBossPreparedRosterV9>{
 const account=loader.principalAccountId,now=loader.nowUtcMs();
 if(invalid(account)||invalid(request.eventId)||invalid(request.characterId)||
  !/^[A-Za-z0-9_-]{8,128}$/.test(request.requestId)||
  !['break_armor','hold_line','steady_assault'].includes(request.order)||
  !Number.isSafeInteger(now)||now<0)throw Error('world_boss_invalid_authenticated_request');
 const starter=await loader.loadCurrentCharacter({accountId:account,characterId:request.characterId});
 assertSnapshot(starter,now,true);
 if(starter.ownerAccountId!==account||starter.verified.characterId!==request.characterId||!starter.eligible)
  throw Error('world_boss_initiator_not_verified_or_eligible');
 const echoes=await loader.listEligibleEchoes({eventId:request.eventId,accountId:account,atUtcMs:now});
 if(echoes.length>1000)throw Error('world_boss_echo_candidate_limit');
 const actors=new Set<string>();
 const toEcho=(raw:WorldBossAuthoritativeSnapshotV9):WorldBossEchoCandidatePrototype=>{
  assertSnapshot(raw,now,false);
  return {snapshotId:raw.snapshotId,ownerAccountId:raw.ownerAccountId,
   resolvedCombatant:toPlayer(raw,actors),bracket:raw.bracket,uses:raw.usageCount,
   updatedAtUtcMs:raw.capturedAtUtcMs,eligible:raw.eligible,affinity:raw.affinity};
 };
 // Bad/stale Echo inputs are excluded rather than making the initiator fail.
 // Never silently bypass malicious/invalid starter data.
 const candidates:WorldBossEchoCandidatePrototype[]=[];
 const candidateActors=new Set<string>();
 for(const echo of echoes){
  try{
   const converted=toEcho(echo);
   if(!candidateActors.has(converted.resolvedCombatant.id)){
    candidates.push(converted);
    candidateActors.add(converted.resolvedCombatant.id);
   }
  }catch{ /* server catalogue quarantine: NPC backfills missing roles */ }
 }
 const starterActor=toPlayer(starter,new Set());
 const initiator:WorldBossSnapshotPrototype={
  snapshotId:starter.snapshotId,ownerAccountId:starter.ownerAccountId,resolvedCombatant:starterActor
 };
 const seed=loader.randomSeed();
 if(typeof seed!=='string'||seed.trim().length<24||seed.length>512)
  throw Error('world_boss_server_entropy_required');
 const matched=matchWorldBossEchoesPrototype({
  seed,accountId:account,atUtcMs:now,bracket:starter.bracket,initiator,
  candidateEchoes:candidates,
 });
 const snapshotDigest=digest({
  version:'v9-verified-roster-prototype',account,request,
  squad:matched.squad.map(s=>({
   ownerAccountId:s.ownerAccountId,snapshotId:s.snapshotId,npc:Boolean(s.npc),actor:s.resolvedCombatant,
  })),
 });
 return {
  command:{accountId:account,characterId:request.characterId,requestId:request.requestId,
   atUtcMs:now,order:request.order,squad:matched.squad},
  serverSeed:seed,snapshotDigest,npcSlots:matched.npcSlots,
  selectedRealEchoIds:matched.selectedRealEchoIds,
  contentVersion:'v9-verified-roster-prototype',persisted:false,
 };
}
