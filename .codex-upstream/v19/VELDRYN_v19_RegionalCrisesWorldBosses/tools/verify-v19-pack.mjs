import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.argv[2]||new URL('..',import.meta.url).pathname);
let failed=false;
const required=[
 'START_HERE.md','REGIONAL_CRISES_WORLD_BOSSES_V19.md','SETTLEMENT_WIRING_V19.md','CODEX_INSTRUCTIONS.txt','APPLICATION_MANIFEST.json','V19_API_NAMES_TO_MERGE.txt',
 'dependencies/VELDRYN_v18_GuildProjectsSocial.zip',
 'files/backend/supabase/migrations/20260914_031_regional_crises_world_bosses_v19.sql',
 'files/backend/src/server/shared-world/regional-crises.ts','files/backend/src/server/shared-world/world-bosses.ts','files/backend/src/server/shared-world/shared-world-routing.ts',
 'files/backend/src/server/shared-world/world-boss-service.ts','files/backend/src/server/shared-world/regional-crisis-service.ts','files/backend/src/server/shared-world/shared-world-worker.ts',
 'files/backend/src/server/shared-world/shared-world-rewards.ts','files/backend/src/server/shared-world/world-boss-ranking.ts','files/backend/src/server/shared-world/shared-world-finalization.ts',
 'files/apps/mobile/src/core/shared-world-v19.ts','files/apps/mobile/src/components/RegionalCrisisPanel.tsx','files/apps/mobile/src/components/WorldBossPanel.tsx',
 'files/control-center/backend_integration/SHARED_WORLD_CONTROL_WIRING_V19.md'
];
for(const rel of required){if(!fs.existsSync(path.join(root,rel))){console.error('MISSING',rel);failed=true;}}
function walk(dir){if(!fs.existsSync(dir))return[];return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const activeRoots=[path.join(root,'files/backend'),path.join(root,'files/apps/mobile')];
const forbiddenPath=/(^|[/\\])market([/\\]|$)|procurement/i;
const forbiddenRuntime=/(?:from\s+['"][^'"]*market|require\(['"][^'"]*market|feature\.market\.|Can_Post_Procurement|procurement_(?:order|slot))/i;
for(const base of activeRoots){for(const file of walk(base)){const rel=path.relative(root,file);if(forbiddenPath.test(rel)){console.error('FORBIDDEN ACTIVE PATH',rel);failed=true;}if(/\.(ts|tsx|js|sql)$/.test(file)){const src=fs.readFileSync(file,'utf8');if(forbiddenRuntime.test(src)){console.error('FORBIDDEN ACTIVE MARKET/PROCUREMENT SYMBOL',rel);failed=true;}}}}
const sqlPath=path.join(root,'files/backend/supabase/migrations/20260914_031_regional_crises_world_bosses_v19.sql');
if(fs.existsSync(sqlPath)){
 const sql=fs.readFileSync(sqlPath,'utf8');
 if(!/^begin;/im.test(sql)||!/^commit;/im.test(sql)){console.error('Migration missing BEGIN/COMMIT');failed=true;}
 const tables=[...sql.matchAll(/create table if not exists public\.([a-z0-9_]+)/gi)].map(m=>m[1]);
 for(const table of tables){if(!new RegExp(`alter table public\\.${table} enable row level security;`,'i').test(sql)){console.error('RLS NOT ENABLED',table);failed=true;}}
 for(const needle of ['apply_shared_world_crisis_contribution','reserve_shared_world_boss_attempt','settle_shared_world_boss_attempt','feature.regional_crises.enabled','feature.world_bosses.enabled','shared_world.world_boss_recalculate_hp','shared_world_world_boss_final_ranks']){if(!sql.includes(needle)){console.error('SQL MISSING',needle);failed=true;}}
 if(/grant\s+(insert|update|delete|all)\s+on\s+public\.shared_world_/i.test(sql)){console.error('Direct client write grant detected');failed=true;}
}
const manifestPath=path.join(root,'APPLICATION_MANIFEST.json');
if(fs.existsSync(manifestPath)){const m=JSON.parse(fs.readFileSync(manifestPath,'utf8'));if(m.version!=='19.0'){console.error('Manifest version mismatch');failed=true;}if(m.market_removed!==true){console.error('Manifest must mark market_removed=true');failed=true;}if(m.new_currency!==false){console.error('v19 must not add a currency');failed=true;}}
if(failed)process.exit(1);
console.log('v19 pack static verification passed');
