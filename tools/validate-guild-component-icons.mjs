import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=fs.readFileSync(path.join(root,'apps/mobile/src/theme/guild-upgrade-component-art.ts'),'utf8');
const icons=[
 ['GUILD_REINFORCED_TIMBER','guild_reinforced_timber.png'],
 ['GUILD_MASONS_KEYSTONE','guild_masons_keystone.png'],
 ['GUILD_FORGED_RIVETS','guild_forged_rivets.png'],
 ['GUILD_BANNERWEAVE','guild_bannerweave.png'],
 ['GUILD_HERALDIC_DYE','guild_heraldic_dye.png'],
 ['GUILD_SEAL_WAX','guild_seal_wax.png'],
 ['GUILD_FORTIFICATION_HINGES','guild_fortification_hinges.png'],
 ['GUILD_BEACON_OIL','guild_beacon_oil.png'],
];
const signature=Buffer.from([137,80,78,71,13,10,26,10]);
for(const [key,name] of icons){
 assert.match(file,new RegExp('\\b'+key+'\\s*:'),'registry includes '+key);
 assert.ok(file.includes('guild-components/'+name),'static Metro require for '+name);
 const bytes=fs.readFileSync(path.join(root,'apps/mobile/assets/guild-components',name));
 assert.ok(bytes.subarray(0,8).equals(signature),'PNG signature: '+name);
 assert.equal(bytes.readUInt32BE(16),96,'optimized asset width: '+name);
 assert.equal(bytes.readUInt32BE(20),96,'optimized asset height: '+name);
 assert.equal(bytes[25],3,'paletted PNG expected: '+name);
 assert.ok(bytes.includes(Buffer.from('tRNS')),'transparent PNG expected: '+name);
}
assert.equal((file.match(/require\('\.\.\/\.\.\/assets\/guild-components\//g)||[]).length,icons.length,'each icon required exactly once');
console.log('PASS: 8 guild-only component ids have valid transparent PNG assets and static Metro requires');
