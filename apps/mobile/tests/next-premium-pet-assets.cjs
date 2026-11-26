const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const repo=path.resolve(__dirname,'../../..');
const manifest={...JSON.parse(fs.readFileSync(path.join(repo,'sakura-pet-manifest.json'),'utf8')),...JSON.parse(fs.readFileSync(path.join(repo,'stormforged-pet-manifest.json'),'utf8'))};
const expected={
 'apps/mobile/assets/ascendant/stormforged/direwolf_512.webp':[512,75950,'49fd4863e8dfdf9e32d2ce4267c4f14a4af12fa246bc42c78519efc7fc9f6699'],
 'apps/mobile/assets/ascendant/stormforged/direwolf_showcase.webp':[256,26832,'d83657c454da197c84187462cacfd276901d0fa58dcf68cf3c69004e3bb95b51'],
 'apps/mobile/assets/ascendant/stormforged/direwolf_96.webp':[96,6244,'bfd70c6a6c1d8a0d5229d71589d3e8bd5105a5475da5cef3845f43ab8814d8de'],
 'apps/mobile/assets/ascendant/stormforged/direwolf_idle_atlas.webp':[768,236688,'f2551859deeca2001f211c62b213c0ae676c8d49c2c3e4d88bd1ae1b43f55188'],
 'apps/mobile/assets/ascendant/sakura/spirit_fox_512.webp':[512,82020,'478fa94be496602bdb96f9bb68caacf6532d6298c5f788ced49f579ff8128813'],
 'apps/mobile/assets/ascendant/sakura/spirit_fox_showcase.webp':[256,28470,'c1ced2fa925b198211ce95304c1f61a2fad56e1219ae560ba98fccbb3ed754f0'],
 'apps/mobile/assets/ascendant/sakura/spirit_fox_96.webp':[96,6762,'9ca7008b53aa1cb2b7f24a35835fd4ee49811cc86481c18b7a3ec26afe4e623e'],
 'apps/mobile/assets/ascendant/sakura/spirit_fox_idle_atlas.webp':[768,249976,'2d2b8ec3e7acaef94e9057cf98880a140b3113d04d0fb3bf78caf164e2ea0f92'],
};
assert.deepEqual(Object.keys(manifest).sort(),Object.keys(expected).sort());
let total=0;
for(const [file,[w,size,hash]] of Object.entries(expected)){
 const b=fs.readFileSync(path.join(repo,file)),m=manifest[file];total+=b.length;
 assert.equal(b.length,size);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),hash);
 assert.deepEqual([m.width,m.height,m.bytes,m.sha256],[w,w,size,hash]);
 assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.readUInt32LE(4)+8,b.length);
 assert.equal(b.toString('ascii',8,12),'WEBP');assert.equal(b.toString('ascii',12,16),'VP8X');
 assert(b[20]&16);assert(!(b[20]&2));assert.equal(b.readUIntLE(24,3)+1,w);assert.equal(b.readUIntLE(27,3)+1,w);
 if(file.endsWith('_atlas.webp')){
  assert.deepEqual([m.frames,m.columns,m.rows,m.cell_width,m.cell_height,m.fps,m.unique_decoded_frames],[36,6,6,128,128,12,36]);
  assert.equal(m.cell_alpha_bounds.length,36);
  for(const [x0,y0,x1,y1] of m.cell_alpha_bounds)assert(x0>=6&&y0>=6&&x1<=122&&y1<=122&&x1>x0&&y1>y0);
 }
}
assert.equal(total,712942);
const src=path.join(repo,'apps/mobile/src'),name='next-premium-pet-review-assets';
const registry=fs.readFileSync(path.join(src,'theme',name+'.ts'),'utf8');
for(const file of Object.keys(expected))assert(registry.includes(file.replace('apps/mobile/','../../')));

function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
for(const file of walk(src)){
 if(file===path.join(src,'components/profile/NextPremiumShowcaseReview.tsx')||file===path.join(src,'theme/ultra-luxe-candidate-art.ts'))continue;
 if(!/\.[jt]sx?$/.test(file)||file.endsWith(name+'.ts'))continue;
 assert(!fs.readFileSync(file,'utf8').includes(name),'review registry must remain confined to approved render adapters: '+file);
}
console.log('Verified eight pinned premium pet textures and manifest bounds; '+total+' bytes; only approved rendering adapter imports.');
