import { readFile } from 'node:fs/promises';
const sql=await readFile(new URL('../supabase/migrations/20260914_028_operations_safety_foundation_v17_2.sql',import.meta.url),'utf8');
for(const table of ['ops_remote_config','ops_remote_config_revisions','ops_metric_buckets','ops_alerts','ops_reset_definitions','ops_reset_runs','ops_support_accounts','ops_support_cases','ops_support_notes']){
  if(!sql.includes(`create table if not exists public.${table}`)) throw new Error(`missing table ${table}`);
  if(!sql.includes(`alter table public.${table} enable row level security`)) throw new Error(`missing RLS ${table}`);
  if(!sql.includes(`revoke all on public.${table} from anon, authenticated`)) throw new Error(`missing player revoke ${table}`);
}
if(!sql.includes('for update skip locked')) throw new Error('reset claim is not using SKIP LOCKED');
if(!sql.includes('unique(reset_key,period_key)')) throw new Error('reset ledger lacks idempotency unique key');
if(!sql.includes('ops_remote_config_revisions_are_append_only')) throw new Error('config revision append-only trigger missing');
if(/SUPABASE_SERVICE_ROLE_KEY/.test(sql)) throw new Error('secret binding name should not be in SQL migration');
console.log('v17.2 SQL static audit passed. Real Supabase apply/RLS tests are still required.');
