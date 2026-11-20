import {createCharacter,newGame} from '../src/core/game';
import {GATHERING} from '../src/content/skills';
import {MONSTERS} from '../src/content/monsters';
import {sourceRouteView,resolveSourceRoute} from '../src/core/source-route-guidance';
import {workingTowardDestinationAvailability,workingTowardItemSourceEntries,type WorkingTowardDestination} from '../src/core/working-toward';

function assert(value:unknown,message:string):asserts value{if(!value)throw new Error(message);}
function equal(a:unknown,b:unknown,message:string){if(a!==b)throw new Error(message+': expected '+String(b)+' but got '+String(a));}

const sunscar:WorkingTowardDestination={
 kind:'combat',monsterId:'GLASSBOUND_SENTINEL',zoneName:'Old location',regionId:'GREENFIELDS',
 button:'Hunt',detail:'Find this monster',
};
const original=JSON.stringify(sunscar);
const route=resolveSourceRoute(sunscar);
assert(route.kind==='combat','Exact monster route is a combat destination');
equal(route.regionId,'SUNSCAR','Catalog overrides a stale region');
equal(route.areaId,'ZONE_008','Sunscar enemy retains Mirage Basin sub-area');
assert(sourceRouteView(route)?.breadcrumb.includes('Sunscar › Mirage Basin › Combat › Glassbound Sentinel'),
 'Full journey names region, sub-area, activity and target');
equal(JSON.stringify(sunscar),original,'Destination enrichment does not mutate a caller-owned object');

const frostmarch=sourceRouteView({
 kind:'combat',monsterId:'RIME_STALKER',zoneName:'Frostmarch',
 button:'Hunt',detail:'Find this monster',
});
equal(frostmarch?.regionId,'FROSTMARCH','Frostmarch source routes to the canonical region');
equal(frostmarch?.areaId,'ZONE_013','Frostmarch source pinpoints Shiverlake');
assert(frostmarch?.breadcrumb.includes('Shiverlake'),'Frostmarch breadcrumb uses the actual sub-area name');

const node=GATHERING.find(row=>row.zoneId==='SUNSCAR'&&!!row.areaId);
assert(node,'Sunscar contains area-specific gathering nodes');
const gather:WorkingTowardDestination={
 kind:'skills',mode:'gathering',skillId:node.skillId,actionId:node.id,
 button:'Gather',detail:'Visit the resource node',
};
const resolvedGather=resolveSourceRoute(gather);
assert(resolvedGather.kind==='skills','Gathering route stays in Skills');
equal(resolvedGather.regionId,node.zoneId,'Gathering route supplies its region');
equal(resolvedGather.areaId,node.areaId,'Gathering route supplies its exact sub-area');
assert(sourceRouteView(resolvedGather)?.breadcrumb.includes('Gathering › '+node.name),
 'Gathering destination names the node and activity');

const early=sourceRouteView({
 kind:'combat',monsterId:'IRONWOOD_WOLF',zoneName:'Ironwood Forest',
 button:'Hunt',detail:'',
});
assert(early?.breadcrumb==='Ironwood Forest › Combat › Ironwood Wolf',
 'Asterfall's original region-only monsters never invent a sub-area');

const state=createCharacter(newGame(0),'IRONWARDEN','Source Finder');
const locked=workingTowardDestinationAvailability(state,route);
equal(locked.status,'locked','Locked region/monster cannot be marked as ready');
assert(locked.canNavigate,'Locked source remains inspectable for unlock guidance');

const sourced=workingTowardItemSourceEntries(state,'GLASSBOUND_CORE');
const glassbound=sourced.find(entry=>entry.destination.kind==='combat'&&entry.destination.monsterId==='GLASSBOUND_SENTINEL');
assert(glassbound,'Material sources include the actual Glassbound Sentinel');
assert(glassbound.destination.kind==='combat','Selected material source is combat');
equal(glassbound.destination.areaId,'ZONE_008','Item source preserves the exact combat sub-area');
assert(glassbound.destination.detail.includes('Mirage Basin'),'Item source detail names the sub-area');
assert(MONSTERS.find(row=>row.id==='GLASSBOUND_SENTINEL')?.drops.some(drop=>drop.itemId==='GLASSBOUND_CORE'),
 'Source guidance is backed by authored monster drops, not invented data');
console.log('PASS: precise Where to Find routes and locked source guidance');
