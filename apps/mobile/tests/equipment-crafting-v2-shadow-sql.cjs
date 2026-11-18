const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../../../backend/sql/drafts/equipment_crafting_v2_shadow_store_staging_only.sql'),'utf8');
assert.match(source,/INTERNAL STAGING DRAFT, NOT AN APPLIED MIGRATION/i);
assert.match(source,/create table if not exists private\.equipment_crafting_v2_shadow_accounts/i);
assert.match(source,/create table if not exists private\.equipment_crafting_v2_shadow_receipts/i);
assert.match(source,/primary key \(account_id,request_id\)/i);
assert.match(source,/for update;/i,'Account commit needs a row lock for serialized writes');
assert.match(source,/if p_expected_version <> v_version then/i,'CAS must reject concurrent stale versions');
assert.match(source,/if v_fingerprint <> p_fingerprint then/i,'Request IDs cannot be reused for another command');
assert.match(source,/revoke all on function public\.equipment_crafting_v2_shadow_read\(uuid\)/i);
assert.match(source,/revoke all on function public\.equipment_crafting_v2_shadow_commit\(uuid,bigint,text,text,jsonb,jsonb\)/i);
assert.match(source,/grant execute on function public\.equipment_crafting_v2_shadow_commit\(uuid,bigint,text,text,jsonb,jsonb\)\s+to service_role/i);
assert.equal((source.match(/security invoker set search_path=''/gi)||[]).length,2,
 'Both staging RPCs must use SECURITY INVOKER and a pinned search path');
assert.equal((source.match(/enable row level security/gi)||[]).length,2,
 'Both private snapshot and receipt tables need RLS defense in depth');
assert.doesNotMatch(source,/grant execute[^;]*\bto\s+(?:anon|authenticated)\b/i,
 'No public client may execute the draft persistence functions');
assert.doesNotMatch(source,/create (?:table|function)[^;]*\b(?:character_wallets|online_game_states|equipment_craft_queues)\b/i,
 'Staging shadow storage cannot rewrite current live balances');
console.log('PASS: shadow persistence SQL draft enforces isolation, RPC privileges, row locks and idempotent CAS');
