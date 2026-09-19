import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const failures=[];
const ok=(cond,msg)=>{if(!cond)failures.push(msg);};
const text=p=>fs.readFileSync(path.join(root,p),'utf8');
const exists=p=>fs.existsSync(path.join(root,p));

const required=[
  'START_HERE.md','CODEX_INSTRUCTIONS.txt','LIVE_DUNGEON_PRODUCTION_V20.md','SUNSCAR_REGION_V20.md','EQUIPMENT_SET_FRAMEWORK_V20.md','SETTLEMENT_WIRING_V20.md',
  'files/backend/supabase/migrations/20260914_032_live_dungeon_production_v20.sql',
  'files/backend/supabase/migrations/20260914_033_region_content_registry_v20.sql',
  'files/backend/src/server/content/combat-stat-contract-v20.ts',
  'files/backend/src/server/content/sunscar-region-v20.ts',
  'files/backend/src/server/content/sunscar-dungeons-v20.ts',
  'files/backend/src/server/content/region-content-publisher-v20.ts',
  'files/backend/src/server/content/region-content-admin-v20.ts',
  'dependencies/VELDRYN_v19_RegionalCrisesWorldBosses.zip'
];
for(const p of required) ok(exists(p),`missing required file: ${p}`);

const codeRoots=['files/backend','files/apps/mobile/src','files/control-center'];
const codeFiles=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else codeFiles.push(p);}}
for(const r of codeRoots){const p=path.join(root,r);if(fs.existsSync(p))walk(p);}
const active=codeFiles.filter(p=>!p.endsWith('.md')&&!p.endsWith('.test.ts')).map(p=>fs.readFileSync(p,'utf8')).join('\n').toLowerCase();
ok(!/\bmarket\b/.test(active),'active implementation contains Market');
ok(!/procurement/.test(active),'active implementation contains Procurement');
ok(!/hybrid[_ ]queue/.test(active),'active implementation contains Hybrid Queue');
ok(!/echo[-_ ]pilot/.test(active),'active implementation contains Echo pilot terminology');
ok(!/liveechoautofill\s*:\s*true/.test(active),'Live Echo autofill enabled');

const sun=text('files/backend/src/server/content/sunscar-region-v20.ts');
for(const needle of ['equipmentSetsAuthored:false','regionalWeaponsAuthored:false','regionalArmorAuthored:false','SUNSCAR_ECHO_CONDITIONS_V20','SUNSCAR_RELIC_HOOKS_V20','SUNSCAR_COLLECTIBLE_UNLOCKS_V20']) ok(sun.includes(needle),`Sunscar content missing ${needle}`);
const set=text('files/backend/src/server/content/combat-stat-contract-v20.ts');
ok(set.includes('resolveActiveSetBonusesV20'),'set-bonus resolver missing');
ok(set.includes("threePiece:'+2% Crit Chance'"),'partial 3pc Crit example missing');
ok(set.includes('3+2 mixed-set combinations'),'mixed-set design guard missing');

const sql32=text('files/backend/supabase/migrations/20260914_032_live_dungeon_production_v20.sql');
const tableNames=[...sql32.matchAll(/create table if not exists public\.([a-zA-Z0-9_]+)/g)].map(m=>m[1]);
for(const table of tableNames) ok(sql32.includes(`alter table public.${table} enable row level security;`),`RLS not enabled: ${table}`);
ok(sql32.includes('is_live_dungeon_match_member_v20'),'non-recursive match membership helper missing');
ok(sql32.includes('is_live_dungeon_run_member_v20'),'run membership helper missing');
ok(!sql32.includes('using(exists(select 1 from public.live_dungeon_match_members me where me.match_id=live_dungeon_match_members.match_id'),'recursive match-member RLS pattern remains');
ok(sql32.includes('Individual member responses') || sql32.includes('Individual member response'),'ready generation concurrency note missing');
ok(sql32.includes('return v_match.state_version; -- idempotent retry of the same response'),'Ready retry idempotency missing');
ok(sql32.includes('renew_live_dungeon_account_slot_server'),'slot lease renewal RPC missing');

const sql33=text('files/backend/supabase/migrations/20260914_033_region_content_registry_v20.sql');
for(const table of [...sql33.matchAll(/create table if not exists public\.([a-zA-Z0-9_]+)/g)].map(m=>m[1])) ok(sql33.includes(`alter table public.${table} enable row level security;`),`RLS not enabled: ${table}`);
ok(sql33.includes("'echo_condition','relic','collectible_unlock','live_dungeon','dungeon_node'"),'region record types incomplete');
ok(sql33.includes('before update or delete on public.region_content_manifests_v20'),'published manifest delete guard missing');
ok(sql33.includes("v_old_state in ('published','retired')"),'old published record mutation guard missing');

try{execFileSync('unzip',['-t',path.join(root,'dependencies/VELDRYN_v19_RegionalCrisesWorldBosses.zip')],{stdio:'ignore'});}catch{failures.push('v19 dependency ZIP failed integrity test');}

if(failures.length){console.error('v20 pack verification FAILED');for(const f of failures)console.error(`- ${f}`);process.exit(1);}
console.log(`v20 pack verification passed (${required.length} required files; ${tableNames.length} live-dungeon tables checked)`);
