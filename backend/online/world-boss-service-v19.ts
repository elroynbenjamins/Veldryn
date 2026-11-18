/**
 * World Boss V19 — HIDDEN server-only ownership -> roster -> frozen battle bridge.
 *
 * No route imports this module. V17/V18 SQL are docs-only and not deployed.
 * A real host MUST verify Auth with Supabase /auth/v1/user, keep database and
 * replay store private, and supply cryptographically secure entropy.
 * Never forward a client-provided GameState, roster, damage or worker identity.
 */
import {createHash} from 'node:crypto';
import {
 resolveRealWorldBossSnapshotV12,
 type WorldBossServerBracketPolicyV12,
 type WorldBossOwnedStateReaderV12,
} from './world-boss-loadout-v12';
import {
 prepareWorldBossRosterV9,
 type WorldBossPreparedRosterV9,
} from '../src/server/combat/world-boss-verified-roster-v9';
import {verifyWorldBossV9PreparedRoster} from '../src/server/combat/world-boss-reservation-v10';
import {
 simulateWorldBossRounds,
 type WorldBossOrder,
} from '../src/server/combat/world-boss-round-prototype';
import {WORLD_BOSS_EVENT_PROTOTYPE_VERSION} from '../src/server/combat/world-boss-event-prototype';
import type {WorldBossPrivateRepositoryV19,WorldBossSettlementViewV19} from './world-boss-private-pg-v19';
import {
 loadWorldBossConsentedEchoesV20,
 type WorldBossConsentedEchoSourceV20,
 type WorldBossEchoResolutionV20,
} from './world-boss-consented-echoes-v20';
import {
 loadWorldBossFrozenRulesV20,verifyWorldBossFrozenRulesV20,
 type WorldBossFrozenRulesV20,type WorldBossRulesSourceV20,
} from './world-boss-frozen-modifiers-v20';
import type {WorldBossPhase,WorldBossId} from '../src/server/combat/world-boss-round-prototype';

export const WORLD_BOSS_V19_LIVE=false as const;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REQUEST=/^[A-Za-z0-9_-]{8,128}$/;
const ENTROPY=/^[A-Za-z0-9:_-]{24,512}$/;
const WORKER=/^[A-Za-z0-9:_-]{8,160}$/;
const validUuid=(s:unknown):s is string=>typeof s==='string'&&UUID.test(s);
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const allowedOrders:WorldBossOrder[]=['hold_line','steady_assault','break_armor'];

export interface WorldBossServiceDepsV19 {
 /** Return an Auth-verified account ID, not client JWT payload or user_metadata. */
 authenticate(token:string):Promise<string|null>;
 db:WorldBossPrivateRepositoryV19;
 /** Must be server-generated CSPRNG, never a user-provided seed. */
 randomSeed():string;
 /** Must be a private trusted worker identity (not a client parameter). */
 workerId:string;
 nowUtcMs():number;
 /** Unapproved power thresholds: injected strictly from private server policy. */
 policy:WorldBossServerBracketPolicyV12;
 minimumCharacterLevel:number;
 /** V20 is opt-in only when BOTH trusted sources exist. Never source these
  * from client JSON; the SQL V20 guard rechecks selected Echo grants.
  */
 echoSource?:WorldBossConsentedEchoSourceV20;
 rulesSource?:WorldBossRulesSourceV20;
 /** Durable, content-addressed, private replay artifact storage. */
 replayStore:{
  putImmutable(input:{key:string;digest:string;content:string}):Promise<void>;
 };
}
export interface WorldBossReserveSelectionV19 {
 eventId:string;characterId:string;requestId:string;order:WorldBossOrder;
 expectedGameVersion:number;
}
export interface WorldBossPublicReceiptV19 {
 status:'reserved'|'committed'|'voided';ordinal:number;repeated:boolean;
}
export interface WorldBossWorkerSelectionV19 {
 eventId:string;accountId:string;requestId:string;
}
export interface WorldBossWorkerReceiptV19 extends WorldBossPublicReceiptV19 {
 creditedHp?:number;hpAfter?:number;residualEcho?:boolean;
}
/** Serialized V9 payload is a STRING inside JSONB. JSONB object-key
 * reordering must not alter the legacy order-sensitive V9/V10 SHA256 digest.
 */
interface FrozenWorldBossPacketV19 {
 schema:'world-boss-v19-serialized-v9';
 eventId:string;accountId:string;rulesVersion:string;
 serializedPrepared:string;
}
interface FrozenWorldBossPacketV20 {
 schema:'world-boss-v20-serialized-v9';
 eventId:string;accountId:string;rulesVersion:string;
 serializedPrepared:string;
 realEchoConsents:Array<{
  eventId:string;ownerAccountId:string;characterId:string;
  consentRevision:number;
 }>;
 warCamp:WorldBossFrozenRulesV20['warCamp'];
 encounterProfiles:WorldBossFrozenRulesV20['encounterProfiles'];
}
type FrozenWorldBossPacket=FrozenWorldBossPacketV19|FrozenWorldBossPacketV20;
const validRuntime=(s:WorldBossServiceDepsV19)=>{
 if(!s||!s.db||!s.replayStore||typeof s.authenticate!=='function'||
  typeof s.randomSeed!=='function'||typeof s.nowUtcMs!=='function'||
  typeof s.replayStore.putImmutable!=='function'||
  Boolean(s.echoSource)!==Boolean(s.rulesSource)||
  !WORKER.test(s.workerId)||
  !Number.isSafeInteger(s.minimumCharacterLevel)||s.minimumCharacterLevel<1||
  s.minimumCharacterLevel>100)
  throw Error('world_boss_v19_server_not_configured');
};
const validRequest=(c:WorldBossReserveSelectionV19)=>{
 if(!c||Object.keys(c).some(k=>!['eventId','characterId','requestId','order','expectedGameVersion'].includes(k))||
  !validUuid(c.eventId)||!validUuid(c.characterId)||
  !REQUEST.test(c.requestId)||!allowedOrders.includes(c.order)||
  !Number.isSafeInteger(c.expectedGameVersion)||c.expectedGameVersion<1)
  throw Error('world_boss_v19_invalid_selection');
};
const validReceipt=(value:WorldBossPublicReceiptV19)=>{
 if(!value||!['reserved','committed','voided'].includes(value.status)||
  !Number.isInteger(value.ordinal)||value.ordinal<1||value.ordinal>3||
  typeof value.repeated!=='boolean')
  throw Error('world_boss_v19_invalid_database_receipt');
 return {status:value.status,ordinal:value.ordinal,repeated:value.repeated};
};
/**
 * This function is NOT an HTTP handler. When mounted in a future server,
 * callers must supply only a Bearer token + the five documented selectors.
 * No direct public DB, replay store, or private worker token is exposed.
 */
export async function reserveAuthenticatedWorldBossV19(input:{
 token:string;selection:WorldBossReserveSelectionV19;
},s:WorldBossServiceDepsV19):Promise<WorldBossPublicReceiptV19>{
 validRuntime(s);
 const {token,selection}=input;
 validRequest(selection);
 if(typeof token!=='string'||token.length<8||token.length>8192)
  throw Error('world_boss_v19_auth_required');
 const accountId=await s.authenticate(token);
 if(!validUuid(accountId))
  throw Error('world_boss_v19_invalid_session');
 const prior=await s.db.readAttempt(selection.eventId,accountId,selection.requestId);
 if(prior){
  if(prior.characterId!==selection.characterId||prior.order!==selection.order)
   throw Error('world_boss_v19_request_id_reused');
  return validReceipt({...prior,repeated:true});
 }
 const event=await s.db.loadEvent(selection.eventId);
 if(event.status!=='active'||!['hollowroot','sunscar','frostmarch'].includes(event.boss)||
  typeof event.rulesVersion!=='string'||event.rulesVersion.length<3)
  throw Error('world_boss_v19_event_unavailable');
 const now=s.nowUtcMs();
 if(!Number.isSafeInteger(now)||now<=0)
  throw Error('world_boss_v19_invalid_server_clock');
 const owned=await s.db.loadOwnedState(accountId,selection.characterId);
 if(owned.ownerAccountId!==accountId||owned.characterId!==selection.characterId||
  owned.updatedAtUtcMs>now||now-owned.updatedAtUtcMs>7*86400000)
  throw Error('world_boss_v19_state_not_authoritative_or_fresh');
 const reader:WorldBossOwnedStateReaderV12={
  principalAccountId:accountId,
  async loadCharacterState({accountId:requested,characterId}){
   if(requested!==accountId||characterId!==selection.characterId)
    throw Error('world_boss_v19_character_not_owned');
   return {ownerAccountId:owned.ownerAccountId,serverState:owned.serverState,
    gameVersion:owned.gameVersion};
  },
 };
 const verified=await resolveRealWorldBossSnapshotV12({
  reader,characterId:selection.characterId,
  expectedGameVersion:selection.expectedGameVersion,nowUtcMs:now,
  minimumCharacterLevel:s.minimumCharacterLevel,policy:s.policy,
 });
 // V20 only: consent rows come from a trusted private repository and every
 // owner's GameState is re-resolved through the V12 equipment/CP verifier.
 const echoResolution:WorldBossEchoResolutionV20|undefined=s.echoSource
  ?await loadWorldBossConsentedEchoesV20({
   source:s.echoSource,eventId:selection.eventId,
   requesterAccountId:accountId,nowUtcMs:now,
   minimumCharacterLevel:s.minimumCharacterLevel,policy:s.policy,
  }):undefined;
 const frozenRules:WorldBossFrozenRulesV20|undefined=s.rulesSource
  ?await loadWorldBossFrozenRulesV20({
   source:s.rulesSource,eventId:selection.eventId,boss:event.boss,
   initiatorBracket:verified.snapshot.bracket,
  }):undefined;
 const seed=s.randomSeed();
 if(typeof seed!=='string'||!ENTROPY.test(seed))
  throw Error('world_boss_v19_secure_entropy_required');
 // V9 selects only adjacent CP brackets and different owners. Missing or
 // revoked eligible roles fall back to the historical deterministic NPCs.
 const prepared=await prepareWorldBossRosterV9({
  principalAccountId:accountId,nowUtcMs:()=>now,randomSeed:()=>seed,
  loadCurrentCharacter:async()=>verified.snapshot,
  listEligibleEchoes:async()=>echoResolution?.candidates??[],
 },{
  eventId:selection.eventId,characterId:selection.characterId,
  requestId:selection.requestId,order:selection.order,
 });
 verifyWorldBossV9PreparedRoster(selection.eventId,prepared);
 const selectedConsents=prepared.selectedRealEchoIds.map(id=>{
  const binding=echoResolution?.consentBindings.find(x=>x.snapshotId===id);
  if(!binding)throw Error('world_boss_v20_missing_selected_echo_consent');
  return {eventId:binding.eventId,ownerAccountId:binding.ownerAccountId,
   characterId:binding.characterId,consentRevision:binding.consentRevision};
 });
 const core={eventId:selection.eventId,accountId,rulesVersion:event.rulesVersion,
  serializedPrepared:JSON.stringify(prepared)};
 const packet:FrozenWorldBossPacket=frozenRules?{
  ...core,schema:'world-boss-v20-serialized-v9',
  realEchoConsents:selectedConsents,
  warCamp:frozenRules.warCamp,
  encounterProfiles:frozenRules.encounterProfiles,
 }:{...core,schema:'world-boss-v19-serialized-v9'};
 const receipt=await s.db.reserve({
  eventId:selection.eventId,accountId,characterId:selection.characterId,
  requestId:selection.requestId,order:selection.order,
  seed:prepared.serverSeed,digest:prepared.snapshotDigest,
  frozenPacket:packet,engineVersion:WORLD_BOSS_EVENT_PROTOTYPE_VERSION,
  workerId:s.workerId,
  ...(frozenRules?{warCampDigest:frozenRules.warCamp.digest}:{}),
 });
 return validReceipt(receipt);
}

function assertFrozen(input:unknown,job:{
 eventId:string;accountId:string;requestId:string;seed:string;digest:string;
 rulesVersion:string;order:WorldBossOrder;
 boss:WorldBossId;phase:WorldBossPhase;
 warCampDigest?:string|null;encounterDigest?:string|null;
}):{prepared:WorldBossPreparedRosterV9;
 rules?:{warCamp:WorldBossFrozenRulesV20['warCamp'];
  encounterProfile:WorldBossFrozenRulesV20['encounterProfiles']['armored']}}{
 if(!input||typeof input!=='object'||Array.isArray(input))
  throw Error('world_boss_v19_invalid_frozen_packet');
 const p=input as Partial<FrozenWorldBossPacket>;
 if(!['world-boss-v19-serialized-v9','world-boss-v20-serialized-v9']
   .includes(p.schema as string)||p.eventId!==job.eventId||
  p.accountId!==job.accountId||p.rulesVersion!==job.rulesVersion||
  typeof p.serializedPrepared!=='string'||p.serializedPrepared.length>262144)
  throw Error('world_boss_v19_frozen_packet_mismatch');
 let prepared:WorldBossPreparedRosterV9;
 try{prepared=JSON.parse(p.serializedPrepared) as WorldBossPreparedRosterV9;}
 catch{throw Error('world_boss_v19_invalid_serialized_roster');}
 if(!prepared||prepared.serverSeed!==job.seed||
  prepared.snapshotDigest!==job.digest||
  prepared.command?.requestId!==job.requestId||
  prepared.command?.accountId!==job.accountId||
  prepared.command?.order!==job.order)
  throw Error('world_boss_v19_job_not_bound_to_reservation');
 verifyWorldBossV9PreparedRoster(job.eventId,prepared);
 if(p.schema==='world-boss-v19-serialized-v9'){
  if(job.warCampDigest!=null||job.encounterDigest!=null)
   throw Error('world_boss_v20_legacy_battle_with_unverified_modifiers');
  return {prepared};
 }
 const v20=p as FrozenWorldBossPacketV20;
 const real=prepared.command.squad.filter(a=>!a.npc&&
  a.ownerAccountId!==job.accountId);
 if(!Array.isArray(v20.realEchoConsents)||
  v20.realEchoConsents.length!==real.length||
  v20.realEchoConsents.some((binding,i)=>
   binding.ownerAccountId!==real[i].ownerAccountId||
   binding.characterId!==real[i].resolvedCombatant.id||
   binding.eventId!==job.eventId||
   !Number.isSafeInteger(binding.consentRevision)||
   binding.consentRevision<1))
  throw Error('world_boss_v20_frozen_echo_consent_mismatch');
 if(typeof job.warCampDigest!=='string'||typeof job.encounterDigest!=='string')
  throw Error('world_boss_v20_missing_frozen_modifier_digests');
 const rules=verifyWorldBossFrozenRulesV20({
  frozen:{warCamp:v20.warCamp,encounterProfiles:v20.encounterProfiles},
  eventId:job.eventId,boss:job.boss,phase:job.phase,
  warCampDigest:job.warCampDigest,
  encounterProfileDigest:job.encounterDigest,
 });
 return {prepared,rules};
}

/**
 * Internal queue worker ONLY. Its event/account/request are sourced from a
 * trusted database job, not from a user request. Compute the entire combat
 * result from the frozen V9 verified squad; never accept external damage.
 */
export async function settleTrustedWorldBossV19(
 job:WorldBossWorkerSelectionV19,s:WorldBossServiceDepsV19,
):Promise<WorldBossWorkerReceiptV19>{
 validRuntime(s);
 if(!job||!validUuid(job.eventId)||!validUuid(job.accountId)||
  !REQUEST.test(job.requestId))
  throw Error('world_boss_v19_invalid_trusted_job');
 const event=await s.db.loadEvent(job.eventId);
 if(!['active','closed'].includes(event.status)||
  !['hollowroot','sunscar','frostmarch'].includes(event.boss))
  throw Error('world_boss_v19_event_unavailable');
 const lease=await s.db.checkout(job.eventId,job.accountId,job.requestId,s.workerId);
 if(!lease||!Number.isSafeInteger(lease.generation)||lease.generation<1||
  !Number.isInteger(lease.ordinal)||lease.ordinal<1||lease.ordinal>3)
  throw Error('world_boss_v19_invalid_worker_lease');
 if(lease.status!=='reserved')
  return validReceipt({...lease,repeated:true});
 if(typeof lease.seed!=='string'||!ENTROPY.test(lease.seed)||
  typeof lease.digest!=='string'||!/^[a-f0-9]{64}$/.test(lease.digest)||
  lease.engine!==WORLD_BOSS_EVENT_PROTOTYPE_VERSION||
  !allowedOrders.includes(lease.order as WorldBossOrder)||
  !['armored','exposed','enraged'].includes(lease.phase as string))
  throw Error('world_boss_v19_unapproved_or_invalid_frozen_engine');
 const frozen=assertFrozen(lease.squad,{
  eventId:job.eventId,accountId:job.accountId,requestId:job.requestId,
  seed:lease.seed,digest:lease.digest,rulesVersion:event.rulesVersion,
  order:lease.order!,boss:event.boss,phase:lease.phase!,
  warCampDigest:lease.warCampDigest,encounterDigest:lease.encounterDigest,
 });
 const replay=simulateWorldBossRounds({
  boss:event.boss,phase:lease.phase!,order:lease.order!,
  seed:[WORLD_BOSS_EVENT_PROTOTYPE_VERSION,job.eventId,job.accountId,lease.seed].join(':'),
  players:frozen.prepared.command.squad.map(s=>s.resolvedCombatant),
  serverWarCamp:frozen.rules?.warCamp,
  serverEncounterProfile:frozen.rules?.encounterProfile,
 });
 if(!Number.isFinite(replay.bossHpDamage)||replay.bossHpDamage<0||
  !Number.isFinite(replay.localGuardDamage)||replay.localGuardDamage<0||
  !Number.isInteger(replay.roundsCompleted)||replay.roundsCompleted<1||
  replay.roundsCompleted>14)
  throw Error('world_boss_v19_invalid_simulation_result');
 const rawDamage=Number(replay.bossHpDamage.toFixed(2));
 const guardDamage=Number(replay.localGuardDamage.toFixed(2));
 const content=JSON.stringify({version:WORLD_BOSS_EVENT_PROTOTYPE_VERSION,
  eventId:job.eventId,accountId:job.accountId,requestId:job.requestId,
  seed:lease.seed,rosterDigest:lease.digest,
  warCampDigest:lease.warCampDigest??null,
  encounterProfileDigest:lease.encounterDigest??null,replay});
 const replayDigest=sha(content),replayKey='WB19_REPLAY_'+replayDigest.slice(0,40);
 // Artifact MUST be durable before receipt settlement: failure cannot debit HP.
 await s.replayStore.putImmutable({key:replayKey,digest:replayDigest,content});
 const receipt:WorldBossSettlementViewV19=await s.db.settle({
  ...job,workerId:s.workerId,generation:lease.generation,
  digest:lease.digest,engineVersion:WORLD_BOSS_EVENT_PROTOTYPE_VERSION,
  replayDigest,replayKey,rawDamage,guardDamage,
 });
 if(receipt.status!=='committed'||!Number.isInteger(receipt.ordinal)||
  !Number.isFinite(receipt.creditedHp)||receipt.creditedHp<0||
  !Number.isFinite(receipt.hpAfter)||receipt.hpAfter<0||
  typeof receipt.residualEcho!=='boolean')
  throw Error('world_boss_v19_invalid_settlement_receipt');
 return {status:'committed',ordinal:receipt.ordinal,repeated:receipt.repeated,
  creditedHp:receipt.creditedHp,hpAfter:receipt.hpAfter,
  residualEcho:receipt.residualEcho};
}
