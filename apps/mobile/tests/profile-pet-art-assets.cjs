const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const art=read('src/theme/event-collectible-assets-active.ts');
const editor=read('src/components/ProfileEditor.tsx');
// Artwork was losslessly repackaged as runtime WebP in the November asset pass.
// Keep checking the live import, real binary format and non-placeholder size.
for(const [id,file] of [['EVT_PET_013','EVT_PET_013_Gloomkin.webp'],['EVT_PET_014','EVT_PET_014_Lantern_Mimic.webp']]){
 assert.ok(art.includes(`'${id}',require('../../assets/event_collectibles/veilbreak/pets/${file}')`),`${id} uses its Android-safe profile-gallery WebP`);
 const icon=fs.readFileSync(path.join(root,'assets/event_collectibles/veilbreak/pets',file));
 assert.ok(icon.length>10_000,`${id} WebP artwork exists and is not a tiny placeholder`);
 assert.equal(icon.toString('ascii',0,4),'RIFF',`${id} has a RIFF container`);
 assert.equal(icon.toString('ascii',8,12),'WEBP',`${id} has WebP image data`);
}
assert.ok(editor.includes('petArtSource(row.id)'),'Profile pets resolve artwork through the shared registry');
assert.ok(editor.includes('style={s.petImage}'),'Profile pet artwork uses an explicit visible image box');
console.log('PASS: Veilbreak profile pets resolve optimized Android-safe WebP artwork in the customization gallery');
