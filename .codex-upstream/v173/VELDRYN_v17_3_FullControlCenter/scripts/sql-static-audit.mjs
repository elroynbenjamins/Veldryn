import { readFile } from 'node:fs/promises';
const sql28=await readFile(new URL('../supabase/migrations/20260914_028_operations_safety_foundation_v17_2.sql',import.meta.url),'utf8');
for(const table of ['ops_remote_config','ops_remote_config_revisions','ops_metric_buckets','ops_alerts','ops_reset_definitions','ops_reset_runs','ops_support_accounts','ops_support_cases','ops_support_notes']){
  if(!sql28.includes(`create table if not exists public.${table}`)) throw new Error(`missing table ${table}`);
  if(!sql28.includes(`alter table public.${table} enable row level security`)) throw new Error(`missing RLS ${table}`);
  if(!sql28.includes(`revoke all on public.${table} from anon, authenticated`)) throw new Error(`missing player revoke ${table}`);
}
if(!sql28.includes('for update skip locked')) throw new Error('reset claim is not using SKIP LOCKED');
if(!sql28.includes('unique(reset_key,period_key)')) throw new Error('reset ledger lacks idempotency unique key');
if(!sql28.includes('ops_remote_config_revisions_are_append_only')) throw new Error('config revision append-only trigger missing');
if(sql28.includes("feature.market.enabled")) throw new Error('removed player-market control is still seeded by fresh v17.2 migration');
const sql29=await readFile(new URL('../supabase/migrations/20260914_029_full_control_center_v17_3.sql',import.meta.url),'utf8');
for(const table of ['ops_admin_command_registry','ops_admin_commands','ops_admin_command_events','ops_admin_content_catalog','ops_redeem_codes','ops_redeem_code_claims','ops_admin_announcements']){
  if(!sql29.includes(`create table if not exists public.${table}`)) throw new Error(`missing v17.3 table ${table}`);
  if(!sql29.includes(`alter table public.${table} enable row level security`)) throw new Error(`missing v17.3 RLS ${table}`);
  if(!sql29.includes(`revoke all on public.${table} from anon, authenticated`)) throw new Error(`missing v17.3 player revoke ${table}`);
}
if(!sql29.includes('claim_ops_admin_commands')||!sql29.includes('for update skip locked')) throw new Error('admin command atomic claim missing');
if(!sql29.includes('ops_admin_command_events_are_append_only')) throw new Error('command forensic ledger not append-only');
if(!sql29.includes('reserve_ops_redeem_code_claim')||!sql29.includes('redeem-code:')) throw new Error('atomic redeem reservation/idempotency function missing');
if(!sql29.includes("delete from public.ops_remote_config where config_key = 'feature.market.enabled'")) throw new Error('removed Market control cleanup missing');
if(/SUPABASE_SERVICE_ROLE_KEY/.test(sql28+sql29)) throw new Error('secret binding name should not be in SQL migrations');
console.log('v17.2 + v17.3 SQL static audit passed. Real Supabase apply/RLS/concurrency tests are still required.');
