import {WORLD_ZONES} from '../src/content/world-map';
import {MONSTERS} from '../src/content/monsters';
import {worldDestinationGuide,reachedWorldDestination,canStartGatheringAtDestination} from '../src/core/world-destination-guide';
import type {WorkingTowardDestination} from '../src/core/working-toward';
import type {GameState} from '../src/core/types';

function check(value:unknown,message:string):asserts value{if(!value)throw new Error(message);}
function state(region='GREENFIELDS',level=100,skillLevel=100,extras:Partial<GameState>={}):GameState{
 return {character:{level} as GameState['character'],currentRegionId:region,
  exploredRouteIds:[],defeatedBossIds:[],unlockedMonsterIds:[],activity:null,
  skills:[{skillId:'fishing',level:skillLevel,xp:0}] as GameState['skills'],...extras} as GameState;
}
const target:WorkingTowardDestination={kind:'skills',skillId:'fishing',mode:'gathering',actionId:'SILVERBROOK_SHOAL',
 regionId:'SILVERBROOK',button:'Travel to Silverbrook',detail:'Fish at Silverbrook'};
const before=state();
const guide=worldDestinationGuide(before,target);
check(guide?.regionId==='SILVERBROOK','Travel must address the exact target region, never the chapter default');
check(guide.kind==='gathering'&&guide.canTravelAndStart,'Reachable off-region gathering should offer quick start');
check(guide.targetName.length>0&&!!guide.itemId,'Destination should show the actual resource and item art');
check(!reachedWorldDestination(target,'IRONWOOD'),'Travelling to another Asterfall sibling must not consume the intent');
check(reachedWorldDestination(target,'SILVERBROOK'),'Only confirmed target arrival can consume the intent');
check(!canStartGatheringAtDestination(before,target),'Never start before travel was confirmed');
check(canStartGatheringAtDestination(state('SILVERBROOK'),target),'Gathering can start only after arrival');
check(!canStartGatheringAtDestination(state('SILVERBROOK',100,0),target),'Profession-level locks prevent quick start');
check(!worldDestinationGuide(state('SILVERBROOK'),target),'Arrived targets should not leave an outdated destination card');
check(!worldDestinationGuide(before,{...target,actionId:'UNKNOWN_NODE'}),'Unknown target IDs must not fabricate a travel card');
check(!worldDestinationGuide(before,{...target,skillId:'mining'}),'Skill/action mismatch must not create an incorrect quick-start');
const locked=worldDestinationGuide(state('GREENFIELDS',1),target);
check(locked&&!locked.canTravel&&!locked.canTravelAndStart,'Locked travel must never expose working buttons');
const blueZone=WORLD_ZONES.find(zone=>zone.id==='SILVERBROOK');
check(!!blueZone,'Silverbrook zone exists');
const hunt=MONSTERS.find(row=>row.zone===blueZone.name&&!row.boss);
check(!!hunt,'Silverbrook hunt exists');
const combatTarget:WorkingTowardDestination={kind:'combat',monsterId:hunt.id,zoneName:hunt.zone,regionId:'SILVERBROOK',button:'Hunt',detail:'Hunt target'};
const combat=worldDestinationGuide(before,combatTarget);
check(combat?.kind==='combat'&&!combat.canTravelAndStart,'Combat deep links should guide travel but never auto-start fights');
check(!canStartGatheringAtDestination(state('SILVERBROOK'),combatTarget),'Combat targets may not start gathering');
const lockedScouted:WorkingTowardDestination={...target,actionId:'CAVE_LOACH_POOL',regionId:'OLD_MINES'};
const oldMine=worldDestinationGuide(before,lockedScouted);
check(oldMine&&!oldMine.canTravelAndStart,'Missing scout requirements must block direct travel/start');
console.log('PASS: exact World destination, detours, fast start, locked regions, invalid IDs and combat boundaries');
