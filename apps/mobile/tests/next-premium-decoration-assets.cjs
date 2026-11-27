const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const repo=path.resolve(__dirname,'../../..');
const manifest=JSON.parse(fs.readFileSync(path.join(repo,'premium-badge-fx-manifest.json'),'utf8'));
const expected={
  "apps/mobile/assets/ascendant/sakura/blossom_crest_256.webp": [
    256,
    33634,
    "3ebc2ec2a51ec47064a5bfdc133de61a8ad0a2d3143aee2a94c49e587061547e",
    "badge"
  ],
  "apps/mobile/assets/ascendant/sakura/blossom_crest_64.webp": [
    64,
    4266,
    "d661e074fbab6823f52a22016dbaf8161d8f468b28313c2a11c2fbb2070f22d1",
    "badge"
  ],
  "apps/mobile/assets/ascendant/stormforged/wolf_crest_256.webp": [
    256,
    30370,
    "2a35b277495510cf264244a75d124161d7426dced31e42f8d98cff8b3260a122",
    "badge"
  ],
  "apps/mobile/assets/ascendant/stormforged/wolf_crest_64.webp": [
    64,
    4018,
    "5043fe0b7948193f176d587409a3853ea0533e45c232cbb61a5426e649c1c47d",
    "badge"
  ],
  "apps/mobile/assets/ascendant/sakura/petal.webp": [
    64,
    1412,
    "8d1df2ec7e4ed843859973b8b685f162d189a179d7cf8ab21dff4721cea25a17",
    "fx"
  ],
  "apps/mobile/assets/ascendant/sakura/crest_glow.webp": [
    64,
    1188,
    "6d9a83cfc793f971846cc18e63c5bcb67114f67ee3308db02d3f2e9507d9a06b",
    "fx"
  ],
  "apps/mobile/assets/ascendant/sakura/ambient_haze.webp": [
    64,
    836,
    "6ee3ef2093e912ae479db3d4063734f2a79212872fb28b28108772571c8d6760",
    "fx"
  ],
  "apps/mobile/assets/ascendant/stormforged/lightning_arc.webp": [
    64,
    2552,
    "9cf39eeaefa5fe4c5886167d497b830620907020df6f825c9e83e71783fdc140",
    "fx"
  ],
  "apps/mobile/assets/ascendant/stormforged/crest_glow.webp": [
    64,
    1128,
    "2f7d999e6b1d77177e85c94b6a97d42cb57d288a4b9851055ea8603496c71dd1",
    "fx"
  ],
  "apps/mobile/assets/ascendant/stormforged/ambient_haze.webp": [
    64,
    808,
    "b61dc10ba97bdd68d21ffc7c138d90ffca475d5f376bc56188f5f19c16750541",
    "fx"
  ]
};
assert.deepEqual(Object.keys(manifest).sort(),Object.keys(expected).sort());
let total=0;
for(const [file,[w,size,hash,kind]] of Object.entries(expected)){
 const b=fs.readFileSync(path.join(repo,file)),m=manifest[file];total+=b.length;
 assert.equal(b.length,size);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),hash);
 assert.deepEqual([m.width,m.height,m.bytes,m.sha256,m.kind],[w,w,size,hash,kind]);
 assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.readUInt32LE(4)+8,b.length);assert.equal(b.toString('ascii',8,12),'WEBP');
 const tag=b.toString('ascii',12,16);
 if(kind==='badge'){
  assert.equal(tag,'VP8X');assert(b[20]&16);assert(!(b[20]&2));assert.equal(b.readUIntLE(24,3)+1,w);assert.equal(b.readUIntLE(27,3)+1,w);
 }else{
  assert.equal(tag,'VP8L');assert.equal(b[20],0x2f);const bits=b.readUInt32LE(21);
  assert(bits&(1<<28));assert.equal((bits&16383)+1,w);assert.equal(((bits>>>14)&16383)+1,w);
 }
 const [x0,y0,x1,y1]=m.alpha_bounds;assert(x0>=2&&y0>=2&&x1<=w-2&&y1<=w-2&&x1>x0&&y1>y0);
}
assert.equal(total,80212);
const src=path.join(repo,'apps/mobile/src'),name='next-premium-decoration-review-assets';
const registry=fs.readFileSync(path.join(src,'theme',name+'.ts'),'utf8');
for(const file of Object.keys(expected))assert(registry.includes(file.replace('apps/mobile/','../../')));
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
for(const file of walk(src)){
 if(!/\.[jt]sx?$/.test(file)||file.endsWith(name+'.ts')||file===path.join(src,'components/profile/NextPremiumShowcaseReview.tsx'))continue;
 assert(!fs.readFileSync(file,'utf8').includes(name),'review registry must remain disconnected: '+file);
}
console.log('Verified ten pinned static badge and FX textures; '+total+' bytes.');
