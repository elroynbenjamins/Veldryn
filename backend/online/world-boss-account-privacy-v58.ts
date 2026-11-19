/**
 * World Boss V58 — private, read-only V57 account-fence adapter.
 *
 * NO live endpoint, Auth token handling, service secret or mutation here.
 * Callers must FIRST verify the bearer credential with trusted Supabase Auth
 * and derive the account UUID exclusively from the verified user. V51 then
 * checks this privacy source before AND after the event overview read.
 *
 * This function fails closed if either the V57 table or auth.users access is
 * absent. It cannot enable World Boss gameplay or authorize any deletion.
 */
import type {WorldBossPgExecutorV19} from './world-boss-private-pg-v19';
import {
 createWorldBossCurrentOverviewPgV51,
 type WorldBossCurrentOverviewDepsV51,
} from './world-boss-current-overview-v51';

export const WORLD_BOSS_V58_PRIVATE_READ_LIVE=false as const;
const ACCOUNT_UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * A valid, still-existing Auth user is not enough: no blocked V57 tombstone
 * may exist for their account. Query directly through private PostgreSQL,
 * never via a public RPC, a PostgREST table, or client supplied account ID.
 */
export function createWorldBossAccountPrivacyPgV58(
 pg:WorldBossPgExecutorV19,
):WorldBossCurrentOverviewDepsV51['accountPrivacy']{
 if(!pg||typeof pg.query!=='function')
  throw Error('world_boss_v58_private_pg_required');

 return {async allowRead(accountId:string):Promise<boolean>{
  if(typeof accountId!=='string'||!ACCOUNT_UUID.test(accountId))
   throw Error('world_boss_v58_invalid_verified_owner');
  // Parameter binding protects the trusted Auth subject from SQL injection.
  // One statement gives a single READ COMMITTED snapshot of Auth and fence.
  // V51 checks this again AFTER the awaited private overview read.
  const sql='SELECT ('+
   'EXISTS(SELECT 1 FROM auth.users WHERE id=$1::uuid) AND '+
   'NOT EXISTS(SELECT 1 FROM private.world_boss_erasure_fences_v57 '+
   'WHERE account_id=$1::uuid)) AS "allowRead"';
  const found=await pg.query<{allowRead:boolean}>(sql,[accountId]);
  if(!found||!Array.isArray(found.rows)||found.rows.length!==1||
   typeof found.rows[0]?.allowRead!=='boolean')
   throw Error('world_boss_v58_invalid_private_privacy_result');
  return found.rows[0].allowRead;
 }};
}

/**
 * Server-only V51 composition. The authenticated host must inject:
 *   authenticate: token => verified Auth user UUID
 *   launchMondayUtcMs: audited server feature configuration
 *   serverNowUtcMs: trusted UTC time
 * The returned adapter alone has NO HTTP route and cannot be passed to
 * untrusted mobile code.
 */
export function createWorldBossCurrentOverviewPgV58(
 pg:WorldBossPgExecutorV19,
){
 return {
  ...createWorldBossCurrentOverviewPgV51(pg),
  accountPrivacy:createWorldBossAccountPrivacyPgV58(pg),
 };
}
