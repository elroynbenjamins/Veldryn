/* Static deployment safety checks for the HIDDEN Combat 2.0 migration.
 * This does not replace an actual staging migration, RLS review or DB CI.
 */
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const src=fs.readFileSync(path.resolve(__dirname,
 '../supabase/migrations/20261118124500_combat_v2_build_persistence_hidden_v1.sql'),'utf8');
assert.match(src,/create table if not exists private\.combat_v2_character_builds_v1/);
assert.match(src,/enable row level security/);
assert.match(src,/revoke all on private\.combat_v2_character_builds_v1 from public,anon,authenticated/);
assert.match(src,/grant execute on function public\.combat_v2_build_read_server_v1[\s\S]*?to service_role/);
assert.match(src,/grant execute on function public\.combat_v2_build_cas_server_v1[\s\S]*?to service_role/);
assert.match(src,/revoke all on function public\.combat_v2_build_read_server_v1[\s\S]*?from public,anon,authenticated/);
assert.match(src,/revoke all on function public\.combat_v2_build_cas_server_v1[\s\S]*?from public,anon,authenticated/);
assert.match(src,/from public\.characters c[\s\S]*?where c\.id=p_character_id and c\.account_id=p_account_id/);
assert.match(src,/from public\.online_game_states g[\s\S]*?for update/);
assert.match(src,/combat_v2_stale_game_revision/);
assert.match(src,/combat_v2_stale_build_revision/);
assert.match(src,/p_expected_character_fingerprint/);
assert.match(src,/p_expected_build_revision/);
assert.doesNotMatch(src,/grant\s+(?:all|select|insert|update)\s+on\s+private\.combat_v2_character_builds_v1\s+to\s+(?:public|anon|authenticated)/i);
assert.doesNotMatch(src,/revoke all on schema private from/i,
 'Cannot remove existing schema grants during the new feature migration');
console.log('PASS: hidden build DB permissions, server-only RPCs, account ownership and CAS checks');
