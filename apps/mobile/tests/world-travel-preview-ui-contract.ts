export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const map=read('src/content/world-map.ts');
const navigation=read('src/core/world-navigation.ts');
const world=read('src/screens/WorldScreen.tsx');
const modal=read('src/components/TravelRegionModal.tsx');

ok(map.includes("WorldZoneAvailability='released'|'inDevelopment'"),'World zones need explicit released/development states');
ok(map.includes('developmentNote?:string'),'Future region previews need optional development copy');
ok(navigation.includes('!worldZoneInDevelopment(zone)&&zone.minLevel>level'),'In-development regions must not count as progression unlocks');
ok(navigation.includes('const released=!worldZoneInDevelopment(region)'),'In-development regions must never become active just from level');
ok(world.includes('<ZoneSceneArtwork regionId={current.id}/>'),'Current-region card must use scenic zone artwork');
ok(world.includes('<ZoneSceneArtwork regionId={zone.id} muted={!unlocked}/>'),'Travel cards must use scenic artwork and dim unavailable regions');
ok(world.includes("inDevelopment?'IN DEVELOPMENT'"),'Future-region cards need a clear In Development state');
ok(world.includes("title={unlocked?'Travel':'Preview'}"),'Locked/development cards must remain previewable without travelling');
ok(modal.includes('REGION PREVIEW')&&modal.includes('LOCKED REGION PREVIEW'),'Travel modal must distinguish preview states');
ok(modal.includes('disabled={!unlocked}'),'Unavailable regions must disable the travel action');
ok(modal.includes('Travel is instant.'),'Released-region travel copy must explicitly remain instant');
ok(!modal.includes('Travel Time'),'Travel modal must not introduce travel timers');
console.log('PASS: world travel supports instant travel, locked previews, and in-development region previews');
