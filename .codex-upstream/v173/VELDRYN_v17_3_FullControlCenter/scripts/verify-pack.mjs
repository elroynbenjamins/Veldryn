import { readFile, stat, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'src/index.html','src/app.js','src/styles.css','functions/api/admin.js','functions/_shared/liveops.js','functions/_shared/operations.js','functions/_shared/admin-control.js','functions/_shared/redeem-codes.js',
  'supabase/migrations/20260913_027_liveops_admin_control.sql','supabase/migrations/20260914_028_operations_safety_foundation_v17_2.sql','supabase/migrations/20260914_029_full_control_center_v17_3.sql',
  'backend_integration/remote-config-v17_2.ts','backend_integration/ops-metrics-v17_2.ts','backend_integration/central-reset-service-v17_2.ts','backend_integration/player-support-index-v17_2.ts','backend_integration/runtime-health-v17_2.ts','backend_integration/operations-monitor-v17_2.ts',
  'backend_integration/admin-command-worker-v17_3.ts','backend_integration/admin-command-handlers-v16-reference.ts','backend_integration/admin-content-catalog-v17_3.ts','backend_integration/announcement-worker-v17_3.ts','backend_integration/redeem-code-service-v17_3.ts','backend_integration/supabase-redeem-code-store-v17_3.ts','backend_integration/ADMIN_CONTROL_WIRING_V17_3.md','backend_integration/REDEEM_CODE_WIRING_V17_3.md',
  'DEPLOY_FREE_CLOUDFLARE_PAGES.md','SECURITY.md','CODEX_INSTRUCTIONS.txt','START_HERE.md','FULL_CONTROL_CENTER_V17_3.md'
];
for (const rel of required) { const s=await stat(path.join(root,rel)); if(!s.isFile()) throw new Error(`missing:${rel}`); }
const api = await readFile(path.join(root,'functions/api/admin.js'),'utf8');
const app = await readFile(path.join(root,'src/app.js'),'utf8');
if (app.includes('SUPABASE_SERVICE_ROLE_KEY')) throw new Error('service_role_name_leaked_into_browser_source');
if (!api.includes('SUPABASE_SERVICE_ROLE_KEY')) throw new Error('server_api_missing_service_role_binding');
for (const action of ['remoteConfig','saveRemoteConfig','healthEconomy','resets','supportSearch','supportAccount','controlCenter','contentCatalog','listRedeemCodes','createRedeemCode','setRedeemCodeEnabled','queueAdminCommand','approveAdminCommand','reverseAdminCommand','listAnnouncements','saveAnnouncement']) if(!api.includes(`'${action}'`)) throw new Error(`admin_api_missing:${action}`);
for (const page of ['Full Game Controls','Content Catalog','Redeem Codes','Announcements','Remote Config & Kill Switches','Health & Economy','Central Reset Service','Player Support']) if(!app.includes(page)) throw new Error(`admin_ui_missing:${page}`);
const migration29 = await readFile(path.join(root,'supabase/migrations/20260914_029_full_control_center_v17_3.sql'),'utf8');
for (const table of ['ops_admin_command_registry','ops_admin_commands','ops_admin_command_events','ops_admin_content_catalog','ops_redeem_codes','ops_redeem_code_claims','ops_admin_announcements']) if(!migration29.includes(table)) throw new Error(`v17_3_migration_missing:${table}`);
for (const key of ['economy.gold_adjust','economy.gold_set','inventory.item_adjust','inventory.item_set','rewards.grant_bundle','progression.skill_xp_set','moderation.suspend','moderation.chat_message_hide','entitlement.grant_override','companion.xp_adjust','companion.xp_set','social.guild_transfer_leader','dungeon.cancel_stuck_run']) if(!migration29.includes(`'${key}'`)) throw new Error(`v17_3_command_missing:${key}`);
if (!migration29.includes("delete from public.ops_remote_config where config_key = 'feature.market.enabled'")) throw new Error('legacy_removed_feature_cleanup_missing');
if (!migration29.includes('reserve_ops_redeem_code_claim')) throw new Error('redeem_code_reservation_rpc_missing');
const nonHistorical=[];
for(const rel of ['src/app.js','functions/api/admin.js','backend_integration/ops-metrics-v17_2.ts','backend_integration/remote-config-v17_2.ts','backend_integration/admin-command-handlers-v16-reference.ts']){
  const text=await readFile(path.join(root,rel),'utf8'); if(/\bmarket\b/i.test(text)) nonHistorical.push(rel);
}
if(nonHistorical.length) throw new Error(`removed_market_references_present:${nonHistorical.join(',')}`);
console.log('Pack static verification passed.');
