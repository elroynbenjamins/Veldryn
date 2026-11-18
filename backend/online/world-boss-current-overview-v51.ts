/**
 * V51 hidden server-only handoff from the global rotation to the V41
 * read-only overview. This is NOT an HTTP endpoint or mobile RPC.
 *
 * The client supplies only a session credential. Trusted server Auth derives
 * account identity; trusted server config + clock choose the global cycle;
 * a private DB reader chooses the exact event ID. Never authorize requests
 * based on user_metadata, client-supplied boss IDs or account IDs.
 */
import {
 worldBossRotationAtV50,assertWorldBossCanonicalEventV50,
 type WorldBossGlobalCycleV50,type WorldBossRotatingIdV50,
} from '../src/server/combat/world-boss-weekend-v22';
import {
 createWorldBossOverviewPgV41,verifyWorldBossOverviewV41,
 type WorldBossOverviewRowV41,
} from './world-boss-overview-v41';
import type {WorldBossPgExecutorV19} from './world-boss-private-pg-v19';

export const WORLD_BOSS_V51_AUTHENTICATED_OVERVIEW_LIVE=false as const;
type EventSelection=Pick<WorldBossGlobalCycleV50,
 'index'|'bossId'|'startsAtUtcMs'|'cycleEndsAtUtcMs'> & {eventId:string};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const validId=(v:unknown):v is string=>typeof v==='string'&&UUID.test(v);
const integer=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0;

export interface WorldBossCurrentOverviewDepsV51 {
 /** Auth must verify token at the provider and return only its owner account ID. */
 authenticate(token:string):Promise<string|null>;
 /** Must be private server configuration, NOT a request argument. */
 launchMondayUtcMs:number;
 /** Must use server UTC time, NOT a user/client device clock. */
 serverNowUtcMs():number;
 /** Runs with approved private DB privileges; never from React Native. */
 events:{findByCycleStart(cycleStartUtcMs:number):Promise<
  Omit<EventSelection,'index'>|null>};
 overview:{read(eventId:string,accountId:string):Promise<WorldBossOverviewRowV41>};
}

/**
 * The resulting shape has exactly the original V41 JSON projection; it does
 * NOT return canAttack/canDonate booleans and authorizes no game actions.
 * Returning null means no approved event row for this exact cycle.
 */
export async function readAuthenticatedCurrentWorldBossOverviewV51(
 input:{token:string},deps:WorldBossCurrentOverviewDepsV51,
):Promise<WorldBossOverviewRowV41|null>{
 if(!deps||typeof deps.authenticate!=='function'||
  typeof deps.serverNowUtcMs!=='function'||
  !deps.events||typeof deps.events.findByCycleStart!=='function'||
  !deps.overview||typeof deps.overview.read!=='function'||
  typeof input?.token!=='string'||input.token.length<8||
  input.token.length>8192)
  throw Error('world_boss_v51_invalid_auth_reader');

 const accountId=await deps.authenticate(input.token);
 if(!validId(accountId))throw Error('world_boss_v51_auth_required');
 const now=deps.serverNowUtcMs();
 if(!integer(now))throw Error('world_boss_v51_invalid_server_clock');
 const cycle=worldBossRotationAtV50(deps.launchMondayUtcMs,now);
 // Never announce a cycle or its name before its trusted launch epoch.
 if(now<cycle.startsAtUtcMs)return null;

 const selected=await deps.events.findByCycleStart(cycle.startsAtUtcMs);
 if(selected===null)return null;
 if(!selected||!validId(selected.eventId)||
  !integer(selected.startsAtUtcMs)||!integer(selected.cycleEndsAtUtcMs)||
  !['hollowroot','sunscar','frostmarch'].includes(selected.bossId as string))
  throw Error('world_boss_v51_invalid_private_event');
 assertWorldBossCanonicalEventV50(deps.launchMondayUtcMs,{
  index:cycle.index,
  bossId:selected.bossId as WorldBossRotatingIdV50,
  startsAtUtcMs:selected.startsAtUtcMs,
  cycleEndsAtUtcMs:selected.cycleEndsAtUtcMs,
 });
 if(selected.eventId==='00000000-0000-0000-0000-000000000000')
  throw Error('world_boss_v51_invalid_private_event');

 const row=await deps.overview.read(selected.eventId,accountId);
 const validated=verifyWorldBossOverviewV41(row,selected.eventId,accountId);
 if(validated.bossId!==cycle.bossId||
  validated.startsAtUtcMs!==cycle.startsAtUtcMs||
  validated.readAtUtcMs<now-120000||validated.readAtUtcMs>now+30000)
  throw Error('world_boss_v51_stale_or_foreign_cycle');
 // Re-verify the selected event against the private projection, not merely
 // against the catalogue label. Do not leak action recommendations.
 const {attemptsRemaining:_attemptsRemaining,donationsRemaining:_donationsRemaining,
  canAttack:_canAttack,canDonate:_canDonate,...readOnly}=validated;
 return readOnly;
}

/** Private, parameterized read-only PostgreSQL selector; not an RPC grant. */
export function createWorldBossCurrentEventPgV51(pg:WorldBossPgExecutorV19):
 WorldBossCurrentOverviewDepsV51['events']{
 if(!pg||typeof pg.query!=='function')
  throw Error('world_boss_v51_private_pg_required');
 return {async findByCycleStart(cycleStartUtcMs){
  if(!integer(cycleStartUtcMs)||new Date(cycleStartUtcMs).getUTCDay()!==1||
   cycleStartUtcMs%86400000!==0)
   throw Error('world_boss_v51_invalid_cycle_start');
  const cycleMs=14*86400000;
  // Test overlap using exact elapsed UTC milliseconds, not `interval '14
  // days'` in the connection's session timezone (DST can shift that).
  const sql='SELECT id::text AS "eventId",boss_id AS "bossId",'+
   'floor(extract(epoch FROM starts_at)*1000)::double precision AS "startsAtUtcMs",'+
   'floor(extract(epoch FROM starts_at)*1000)::double precision + $3::double precision AS "cycleEndsAtUtcMs" '+
   'FROM private.world_boss_events_v17 WHERE starts_at > $1::timestamptz '+
   'AND starts_at < $2::timestamptz LIMIT 2';
  // Any start strictly within 14 days before/after the selected start
  // overlaps the selected 14-day interval. Exact adjacent cycles do not.
  const result=await pg.query<Omit<EventSelection,'index'>>(
   sql,[new Date(cycleStartUtcMs-cycleMs).toISOString(),
    new Date(cycleStartUtcMs+cycleMs).toISOString(),cycleMs]);
  if(result.rows.length>1)
   throw Error('world_boss_v51_duplicate_global_event');
  return result.rows[0]??null;
 }};
}

/** Reuses the existing isolated private overview SQL; no new migration. */
export function createWorldBossCurrentOverviewPgV51(pg:WorldBossPgExecutorV19){
 return {events:createWorldBossCurrentEventPgV51(pg),
  overview:createWorldBossOverviewPgV41(pg)};
}
