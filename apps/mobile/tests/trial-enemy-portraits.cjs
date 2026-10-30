const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const trials=read('../../backend/src/server/companions/trials.ts');
const content=read('../../backend/src/server/companions/content.ts');
const art=read('src/theme/trial-enemy-portraits.ts');
const expected=[...trials.matchAll(/bossName:'([^']+)'/g)].map(row=>row[1]);
const profiles=trials.slice(trials.indexOf('const prefix:'),trials.indexOf('const [guard,striker,adept]'));
expected.push(...[...profiles.matchAll(/'([^']+)'/g)].map(row=>row[1]));
expected.push(...[...content.matchAll(/bossId:'([^']+)'/g)].map(row=>row[1].replaceAll('_',' ')));
const portraits=new Map([...art.matchAll(/"([^"]+)":require\('([^']+)'\)/g)].map(row=>[row[1],row[2]]));
assert.equal(new Set(portraits.values()).size,portraits.size,'Each named enemy needs a distinct portrait');
for(const name of expected){
 assert.ok(portraits.has(name),`Missing human portrait: ${name}`);
 const file=path.resolve(root,'src/theme',portraits.get(name));
 assert.ok(fs.existsSync(file),`Missing portrait asset: ${name}`);
 const bytes=fs.readFileSync(file);
 assert.equal(bytes.subarray(1,4).toString(),'PNG');
 assert.equal(bytes.readUInt32BE(16),256);
 assert.equal(bytes.readUInt32BE(20),256);
}
assert.ok(read('src/components/CompanionTrialStage.tsx').includes('trialEnemyPortrait(unit.name)'));
console.log(`PASS ${expected.length} named trial enemies have distinct 256px human portraits used by playback`);
