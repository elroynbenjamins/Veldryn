import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const file=path.join(root,'backend','supabase','migrations','20261028000000_regional_combat_cadence.sql');
if(!fs.existsSync(file))throw new Error('regional combat cadence migration missing');
const sql=fs.readFileSync(file,'utf8');
const required=[
  "when 'standard' then v_cooldown_seconds:=30;",
  "when 'elite' then v_cooldown_seconds:=90;",
  "when 'regional_boss' then v_cooldown_seconds:=300;v_daily_cap:=3;",
  "pg_advisory_xact_lock(hashtextextended('regional-combat:'||p_account_id::text,0))",
  "raise exception 'regional_combat_cooldown'",
  "raise exception 'regional_boss_daily_cap'",
  "revoke all on function public.regional_combat_cadence_server_v1(uuid,text,text) from public,anon,authenticated;",
  "grant execute on function public.regional_combat_cadence_server_v1(uuid,text,text) to service_role;",
];
for(const needle of required)if(!sql.includes(needle))throw new Error('regional cadence contract missing: '+needle);
const idempotentRead=sql.indexOf("where account_id=p_account_id and request_id=p_request_id");
const cadenceRead=sql.indexOf("v_cadence:=public.regional_combat_cadence_server_v1");
if(idempotentRead<0||cadenceRead<0||idempotentRead>cadenceRead)throw new Error('idempotent receipt replay must be checked before cadence enforcement');
console.log('PASS: regional combat cadence migration contract');
