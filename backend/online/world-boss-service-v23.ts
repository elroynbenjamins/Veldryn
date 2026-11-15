/**
 * VELDRYN WORLD BOSS V23 — PRIVATE, HIDDEN account-raid service prototype.
 *
 * No HTTP handler imports this module. No production/staging migration.
 * Auth comes from the existing Supabase /auth/v1/user verifier, never a decoded
 * client JWT or a client-supplied account/character roster.
 * All 1–5 owned GameStates are privately enumerated and V12-verified.
 * Only the V23 worker can generate combat/world damage; V18 settles it under
 * the event lock, after a replay has been durably stored.
 */
import {createHash} from 'node:crypto';
import {
 resolveRealWorldBossSnapshotV12,
 type WorldBossServerBracketPolicyV12,
} from './world-boss-loadout-v12';
import {
 freezeWorldBossAccountRosterV22,simulateWorldBossAccountRaidV22,
 WORLD_BOSS_V22_ENGINE_VERSION,
 type WorldBossAccountRosterV22,
} from '../src/server/combat/world-boss-account-raid-v22';
import {assertWorldBossAttackWindowV22} from '../src/server/combat/world-boss-weekend-v22';
import {
 loadWorldBossFrozenRulesV20,verifyWorldBossFrozenRulesV20,
 type WorldBossFrozenRulesV20,type WorldBossRulesSourceV20,
} from './world-boss-frozen-modifiers-v20';
import type {WorldBossOrder,WorldBossPhase,WorldBossId} from '../src/server/combat/world-boss-round-prototype';
import type {
 WorldBossRepositoryV23,WorldBossReserveAccountV23,
 WorldBossAccountOwnedStateV23,
} from './world-boss-private-pg-v23';
import type {WorldBossSettlementViewV19} from './world-boss-private-pg-v19';

export const WORLD_BOSS_V23_ACCOUNT_RAID_LIVE=false as const;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REQUEST=/^[A-Za-z0-9_-]{8,128}$/;
const WORKER=/^[A-Za-z0-9:_-]{8,160}$/;
const SEED=/^[A-Za-z0-9:_-]{24,512}$/;
const DIGEST=/^[a-f0-9]{64}$/;
const DAY=86400000;
const orders:readonly WorldBossOrder[]=['steady_assault','hold_line','break_armor'];
const phases:readonly WorldBossPhase[]=['armored','exposed','enraged'];
const sha=(text:string)=>createHash('sha256').update(text).digest('hex');
const validUuid=(s:unknown):s is string=>typeof s==='string'&&UUID.test(s);
export interface WorldBossAccountRaidDepsV23 {
 authenticate(token:string):Promise<string|null>;
 db:WorldBossRepositoryV23;
 nowUtcMs():number;
 randomSeed():string;
 workerId:string;
 policy:WorldBossServerBracketPolicyV12;
 minimumCharacterLevel:number;
 rulesSource:WorldBossRulesSourceV20;
 replayStore:{
  putImmutable(input:{key:string;digest:string;content:string}):Promise<void>;
 };
}
export interface WorldBossAccountRaidSelectionV23{
 eventId:string;requestId:string;order:WorldBossOrder;
}
export interface WorldBossAccountRaidReceiptV23{
 status:'reserved'|'committed'|'voided';ordinal:number;repeated:boolean;
 participatingCharacters?:number;
}
export interface WorldBossAccountRaidWorkerJobV23{
 eventId:string;accountId:string;requestId:string;
}
export interface WorldBossAccountRaidWorkerReceiptV23 extends
 WorldBossAccountRaidReceiptV23{
 creditedHp?:number;hpAfter?:number;residualEcho?:boolean;
}
interface FrozenAccountPacketV23{
 schema:'world-boss-v23-frozen-account-raid';
 eventId:string;accountId:string;requestId:string;rulesVersion:string;
 order:WorldBossOrder;rosterDigest:string;
 /** exact string — JSONB reorders object keys and would alter roster hashes */
 serializedRoster:string;
 /** minimal private SQL-owned-character membership selectors */
 characters:readonly {characterId:string;sourceRevision:number}[];
 warCamp:WorldBossFrozenRulesV20['warCamp'];
 encounterProfiles:WorldBossFrozenRulesV20['encounterProfiles'];
}
const validDeps=(s:WorldBossAccountRaidDepsV23)=>{
 if(!s||!s.db||typeof s.authenticate!=='function'||
  typeof s.db.listOwnedStates!=='function'||
  typeof s.db.loadEvent!=='function'||
  typeof s.db.reserveAccount!=='function'||
  typeof s.db.readAttempt!=='function'||
  typeof s.db.checkout!=='function'||typeof s.db.settle!=='function'||
  typeof s.nowUtcMs!=='function'||typeof s.randomSeed!=='function'||
  typeof s.replayStore?.putImmutable!=='function'||
  !WORKER.test(s.workerId)||
  !Number.isSafeInteger(s.minimumCharacterLevel)||
  s.minimumCharacterLevel<1||s.minimumCharacterLevel>100||
  !s.rulesSource)
  throw Error('world_boss_v23_invalid_private_service_configuration');
};
const validSelection=(value:WorldBossAccountRaidSelectionV23)=>{
 if(!value||typeof value!=='object'||Array.isArray(value)||
  Object.keys(value).some(k=>!['eventId','requestId','order'].includes(k))||
  !validUuid(value.eventId)||!REQUEST.test(value.requestId)||
  !orders.includes(value.order))
  throw Error('world_boss_v23_invalid_public_selection');
};
const validResponse=(r:WorldBossAccountRaidReceiptV23)=>{
 if(!r||!['reserved','committed','voided'].includes(r.status)||
  !Number.isSafeInteger(r.ordinal)||r.ordinal<1||r.ordinal>3||
  typeof r.repeated!=='boolean')
  throw Error('world_boss_v23_invalid_private_receipt');
 return {status:r.status,ordinal:r.ordinal,repeated:r.repeated};
};
const saneClock=(s:WorldBossAccountRaidDepsV23)=>{
 const now=s.nowUtcMs();
 if(!Number.isSafeInteger(now)||now<=0)
  throw Error('world_boss_v23_invalid_private_clock');
 return now;
};
function frozenPacket(input:unknown,job:{
 eventId:string;accountId:string;requestId:string;
 rulesVersion:string;order:WorldBossOrder;rosterDigest:string;
 warCampDigest:string;encounterDigest:string;boss:WorldBossId;
 phase:WorldBossPhase;
}):{
 roster:WorldBossAccountRosterV22;
 rules:ReturnType<typeof verifyWorldBossFrozenRulesV20>;
}{
 if(!input||typeof input!=='object'||Array.isArray(input))
  throw Error('world_boss_v23_invalid_frozen_packet');
 const raw=input as Partial<FrozenAccountPacketV23>;
 if(raw.schema!=='world-boss-v23-frozen-account-raid'||
  raw.eventId!==job.eventId||raw.accountId!==job.accountId||
  raw.requestId!==job.requestId||raw.rulesVersion!==job.rulesVersion||
  raw.order!==job.order||raw.rosterDigest!==job.rosterDigest||
  typeof raw.serializedRoster!=='string'||
  raw.serializedRoster.length<128||raw.serializedRoster.length>245760||
  !Array.isArray(raw.characters)||raw.characters.length<1||
  raw.characters.length>5)
  throw Error('world_boss_v23_frozen_packet_binding_failed');
 let roster:WorldBossAccountRosterV22;
 try{roster=JSON.parse(raw.serializedRoster) as WorldBossAccountRosterV22}
 catch{throw Error('world_boss_v23_invalid_serialized_roster');}
 if(!roster||roster.accountId!==job.accountId||
  roster.rosterDigest!==job.rosterDigest||
  !Array.isArray(roster.characters)||roster.characters.length!==raw.characters.length||
  roster.characters.some((r,i)=>r.characterId!==raw.characters?.[i]?.characterId||
   r.sourceRevision!==raw.characters?.[i]?.sourceRevision))
  throw Error('world_boss_v23_serialized_roster_not_bound');
 const rules=verifyWorldBossFrozenRulesV20({
  frozen:{warCamp:raw.warCamp!,encounterProfiles:raw.encounterProfiles!},
  eventId:job.eventId,boss:job.boss,phase:job.phase,
  warCampDigest:job.warCampDigest,
  encounterProfileDigest:job.encounterDigest,
 });
 return {roster,rules};
}

/**
 * Server authenticates and enumerates EVERY character (not client-selected).
 * On a lost ACK, the original request receipt is returned BEFORE a new
 * window/loadout check. DB itself rechecks the UTC window under a row lock.
 */
export async function reserveAuthenticatedWorldBossAccountRaidV23(input:{
 token:string;selection:WorldBossAccountRaidSelectionV23;
},s:WorldBossAccountRaidDepsV23):Promise<WorldBossAccountRaidReceiptV23>{
 validDeps(s);
 const {token,selection}=input;
 validSelection(selection);
 if(typeof token!=='string'||token.length<8||token.length>8192)
  throw Error('world_boss_v23_auth_required');
 const accountId=await s.authenticate(token);
 if(!validUuid(accountId))
  throw Error('world_boss_v23_invalid_authenticated_account');
 const prior=await s.db.readAttempt(selection.eventId,accountId,selection.requestId);
 if(prior){
  if(prior.order!==selection.order)
   throw Error('world_boss_v23_request_id_reused');
  return validResponse({...prior,repeated:true});
 }
 const now=saneClock(s);
 const event=await s.db.loadEvent(selection.eventId);
 if(event.status!=='active'||event.endsAtUtcMs-event.startsAtUtcMs!==7*DAY||
  !['hollowroot','sunscar','frostmarch'].includes(event.boss))
  throw Error('world_boss_v23_event_unavailable');
 assertWorldBossAttackWindowV22(event.startsAtUtcMs,now);
 // No client may choose which characters to omit. A missing state/underleveled
 // character makes this fail closed, never silently replaced with an Echo.
 const owned=await s.db.listOwnedStates(accountId);
 if(!Array.isArray(owned)||owned.length<1||owned.length>5)
  throw Error('world_boss_v23_invalid_account_character_population');
 const characterSet=new Set<string>();
 for(const row of owned){
  if(!row||row.ownerAccountId!==accountId||
   !validUuid(row.characterId)||characterSet.has(row.characterId)||
   !Number.isSafeInteger(row.gameVersion)||row.gameVersion<1||
   !Number.isSafeInteger(row.updatedAtUtcMs)||row.updatedAtUtcMs>now||
   !row.serverState||row.serverState.character?.id!==row.characterId)
   throw Error('world_boss_v23_unverified_owned_account_state');
  characterSet.add(row.characterId);
 }
 const verified=await Promise.all(owned.map(async row=>{
  // V12 independently checks equipped copy ownership, gear/gems/companions,
  // character id, state revision and real Combat Power on EVERY character.
  const result=await resolveRealWorldBossSnapshotV12({
   reader:{principalAccountId:accountId,
    async loadCharacterState({accountId:owner,characterId}){
     if(owner!==accountId||characterId!==row.characterId)
      throw Error('world_boss_v23_character_access_violation');
     return {ownerAccountId:row.ownerAccountId,
      gameVersion:row.gameVersion,serverState:structuredClone(row.serverState)};
    }},
   characterId:row.characterId,expectedGameVersion:row.gameVersion,
   nowUtcMs:now,minimumCharacterLevel:s.minimumCharacterLevel,
   policy:s.policy,
  });
  return result;
 }));
 // Strongest character anchors the *private* threat bracket. This does not
 // privilege it with a separate attack or attempt.
 const strongest=[...verified].sort((a,b)=>
  b.combatPower-a.combatPower||
  a.snapshot.verified.characterId.localeCompare(b.snapshot.verified.characterId))[0];
 const roster=freezeWorldBossAccountRosterV22({
  accountId,atUtcMs:now,verified,
 });
 const rules=await loadWorldBossFrozenRulesV20({
  source:s.rulesSource,eventId:selection.eventId,boss:event.boss,
  initiatorBracket:strongest.snapshot.bracket,
 });
 const seed=s.randomSeed();
 if(typeof seed!=='string'||!SEED.test(seed))
  throw Error('world_boss_v23_cryptographic_seed_required');
 const packet:FrozenAccountPacketV23={
  schema:'world-boss-v23-frozen-account-raid',
  eventId:selection.eventId,accountId,requestId:selection.requestId,
  order:selection.order,rulesVersion:event.rulesVersion,
  rosterDigest:roster.rosterDigest,
  serializedRoster:JSON.stringify(roster),
  characters:roster.characters.map(c=>({
   characterId:c.characterId,sourceRevision:c.sourceRevision,
  })),
  warCamp:rules.warCamp,encounterProfiles:rules.encounterProfiles,
 };
 if(JSON.stringify(packet).length>245760)
  throw Error('world_boss_v23_frozen_packet_oversized');
 const leaderCharacterId=strongest.snapshot.verified.characterId;
 const reservation:WorldBossReserveAccountV23={
  eventId:selection.eventId,accountId,leaderCharacterId,
  requestId:selection.requestId,order:selection.order,
  seed,rosterDigest:roster.rosterDigest,frozenPacket:packet,
  engineVersion:WORLD_BOSS_V22_ENGINE_VERSION,
  workerId:s.workerId,warCampDigest:rules.warCamp.digest,
 };
 const receipt=await s.db.reserveAccount(reservation);
 return {...validResponse(receipt),participatingCharacters:roster.characters.length};
}

/** Internal worker job sourced ONLY from private DB queue, never mobile JSON.
 * V18 checkout/settle holds event lock to protect all simultaneous players.
 */
export async function settleTrustedWorldBossAccountRaidV23(
 job:WorldBossAccountRaidWorkerJobV23,
 s:WorldBossAccountRaidDepsV23,
):Promise<WorldBossAccountRaidWorkerReceiptV23>{
 validDeps(s);
 if(!job||!validUuid(job.eventId)||!validUuid(job.accountId)||
  !REQUEST.test(job.requestId))
  throw Error('world_boss_v23_invalid_private_job');
 const event=await s.db.loadEvent(job.eventId);
 if(!['active','closed'].includes(event.status))
  throw Error('world_boss_v23_event_unavailable');
 const lease=await s.db.checkout(job.eventId,job.accountId,job.requestId,s.workerId);
 if(!lease||!Number.isSafeInteger(lease.generation)||lease.generation<1)
  throw Error('world_boss_v23_invalid_worker_lease');
 const base=validResponse(lease);
 if(lease.status!=='reserved')return {...base,repeated:true};
 if(typeof lease.seed!=='string'||!SEED.test(lease.seed)||
  typeof lease.digest!=='string'||!DIGEST.test(lease.digest)||
  lease.engine!==WORLD_BOSS_V22_ENGINE_VERSION||
  !orders.includes(lease.order as WorldBossOrder)||
  !phases.includes(lease.phase as WorldBossPhase)||
  typeof lease.warCampDigest!=='string'||!DIGEST.test(lease.warCampDigest)||
  typeof lease.encounterDigest!=='string'||!DIGEST.test(lease.encounterDigest))
  throw Error('world_boss_v23_unapproved_frozen_engine_or_rules');
 const freeze=frozenPacket(lease.squad,{
  eventId:job.eventId,accountId:job.accountId,requestId:job.requestId,
  rulesVersion:event.rulesVersion,order:lease.order!,rosterDigest:lease.digest,
  warCampDigest:lease.warCampDigest,encounterDigest:lease.encounterDigest,
  boss:event.boss,phase:lease.phase!,
 });
 const output=simulateWorldBossAccountRaidV22({
  eventId:job.eventId,requestId:job.requestId,roster:freeze.roster,
  order:lease.order!,boss:event.boss,phase:lease.phase!,
  serverSeed:lease.seed,encounter:freeze.rules.encounterProfile,
  warCamp:freeze.rules.warCamp,
 });
 const contribution=output.proposedWorldHpDamage;
 if(!Number.isSafeInteger(contribution)||contribution<0||
  contribution>1000000000000||
  !Number.isFinite(output.rawPartyDamage)||output.rawPartyDamage<0)
  throw Error('world_boss_v23_invalid_simulated_world_contribution');
 const content=JSON.stringify({
  engine:WORLD_BOSS_V22_ENGINE_VERSION,
  eventId:job.eventId,accountId:job.accountId,requestId:job.requestId,
  frozenRosterDigest:lease.digest,warCampDigest:lease.warCampDigest,
  encounterDigest:lease.encounterDigest,serverSeed:lease.seed,
  output,
 });
 const replayDigest=sha(content);
 const replayKey='WB23_RAID_'+replayDigest.slice(0,44);
 // A failed replay-store write NEVER debits the shared boss; durable first.
 await s.replayStore.putImmutable({key:replayKey,digest:replayDigest,content});
 const receipt:WorldBossSettlementViewV19=await s.db.settle({
  eventId:job.eventId,accountId:job.accountId,requestId:job.requestId,
  workerId:s.workerId,generation:lease.generation,
  digest:lease.digest,engineVersion:WORLD_BOSS_V22_ENGINE_VERSION,
  replayDigest,replayKey,
  // V18's raw_boss_damage column is used for the *normalized account
  // world impact* in this V23 draft. Full uncapped character damage stays
  // in the durable replay, never credited five times.
  rawDamage:contribution,guardDamage:0,
 });
 if(!receipt||receipt.status!=='committed'||!receipt.ordinal||
  !Number.isFinite(receipt.creditedHp)||receipt.creditedHp<0||
  !Number.isFinite(receipt.hpAfter)||receipt.hpAfter<0||
  typeof receipt.residualEcho!=='boolean')
  throw Error('world_boss_v23_untrusted_settlement_receipt');
 return {status:'committed',ordinal:receipt.ordinal,
  repeated:receipt.repeated,creditedHp:receipt.creditedHp,
  hpAfter:receipt.hpAfter,residualEcho:receipt.residualEcho,
  participatingCharacters:freeze.roster.characters.length};
}
