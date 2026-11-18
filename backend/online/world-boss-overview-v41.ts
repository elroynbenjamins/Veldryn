/** World Boss V41 — private, authenticated, read-only overview bridge.
 * A SINGLE private SQL statement supplies event, account attempts, War Camp
 * and earned (not necessarily spendable) Sigils. No HTTP route is mounted.
 * Never accept account identity, progress or damage fields from a client.
 */
import {worldBossScheduleAtV22} from '../src/server/combat/world-boss-weekend-v22';
import {validateWorldBossWarCampProgressV27,
 type WorldBossWarCampProgressV27} from './world-boss-war-camp-service-v27';
import type {WorldBossPgExecutorV19} from './world-boss-private-pg-v19';

export const WORLD_BOSS_V41_OVERVIEW_LIVE=false as const;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Boss='hollowroot'|'sunscar'|'frostmarch';
type Status='draft'|'active'|'closed';
type Phase='upcoming'|'preparation'|'raid'|'cooldown'|'expired';
export interface WorldBossOverviewRowV41 {
 schema:'world-boss-overview-v41';
 eventId:string;accountId:string;bossId:Boss;status:Status;phase:Phase;
 startsAtUtcMs:number;endsAtUtcMs:number;readAtUtcMs:number;
 maxHp:number;remainingHp:number;eventRevision:number;
 attemptsUsed:number;attemptsReserved:number;attemptsCommitted:number;
 donationsUsed:number;
 warCamp:WorldBossWarCampProgressV27;
 rewards:{balance:number;walletRevision:number;claimedThisEvent:number;eventCap:100};
}
export interface WorldBossOverviewV41 extends WorldBossOverviewRowV41 {
 attemptsRemaining:number;donationsRemaining:number;
 canAttack:boolean;canDonate:boolean;
}
const integer=(v:unknown)=>Number.isSafeInteger(v)&&typeof v==='number'&&v>=0;
const validId=(s:unknown):s is string=>typeof s==='string'&&UUID.test(s);
const TRACKS=['fortifications','fieldProvisions','siegecraft'] as const;

/** Validates even DB-produced JSON: never project fabricated totals as truth. */
export function verifyWorldBossOverviewV41(
 raw:WorldBossOverviewRowV41,expectedEvent:string,expectedAccount:string,
):WorldBossOverviewV41{
 if(!raw||raw.schema!=='world-boss-overview-v41'||raw.eventId!==expectedEvent||raw.accountId!==expectedAccount||
  !validId(raw.eventId)||!validId(raw.accountId)||
  !['hollowroot','sunscar','frostmarch'].includes(raw.bossId)||
  !['draft','active','closed'].includes(raw.status)||
  !integer(raw.startsAtUtcMs)||!integer(raw.endsAtUtcMs)||
  !integer(raw.readAtUtcMs)||!integer(raw.maxHp)||raw.maxHp<1||
  !integer(raw.remainingHp)||raw.remainingHp>raw.maxHp||
  !integer(raw.eventRevision)||!integer(raw.attemptsUsed)||
  !integer(raw.attemptsCommitted)||!integer(raw.attemptsReserved)||
  !integer(raw.donationsUsed)||raw.attemptsUsed>3||
  raw.attemptsCommitted+raw.attemptsReserved!==raw.attemptsUsed||
  raw.donationsUsed>2||
  !raw.rewards||!integer(raw.rewards.balance)||
  !integer(raw.rewards.walletRevision)||
  !integer(raw.rewards.claimedThisEvent)||
  raw.rewards.claimedThisEvent>100||raw.rewards.eventCap!==100)
  throw Error('world_boss_v41_invalid_server_overview');
 let phase:Phase;
 try {
  const status=worldBossScheduleAtV22(raw.startsAtUtcMs,raw.readAtUtcMs);
  phase=status.phase;
  if(raw.endsAtUtcMs!==status.raidWeekEndsAtUtcMs)
   throw Error('invalid end');
 }catch{throw Error('world_boss_v41_invalid_calendar');}
 if(raw.phase!==phase)throw Error('world_boss_v41_inconsistent_phase');
 const camp=validateWorldBossWarCampProgressV27(raw.warCamp,expectedEvent);
 const attemptsRemaining=3-raw.attemptsUsed;
 const donationsRemaining=2-raw.donationsUsed;
 const canAttack=raw.status==='active'&&phase==='raid'&&
  raw.remainingHp>0&&attemptsRemaining>0&&camp.frozen;
 const canDonate=raw.status==='active'&&phase==='preparation'&&
  donationsRemaining>0&&TRACKS.some(t=>
   camp.contributions[t]<camp.goals[t].tier2At);
 return {...raw,warCamp:camp,attemptsRemaining,donationsRemaining,
  canAttack,canDonate};
}
export interface WorldBossOverviewDepsV41 {
 authenticate(token:string):Promise<string|null>;
 db:{read(eventId:string,accountId:string):Promise<WorldBossOverviewRowV41>};
}
export function createWorldBossOverviewPgV41(pg:WorldBossPgExecutorV19):
 WorldBossOverviewDepsV41['db']{
 if(!pg||typeof pg.query!=='function')
  throw Error('world_boss_v41_private_pg_required');
 return {async read(eventId,accountId){
  if(!validId(eventId)||!validId(accountId))
   throw Error('world_boss_v41_invalid_private_identity');
  const result=await pg.query<{state:WorldBossOverviewRowV41}>(
   'SELECT private.world_boss_v41_overview($1::uuid,$2::uuid) AS state',
   [eventId,accountId]);
  if(result.rows.length!==1||!result.rows[0]?.state)
   throw Error('world_boss_v41_private_overview_missing');
  return result.rows[0].state;
 }};
}
/** Service-only. Real mobile must use a separately reviewed auth route. */
export async function readAuthenticatedWorldBossOverviewV41(
 input:{token:string;eventId:string},deps:WorldBossOverviewDepsV41,
):Promise<WorldBossOverviewV41>{
 if(!deps||typeof deps.authenticate!=='function'||
  !deps.db||typeof deps.db.read!=='function'||
  !validId(input?.eventId)||typeof input?.token!=='string'||
  input.token.length<8||input.token.length>8192)
  throw Error('world_boss_v41_auth_or_selection_invalid');
 const accountId=await deps.authenticate(input.token);
 if(!validId(accountId))throw Error('world_boss_v41_auth_required');
 return verifyWorldBossOverviewV41(
  await deps.db.read(input.eventId,accountId),input.eventId,accountId);
}
