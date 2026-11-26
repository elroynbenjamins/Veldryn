const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const repo=path.resolve(__dirname,'../../..');
const manifest={...JSON.parse(fs.readFileSync(path.join(repo,'frame-candidate-manifest.json'),'utf8')),...JSON.parse(fs.readFileSync(path.join(repo,'sakura-v2-frame-manifest.json'),'utf8')),...JSON.parse(fs.readFileSync(path.join(repo,'stormforged-v2-frame-manifest.json'),'utf8'))};
const expected={
 'apps/mobile/assets/ascendant/stormforged/steel_crown_v2.webp':[1020,615,119716,'3c2774af8bda91a3a7fbc3e6cb850bb397d34f61d7ad40a5becdc03a8f46492f'],
 'apps/mobile/assets/ascendant/stormforged/steel_crown_v2_standard.webp':[1024,576,116826,'2216104f3aea5b35beedb7bab30fd8a2e425019c89a09b4010f36c6032b624de'],
 'apps/mobile/assets/ascendant/sakura/blossom_crown_v2.webp':[1020,615,157670,'6fc85ad5d157d82a5501f8fc1a7b707b51674e1a2f0490253589b9777fed81d2'],
 'apps/mobile/assets/ascendant/sakura/blossom_crown_v2_standard.webp':[1024,576,155624,'6844f2520245c5cda5f6cf6efb3f5508865010b675035a8c051a692ab71427d5'],
 'apps/mobile/assets/ascendant/sakura/blossom_crown.webp':[1020,615,49848,'f783df154c2366a125cdfa358563ff5bafb8e8b71541d3fb79a96b64e4bfb330'],
 'apps/mobile/assets/ascendant/sakura/blossom_crown_standard.webp':[1024,576,48290,'dbb03de1e6084f1f827e6037b71438955c221fa686c96fc14b870b18c47c6b83'],
 'apps/mobile/assets/ascendant/stormforged/steel_crown.webp':[1020,615,39618,'0ba01e95a188035d73ab284dfdde931d032ca7a08cb3df67ced1bf0dbf27467c'],
 'apps/mobile/assets/ascendant/stormforged/steel_crown_standard.webp':[1024,576,37986,'d957eecc1fe2ba01e474db84cb200133eb89b7d7da795c2745d4bf4e0f935608'],
};
assert.deepEqual(Object.keys(manifest).sort(),Object.keys(expected).sort());
let total=0;
for(const [file,[w,h,size,hash]] of Object.entries(expected)){
 const b=fs.readFileSync(path.join(repo,file)),m=manifest[file];
 assert.equal(b.length,size);total+=b.length;
 assert.equal(crypto.createHash('sha256').update(b).digest('hex'),hash);
 assert.deepEqual([m.width,m.height,m.bytes,m.sha256],[w,h,size,hash]);
 assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.readUInt32LE(4)+8,b.length);
 assert.equal(b.toString('ascii',8,12),'WEBP');assert.equal(b.toString('ascii',12,16),'VP8X');
 assert(b[20]&16,'alpha flag required');
 assert.equal(b.readUIntLE(24,3)+1,w);assert.equal(b.readUIntLE(27,3)+1,h);
 assert(!(b[20]&2),'static texture, motion is native');
}
assert.equal(total,725578);
const src=path.join(repo,'apps/mobile/src');
const registry=fs.readFileSync(path.join(src,'theme/next-premium-frame-review-assets.ts'),'utf8');
for(const file of Object.keys(expected).filter(f=>!f.endsWith('/sakura/blossom_crown.webp')&&!f.endsWith('/sakura/blossom_crown_standard.webp')&&!f.endsWith('/stormforged/steel_crown.webp')&&!f.endsWith('/stormforged/steel_crown_standard.webp')))assert(registry.includes(file.replace('apps/mobile/','../../')));
for(const old of ['sakura/blossom_crown.webp','sakura/blossom_crown_standard.webp','stormforged/steel_crown.webp','stormforged/steel_crown_standard.webp'])assert(!registry.includes(old));
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
for(const file of walk(src)){
 if(file===path.join(src,'components/profile/NextPremiumShowcaseReview.tsx'))continue;
 if(!/\.[jt]sx?$/.test(file)||file.endsWith('next-premium-frame-review-assets.ts'))continue;
 assert(!fs.readFileSync(file,'utf8').includes('next-premium-frame-review-assets'),'review registry must remain disconnected: '+file);
}
console.log('Eight pinned next-premium review textures verified; '+total+' bytes; no production imports.');
