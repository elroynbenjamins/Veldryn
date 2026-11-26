const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'../assets/ascendant/celestial');
const registry=fs.readFileSync(path.join(__dirname,'../src/theme/celestial-integration-assets.ts'),'utf8');
const borderRegistry=fs.readFileSync(path.join(__dirname,'../src/theme/profile-border-assets.ts'),'utf8');
const draconicRegistry=fs.readFileSync(path.join(__dirname,'../src/theme/draconic-integration-assets.ts'),'utf8');
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
function verifyWebp(file,name,budget=128*1024){
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
 assert(bytes.length<budget,`Runtime asset exceeds budget: ${name}`);
 return bytes.length;
}
for(const name of files)total+=verifyWebp(path.join(root,name),name);
assert(total<256*1024,`Celestial runtime pack exceeds 256 KiB budget: ${total} bytes`);
for(const name of files.filter(name=>!name.endsWith('_32.webp'))){
 const source=registry;
 assert(source.includes(name),`Runtime asset is not statically referenced: ${name}`);
}
assert(registry.includes("celestial_border.webp"),'Ascendant stage must keep its custom 340x205 border');
assert(borderRegistry.includes('celestial.scene.border')||borderRegistry.includes('celestial_border_standard.webp'),'ordinary profile frame must resolve to verified artwork');
assert(registry.includes('return BUNDLE'),'Celestial artwork must remain renderable for profiles of explicitly granted owners');
// Every newly enabled static art reference must also pass structural validation.
const assetRoot=path.join(root,'..');
for(const name of ['celestial_crown','draconic_ruby'])verifyWebp(path.join(assetRoot,'shared',name+'.webp'),name,8*1024);
for(const source of [registry,borderRegistry,draconicRegistry]){
 for(const match of source.matchAll(/require\(['"]\.\.\/\.\.\/assets\/ascendant\/([^'"]+\.webp)['"]\)/g)){
  const name=match[1];verifyWebp(path.join(assetRoot,name),name,name.includes('_smooth_pose_atlas')?512*1024:128*1024);
 }
}
console.log(`Celestial assets: ${files.length} WebPs, ${total} bytes, public rendering available; wardrobe visibility remains ownership-gated.`);
