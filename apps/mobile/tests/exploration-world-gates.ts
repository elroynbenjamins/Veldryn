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
const oldMines=WORLD_ZONES.find(zone=>zone.id==='OLD_MINES')!;
const mireHeron=MONSTERS.find(monster=>monster.id==='MIRE_HERON')!;
const thornling=MONSTERS.find(monster=>monster.id==='THORNLING')!;

state={...state,character:{...state.character!,level:5}};
ok(regionTravelAvailability(state,silverbrook)==='available','Silverbrook must remain a normal level-gated early region');
state=travelToRegion(state,'SILVERBROOK',t0+1_000).state;
ok(state.unlockedMonsterIds.includes('SILVERFIN_SWARM'),'Entering Silverbrook must reveal its baseline combat target');
ok(!state.unlockedMonsterIds.includes('MIRE_HERON'),'Silverbrook hidden encounter must remain undiscovered before scouting');

state=startExploration(state,'SCOUT_SILVERBROOK',t0+2_000);
state=claimActivity(state,t0+92_001).state;
ok(state.unlockedMonsterIds.includes('MIRE_HERON'),'Silverbrook scouting must reveal Mire Heron');
ok(!encounterUnlocked(state,mireHeron),'Discovery must not bypass Mire Heron combat-level readiness');

state={...state,character:{...state.character!,level:7}};
ok(regionTravelAvailability(state,ironwood)==='available','Ironwood must remain a normal level-gated onboarding region');
state=travelToRegion(state,'IRONWOOD',t0+93_000).state;
ok(state.unlockedMonsterIds.includes('IRONWOOD_WOLF'),'Entering Ironwood must reveal Ironwood Wolf for the story tutorial');
ok(!state.unlockedMonsterIds.includes('THORNLING'),'Thornling must remain hidden before Ironwood scouting');

state={...state,character:{...state.character!,level:16}};
ok(regionTravelAvailability(state,oldMines)==='locked','Old Mines must remain locked until Ironwood scouting charts the road, even at sufficient character level');

let explorationBlocked=false;
try{startExploration(state,'SCOUT_IRONWOOD',t0+94_000)}catch(error){explorationBlocked=String(error).includes('Exploration level 2')}
ok(explorationBlocked,'Ironwood scouting must require Exploration level 2');

state={...state,skills:state.skills.map(skill=>skill.skillId==='exploration'?{...skill,level:2,xp:totalXpAtLevel(2)}:skill)};
state=startExploration(state,'SCOUT_IRONWOOD',t0+95_000);
state=claimActivity(state,t0+215_001).state;
ok(state.unlockedMonsterIds.includes('THORNLING'),'Ironwood scouting must reveal Thornling');
ok(encounterUnlocked(state,thornling),'Discovered Thornling must be combat-ready once its level requirement is met');
ok(regionTravelAvailability(state,oldMines)==='available','Old Mines must open once both character level and Ironwood scouting are complete');

console.log('PASS: Exploration reveals hidden encounters and gates later roads without disrupting early onboarding');
