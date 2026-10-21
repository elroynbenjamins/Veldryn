const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const art=read('src/theme/event-collectible-assets-active.ts');
const editor=read('src/components/ProfileEditor.tsx');
for(const [id,file] of [['EVT_PET_013','EVT_PET_013_Gloomkin.png'],['EVT_PET_014','EVT_PET_014_Lantern_Mimic.png']]){
 assert.ok(art.includes(`'${id}',require('../../assets/event_collectibles/veilbreak/pets/${file}')`),`${id} uses its Android-safe profile-gallery PNG`);
 assert.ok(fs.statSync(path.join(root,'assets/event_collectibles/veilbreak/pets',file)).size>100_000,`${id} PNG artwork exists`);
}
assert.ok(editor.includes('petArtSource(row.id)'),'Profile pets resolve artwork through the shared registry');
assert.ok(editor.includes('style={s.petImage}'),'Profile pet artwork uses an explicit visible image box');
console.log('PASS: Veilbreak profile pets resolve Android-safe artwork in the customization gallery');
