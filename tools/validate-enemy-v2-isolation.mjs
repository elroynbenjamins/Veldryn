#!/usr/bin/env node
/**
 * Enemies & Bosses 2.0 isolation guard.
 *
 * Existing dungeons must remain legacy until the coordinated 2.0 release.
 * This deliberately fails if the opt-in 2.0 prototype is imported by live
 * server/mobile gameplay or accidentally activated in a production path.
 *
 * When 2.0 becomes launch-ready, replace this guard with a versioned
 * authoritative encounter migration + frozen-run compatibility gate.
 */
import {readFileSync, readdirSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const runtimeRoots=[
  'backend/src/server',
  'backend/online',
  'apps/mobile/src',
  'apps/mobile/App.tsx',
];
const allowedPrototypePaths=new Set([
  'backend/src/server/combat/enemy-v2-prototype.ts',
  'backend/src/server/combat/boss-v2-asterfall-prototype.ts',
  'backend/src/server/combat/boss-v2-regional-prototype.ts',
]);
const sourceExtensions=/\.(?:ts|tsx|js|jsx|mjs|cjs)$/;
const patterns=[
  /\bprepareEnemyV2\b/,
  /\bprepareAsterfallBossV2\b/,
  /\bprepareRegionalBossV2\b/,
  /\bENEMY_V2_RULESET\b/,
  /['"]enemy-v2-prototype['"]/,
  /['"]boss-v2-asterfall-prototype['"]/,
  /\benemy-v2-prototype\b/,
  /\bboss-v2-asterfall-prototype\b/,
  /\bboss-v2-regional-prototype\b/,
];
const failures=[];
let checked=0;
function walk(relative){
  const absolute=join(root,relative);
  if(relative.includes('/__tests__/')||relative.includes('/tests/')||
     allowedPrototypePaths.has(relative))return;
  const statOrFile=relative.endsWith('.tsx')||relative.endsWith('.ts')||relative.endsWith('.js');
  if(statOrFile){
    if(!sourceExtensions.test(relative))return;
    checked++;
    const source=readFileSync(absolute,'utf8');
    if(patterns.some(pattern=>pattern.test(source)))failures.push(relative);
    return;
  }
  for(const entry of readdirSync(absolute,{withFileTypes:true})){
    if(entry.name==='node_modules'||entry.name==='dist'||entry.name.startsWith('.'))continue;
    const child=`${relative}/${entry.name}`;
    if(entry.isDirectory())walk(child);
    else if(entry.isFile()&&sourceExtensions.test(entry.name))walk(child);
  }
}
for(const target of runtimeRoots)walk(target);
if(failures.length){
  console.error('FAIL: Enemy 2.0 prototype referenced from active gameplay paths:');
  failures.forEach(path=>console.error(' - '+path));
  process.exitCode=1;
}else console.log(`PASS: Enemy 2.0 stays isolated from ${checked} active gameplay source files; current dungeons unchanged`);
