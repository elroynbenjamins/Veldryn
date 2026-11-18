'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('activity icon resolver uses the persisted recipe profession, not generic processing artwork',()=>{
 const resolver=read('src/core/activity-icon.ts');
 assert.match(resolver,/RECIPES\.map\(recipe=>\[recipe\.id,recipe\.skillId\]\)/);
 assert.match(resolver,/kind==='processing'\|\|kind==='alchemy'/);
 assert.match(resolver,/recipeSkillById\.get\(targetId\)/);
 assert.doesNotMatch(resolver,/kind==='processing'\?'cooking'/);
});

test('smithing, tailoring and cooking recipes have distinct skill artwork',()=>{
 const components=read('src/content/cross-profession-components.ts');
 const skills=read('src/content/skills.ts');
 const art=read('src/theme/skill-assets.ts');
 assert.match(components,/id:'FORGE_REINFORCED_BUCKLES',name:'Forge Reinforced Buckles',skillId:'smithing'/);
 assert.match(components,/id:'STITCH_PADDED_LININGS',name:'Stitch Padded Linings',skillId:'tailoring'/);
 assert.match(skills,/id:'COOK_MEADOW_PERCH',name:'Cook Meadow Perch',skillId:'cooking'/);
 for(const skill of ['smithing','tailoring','cooking','alchemy','enchanting']){
  assert.match(art,new RegExp(skill+":require\\('\\.\\./\\.\\./assets/activity-icons-v1/"+skill+"\\.webp'\\)"));
 }
});

test('current activity, running bar and stopped bar all use the shared resolver',()=>{
 const home=read('src/components/HomeActivityFocus.tsx');
 const bar=read('src/components/ActiveActivityBar.tsx');
 assert.match(home,/const iconId=activityIconId\(activity\)/);
 assert.match(bar,/props\.state\.activity\?activityIconId\(props\.state\.activity\):'combat'/);
 assert.match(bar,/<ActivityArtwork id=\{activityIconId\(activity\)\} size=\{30\}\/>/);
 assert.doesNotMatch(home,/kind==='processing'\?'cooking'/);
 assert.doesNotMatch(bar,/kind==='processing'\?'cooking'/);
});
