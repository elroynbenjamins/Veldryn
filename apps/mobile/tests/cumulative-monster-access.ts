import {createCharacter,newGame,startCombat} from '../src/core/game';
import {projectCharacter} from '../src/core/account-roster';
import {cumulativeMonsterUnlockIds,encounterUnlocked,furthestUnlockedCombatZone,restoreCumulativeMonsterUnlocks} from '../src/core/world-navigation';
import {MONSTERS} from '../src/content/monsters';

const assert=(value:unknown,message:string)=>{if(!value)throw new Error(message)};
const monster=(id:string)=>MONSTERS.find(row=>row.id===id)!;
const starter=createCharacter(newGame(0),'IRONWARDEN','Monster access test');
starter.character!.id='main-monster-access-test';
assert(furthestUnlockedCombatZone(starter)?.id==='GREENFIELDS','New players start at Greenfields, not another character\'s region');
assert(!encounterUnlocked(starter,monster('IRONWOOD_WOLF')),'New players must not gain monsters from locked later zones');
assert(encounterUnlocked(starter,monster('GLOAM_MITE')),'All ordinary monsters in the latest unlocked zone should be available');
const ironwood={...starter,character:{...starter.character!,level:12},currentRegionId:'IRONWOOD',unlockedMonsterIds:['MOSS_RAT']};
assert(furthestUnlockedCombatZone(ironwood)?.id==='IRONWOOD','The current unlocked region must be retained');
for(const id of ['SILVERFIN_SWARM','VENOM_WEAVER','BRIAR_HUSK','FOREST_TROLL','ANCIENT_TREANT']){
 assert(cumulativeMonsterUnlockIds(ironwood).includes(id),id+' must be restored from earlier/unlocked regions');
}
assert(!cumulativeMonsterUnlockIds(ironwood).includes('CAVE_SKITTER'),'Locked later zones must not leak their monsters');
assert(startCombat(ironwood,'VENOM_WEAVER',1).activity?.targetId==='VENOM_WEAVER','The authoritative combat engine must honor cumulative access');

const veteran={...starter,
 character:{...starter.character!,level:30,monsterMasteryPoints:{DUNE_ORACLE:744,BANNER_SHADE:750}},
 currentRegionId:'IRONWOOD',
 unlockedMonsterIds:['MOSS_RAT','IRONWOOD_WOLF'],
 exploredRouteIds:['SCOUT_IRONWOOD','SCOUT_OLD_MINES','SCOUT_KINGS_ROAD'],
 defeatedBossIds:['FALLEN_KNIGHT'],
};
assert(furthestUnlockedCombatZone(veteran)?.id==='SUNSCAR','A veteran backtracking to Ironwood must retain Sunscar');
const repaired=restoreCumulativeMonsterUnlocks(veteran);
for(const id of ['VENOM_WEAVER','IRONBACK_MOLE','DROWNED_PILGRIM','OATHGLASS_REVENANT','DUNE_ORACLE','ROYAL_SANDGUARD']){
 assert(repaired.unlockedMonsterIds.includes(id),'Restore missing '+id+' from the highest unlocked zone');
}
assert(restoreCumulativeMonsterUnlocks(repaired)===repaired,'Repair must be idempotent');
assert(!repaired.unlockedMonsterIds.includes('FALLEN_KNIGHT'),'Story bosses stay outside regular monster grants');
assert(!encounterUnlocked(repaired,monster('BLACKGLASS_MIRELING')),'Unreleased Ashlands monsters remain inaccessible');
assert(!repaired.unlockedMonsterIds.includes('FROSTWOLF'),'Future released zones still require progression');

// Scouting flags can also be lost: actual combat mastery proves the character reached the zone.
const missingRoutes={...veteran,exploredRouteIds:[],defeatedBossIds:[]};
assert(furthestUnlockedCombatZone(missingRoutes)?.id==='SUNSCAR','Persisted mastery proves historical access even when route flags were lost');
assert(restoreCumulativeMonsterUnlocks(missingRoutes).unlockedMonsterIds.includes('DUNE_ORACLE'),'Mastery-backed zone history must repair missing monster IDs');

const altCreated=createCharacter(newGame(0),'STONECALLER','Separate alt');
altCreated.character!.id='alt-monster-access-test';
const withAlt={...veteran,otherCharacters:[{
 character:altCreated.character!,inventory:altCreated.inventory,overflow:altCreated.overflow,
 activity:altCreated.activity,skills:altCreated.skills,quests:altCreated.quests,
 currentRegionId:'GREENFIELDS',unlockedMonsterIds:['MOSS_RAT'],
 exploredRouteIds:[],defeatedBossIds:[],
}]};
const switched=projectCharacter(withAlt,'alt-monster-access-test');
assert(furthestUnlockedCombatZone(switched)?.id==='GREENFIELDS','Character switching must not borrow the main\'s Sunscar access');
assert(!switched.unlockedMonsterIds.includes('IRONWOOD_WOLF'),'Alts must not inherit another character\'s monster flags');
assert(projectCharacter(switched,'main-monster-access-test').unlockedMonsterIds.includes('DUNE_ORACLE'),'Switching back must restore the main character\'s cumulative access');
console.log('PASS: cumulative monster unlocks survive backtracking, missing save flags and character switching');
