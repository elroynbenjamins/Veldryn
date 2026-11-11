export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');
const world=read('src/screens/WorldScreen.tsx');
const chapters=read('src/components/WorldChapterNavigator.tsx');
const scene=read('src/components/ZoneSceneArtwork.tsx');
const map=read('src/content/world-map.ts');
const navigation=read('src/core/world-navigation.ts');

ok(!world.includes('TravelRegionModal')&&!world.includes('travelTargetId')&&!chapters.includes('TravelRegionModal'),'World screen must not stage a travel-preview sheet');
ok(chapters.includes('onTravel(zone.id)'),'Available destinations must travel directly');
ok(chapters.includes("development?t('In Development')"),'Future destinations must expose localized In Development status');
ok(chapters.includes("availability==='available'")&&chapters.includes('{access&&target?<View'),'Unavailable destinations must never render an active Travel button');
ok(chapters.includes('<ZoneSceneArtwork regionId={current.id}/>'),'Current region must use the scenic artwork entrypoint');
ok(chapters.includes('<ZoneSceneArtwork regionId={artId} muted={!access}/>'),'Current-region zone drawer must show scenic area art and dim locked zones');
ok(map.includes("WorldZoneAvailability='released'|'inDevelopment'"),'World zone definitions must use explicit release metadata');
ok(map.includes("availability:WorldZoneAvailability"),'Every world zone needs an explicit availability field');
ok(map.includes("plannedActivities?:string[]"),'Future region definitions must support planned activity metadata');
ok(map.includes("id:'VEILLANDS'")&&map.includes("availability:'inDevelopment'"),'World map must expose a future-region preview');
ok(map.includes("plannedActivities:['High-level combat','Regional gathering','Elite encounters','Region progression']"),'Veillands preview must expose planned-content categories');
ok(navigation.includes("RegionTravelAvailability='available'|'locked'|'inDevelopment'"),'Travel state logic must distinguish available, locked and in-development zones');
ok(navigation.includes('regionTravelPreview'), 'Travel preview must expose enemies, drops and activities');
ok(navigation.includes('worldZoneInDevelopment(region)'), 'Future-region travel previews must branch on release state');
ok(navigation.includes("region.plannedActivities??['Regional content']"),'Future-region previews must use planned activities instead of fake counters');
ok(navigation.includes('!worldZoneInDevelopment(zone)&&zone.minLevel>level'),'In-development zones must not count as progression unlocks');
ok(navigation.includes('const released=!worldZoneInDevelopment(region)'),'In-development regions must never become active from level alone');
ok(scene.includes('source?<Image')&&scene.includes(':<RegionArtwork regionId={regionId}/>'),'Zone scene artwork must retain the map fallback');
console.log('PASS: inline world travel remains direct, locked and development gating remains authoritative');
