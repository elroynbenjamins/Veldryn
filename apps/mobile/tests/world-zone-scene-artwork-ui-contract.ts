export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const worldMap=read('src/content/world-map.ts');
const scene=read('src/components/ZoneSceneArtwork.tsx');
const world=read('src/screens/WorldScreen.tsx');
const skills=read('src/screens/SkillsScreen.tsx');

const ids=['GREENFIELDS','SILVERBROOK','IRONWOOD','OLD_MINES','KINGS_ROAD','SUNSCAR','FROSTMARCH','ASHLANDS'];
const upgraded=read('src/theme/upgraded-artwork.ts');
for(const id of ids)ok(upgraded.includes(id+':require('),'Missing dedicated panorama for '+id);
ok(scene.includes('regionScenes[regionId]'),'Scenes must use upgraded panoramas');
ok(scene.includes(':<RegionArtwork regionId={regionId}/>'),'Unmapped future zones must keep map artwork fallback');
ok(scene.includes('muted&&s.muted'),'Unavailable regions must retain muted treatment');
ok(scene.includes('resizeMode="cover"'),'Panoramas must fill cards without stretching');
ok(world.includes('<ZoneSceneArtwork regionId={current.id}/>'),'Current region card must use scenic artwork');
ok(world.includes('<ZoneSceneArtwork regionId={zone.id} muted={!unlocked}/>'),'Travel destinations must use scenic artwork');
const regionalGathering=skills.split("if(mode==='gathering'&&initialSkill==='regional-gathering'){")[1]?.split("if(mode==='crafting'")[0]??'';
ok(!regionalGathering.includes('<DetailBack'), 'Current-region gathering should not show a redundant All skills back button');
ok(regionalGathering.includes('<ZoneSceneArtwork regionId={region.id}/>'), 'Current-region gathering header must display the region panorama');
ok(skills.split('<ZoneSceneArtwork regionId={region.id}/>').length===3, 'Both regional and individual gathering pages must show the region panorama');
ok(skills.includes('style={s.regionShade}'), 'Region panorama needs a legible text overlay');
ok(upgraded.includes("IRONWOOD:require('../../assets/world/regions-v2/ironwood-forest-pixel-v1.jpg')"), 'Ironwood Forest scene must resolve to bundled artwork');
ok(ids.every(id=>worldMap.includes("id:'"+id+"'")),'Scenic atlas must cover every current travel-region id');
console.log('PASS: every current world region has scenic travel artwork with a safe future-zone fallback');
