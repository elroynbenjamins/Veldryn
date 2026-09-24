export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const worldMap=read('src/content/world-map.ts');
const scene=read('src/components/ZoneSceneArtwork.tsx');
const world=read('src/screens/WorldScreen.tsx');

const ids=['GREENFIELDS','SILVERBROOK','IRONWOOD','OLD_MINES','KINGS_ROAD','SUNSCAR','FROSTMARCH','ASHLANDS'];
for(const id of ids)ok(scene.includes(id+':{column:'),'Missing scenic zone artwork mapping for '+id);
ok(scene.includes("require('../../assets/world/world-zone-scenes-v1.jpg')"),'World scene atlas must be bundled');
ok(scene.includes("const future=regionId==='VEILLANDS'"),'Future-zone scene fallback must recognize Veillands explicitly');
ok(scene.includes('<RegionArtwork regionId={regionId} muted={muted}/>'),'Future zones must keep the world-map fallback');
ok(scene.includes('futureWash')&&scene.includes('futureHaze'),'Future-zone previews must receive a distinct muted concept-art treatment');
ok(scene.includes('Math.max(size.width/ZONE_SCENE_CELL_WIDTH,size.height/ZONE_SCENE_CELL_HEIGHT)'),'Scene atlas must crop responsively without stretching its cell');
ok(world.includes('<ZoneSceneArtwork regionId={current.id}/>'),'Current region card must use scenic artwork');
ok(world.includes('<ZoneSceneArtwork regionId={zone.id} muted={!unlocked}/>'),'Travel destinations must use scenic artwork');
ok(ids.every(id=>worldMap.includes("id:'"+id+"'")),'Scenic atlas must cover every current travel-region id');
console.log('PASS: every current world region has scenic travel artwork with a safe future-zone fallback');
