import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const file=resolve(root,'apps/mobile/src/theme/upgraded-artwork.ts');
const registry=readFileSync(file,'utf8');
const portraits=[...registry.matchAll(/\['(UNIT_\d{3})',require\('([^']+)'\)/g)];
assert.equal(portraits.length,24);
assert.equal(new Set(portraits.map(m=>m[1])).size,24);
for(let index=1;index<=24;index++)assert.ok(portraits.some(m=>m[1]===`UNIT_${String(index).padStart(3,'0')}`));
for(const [,id,path] of portraits){
  const data=readFileSync(resolve(dirname(file),path));
  assert.equal(data.readUInt32BE(16),512,id);
  assert.equal(data.readUInt32BE(20),512,id);
  assert.equal(data[25],6,`${id} must retain RGBA`);
}
const regions=[...registry.matchAll(/^  ([A-Z_]+):require\('([^']+)'\)/gm)];
assert.equal(regions.length,9);
for(const [,id,path] of regions)assert.ok(existsSync(resolve(dirname(file),path)),id);
const content=readFileSync(resolve(root,'apps/mobile/src/content/world-map.ts'),'utf8');
for(const [,id] of content.matchAll(/id:'([A-Z_]+)'/g))assert.ok(regions.some(m=>m[1]===id),id);
const resolver=readFileSync(resolve(root,'apps/mobile/src/theme/companion-art.ts'),'utf8');
assert.ok(resolver.indexOf('return companionPortraits.get(id)')>=0);
assert.ok(resolver.includes('eventCompanionSourceById.get(id)'));
console.log('PASS: 24 RGBA runtime portraits, 9 region scenes, and event fallback.');
