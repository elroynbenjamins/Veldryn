import {REGIONAL_AREAS,regionAreas,regionalArea} from '../src/content/regional-areas';
import {MONSTERS} from '../src/content/monsters';
import {GATHERING} from '../src/content/skills';
import {HERB_NODES} from '../src/content/herbalism';
import {regionalAreaActivityCounts,validateRegionalAreaContent} from '../src/core/region-area-activities';
import {encounterLockRequirement,regionEncounters} from '../src/core/world-navigation';
import type {GameState} from '../src/core/types';

function check(value:unknown,message:string):asserts value{if(!value)throw new Error(message);}
check(validateRegionalAreaContent().length===0,validateRegionalAreaContent().join(', '));
check(REGIONAL_AREAS.length===8,'Expected eight play areas total');
for(const regionId of ['SUNSCAR','FROSTMARCH']){
  const areas=regionAreas(regionId);
  check(areas.length===4,regionId+' must contain exactly four areas');
  const monsters=MONSTERS.filter(m=>m.zone.toUpperCase()===regionId&&!m.boss);
  const nodes=[...GATHERING,...HERB_NODES].filter(g=>g.zoneId===regionId);
  check(monsters.length===12,regionId+' must have twelve regular encounters');
  check(nodes.length===10,regionId+' must have ten gathering activities');
  for(const area of areas){
    const counts=regionalAreaActivityCounts(regionId,area.id);
    check(counts.enemies===3,area.name+' should have three enemies');
    check(counts.gathering>0,area.name+' has no gathering');
    check(monsters.filter(m=>m.areaId===area.id).length===3,area.name+' encounters not assigned');
  }
}
check(regionalArea('SUNSCAR','ZONE_009')?.id==='ZONE_010','Old Buried Observatory must map to Tyrant Crown');
check(regionalArea('FROSTMARCH','ZONE_014')?.id==='ZONE_015','Old Choir Caverns navigation must map to Wyrmspine');
check(MONSTERS.some(m=>m.id==='FALLEN_KNIGHT'&&m.boss&&m.zone==="King's Road"),'Chapter I Fallen Knight must be untouched');
const state={
 character:{level:31},unlockedMonsterIds:[],defeatedBossIds:['FALLEN_KNIGHT'],
 exploredRouteIds:['SCOUT_KINGS_ROAD'],quests:[],
} as unknown as GameState;
const early=MONSTERS.find(m=>m.id==='SAFFRON_MARAUDER');
const later=MONSTERS.find(m=>m.id==='ROYAL_SANDGUARD');
check(early&&later,'Regional auto unlock monsters must exist');
check(!encounterLockRequirement(state,early),'Level-ready regional enemy must be accessible without rewriting saved unlock arrays');
check(!encounterLockRequirement(state,later),'Every regular monster in the furthest unlocked region stays available, even in a later area');
const frostmarch=MONSTERS.find(m=>m.id==='FROSTWOLF');
check(frostmarch&&encounterLockRequirement(state,frostmarch)?.kind==='level','An unreached later region must remain locked');
check(regionEncounters(state,'Sunscar','',false,'ZONE_006').length===3,'Area-filtered hunting should only show its own three enemies');
check(regionEncounters(state,'Sunscar','',false,'ZONE_009').length===3,'Legacy area selection must map to the final area');
check(regionEncounters(state,'Sunscar','',true,'ZONE_010').length===2,'Legacy area encounters remain cumulative but the new Crown Executioner obeys its level gate');
const lateChapter={...state,character:{level:50}} as unknown as GameState;
check(regionEncounters(lateChapter,'Sunscar','',true,'ZONE_010').length===3,'All three final-area enemies must appear after the authored chapter gate');
console.log('PASS 4x3 regional areas, 12 enemies, 10 gathering nodes, old IDs and cumulative zone gates');
