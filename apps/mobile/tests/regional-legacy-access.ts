import {createCharacter,newGame} from '../src/core/game';
import {characterTotalXpAtLevel} from '../src/core/progression';
import {MONSTERS} from '../src/content/monsters';
import {WORLD_ZONES} from '../src/content/world-map';
import {regionTravelLockReason,encounterLockRequirement} from '../src/core/world-navigation';
import type {GameState} from '../src/core/types';
function check(value:unknown,message:string):asserts value{if(!value)throw Error(message);}
const sunscar=WORLD_ZONES.find(z=>z.id==='SUNSCAR')!;
const frost=WORLD_ZONES.find(z=>z.id==='FROSTMARCH')!;
const ash=WORLD_ZONES.find(z=>z.id==='ASHLANDS')!;
const enemy=(id:string)=>MONSTERS.find(m=>m.id===id)!;
function at(level:number):GameState{
 const state=createCharacter(newGame(0),'IRONWARDEN','Regional Legacy');
 state.character!.level=level;
 state.character!.xp=characterTotalXpAtLevel(level);
 state.defeatedBossIds=['FALLEN_KNIGHT'];
 state.exploredRouteIds=['SCOUT_KINGS_ROAD','SCOUT_SUNSCAR'];
 return state;
}
// An established player had already visited Sunscar at the OLD entry level.
const legacySunscar=at(22);
legacySunscar.currentRegionId='SUNSCAR';
legacySunscar.unlockedMonsterIds.push('SUNSCAR_SCORPION');
check(!regionTravelLockReason(legacySunscar,sunscar),'Previously visited Sunscar must not become inaccessible');
check(!encounterLockRequirement(legacySunscar,enemy('SUNSCAR_SCORPION')),
 'A legitimate previously unlocked Sunscar encounter must not be silently revoked');
check(encounterLockRequirement(legacySunscar,enemy('ROYAL_SANDGUARD'))?.kind==='level',
 'Legacy access must never unlock later new area monsters');

// Old survey progress also works if the player has already traveled home.
const oldSurvey=at(22);
oldSurvey.currentRegionId='GREENFIELDS';
check(!regionTravelLockReason(oldSurvey,sunscar),'Already-completed Sunscar survey remains valid');
const fresh=at(22);
fresh.currentRegionId='GREENFIELDS';
fresh.exploredRouteIds=['SCOUT_KINGS_ROAD'];
check(regionTravelLockReason(fresh,sunscar)?.includes('Level 26'),
 'New characters must still meet the proposed Sunscar Lv26 entry gate');

// The grandfather rule cannot override mandatory Chapter I completion.
const unfinished={...legacySunscar,defeatedBossIds:[]};
check(regionTravelLockReason(unfinished,sunscar)?.includes('Fallen Knight'),
 'Old regional saves still require Chapter I story completion');

// Old Frostmarch entry at current Lv36 must also retain verified old access.
const oldFrost=at(36);
oldFrost.currentRegionId='FROSTMARCH';
oldFrost.unlockedMonsterIds.push('FROSTWOLF');
check(!regionTravelLockReason(oldFrost,frost),'Previously visited Frostmarch remains reachable');
check(!encounterLockRequirement(oldFrost,enemy('FROSTWOLF')),
 'Previously unlocked Frostmarch monsters remain accessible');
const freshFrost=at(36);
freshFrost.currentRegionId='SUNSCAR';
check(regionTravelLockReason(freshFrost,frost)?.includes('Level 51'),
 'New Frostmarch characters still need Lv51');
check(regionTravelLockReason({...oldFrost,currentRegionId:'ASHLANDS'},ash)?.includes('development'),
 'Historical zone IDs cannot unlock future Ashlands');
console.log('PASS grandfather Sunscar and Frostmarch owned access, preserve existing monsters and enforce new gates');
