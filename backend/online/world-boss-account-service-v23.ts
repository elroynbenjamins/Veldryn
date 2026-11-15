/**
 * World Boss V23 — HIDDEN, server-only full-account raid bridge.
 *
 * No HTTP route, migration, event activation, or live rewards. A trusted
 * adapter MUST resolve the Auth principal, enumerate owned online save rows,
 * provide server-controlled rules/entropy and a private transactional DB.
 * Never accept client-supplied rosters, stats, seed, HP, result or worker ID.
 */
import {createHash} from 'node:crypto';
import {resolveRealWorldBossSnapshotV12,type WorldBossServerBracketPolicyV12,
 type WorldBossOwnedStateReaderV12} from './world-boss-loadout-v12';
import {loadWorldBossFrozenRulesV20,verifyWorldBossFrozenRulesV20,
 type WorldBossFrozenRulesV20,type WorldBossRulesSourceV20} from './world-boss-frozen-modifiers-v20';
import {freezeWorldBossAccountRosterV22,simulateWorldBossAccountRaidV22,
 WORLD_BOSS_V22_ENGINE_VERSION,type WorldBossAccountRosterV22} from
 '../src/server/combat/world-boss-account-raid-v22';
import {worldBossScheduleAtV22} from '../src/server/combat/world-boss-weekend-v22';
import type {WorldBossOrder,WorldBossId,WorldBossPhase} from
 '../src/server/combat/world-boss-round-prototype';
import type {WorldBossOwnerStateV19,WorldBossLeaseV19,
 WorldBossSettlementViewV19,WorldBossSettlePayloadV19,
 WorldBossAttemptViewV19} from './world-boss-private-pg-v19';

export const WORLD_BOSS_V23_LIVE=false as const;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REQUEST=/^[A-Za-z0-9_-]{8,128}$/;
const WORKER=/^[A-Za-z0-9:_-]{8,160}$/;
const SEED=/^[A-Za-z0-9:_-]{24,512}$/;
const DIGEST=/^[a-f0-9]{64}$/;
const ORDERS:WorldBossOrder[]=['steady_assault','hold_line','break_armor'];
const PHASES:WorldBossPhase[]=['armored','exposed','enraged'];
const BOSSES:WorldBossId[]=['hollowroot','sunscar','frostmarch'];
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const uuid=(value:unknown):value is string=>
 typeof value==='string'&&UUID.test(value);
const identity=(eventId:string,accountId:string,requestId:string)=>{
 if(!uuid(eventId)||!uuid(accountId)||!REQUEST.test(requestId))
  throw Error('world_boss_v23_invalid_identity');
};

export interface WorldBossEventV23{
 boss:WorldBossId;status:'draft'|'active'|'closed';rulesVersion:string;
 startsAtUtcMs:number;endsAtUtcMs:number;
}
export interface WorldBossReserveV23{
 eventId:string;accountId:string;characterId:string;requestId:string;
 order:WorldBossOrder;seed:string;digest:string;frozenPacket:FrozenAccountPacketV23;
 engineVersion:typeof WORLD_BOSS_V22_ENGINE_VERSION;workerId:string;
 warCampDigest:string;
}
export interface WorldBossRepositoryV23{
 /** Unique event/account/request lookup; no new entropy before retry read. */
 readAttempt(eventId:string,accountId:string,requestId:string):
  Promise<WorldBossAttemptViewV19|undefined>;
 /** Query from server-owned saves JOINed to owned characters, LIMIT 6. */
 listOwnedStates(accountId:string):Promise<WorldBossOwnerStateV19[]>;
 loadEvent(eventId:string):Promise<WorldBossEventV23>;
 /** SQL uses v22 weekend gate + v18 atomic account ordinal allocation. */
 reserve(input:WorldBossReserveV23):Promise<WorldBossLeaseV19>;
 checkout(eventId:string,accountId:string,requestId:string,workerId:string):
  Promise<WorldBossLeaseV19>;
 /** Must call private v18_settle under EVENT lock, not an app update. */
 settle(input:WorldBossSettlePayloadV19):Promise<WorldBossSettlementViewV19>;
}
export interface WorldBossDepsV23{
 authenticate(token:string):Promise<string|null>;
 db:WorldBossRepositoryV23;
 rulesSource:WorldBossRulesSourceV20;
 bracketPolicy:WorldBossServerBracketPolicyV12;
 minimumCharacterLevel:number;
 randomSeed():string;
 workerId:string;
 nowUtcMs():number;
 replayStore:{
  putImmutable(input:{key:string;digest:string;content:string}):Promise<void>;
 };
}
export interface WorldBossSelectionV23{
 eventId:string;requestId:string;order:WorldBossOrder;
}
export interface WorldBossReceiptV23{
 status:'reserved'|'committed'|'voided';ordinal:number;repeated:boolean;
 creditedHp?:number;hpAfter?:number;residualEcho?:boolean;
}
/** A canonical serialized roster string survives JSONB key reordering. */
export interface FrozenAccountPacketV23{
 schema:'world-boss-v22-account-raid-prototype';
 eventId:string;accountId:string;requestId:string;order:WorldBossOrder;
 rulesVersion:string;
 rosterDigest:string;serializedRoster:string;
 characters:{characterId:string}[];
 warCamp:WorldBossFrozenRulesV20['warCamp'];
 encounterProfiles:WorldBossFrozenRulesV20['encounterProfiles'];
}
function validDeps(s:WorldBossDepsV23){
 if(!s||!s.db||!s.rulesSource||!s.replayStore||
  typeof s.authenticate!=='function'||
  typeof s.randomSeed!=='function'||typeof s.nowUtcMs!=='function'||
  typeof s.replayStore.putImmutable!=='function'||
  !WORKER.test(s.workerId)||
  !Number.isSafeInteger(s.minimumCharacterLevel)||
  s.minimumCharacterLevel<1||s.minimumCharacterLevel>100)
  throw Error('world_boss_v23_private_runtime_required');
}
function selectionValid(selection:WorldBossSelectionV23){
 if(!selection||Object.keys(selection).some(k=>
  !['eventId','requestId','order'].includes(k))||
  !uuid(selection.eventId)||!REQUEST.test(selection.requestId)||
  !ORDERS.includes(selection.order))
  throw Error('world_boss_v23_invalid_selection');
}
function receiptValid(value:WorldBossReceiptV23):WorldBossReceiptV23{
 if(!value||!['reserved','committed','voided'].includes(value.status)||
  !Number.isInteger(value.ordinal)||value.ordinal<1||value.ordinal>3||
  typeof value.repeated!=='boolean')
  throw Error('world_boss_v23_bad_receipt');
 return {status:value.status,ordinal:value.ordinal,repeated:value.repeated,
  ...('creditedHp' in value?{creditedHp:value.creditedHp}:{}),
  ...('hpAfter' in value?{hpAfter:value.hpAfter}:{}),
  ...('residualEcho' in value?{residualEcho:value.residualEcho}:{}),
 };
}
function eventValid(event:WorldBossEventV23){
 if(!event||!BOSSES.includes(event.boss)||
  !['draft','active','closed'].includes(event.status)||
  typeof event.rulesVersion!=='string'||event.rulesVersion.length<3||
  !Number.isSafeInteger(event.startsAtUtcMs)||
  !Number.isSafeInteger(event.endsAtUtcMs)||
  event.endsAtUtcMs-event.startsAtUtcMs!==7*86400000)
  throw Error('world_boss_v23_invalid_event_calendar');
 // This also enforces exact Monday 00:00 UTC launch epoch.
 worldBossScheduleAtV22(event.startsAtUtcMs,event.startsAtUtcMs);
}
export async function reserveAuthenticatedWorldBossAccountV23(input:{
 token:string;selection:WorldBossSelectionV23;
},s:WorldBossDepsV23):Promise<WorldBossReceiptV23>{
 validDeps(s);
 selectionValid(input.selection);
 if(typeof input.token!=='string'||input.token.length<8||input.token.length>8192)
  throw Error('world_boss_v23_auth_required');
 const accountId=await s.authenticate(input.token);
 if(!uuid(accountId))throw Error('world_boss_v23_invalid_auth');
 const {eventId,requestId,order}=input.selection;
 // Lost ACK: never read fresh loadouts or generate fresh entropy on a retry.
 const prior=await s.db.readAttempt(eventId,accountId,requestId);
 if(prior){
  if(prior.order!==order)throw Error('world_boss_v23_request_reused');
  return receiptValid({...prior,repeated:true});
 }
 const event=await s.db.loadEvent(eventId);
 eventValid(event);
 const now=s.nowUtcMs();
 if(!Number.isSafeInteger(now)||now<=0||
  event.status!=='active'||
  worldBossScheduleAtV22(event.startsAtUtcMs,now).phase!=='raid')
  throw Error('world_boss_v23_weekend_closed');
 const states=await s.db.listOwnedStates(accountId);
 if(!Array.isArray(states)||states.length<1||states.length>5)
  throw Error('world_boss_v23_invalid_owned_character_count');
 const seen=new Set<string>();
 const byCharacter=new Map<string,WorldBossOwnerStateV19>();
 for(const state of states){
  if(!state||state.ownerAccountId!==accountId||!uuid(state.characterId)||
   seen.has(state.characterId)||state.serverState?.character?.id!==state.characterId||
   !Number.isSafeInteger(state.gameVersion)||state.gameVersion<1||
   !Number.isSafeInteger(state.updatedAtUtcMs)||
   state.updatedAtUtcMs>now||now-state.updatedAtUtcMs>7*86400000)
   throw Error('world_boss_v23_untrusted_owned_state');
  seen.add(state.characterId);
  byCharacter.set(state.characterId,state);
 }
 const reader:WorldBossOwnedStateReaderV12={
  principalAccountId:accountId,
  async loadCharacterState({accountId:principal,characterId}){
   if(principal!==accountId||!byCharacter.has(characterId))
    throw Error('world_boss_v23_foreign_character');
   const entry=byCharacter.get(characterId)!;
   return {ownerAccountId:entry.ownerAccountId,serverState:entry.serverState,
    gameVersion:entry.gameVersion};
  },
 };
 // Highest real verified CP bracket chooses threat; no client-controlled
 // "main character" can lower encounter difficulty.
 const verified=await Promise.all([...byCharacter.values()].map(entry=>
  resolveRealWorldBossSnapshotV12({reader,characterId:entry.characterId,
   expectedGameVersion:entry.gameVersion,nowUtcMs:now,
   minimumCharacterLevel:s.minimumCharacterLevel,policy:s.bracketPolicy})));
 const bracket=Math.max(...verified.map(x=>x.snapshot.bracket)) as
  1|2|3|4|5;
 const roster=freezeWorldBossAccountRosterV22({
  accountId,atUtcMs:now,verified,
 });
 const frozen=await loadWorldBossFrozenRulesV20({
  source:s.rulesSource,eventId,boss:event.boss,initiatorBracket:bracket,
 });
 const seed=s.randomSeed();
 if(typeof seed!=='string'||!SEED.test(seed))
  throw Error('world_boss_v23_entropy_required');
 const packet:FrozenAccountPacketV23={
  schema:'world-boss-v22-account-raid-prototype',
  eventId,accountId,requestId,order,rulesVersion:event.rulesVersion,
  rosterDigest:roster.rosterDigest,serializedRoster:JSON.stringify(roster),
  characters:roster.characters.map(c=>({characterId:c.characterId})),
  warCamp:frozen.warCamp,encounterProfiles:frozen.encounterProfiles,
 };
 // The private V22 SQL checks the weekend again under the event row lock.
 const result=await s.db.reserve({
  eventId,accountId,characterId:roster.characters[0].characterId,
  requestId,order,seed,digest:roster.rosterDigest,frozenPacket:packet,
  engineVersion:WORLD_BOSS_V22_ENGINE_VERSION,workerId:s.workerId,
  warCampDigest:frozen.warCamp.digest,
 });
 return receiptValid(result);
}

/** Internal worker job comes from a trusted queue, never a mobile request. */
export async function settleTrustedWorldBossAccountV23(job:{
 eventId:string;accountId:string;requestId:string;
},s:WorldBossDepsV23):Promise<WorldBossReceiptV23>{
 validDeps(s);
 identity(job.eventId,job.accountId,job.requestId);
 const event=await s.db.loadEvent(job.eventId);
 eventValid(event);
 if(!['active','closed'].includes(event.status))
  throw Error('world_boss_v23_event_unavailable');
 const lease=await s.db.checkout(job.eventId,job.accountId,job.requestId,s.workerId);
 if(!lease||!Number.isSafeInteger(lease.ordinal)||lease.ordinal<1||
  lease.ordinal>3||!Number.isSafeInteger(lease.generation)||lease.generation<1)
  throw Error('world_boss_v23_invalid_lease');
 if(lease.status!=='reserved')
  return receiptValid({status:lease.status,ordinal:lease.ordinal,repeated:true});
 if(typeof lease.seed!=='string'||!SEED.test(lease.seed)||
  !DIGEST.test(lease.digest||'')||
  lease.engine!==WORLD_BOSS_V22_ENGINE_VERSION||
  !ORDERS.includes(lease.order as WorldBossOrder)||
  !PHASES.includes(lease.phase as WorldBossPhase)||
  !lease.squad||typeof lease.squad!=='object'||Array.isArray(lease.squad))
  throw Error('world_boss_v23_invalid_frozen_lease');
 const p=lease.squad as Partial<FrozenAccountPacketV23>;
 if(p.schema!=='world-boss-v22-account-raid-prototype'||
  p.eventId!==job.eventId||p.accountId!==job.accountId||
  p.requestId!==job.requestId||p.order!==lease.order||
  p.rulesVersion!==event.rulesVersion||p.rosterDigest!==lease.digest||
  typeof p.serializedRoster!=='string'||
  p.serializedRoster.length>262144||
  !Array.isArray(p.characters))
  throw Error('world_boss_v23_frozen_packet_mismatch');
 let roster:WorldBossAccountRosterV22;
 try{roster=JSON.parse(p.serializedRoster) as WorldBossAccountRosterV22;}
 catch{throw Error('world_boss_v23_corrupt_serialized_roster');}
 if(!roster||roster.accountId!==job.accountId||
  roster.rosterDigest!==lease.digest||
  !Array.isArray(roster.characters)||roster.characters.length<1||
  roster.characters.length>5||
  p.characters.length!==roster.characters.length||
  p.characters.some((c,i)=>c?.characterId!==roster.characters[i]?.characterId))
  throw Error('world_boss_v23_roster_identity_mismatch');
 const rules=verifyWorldBossFrozenRulesV20({
  frozen:{warCamp:p.warCamp!,encounterProfiles:p.encounterProfiles!},
  eventId:job.eventId,boss:event.boss,phase:lease.phase!,
  warCampDigest:lease.warCampDigest!,encounterProfileDigest:lease.encounterDigest!,
 });
 const replay=simulateWorldBossAccountRaidV22({
  eventId:job.eventId,requestId:job.requestId,
  roster,order:lease.order!,boss:event.boss,phase:lease.phase!,
  serverSeed:lease.seed,warCamp:rules.warCamp,encounter:rules.encounterProfile,
 });
 if(replay.engineVersion!==WORLD_BOSS_V22_ENGINE_VERSION||
  replay.accountId!==job.accountId||replay.rosterDigest!==lease.digest||
  !Number.isSafeInteger(replay.proposedWorldHpDamage)||
  replay.proposedWorldHpDamage<0||replay.proposedWorldHpDamage>1e12)
  throw Error('world_boss_v23_invalid_server_simulation');
 const content=JSON.stringify({
  version:WORLD_BOSS_V22_ENGINE_VERSION,
  eventId:job.eventId,accountId:job.accountId,requestId:job.requestId,
  seed:lease.seed,rosterDigest:lease.digest,phase:lease.phase,
  warCampDigest:lease.warCampDigest,encounterDigest:lease.encounterDigest,
  replay,
 });
 const replayDigest=sha(content);
 const replayKey='WB23_REPLAY_'+replayDigest.slice(0,40);
 // Persist replay immutably BEFORE a global HP transaction or attempt charge.
 await s.replayStore.putImmutable({key:replayKey,digest:replayDigest,content});
 // The V22 account raid currently models no separate local Guard ledger.
 // This ZERO is test-only; actual Guard must be integrated before live launch.
 const result=await s.db.settle({
  ...job,workerId:s.workerId,generation:lease.generation,
  digest:lease.digest,engineVersion:WORLD_BOSS_V22_ENGINE_VERSION,
  replayDigest,replayKey,rawDamage:replay.proposedWorldHpDamage,
  guardDamage:0,
 });
 if(result.status!=='committed'||!Number.isInteger(result.ordinal)||
  result.ordinal<1||result.ordinal>3||
  !Number.isSafeInteger(result.creditedHp)||result.creditedHp<0||
  !Number.isSafeInteger(result.hpAfter)||result.hpAfter<0||
  typeof result.residualEcho!=='boolean')
  throw Error('world_boss_v23_invalid_atomic_receipt');
 return receiptValid(result);
}
