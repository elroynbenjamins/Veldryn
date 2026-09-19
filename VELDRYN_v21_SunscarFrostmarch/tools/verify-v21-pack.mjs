import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const required = [
  'START_HERE.md','CODEX_INSTRUCTIONS.txt','APPLICATION_MANIFEST.json',
  'SUNSCAR_GAMEPLAY_COMPLETION_V21.md','FROSTMARCH_REGION_V21.md','REGION_CONTENT_PIPELINE_V21.md','SETTLEMENT_WIRING_V21.md','V21_API_NAMES_TO_MERGE.txt',
  'dependencies/VELDRYN_v20_LiveDungeonSunscar.zip',
  'files/backend/src/server/content/region-gameplay-v21.ts',
  'files/backend/src/server/content/sunscar-depth-v21.ts',
  'files/backend/src/server/content/frostmarch-region-v21.ts',
  'files/backend/src/server/content/frostmarch-dungeons-v21.ts',
  'files/backend/src/server/content/frostmarch-gameplay-v21.ts',
  'files/backend/src/server/content/region-content-publisher-v21.ts',
  'files/backend/src/server/content/region-content-admin-v21.ts',
  'files/backend/src/server/content/region-v21.test.ts',
  'files/backend/supabase/migrations/20260914_034_region_depth_frostmarch_v21.sql',
  'files/apps/mobile/src/core/region-content-v21.ts',
  'files/apps/mobile/src/components/FrostmarchRegionPanel.tsx',
  'files/apps/mobile/src/components/RegionalJournalPanel.tsx',
  'files/apps/mobile/tests/region-content-v21.ts',
  'files/control-center/backend_integration/V21_CONTROL_WIRING.md'
];
const fail = (m) => { console.error(`FAIL: ${m}`); process.exitCode = 1; };
for (const rel of required) if (!fs.existsSync(path.join(root, rel))) fail(`missing ${rel}`);
if (process.exitCode) process.exit(process.exitCode);

const read = rel => fs.readFileSync(path.join(root, rel),'utf8');
const frost = read('files/backend/src/server/content/frostmarch-region-v21.ts');
for (const token of [
  'equipmentSetsAuthored:false','regionalWeaponsAuthored:false','regionalArmorAuthored:false',"existingSpreadsheetFrostmarchGearStatus:'draft_do_not_implement'"
]) if (!frost.includes(token)) fail(`missing deferred gear guard: ${token}`);
for (const forbidden of ['FROWPN_','FROGEAR_']) {
  const activeFiles = [];
  const walk = dir => { for (const ent of fs.readdirSync(dir,{withFileTypes:true})) { const p=path.join(dir,ent.name); if(ent.isDirectory()) walk(p); else if (/\.(ts|tsx|sql)$/.test(ent.name) && !ent.name.endsWith('.test.ts')) activeFiles.push(p); } };
  walk(path.join(root,'files'));
  if (activeFiles.some(p => fs.readFileSync(p,'utf8').includes(forbidden))) fail(`obsolete gear id ${forbidden} found in active code`);
}

const migration = read('files/backend/supabase/migrations/20260914_034_region_depth_frostmarch_v21.sql');
for (const token of [
  'alter table public.region_content_active_v21 enable row level security',
  'create policy region_content_active_read_v21',
  'activate_region_content_v21_server',
  "v.state<>'published'",
  "'side_quest','activity','achievement','collection_book','weather_rule','region_contract','boss_mastery'",
  "'region_content.activate_version'",
  "'region_content.rollback_active_version'",
  "'content.frostmarch.enabled'",
  "'content.sunscar.side_content.enabled'"
]) if (!migration.includes(token)) fail(`migration missing expected token: ${token}`);

const publisher = read('files/backend/src/server/content/region-content-publisher-v21.ts');
for (const token of ['buildSunscarRegionContentBundleV21','buildFrostmarchRegionContentBundleV21','schemaVersion:2','stagePublishActivateRegionV21']) {
  if (!publisher.includes(token)) fail(`publisher missing ${token}`);
}
const gameplay = read('files/backend/src/server/content/region-gameplay-v21.ts');
for (const token of ['RegionalSideQuestV21','RegionalActivityV21','RegionalAchievementV21','RegionalCollectionBookV21','RegionalWeatherRuleV21','RegionalContractTemplateV21','RegionalBossMasteryV21']) {
  if (!gameplay.includes(token)) fail(`gameplay schema missing ${token}`);
}

// Removed-system scan on implementation code only; historical dependency archive/docs are intentionally excluded.
const banned = [/\bplayer\s+market\b/i,/\bguild\s+procurement\b/i,/\bhybrid\s+queue\b/i,/\blive\s+echo\s+autofill\b/i];
const scan = [];
const walkScan = dir => { for (const ent of fs.readdirSync(dir,{withFileTypes:true})) { const p=path.join(dir,ent.name); if(ent.isDirectory()) walkScan(p); else if (/\.(ts|tsx|sql)$/.test(ent.name) && !ent.name.endsWith('.test.ts')) scan.push(p); } };
walkScan(path.join(root,'files'));
for (const p of scan) {
  const txt=fs.readFileSync(p,'utf8');
  for(const re of banned) if(re.test(txt)) fail(`removed system phrase ${re} found in ${path.relative(root,p)}`);
}

try {
  execFileSync('unzip',['-tqq',path.join(root,'dependencies/VELDRYN_v20_LiveDungeonSunscar.zip')],{stdio:'pipe'});
} catch { fail('v20 dependency ZIP integrity failed'); }

if (!process.exitCode) console.log('v21 pack static audit passed');
