import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('docs/roadmap/leaderboards-v4-frozen-snapshots-proposal.sql');
const fixture=read('backend/supabase/tests/leaderboards_v4_snapshot_security_fixture.sql');
const code=read('backend/src/server/rankings/frozen-rankings.ts');
const required=[
  'CREATE TABLE IF NOT EXISTS private.rankings_frozen_snapshots_v1',
  'CREATE TABLE IF NOT EXISTS private.rankings_frozen_cursors_v1',
  'ENABLE ROW LEVEL SECURITY',
  'REVOKE ALL ON TABLE private.rankings_frozen_snapshots_v1',
  'REVOKE ALL ON FUNCTION public.rankings_frozen_page_server_v1',
  'REVOKE ALL ON FUNCTION public.rankings_frozen_start_server_v1',
  'REVOKE ALL ON FUNCTION private.rankings_frozen_metrics_v1',
  'GRANT EXECUTE ON FUNCTION public.rankings_frozen_page_server_v1',
  'GRANT EXECUTE ON FUNCTION public.rankings_frozen_start_server_v1',
  "p_requester",
  's.requester_id=p_requester',
  's.expires_at>clock_timestamp()',
  "p.profile_visibility='public'",
  'private.rankings_verified_metrics_v3(p_board)',
  "p_board='guild'",
  "p_board IN ('arena_rating','arena_wins')",
  'rank() OVER(',
  'LIMIT 10051',
  'v_last<=10000',
  'WITH ORDINALITY',
  'LIMIT v_snapshot.page_size+1',
  'ON CONFLICT(snapshot_id,raw_after)',
  'RANKING_SNAPSHOT_RATE_LIMITED',
  'rankings_frozen_prune_server_v1',
  'pg_catalog.pg_advisory_xact_lock',
];
for(const term of required)assert.ok(sql.includes(term),'Missing frozen snapshot safety: '+term);
assert.equal(sql.match(/CREATE OR REPLACE FUNCTION/g)?.length,4,'exactly four service-only functions');
assert.equal(sql.match(/^BEGIN;$/gm)?.length,1,'one beginning transaction');
assert.equal(sql.match(/^COMMIT;$/gm)?.length,1,'one ending transaction');
assert.ok(code.includes('RANKINGS_SNAPSHOT_RELEASED=false'),'snapshots must default disabled');
assert.ok(code.includes("rankingsReleased:false,snapshotsReleased:RANKINGS_SNAPSHOT_RELEASED"),'both gates must default closed');
for(const test of ['NEED_TWO_STAGING_PUBLIC_ACCOUNTS','SNAPSHOT_FUNCTIONS_EXPOSED_TO_CLIENT',
  'FROZEN_CURSOR_NOT_IDEMPOTENT','SNAPSHOT_IGNORED_NEW_PRIVACY',
  'EXPIRED_SNAPSHOT_ALLOWED','OTHER_ACCOUNT_STOLE_SNAPSHOT',
  'SNAPSHOT_RATE_LIMIT_NOT_ENFORCED','SNAPSHOT_CLEANUP_DID_NOT_DELETE_EXPIRED'])
  assert.ok(fixture.includes(test),'Missing staging test: '+test);
console.log('All 19 frozen ranking snapshot draft SQL/security checks PASS');
