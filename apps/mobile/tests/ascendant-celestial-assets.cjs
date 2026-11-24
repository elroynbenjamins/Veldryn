const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'../assets/ascendant/celestial');
const files=[
 'celestial_background_wide.webp',
 'celestial_border.webp',
 'celestial_pet_showcase.webp',
 'celestial_orrery.webp',
 'celestial_star.webp',
 'celestial_corona.webp',
 'celestial_fallback_glow.webp',
 'aetherion_runtime.webp',
 'sovereign_badge_32.webp',
 'sovereign_badge_64.webp',
];
let total=0;
for(const name of files){
 const file=path.join(root,name);
 assert(fs.existsSync(file),`Missing Celestial asset: ${name}`);
 const bytes=fs.readFileSync(file);
 assert(bytes.length>64,`Empty or truncated Celestial asset: ${name}`);
 assert.equal(bytes.subarray(0,4).toString('ascii'),'RIFF',`Not a RIFF WebP: ${name}`);
 assert.equal(bytes.subarray(8,12).toString('ascii'),'WEBP',`Not a WebP: ${name}`);
 assert.equal(bytes.readUInt32LE(4)+8,bytes.length,`Incorrect RIFF length: ${name}`);
 let offset=12,hasImage=false;
 while(offset+8<=bytes.length){
  const chunk=bytes.toString('ascii',offset,offset+4),length=bytes.readUInt32LE(offset+4);
  offset+=8+length+(length%2);
  assert(offset<=bytes.length,`Truncated WebP chunk: ${name}/${chunk}`);
  if(chunk==='VP8 '||chunk==='VP8L')hasImage=true;
 }
 assert.equal(offset,bytes.length,`Unexpected trailing WebP bytes: ${name}`);
 assert(hasImage,`Missing WebP image payload: ${name}`);
 assert(bytes.length<128*1024,`Runtime asset exceeds 128 KiB budget: ${name}`);
 total+=bytes.length;
}
assert(total<256*1024,`Celestial runtime pack exceeds 256 KiB budget: ${total} bytes`);
const registry=fs.readFileSync(path.join(__dirname,'../src/theme/celestial-integration-assets.ts'),'utf8');
const borderRegistry=fs.readFileSync(path.join(__dirname,'../src/theme/profile-border-assets.ts'),'utf8');
for(const name of files.filter(name=>!name.endsWith('_32.webp'))){
 const source=registry;
 assert(source.includes(name),`Runtime asset is not statically referenced: ${name}`);
}
assert(registry.includes("celestial_border.webp"),'Ascendant stage must keep its custom 340x205 border');
assert(borderRegistry.includes('celestial.scene.border')||borderRegistry.includes('celestial_border_standard.webp'),'ordinary profile frame must resolve to verified artwork');
assert(registry.includes('return BUNDLE'),'Celestial artwork must remain renderable for profiles of explicitly granted owners');
console.log(`Celestial assets: ${files.length} WebPs, ${total} bytes, public rendering available; wardrobe visibility remains ownership-gated.`);
