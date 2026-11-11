export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const map=read('src/content/world-map.ts');
const navigation=read('src/core/world-navigation.ts');
const world=read('src/screens/WorldScreen.tsx');
const chapters=read('src/components/WorldChapterNavigator.tsx');

ok(map.includes("WorldZoneAvailability='released'|'inDevelopment'"),'World zones need explicit released/development states');
ok(map.includes('developmentNote?:string'),'Future region previews need optional development copy');
ok(navigation.includes('!worldZoneInDevelopment(zone)&&zone.minLevel>level'),'In-development regions must not count as progression unlocks');
ok(navigation.includes('const released=!worldZoneInDevelopment(region)'),'In-development regions must never become active just from level');
ok(world.includes('<WorldChapterNavigator'),'World screen must display the inline chapter navigator');
ok(chapters.includes('<ZoneSceneArtwork regionId={current.id}/>'),'Current-location card must use scenic zone artwork');
ok(chapters.includes('<ZoneSceneArtwork regionId={artId} muted={!access}/>'),'Zone drawer rows must use existing scenic artwork and dim locked zones');
ok(chapters.includes("development?t('In Development')"),'Future regions must show an In Development state');
ok(!world.includes('TravelRegionModal')&&!chapters.includes('TravelRegionModal'),'World travel must not open a preview modal');
ok(chapters.includes("const access=availability==='available'"),'Travel rows must respect level and travel gates via region availability');
ok(chapters.includes('onTravel(zone.id)'),'Unlocked destination rows must travel directly using the original region ID');
ok(chapters.includes('<Text style={s.lockedText}>'),'Locked destinations must remain visibly tagged on their thumbnail');
ok(chapters.includes('{access&&target?<View'),'Locked locations must not expose active travel actions');
console.log('PASS: inline chapter travel is direct, scenic, and properly gated');
