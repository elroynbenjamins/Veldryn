export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const world=read('src/screens/WorldScreen.tsx');
const modal=read('src/components/TravelRegionModal.tsx');
const scene=read('src/components/ZoneSceneArtwork.tsx');
const map=read('src/content/world-map.ts');
const navigation=read('src/core/world-navigation.ts');

ok(world.includes("const [travelTargetId,setTravelTargetId]"),'World screen must stage a travel target before travelling');
ok(world.includes("onPress={()=>setTravelTargetId(zone.id)}"),'Every destination state must be previewable in the travel sheet');
ok(world.includes("<TravelRegionModal"),'World screen must render the travel destination sheet');
ok(world.includes("onTravel={regionId=>{setTravelTargetId(undefined);onTravel(regionId);}}"),'Confirming an available sheet must perform the existing instant travel action');
ok(!world.includes("onPress={()=>onTravel(zone.id)}"),'Destination cards must not bypass the travel sheet');
ok(world.includes("development?'In Development'"),'World destinations must expose an In Development state');
ok(world.includes("Locked · Lv."),'Locked world destinations must be clearly distinct from development previews');

ok(map.includes("releaseState?:WorldZoneReleaseState"),'World zone definitions must support release-state metadata without changing existing regions');
ok(navigation.includes("RegionTravelAvailability='available'|'locked'|'inDevelopment'"),'Travel state logic must distinguish available, locked and in-development zones');
ok(navigation.includes("regionTravelPreview"),'Travel preview must expose enemies, drops and activities');
ok(navigation.includes("zone.releaseState==='inDevelopment'"),'In-development zones must never become travelable by level alone');

ok(modal.includes('TRAVEL DESTINATION'),'Travel sheet must have clear destination hierarchy');
ok(modal.includes('<ZoneSceneArtwork regionId={zone.id}'),'Travel sheet must reserve a scenic zone hero');
ok(modal.includes('Travel is instant.'),'Travel sheet must make instant region switching explicit');
ok(!/travel time|seconds|minute|hour/i.test(modal),'Travel sheet must not introduce travel duration or timers');
ok(modal.includes('title={development?"In Development":locked?"Locked":"Travel"}'),'Unavailable destination buttons must communicate their state');
ok(modal.includes('disabled={!available}'),'Locked and in-development destinations must never travel');
ok(modal.includes('COMMON ENEMIES')&&modal.includes('NOTABLE DROPS')&&modal.includes('ACTIVITIES'),'Travel sheet must preview meaningful zone content');
ok(modal.includes('<ItemArtwork itemId={drop.itemId}'),'Notable drops must use the real in-game item visuals');
ok(modal.includes('environment.weatherName'),'Travel sheet should show current destination conditions');

ok(scene.includes('Falls back to the approved world-map crop'),'Zone scene artwork must have a safe map fallback while dedicated scene art is rolled out');

console.log('PASS: world travel previews available, locked and in-development destinations while keeping travel instant');
