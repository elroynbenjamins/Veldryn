/**
 * World Boss V16 — DISABLED, server-only attempt idempotency boundary.
 *
 * A retry MUST read the (event, principal, request) reservation BEFORE calling
 * prepareWorldBossRosterV9. Otherwise a new random seed / roster may be
 * generated and an entirely legitimate lost-ACK retry can fail or reroll.
 *
 * The store MUST be an authenticated, transactionally safe server service.
 * This adapter neither authenticates users nor implements a PostgreSQL store.
 * Its tests inject the older single-process V10 emulator ONLY. No API route,
 * staging/production DB, wallet, events, inventory, or player data are used.
 */
import {
 prepareWorldBossRosterV9,
 type WorldBossRosterLoaderV9,
 type WorldBossRosterRequestV9,
 type WorldBossPreparedRosterV9,
} from './world-boss-verified-roster-v9';
import type {WorldBossV10Reservation} from './world-boss-reservation-v10';

export const WORLD_BOSS_V16_ATTEMPT_COMMAND_LIVE=false as const;
const SAFE=/^[A-Za-z0-9][A-Za-z0-9:_-]{0,159}$/;
const REQUEST=/^[A-Za-z0-9_-]{8,128}$/;
const valid=(value:unknown):value is string=>
 typeof value==='string'&&SAFE.test(value);

export type WorldBossAttemptCommandV16=WorldBossRosterRequestV9;

/** Implement with event/account locks and an immutable reservation in Postgres.
 * In particular, reserveAtomic MUST enforce the three-slot limit, unique
 * request tombstones, immutable replay payload, and cross-worker fencing.
 */
export interface WorldBossAttemptStoreV16 {
 read(input:{eventId:string;accountId:string;requestId:string}):
  Promise<WorldBossV10Reservation|undefined>;
 reserveAtomic(input:{eventId:string;prepared:WorldBossPreparedRosterV9;nowUtcMs:number}):
  Promise<{reservation:WorldBossV10Reservation;repeated:boolean}>;
}
export interface WorldBossAttemptCommandResultV16{
 reservation:WorldBossV10Reservation;
 repeated:boolean;
 /** False means the existing durable reservation was reused. */
 freshlyPrepared:boolean;
 persistedByRealDatabase:false;
}

/**
 * Service-only coordinator; the command holds ONLY a character selector,
 * event, request key and War Order. Never accept a mobile-submitted roster,
 * source GameState, CP, class, phase, war supplies, seed, or replay here.
 *
 * A racing worker may prepare a different seed after observing no record;
 * if the storage transaction rejects the stale insert as an idempotency
 * conflict, return the ORIGINAL reservation after a second verified read.
 * Never overwrite the winning attempt or replay the losing candidate.
 */
export async function prepareOrResumeWorldBossAttemptV16(input:{
 command:WorldBossAttemptCommandV16;
 loader:WorldBossRosterLoaderV9;
 store:WorldBossAttemptStoreV16;
}):Promise<WorldBossAttemptCommandResultV16>{
 const {command,loader,store}=input;
 if(!command||!loader||!store||
  !valid(loader.principalAccountId)||!valid(command.eventId)||
  !valid(command.characterId)||!REQUEST.test(command.requestId)||
  !['break_armor','steady_assault','hold_line'].includes(command.order)||
  typeof store.read!=='function'||typeof store.reserveAtomic!=='function'||
  typeof loader.nowUtcMs!=='function'||
  typeof loader.randomSeed!=='function'||
  typeof loader.loadCurrentCharacter!=='function'||
  typeof loader.listEligibleEchoes!=='function')
  throw Error('world_boss_v16_invalid_server_command');
 const accountId=loader.principalAccountId;
 const query={eventId:command.eventId,accountId,requestId:command.requestId};

 function verifyExisting(reservation:WorldBossV10Reservation):WorldBossV10Reservation{
  if(reservation.eventId!==query.eventId||
   reservation.accountId!==query.accountId||
   reservation.requestId!==query.requestId)
   throw Error('world_boss_v16_store_returned_foreign_reservation');
  if(reservation.characterId!==command.characterId||
   reservation.order!==command.order)
   throw Error('world_boss_v16_request_id_reused_with_different_intent');
  if(!['reserved','committed','voided'].includes(reservation.status)||
   !Number.isInteger(reservation.ordinal)||
   reservation.ordinal<1||reservation.ordinal>3||
   !reservation.command||
   reservation.command.accountId!==query.accountId||
   reservation.command.characterId!==command.characterId||
   reservation.command.requestId!==command.requestId||
   reservation.command.order!==command.order||
   reservation.command.serverSeed!==reservation.serverSeed||
   reservation.command.snapshotDigest!==reservation.snapshotDigest||
   !/^[a-f0-9]{64}$/.test(reservation.snapshotDigest)||
   !/^[A-Za-z0-9:_-]{24,512}$/.test(reservation.serverSeed)||
   (reservation.status==='committed'&&
     (!reservation.settlement||
      reservation.settlement.eventId!==query.eventId||
      reservation.settlement.accountId!==query.accountId||
      reservation.settlement.requestId!==query.requestId))||
   (reservation.status!=='committed'&&Boolean(reservation.settlement)))
   throw Error('world_boss_v16_invalid_reservation_receipt');
  return structuredClone(reservation);
 }

 const existing=await store.read(query);
 if(existing){
  return {reservation:verifyExisting(existing),repeated:true,
   freshlyPrepared:false,persistedByRealDatabase:false};
 }
 const now=loader.nowUtcMs();
 if(!Number.isSafeInteger(now)||now<=0)
  throw Error('world_boss_v16_invalid_server_clock');
 const prepared=await prepareWorldBossRosterV9(loader,command);
 if(prepared.command.accountId!==accountId||
  prepared.command.characterId!==command.characterId)
  throw Error('world_boss_v16_preparation_identity_mismatch');
 try {
  const reply=await store.reserveAtomic({eventId:command.eventId,prepared,nowUtcMs:now});
  const canonical=verifyExisting(reply.reservation);
  // A store may report repeated=true if a concurrent insert won. Never tell
  // the caller that a losing freshly generated roster is the committed one.
  return {reservation:canonical,repeated:reply.repeated,
   freshlyPrepared:!reply.repeated,persistedByRealDatabase:false};
 }catch(error){
  // Recover ONLY the known reservation conflict, never broad DB failures.
  if(!(error instanceof Error)||
   error.message!=='world_boss_v10_idempotency_payload_mismatch')throw error;
  const canonical=await store.read(query);
  if(!canonical)throw error;
  return {reservation:verifyExisting(canonical),repeated:true,
   freshlyPrepared:false,persistedByRealDatabase:false};
 }
}
