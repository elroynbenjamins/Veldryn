import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const file=path.join(root,'backend','supabase','migrations','20261029000000_regional_combat_pending_recovery.sql');
if(!fs.existsSync(file))throw new Error('regional combat pending recovery migration missing');
const sql=fs.readFileSync(file,'utf8');
const required=[
  "add column if not exists expires_at timestamptz",
  "where r.account_id=p_account_id",
  "and r.result is null",
  "and r.expires_at>clock_timestamp()",
  "raise exception 'regional_combat_pending'",
  "raise exception 'regional_combat_receipt_expired'",
  "v_now+interval '15 minutes'",
  "revoke all on function public.pending_regional_combat_server_v1(uuid) from public,anon,authenticated;",
  "grant execute on function public.pending_regional_combat_server_v1(uuid) to service_role;"
];
for(const snippet of required)if(!sql.includes(snippet))throw new Error('missing regional pending contract: '+snippet);
if((sql.match(/create or replace function public\.reserve_regional_combat_server_v1/g)??[]).length!==1)throw new Error('regional reserve override must be singular');
console.log('PASS: regional combat pending receipt recovery migration contract');
