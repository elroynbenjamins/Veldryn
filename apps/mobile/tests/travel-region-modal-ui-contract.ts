export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const world=read('src/screens/WorldScreen.tsx');
const scene=read('src/components/ZoneSceneArtwork.tsx');
const map=read('src/content/world-map.ts');
const navigation=read('src/core/world-navigation.ts');

ok(!world.includes('TravelRegionModal')&&!world.includes('travelTargetId'),'World screen must not stage a travel-preview sheet');
ok(world.includes("onPress={()=>onTravel(zone.id)}"),'Available destination cards must travel directly');
ok(world.includes("inDevelopment?'IN DEVELOPMENT'"),'World destinations must expose an In Development state');
ok(world.includes("title={unlocked?'Travel':inDevelopment?'In development':'Locked'}")&&world.includes('disabled={!unlocked}'),'Unavailable destinations must stay visibly unavailable without opening a preview sheet');
ok(world.includes("<ZoneSceneArtwork regionId={current.id}/>"),'Current region must use the scenic artwork entrypoint');
ok(world.includes("<ZoneSceneArtwork regionId={zone.id} muted={!unlocked}/>"),'Travel cards must use scenic art and dim unavailable regions');

ok(map.includes("WorldZoneAvailability='released'|'inDevelopment'"),'World zone definitions must use explicit release metadata');
ok(map.includes("availability:WorldZoneAvailability"),'Every world zone needs an explicit availability field');
ok(map.includes("plannedActivities?:string[]"),'Future region definitions must support planned activity metadata');
ok(map.includes("id:'VEILLANDS'")&&map.includes("availability:'inDevelopment'"),'World map must expose at least one real future-region preview in the In Development state');
ok(map.includes("plannedActivities:['High-level combat','Regional gathering','Elite encounters','Region progression']"),'Veillands preview must expose useful planned-content categories without pretending content is live');
ok(navigation.includes("RegionTravelAvailability='available'|'locked'|'inDevelopment'"),'Travel state logic must distinguish available, locked and in-development zones');
ok(navigation.includes("regionTravelPreview"),'Travel preview must expose enemies, drops and activities');
ok(navigation.includes("worldZoneInDevelopment(region)"),'Future-region travel previews must branch on release state');
ok(navigation.includes("region.plannedActivities??['Regional content']"),'Future-region previews must use planned activities instead of fake live counters');
ok(navigation.includes("!worldZoneInDevelopment(zone)&&zone.minLevel>level"),'In-development zones must not count as progression unlocks');
ok(navigation.includes("const released=!worldZoneInDevelopment(region)"),'In-development zones must never become active from level alone');


ok(scene.includes('Falls back to the approved world-map crop'),'Zone scene artwork must have a safe map fallback while dedicated scene art is rolled out');

console.log('PASS: world travel is direct, while locked and in-development regions remain clear and unavailable');
