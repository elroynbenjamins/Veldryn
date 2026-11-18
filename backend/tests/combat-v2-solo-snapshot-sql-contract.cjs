/* HIDDEN Combat 2.0 server-only SQL contract audit.
 * Static checks complement, but do not replace, executing migration in staging.
 */
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const src=fs.readFileSync(path.resolve(__dirname,
 '../supabase/migrations/20261118213000_combat_v2_solo_snapshot_hidden_v1.sql'),'utf8');
assert.match(src,/create\s+table\s+if\s+not\s+exists\s+private\.combat_v2_solo_snapshots_v1/i);
assert.match(src,/references\s+public\.characters\(id\)\s+on\s+delete\s+cascade/i);
assert.match(src,/encounter_id\s+text\s+primary\s+key/i);
assert.match(src,/snapshot_digest\s+text\s+not\s+null/i);
assert.match(src,/alter\s+table\s+private\.combat_v2_solo_snapshots_v1\s+enable\s+row\s+level\s+security/i);
assert.match(src,/revoke\s+all\s+on\s+private\.combat_v2_solo_snapshots_v1\s+from\s+public,anon,authenticated/i);
for(const name of ['combat_v2_solo_read_server_v1','combat_v2_solo_reserve_server_v1']){
 assert.match(src,new RegExp('create or replace function public\\.'+name+'\\('));
 assert.match(src,new RegExp('revoke all on function public\\.'+name+'\\([\\s\\S]*?from public,anon,authenticated','i'));
 assert.match(src,new RegExp('grant execute on function public\\.'+name+'\\([\\s\\S]*?to service_role','i'));
}
assert.match(src,/language plpgsql security definer[\s\S]*?set search_path = ''/);
assert.match(src,/from public\.characters c[\s\S]*?where c\.id=p_character_id and c\.account_id=p_account_id/i);
assert.match(src,/from public\.online_game_states g[\s\S]*?for update/i);
assert.match(src,/from private\.combat_v2_character_builds_v1 b[\s\S]*?for update/i);
assert.match(src,/snapshot_digest is distinct from p_snapshot_digest/i);
assert.match(src,/combat_v2_encounter_id_conflict/);
assert.match(src,/combat_v2_stale_game_revision/);
assert.match(src,/combat_v2_stale_build_revision/);
assert.match(src,/combat_v2_stale_character/);
assert.match(src,/p_payload#>>'\{combatInput,seed\}' is distinct from p_payload#>>'\{preparedKit,seed\}'/);
assert.match(src,/insert into private\.combat_v2_solo_snapshots_v1/);
assert.doesNotMatch(src,/on conflict[\s\S]*?do update/i,
 'Once prepared, a V2 combat snapshot must never be overwritten');
assert.doesNotMatch(src,/(?:update|delete)\s+private\.combat_v2_solo_snapshots_v1\b/i,
 'No mutation or erasure of battle snapshots without separate lifecycle design');
assert.doesNotMatch(src,/\bgrant\s+(?:all|select|insert|update|delete)\s+on\s+private\.combat_v2_solo_snapshots_v1\s+to\s+(?:public|anon|authenticated)/i);
assert.doesNotMatch(src,/\b(insert|update|delete)\s+into\s+public\.(?:online_game_states|account_balances|inventory|dungeon_rewards)/i,
 'Snapshot SQL must not settle rewards, XP, activity or currency');
assert.doesNotMatch(src,/revoke\s+all\s+on\s+schema\s+private/i,
 'Do not change grants for existing private Supabase schema users');
console.log('PASS: V2 solo snapshot RLS/service-role-only RPC, first-write-wins and stale CAS');
