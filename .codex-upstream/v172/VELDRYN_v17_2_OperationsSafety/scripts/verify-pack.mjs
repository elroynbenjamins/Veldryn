import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'src/index.html','src/app.js','src/styles.css','functions/api/admin.js','functions/_shared/liveops.js','functions/_shared/operations.js',
  'supabase/migrations/20260913_027_liveops_admin_control.sql','supabase/migrations/20260914_028_operations_safety_foundation_v17_2.sql',
  'backend_integration/remote-config-v17_2.ts','backend_integration/ops-metrics-v17_2.ts','backend_integration/central-reset-service-v17_2.ts','backend_integration/player-support-index-v17_2.ts','backend_integration/runtime-health-v17_2.ts','backend_integration/operations-monitor-v17_2.ts','backend_integration/OPERATIONS_WIRING_V17_2.md',
  'DEPLOY_FREE_CLOUDFLARE_PAGES.md','SECURITY.md','CODEX_INSTRUCTIONS.txt','START_HERE.md','OPERATIONS_SAFETY_V17_2.md'
];
for (const rel of required) { const s=await stat(path.join(root,rel)); if(!s.isFile()) throw new Error(`missing:${rel}`); }
const api = await readFile(path.join(root,'functions/api/admin.js'),'utf8');
const app = await readFile(path.join(root,'src/app.js'),'utf8');
if (app.includes('SUPABASE_SERVICE_ROLE_KEY')) throw new Error('service_role_name_leaked_into_browser_source');
if (!api.includes('SUPABASE_SERVICE_ROLE_KEY')) throw new Error('server_api_missing_service_role_binding');
for (const action of ['remoteConfig','saveRemoteConfig','healthEconomy','resets','supportSearch','supportAccount']) if(!api.includes(`'${action}'`)) throw new Error(`admin_api_missing:${action}`);
for (const page of ['Remote Config & Kill Switches','Health & Economy','Central Reset Service','Player Support']) if(!app.includes(page)) throw new Error(`admin_ui_missing:${page}`);
const migration27 = await readFile(path.join(root,'supabase/migrations/20260913_027_liveops_admin_control.sql'),'utf8');
for (const table of ['liveops_admin_users','liveops_event_drafts','liveops_admin_templates','liveops_admin_reward_catalog','liveops_admin_audit_log','liveops_runtime_health']) if(!migration27.includes(table)) throw new Error(`v17_1_migration_missing:${table}`);
const migration28 = await readFile(path.join(root,'supabase/migrations/20260914_028_operations_safety_foundation_v17_2.sql'),'utf8');
for (const table of ['ops_remote_config','ops_remote_config_revisions','ops_metric_buckets','ops_alerts','ops_reset_definitions','ops_reset_runs','ops_support_accounts','ops_support_cases','ops_support_notes']) if(!migration28.includes(table)) throw new Error(`v17_2_migration_missing:${table}`);
for (const key of ['feature.market.enabled','feature.live_dungeons.enabled','maintenance.write_actions_disabled','monthly.companion_trials','weekly.party_contracts']) if(!migration28.includes(key)) throw new Error(`v17_2_seed_missing:${key}`);
if ((migration28.match(/enable row level security/g)||[]).length < 9) throw new Error('v17_2_control_tables_missing_rls');
if (!migration28.includes('claim_ops_reset_runs') || !migration28.includes('record_ops_metric')) throw new Error('v17_2_service_rpcs_missing');
console.log('Pack static verification passed.');
