import {claimActivity,createCharacter,newGame,startExploration,travelToRegion} from '../src/core/game';
import {MONSTERS} from '../src/content/monsters';
import {WORLD_ZONES} from '../src/content/world-map';
import {totalXpAtLevel} from '../src/core/progression';
import {encounterUnlocked,regionTravelAvailability} from '../src/core/world-navigation';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}

const t0=1_000_000;
let state=createCharacter(newGame(t0),'IRONWARDEN','Scout');
const silverbrook=WORLD_ZONES.find(zone=>zone.id==='SILVERBROOK')!;
const ironwood=WORLD_ZONES.find(zone=>zone.id==='IRONWOOD')!;
const mireHeron=MONSTERS.find(monster=>monster.id==='MIRE_HERON')!;

state={...state,character:{...state.character!,level:5}};
ok(regionTravelAvailability(state,silverbrook)==='locked','Silverbrook must stay locked until Greenfields scouting discovers the road');

state=startExploration(state,'SCOUT_GREENFIELDS',t0);
state=claimActivity(state,t0+60_001).state;
ok(state.unlockedMonsterIds.includes('FIELD_WISP'),'Greenfields scouting must reveal its hidden encounter');
ok(regionTravelAvailability(state,silverbrook)==='available','Greenfields scouting plus Level 5 must unlock Silverbrook travel');

state=travelToRegion(state,'SILVERBROOK',t0+61_000).state;
ok(state.unlockedMonsterIds.includes('SILVERFIN_SWARM'),'Travelling into a region must unlock its baseline encounter');

let explorationBlocked=false;
try{startExploration(state,'SCOUT_SILVERBROOK',t0+62_000)}catch(error){explorationBlocked=String(error).includes('Exploration level 2')}
ok(explorationBlocked,'Silverbrook scouting must enforce its Exploration skill requirement');

state={...state,skills:state.skills.map(skill=>skill.skillId==='exploration'?{...skill,level:2,xp:totalXpAtLevel(2)}:skill)};
state=startExploration(state,'SCOUT_SILVERBROOK',t0+63_000);
state=claimActivity(state,t0+153_001).state;
ok(state.unlockedMonsterIds.includes('MIRE_HERON'),'Silverbrook scouting must reveal its hidden encounter');
ok(!encounterUnlocked(state,mireHeron),'Discovery must not bypass the hidden monster combat-level requirement');
ok(regionTravelAvailability(state,ironwood)==='locked','Ironwood must still respect its normal character-level gate');

state={...state,character:{...state.character!,level:12}};
ok(encounterUnlocked(state,mireHeron),'A discovered hidden encounter must become usable when its combat level is met');
ok(regionTravelAvailability(state,ironwood)==='available','Silverbrook scouting plus sufficient character level must open Ironwood');

console.log('PASS: Exploration gates roads and hidden encounters without bypassing combat levels');
