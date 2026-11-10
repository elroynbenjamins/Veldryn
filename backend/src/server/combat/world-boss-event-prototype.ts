/**
 * World Boss v7 OFFLINE settlement model. No DB, no routes, no live event, no rewards.
 * This is a side-effect-free *serial transaction model* for designing the future
 * PostgreSQL implementation; it is NOT concurrency-safe without a DB row lock.
 * Client requests may never supply arbitrary actors, power or the battle outcome.
 */
import type {CombatantDefinition} from './types';
import {
  simulateWorldBossRounds,
  type WorldBossId,type WorldBossOrder,type WorldBossPhase,
  type WorldBossRoundResult,
} from './world-boss-round-prototype';

export const WORLD_BOSS_EVENT_PROTOTYPE_VERSION='world-boss-v7-draft';
export const WORLD_BOSS_MAX_ATTEMPTS=3;

export interface WorldBossSnapshotPrototype {
  /** Filled by a future server loadout resolver, never from the app payload. */
  snapshotId:string;
  ownerAccountId:string;
  /** NPC Echoes are allowed in the last three positions only. */
  npc?:boolean;
  resolvedCombatant:CombatantDefinition;
}
export interface WorldBossAttemptPrototype {
  /** Request IDs are unique per account and event, and must be generated before first submit. */
  requestId:string;
  accountId:string;
  characterId:string;
  atUtcMs:number;
  order:WorldBossOrder;
  /** Server-resolved squad: initiating character in slot 0, followed by three Echoes. */
  squad:readonly WorldBossSnapshotPrototype[];
}
export interface WorldBossAttemptReceiptPrototype {
  eventId:string;requestId:string;accountId:string;characterId:string;
  ordinal:number;atUtcMs:number;phase:WorldBossPhase;
  boss:WorldBossId;order:WorldBossOrder;engineVersion:string;seed:string;
  snapshotIds:readonly string[];
  completedRounds:number;survived:boolean;
  rawCombatDamage:number;localGuardDamage:number;
  hpBefore:number;hpAfter:number;worldHpCredited:number;residualEcho:boolean;
  /** Preview of participation payout ONLY. Not a wallet transaction or live currency. */
  hypotheticalBaseSigils:5|10;
  /** Persisted immutable replay test payload. Store by content-addressed reference in real service. */
  replay:WorldBossRoundResult;
}
export interface WorldBossEventPrototype {
  eventId:string;boss:WorldBossId;startsAtUtcMs:number;endsAtUtcMs:number;
  maxHp:number;remainingHp:number;revision:number;
  /** Key is event+account+request; receipts are append-only. */
  receipts:Readonly<Record<string,WorldBossAttemptReceiptPrototype>>;
  /** Pure event HP milestone record, not rewards or entitlements. */
  crossedThresholds:readonly (70|30|0)[];
}
export interface WorldBossEventPrototypeResult {
  event:WorldBossEventPrototype;
  receipt:WorldBossAttemptReceiptPrototype;
  repeated:boolean;
}

const positiveWhole=(v:number)=>Number.isSafeInteger(v)&&v>=0;
const amount=(v:number)=>Math.max(0,Math.floor(v));
const nonempty=(s:string)=>typeof s==='string'&&s.trim().length>0&&s.length<=160;
const receiptKey=(account:string,request:string)=>JSON.stringify([account,request]);

export function createWorldBossEventPrototype(input:{
 eventId:string;boss:WorldBossId;startsAtUtcMs:number;endsAtUtcMs:number;maxHp:number;
}):WorldBossEventPrototype {
 if(!nonempty(input.eventId)||!positiveWhole(input.startsAtUtcMs)||!positiveWhole(input.endsAtUtcMs)||
  input.startsAtUtcMs>=input.endsAtUtcMs||!positiveWhole(input.maxHp)||input.maxHp===0)
  throw Error('world_boss_invalid_event_definition');
 if(!['hollowroot','sunscar','frostmarch'].includes(input.boss))throw Error('world_boss_unknown_boss');
 return {eventId:input.eventId,boss:input.boss,startsAtUtcMs:input.startsAtUtcMs,
  endsAtUtcMs:input.endsAtUtcMs,maxHp:input.maxHp,remainingHp:input.maxHp,revision:0,
  receipts:{},crossedThresholds:[]};
}
export function worldBossPhaseAtStart(event:WorldBossEventPrototype):WorldBossPhase {
 const pct=event.remainingHp/event.maxHp;
 if(pct<=.30)return 'enraged';
 if(pct<=.70)return 'exposed';
 return 'armored';
}

function validateResolvedSquad(command:WorldBossAttemptPrototype):void {
 const list=command.squad;
 if(list.length!==4)throw Error('world_boss_requires_four_fighters');
 if(list[0]?.ownerAccountId!==command.accountId||list[0]?.npc)
  throw Error('world_boss_initiator_must_match_account');
 if(!list.every(x=>nonempty(x.snapshotId)&&nonempty(x.ownerAccountId)))
  throw Error('world_boss_missing_server_snapshot');
 if(new Set(list.map(x=>x.snapshotId)).size!==4)throw Error('world_boss_duplicate_snapshot');
 if(new Set(list.filter(x=>!x.npc).map(x=>x.ownerAccountId)).size!==list.filter(x=>!x.npc).length)
  throw Error('world_boss_duplicate_player_echo');
 const defs=list.map(x=>x.resolvedCombatant);
 if(new Set(defs.map(x=>x.id)).size!==4)throw Error('world_boss_duplicate_actor');
 if(defs.some(p=>p.team!=='players'||!positiveWhole(p.level)||
   !Number.isFinite(p.stats.maxHp)||p.stats.maxHp<=0||
   !Number.isFinite(p.stats.attackPower)||p.stats.attackPower<=0))
  throw Error('world_boss_invalid_combatant');
 const roles=defs.map(x=>x.role);
 if(roles.filter(x=>x==='tank').length!==1||roles.filter(x=>x==='damage').length!==2||
  roles.filter(x=>x==='support').length!==1)throw Error('world_boss_invalid_formation');
}
function assertEventHealth(state:WorldBossEventPrototype):void {
 if(!positiveWhole(state.maxHp)||!positiveWhole(state.remainingHp)||state.remainingHp>state.maxHp||
  !positiveWhole(state.revision))throw Error('world_boss_invalid_health_state');
}
function sameCommand(receipt:WorldBossAttemptReceiptPrototype, command:WorldBossAttemptPrototype):boolean {
 return receipt.accountId===command.accountId&&receipt.characterId===command.characterId&&
  receipt.atUtcMs===command.atUtcMs&&receipt.order===command.order&&
  receipt.snapshotIds.length===command.squad.length&&
  receipt.snapshotIds.every((id,i)=>id===command.squad[i].snapshotId);
}

/**
 * Pure serial command reducer — a mock for a future DB transaction with
 * SELECT ... FOR UPDATE / unique (event_id, account_id, request_id).
 * A future service must authenticate the account, resolve equipment snapshots
 * and seed server-side, then lock the event and account receipt row. Do NOT
 * directly expose this prototype to a mobile client or use it to grant currency.
 */
export function applyWorldBossAttemptPrototype(
 event:WorldBossEventPrototype, command:WorldBossAttemptPrototype,
):WorldBossEventPrototypeResult {
 assertEventHealth(event);
 if(!nonempty(command.accountId)||!nonempty(command.characterId)||!nonempty(command.requestId)||
   !positiveWhole(command.atUtcMs))throw Error('world_boss_invalid_attempt_identifiers');
 const key=receiptKey(command.accountId,command.requestId);
 const existing=event.receipts[key];
 // Replay works after the event has ended or the boss has died. No re-simulation.
 if(existing){
  if(!sameCommand(existing,command))throw Error('world_boss_idempotency_payload_mismatch');
  return {event,receipt:existing,repeated:true};
 }
 if(command.atUtcMs<event.startsAtUtcMs||command.atUtcMs>=event.endsAtUtcMs)
  throw Error('world_boss_event_not_active');
 const used=Object.values(event.receipts).filter(r=>r.accountId===command.accountId).length;
 if(used>=WORLD_BOSS_MAX_ATTEMPTS)throw Error('world_boss_attempt_limit');
 validateResolvedSquad(command);
 const phase=worldBossPhaseAtStart(event);
 const seed=[WORLD_BOSS_EVENT_PROTOTYPE_VERSION,event.eventId,command.accountId,command.requestId].join(':');
 // Pure local simulation first. Any exception means zero new attempts or world HP mutation.
 // No caller-supplied combat damage is accepted.
 const battle=simulateWorldBossRounds({
  seed,boss:event.boss,phase,
  players:command.squad.map(x=>x.resolvedCombatant),order:command.order,
 });
 const originalHp=event.remainingHp;
 const residualEcho=originalHp===0;
 const worldHpCredited=residualEcho?0:Math.min(originalHp,amount(battle.bossHpDamage));
 const after=originalHp-worldHpCredited;
 const newThresholds=[...event.crossedThresholds];
 for(const [pct,threshold] of [[70,.70],[30,.30],[0,0]] as const){
  if(!newThresholds.includes(pct)&&originalHp/event.maxHp>threshold&&after/event.maxHp<=threshold)
   newThresholds.push(pct);
 }
 const receipt:WorldBossAttemptReceiptPrototype={
  eventId:event.eventId,requestId:command.requestId,accountId:command.accountId,
  characterId:command.characterId,ordinal:used+1,atUtcMs:command.atUtcMs,
  phase,boss:event.boss,order:command.order,engineVersion:WORLD_BOSS_EVENT_PROTOTYPE_VERSION,
  seed,snapshotIds:command.squad.map(x=>x.snapshotId),
  completedRounds:battle.roundsCompleted,survived:battle.survived,
  rawCombatDamage:battle.bossHpDamage,localGuardDamage:battle.localGuardDamage,
  hpBefore:originalHp,hpAfter:after,worldHpCredited,residualEcho,
  hypotheticalBaseSigils:battle.survived&&battle.roundsCompleted===14?10:5,
  replay:battle,
 };
 const next:WorldBossEventPrototype={
  ...event,remainingHp:after,revision:event.revision+1,
  receipts:{...event.receipts,[key]:receipt},crossedThresholds:newThresholds,
 };
 return {event:next,receipt,repeated:false};
}
