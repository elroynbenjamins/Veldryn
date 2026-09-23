export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const world=read('src/screens/WorldScreen.tsx');
const modal=read('src/components/TravelRegionModal.tsx');
const scene=read('src/components/ZoneSceneArtwork.tsx');

ok(world.includes("const [travelTargetId,setTravelTargetId]"),'World screen must stage a travel target before travelling');
ok(world.includes("onPress={()=>setTravelTargetId(zone.id)}"),'Destination Travel button must open the travel destination sheet');
ok(world.includes("<TravelRegionModal"),'World screen must render the travel destination sheet');
ok(world.includes("onTravel={regionId=>{setTravelTargetId(undefined);onTravel(regionId);}}"),'Confirming the sheet must perform the existing instant travel action');
ok(!world.includes("onPress={()=>onTravel(zone.id)}"),'Destination cards must not bypass the travel sheet');

ok(modal.includes('TRAVEL DESTINATION'),'Travel sheet must have clear destination hierarchy');
ok(modal.includes('<ZoneSceneArtwork regionId={zone.id}'),'Travel sheet must reserve a scenic zone hero');
ok(modal.includes("Travelling changes your active region immediately."),'Travel sheet must make instant region switching explicit');
ok(!/travel time|seconds|minute|hour/i.test(modal),'Travel sheet must not introduce travel duration or timers');
ok(modal.includes('inDevelopment?"In Development":unlocked?"Travel":"Locked"'),'Travel sheet must keep one obvious state-aware primary action');
ok(modal.includes('disabled={!unlocked}'),'Locked and in-development previews must never trigger travel');
ok(modal.includes('environment.weatherName'),'Travel sheet should show current destination conditions');
ok(modal.includes('regionActivitySummary'),'Travel sheet should preview destination activities');

ok(scene.includes('Falls back to the approved world-map crop'),'Zone scene artwork must have a safe map fallback while dedicated scene art is rolled out');

console.log('PASS: travel destination sheet previews a zone and keeps travel instant');
