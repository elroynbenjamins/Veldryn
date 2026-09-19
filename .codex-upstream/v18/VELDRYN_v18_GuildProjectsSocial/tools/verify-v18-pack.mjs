import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || new URL('..', import.meta.url).pathname);
const required = [
  'START_HERE.md','GUILD_PROJECTS_SOCIAL_V18.md','SETTLEMENT_WIRING_V18.md','GUILD_MARKET_REMOVAL_COMPATIBILITY.md','CODEX_INSTRUCTIONS.txt','APPLICATION_MANIFEST.json',
  'dependencies/VELDRYN_v17_3_FullControlCenter_CloudflareFree.zip',
  'files/backend/supabase/migrations/20260914_030_guild_projects_social_v18.sql',
  'files/backend/src/server/guild/guild-projects.ts','files/backend/src/server/guild/guild-project-service.ts','files/backend/src/server/guild/guild-project-board.ts',
  'files/backend/src/server/guild/guild-project-donations.ts','files/backend/src/server/guild/guild-decrees.ts','files/backend/src/server/guild/guild-social.ts',
  'files/apps/mobile/src/core/guild-projects-v18.ts','files/apps/mobile/src/components/GuildHubPanel.tsx','files/apps/mobile/src/components/GuildProjectsPanel.tsx'
];
let failed = false;
for (const rel of required) {
  if (!fs.existsSync(path.join(root, rel))) { console.error(`MISSING ${rel}`); failed = true; }
}

const runtimeRoots = [path.join(root,'files/backend'),path.join(root,'files/apps/mobile')];
const forbiddenPath = /(^|[/\\])market([/\\]|$)|procurement/i;
const forbiddenRuntime = /(?:from\s+['"][^'"]*market|require\(['"][^'"]*market|feature\.market\.|Can_Post_Procurement|procurement_(?:order|slot))/i;
function walk(dir){
  if(!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
}
for(const base of runtimeRoots){
  for(const file of walk(base)){
    const rel=path.relative(root,file);
    if(forbiddenPath.test(rel)){ console.error(`FORBIDDEN ACTIVE PATH ${rel}`); failed=true; }
    if(/\.(ts|tsx|js|sql)$/.test(file)){
      const src=fs.readFileSync(file,'utf8');
      if(forbiddenRuntime.test(src)){ console.error(`FORBIDDEN ACTIVE MARKET/PROCUREMENT SYMBOL ${rel}`); failed=true; }
    }
  }
}

const sqlPath=path.join(root,'files/backend/supabase/migrations/20260914_030_guild_projects_social_v18.sql');
if(fs.existsSync(sqlPath)){
  const sql=fs.readFileSync(sqlPath,'utf8');
  const tables=[...sql.matchAll(/create table if not exists public\.([a-z0-9_]+)/gi)].map(m=>m[1]);
  for(const table of tables){
    if(!new RegExp(`alter table public\\.${table} enable row level security;`,'i').test(sql)){
      console.error(`RLS NOT ENABLED ${table}`); failed=true;
    }
  }
  for(const needle of ['guild_project_instances','guild_project_cycle_bindings','guild_project_donation_receipts','guild_decree_instances','guild_activity_feed','guild.projects.weekly_board']){
    if(!sql.includes(needle)){console.error(`SQL MISSING ${needle}`); failed=true;}
  }
  if(!/^begin;/im.test(sql)||!/^commit;/im.test(sql)){console.error('Migration missing BEGIN/COMMIT');failed=true;}
}

const manifestPath=path.join(root,'APPLICATION_MANIFEST.json');
if(fs.existsSync(manifestPath)){
  const m=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  if(m.version!=='18.0') {console.error('Manifest version mismatch');failed=true;}
  if(m.market_removed!==true) {console.error('Manifest must mark market_removed=true');failed=true;}
}

if(failed) process.exit(1);
console.log('v18 pack static verification passed');
