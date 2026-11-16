import {GATHERING} from '../src/content/skills';
import {HERB_NODES} from '../src/content/herbalism';
import {WORLD_ZONES} from '../src/content/world-map';
import {regionalArea} from '../src/content/regional-areas';
import {gatheringNodeAvailability,regionalGatheringNodes} from '../src/core/regional-gathering';
import type {GameState,GatheringSkillId} from '../src/core/types';

function check(value:unknown,message:string):asserts value {if(!value)throw new Error(message);}
const nodes=[...GATHERING,...HERB_NODES];
function node(id:string){const result=nodes.find(row=>row.id===id);if(!result)throw new Error('Missing gathering node '+id);return result;}
function regionLevel(id:string){const value=WORLD_ZONES.find(zone=>zone.id===id);if(!value)throw new Error('Missing zone '+id);return value.minLevel;}
function state(characterLevel:number,currentRegionId='GREENFIELDS',overrides:Partial<GameState>={}):GameState{
 return {
  character:{level:characterLevel} as GameState['character'],
  currentRegionId,
  exploredRouteIds:[],
  defeatedBossIds:[],
  unlockedMonsterIds:[],
  skills:[],
  activity:null,
  ...overrides,
 } as unknown as GameState;
}
const entry=(source:GameState,id:string,skillLevel:number)=>gatheringNodeAvailability(source,node(id),skillLevel);
const starting=state(1);
check(entry(starting,'GREENFIELDS_COPPER_OUTCROP',1).status==='ready','Starting Mining is ready in Greenfields');
check(entry(starting,'MEADOW_PERCH_POOL',1).status==='ready','Starting Fishing is ready in Greenfields');
check(entry(starting,'GREENWOOD_TREE',1).status==='ready','Starting Woodcutting is ready in Greenfields');
check(entry(starting,'DEWLEAF_PATCH',1).status==='ready','Starting Herbalism is ready in Greenfields');
check(entry(state(regionLevel('SILVERBROOK')),'SILVERBROOK_SHOAL',1).status==='travel','Unblocked off-region fishing must be shown as travel-ready');
check(entry(state(regionLevel('OLD_MINES')),'CAVE_LOACH_POOL',40).status==='zone-locked','Skill level alone must not bypass locked scouting routes');
check(entry(state(100),'EMBERFIN_POOL',100).status==='upcoming','Unreleased zones must never appear doable');
const zone=state(regionLevel('SUNSCAR'),'SUNSCAR',{
 defeatedBossIds:['FALLEN_KNIGHT'],exploredRouteIds:['SCOUT_KINGS_ROAD'],
});
check(entry(zone,'OASIS_CARP_POOL',1).status==='skill-locked','Unlocked region must still check profession level');
const glassfinArea=regionalArea('SUNSCAR','ZONE_008');
check(glassfinArea,'Mirage Basin area exists');
const earlySunscar=state(glassfinArea.minLevel-1,'SUNSCAR',{
 defeatedBossIds:['FALLEN_KNIGHT'],exploredRouteIds:['SCOUT_KINGS_ROAD'],
});
const glassfin=entry(earlySunscar,'GLASSFIN_POOL',100);
check(glassfin.status==='area-locked'&&glassfin.area?.id==='ZONE_008','High profession level cannot bypass character subarea level');
const advancedSunscar=state(glassfinArea.minLevel,'SUNSCAR',{
 defeatedBossIds:['FALLEN_KNIGHT'],exploredRouteIds:['SCOUT_KINGS_ROAD'],
});
check(entry(advancedSunscar,'GLASSFIN_POOL',100).status==='ready','Area and profession level together unlock current node');
check(entry({...advancedSunscar,currentRegionId:'GREENFIELDS'},'GLASSFIN_POOL',100).status==='travel','Reachable regional area should show travel not locked');
const progressing=state(glassfinArea.minLevel,'SUNSCAR',{
 defeatedBossIds:['FALLEN_KNIGHT'],exploredRouteIds:['SCOUT_KINGS_ROAD'],
 skills:[{skillId:'mining',level:100,xp:0},{skillId:'woodcutting',level:100,xp:0},{skillId:'fishing',level:100,xp:0},{skillId:'herbalism',level:100,xp:0}] as GameState['skills'],
});
const regional=regionalGatheringNodes(progressing);
check(regional.length>0&&regional.every(row=>row.zoneId==='SUNSCAR'),'Regional view only shows the selected region');
check(regional.every((row,i)=>i===0||gatheringNodeAvailability(progressing,regional[i-1]).rank<=gatheringNodeAvailability(progressing,row).rank),'Regional list sorts doable activities before locked areas');
for(const skillId of ['mining','woodcutting','fishing','herbalism'] as GatheringSkillId[]){
 check(nodes.some(row=>row.skillId===skillId),'Missing resource catalog for '+skillId);
 check(regional.some(row=>row.skillId===skillId),'Regional gathering must include '+skillId);
 check(nodes.filter(row=>row.skillId===skillId).every(row=>typeof gatheringNodeAvailability(progressing,row).rank==='number'),'Availability must cover every '+skillId+' node');
}
console.log('PASS: all gathering skills distinguish current, travel, level, area, route and unreleased-zone locks');
