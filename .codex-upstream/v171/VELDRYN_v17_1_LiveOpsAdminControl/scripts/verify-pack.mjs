import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'src/index.html','src/app.js','src/styles.css','functions/api/admin.js','functions/_shared/liveops.js',
  'supabase/migrations/20260913_027_liveops_admin_control.sql','DEPLOY_FREE_CLOUDFLARE_PAGES.md','SECURITY.md','CODEX_INSTRUCTIONS.txt'
];
for (const rel of required) { const s=await stat(path.join(root,rel)); if(!s.isFile()) throw new Error(`missing:${rel}`); }
const api = await readFile(path.join(root,'functions/api/admin.js'),'utf8');
const app = await readFile(path.join(root,'src/app.js'),'utf8');
if (app.includes('SUPABASE_SERVICE_ROLE_KEY')) throw new Error('service_role_name_leaked_into_browser_source');
if (!api.includes('SUPABASE_SERVICE_ROLE_KEY')) throw new Error('server_api_missing_service_role_binding');
if (!api.includes('liveops_admin_users')) throw new Error('server_api_missing_admin_authorization');
const migration = await readFile(path.join(root,'supabase/migrations/20260913_027_liveops_admin_control.sql'),'utf8');
for (const table of ['liveops_admin_users','liveops_event_drafts','liveops_admin_templates','liveops_admin_reward_catalog','liveops_admin_audit_log','liveops_runtime_health']) if(!migration.includes(table)) throw new Error(`migration_missing:${table}`);
if (!migration.includes('enable row level security')) throw new Error('admin_tables_missing_rls');
console.log('Pack static verification passed.');
