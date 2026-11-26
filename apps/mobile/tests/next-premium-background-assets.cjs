const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const repo=path.resolve(__dirname,'../../..');
const manifest=JSON.parse(fs.readFileSync(path.join(repo,'sakura-background-manifest.json'),'utf8'));
const expected={
 'apps/mobile/assets/ascendant/sakura/petal_sanctuary.webp':[1020,615,182402,'5c0f5373ce7fdd594201d51103f364d4c47d16240838f34e97388a0d11875617'],
 'apps/mobile/assets/ascendant/sakura/petal_sanctuary_square.webp':[512,512,99220,'06dce1e514c8ff70604420e01c66ca75994942b369fde03c17bf65e2b7a30ca0'],
};
assert.deepEqual(Object.keys(manifest).sort(),Object.keys(expected).sort());
let total=0;
for(const [file,[w,h,size,hash]] of Object.entries(expected)){
 const b=fs.readFileSync(path.join(repo,file)),m=manifest[file];total+=b.length;
 assert.equal(b.length,size);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),hash);
 assert.deepEqual([m.width,m.height,m.bytes,m.sha256],[w,h,size,hash]);
 assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.readUInt32LE(4)+8,b.length);
 assert.equal(b.toString('ascii',8,12),'WEBP');assert.equal(b.toString('ascii',12,16),'VP8 ');
 assert.deepEqual([...b.subarray(23,26)],[157,1,42]);
 assert.equal(b.readUInt16LE(26)&0x3fff,w);assert.equal(b.readUInt16LE(28)&0x3fff,h);
}
assert.equal(total,281622);
const src=path.join(repo,'apps/mobile/src'),name='next-premium-background-review-assets';
const registry=fs.readFileSync(path.join(src,'theme',name+'.ts'),'utf8');
for(const file of Object.keys(expected))assert(registry.includes(file.replace('apps/mobile/','../../')));
assert(!registry.includes('thunderkeep.webp'));
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
for(const file of walk(src)){
 if(!/\.[jt]sx?$/.test(file)||file.endsWith(name+'.ts'))continue;
 assert(!fs.readFileSync(file,'utf8').includes(name),'review registry must remain disconnected: '+file);
}
console.log('Verified two pinned Sakura background textures; '+total+' bytes; no production imports.');
