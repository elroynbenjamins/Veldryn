const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const raidScreen=fs.readFileSync(path.join(root,'src/components/GuildRaidEncounter.tsx'),'utf8');
const presentation=fs.readFileSync(path.join(root,'src/core/guild-pve-encounters.ts'),'utf8');
const theater=fs.readFileSync(path.join(root,'src/components/GuildRaidTheater.tsx'),'utf8');

for(const [key,name] of [
 ['guild_fallen_oathbreaker','fallen_oathbreaker'],
 ['guild_granite_moss_troll','granite_moss_troll'],
 ['guild_veilbound_revenant','veilbound_revenant'],
]){
 // assets sit at apps/mobile/assets, relative to the test's parent root.
 const realFile=path.join(root,'assets','guild-bosses',name+'.webp');
 assert.ok(fs.existsSync(realFile),'Missing weekly guild boss art: '+name);
 const buf=fs.readFileSync(realFile);
 assert.ok(buf.length>30000&&buf.length<160000,'Boss art should be optimized but legible: '+name);
 assert.equal(buf.toString('ascii',0,4),'RIFF','RIFF header: '+name);
 assert.equal(buf.toString('ascii',8,12),'WEBP','WebP header: '+name);
 assert.equal(buf.toString('ascii',12,16),'VP8X','Extended WebP with transparency: '+name);
 assert.ok((buf[20]&0x10)!==0,'Transparent alpha channel: '+name);
 assert.equal(1+buf.readUIntLE(24,3),384,'Width: '+name);
 assert.equal(1+buf.readUIntLE(27,3),480,'Height: '+name);
 assert.ok(raidScreen.includes(key+':require(\'../../assets/guild-bosses/'+name+'.webp\')'),'Static Metro require for '+name);
 assert.ok(presentation.includes("visualKey:'"+key+"'"),'Weekly presentation uses '+key);
}
assert.ok(raidScreen.includes("source={bossArt[presentation.visualKey]}"),'Raid card must show the selected artwork');
assert.ok(raidScreen.includes("bossArt={bossArt[presentation.visualKey]}"),'Fight theater must use the same selected boss artwork');
assert.ok(theater.includes('source={bossArt}'),'Fight theater must render its provided boss art');
assert.ok(presentation.includes("if(row.eventId?.startsWith('EVT_ANNUAL_010'))"),'Event boss visual identity stays independent');
assert.ok(raidScreen.includes("veilbreak:require('../../assets/monsters/oathglass_revenant.webp')"),'Seasonal veil artwork is preserved');
console.log('PASS three original transparent 384x480 Guild Boss artworks, Metro imports and combat theater parity');
