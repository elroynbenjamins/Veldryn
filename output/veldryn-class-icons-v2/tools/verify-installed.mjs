import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const app=path.resolve(root,'../../apps/mobile');
const manifest=JSON.parse(await fs.readFile(path.join(root,'asset-manifest.json'),'utf8'));
let checked=0;
for(const a of manifest.assets)for(const v of a.variants)for(const f of v.files){
  const installed=await fs.readFile(path.join(app,'assets/class-emblems-v2',f.file.replace(/^assets\//,'')));
  assert.equal(crypto.createHash('sha256').update(installed).digest('hex'),f.sha256,f.file);
  checked++;
}
const registry=await fs.readFile(path.join(app,'src/theme/class-emblem-assets.ts'),'utf8');
assert.equal(registry.trim(),(await fs.readFile(path.join(root,'integration/class-emblem-assets.ts'),'utf8')).trim());
const aliases=await fs.readFile(path.join(app,'src/theme/character-assets.ts'),'utf8');
assert.ok(aliases.includes('classEmblemArtwork as classArtwork'));
assert.ok(aliases.includes('classEmblemIconArtwork as classIconArtwork'));
const character=await fs.readFile(path.join(app,'src/screens/CharacterScreen.tsx'),'utf8');
assert.ok(character.includes('classIconArtwork as classArtwork'));
const report={status:'PASS',installedPngs:checked,registry:'PASS',consumerMappings:'PASS'};
await fs.writeFile(path.join(root,'qa/installed.json'),JSON.stringify(report,null,2)+'\n');
console.log(report);
