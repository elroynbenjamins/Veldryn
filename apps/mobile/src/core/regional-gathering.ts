import {GATHERING,type GatherDef} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import {WORLD_ZONES,worldZoneInDevelopment} from '../content/world-map';
import {regionalArea} from '../content/regional-areas';
import {currentRegionId} from './combat-region';
import {regionTravelAvailability,regionTravelLockReason} from './world-navigation';
import type {GameState,GatheringSkillId} from './types';

/** The same state determines sorting, badges, navigation and regional totals. */
export type GatheringNodeStatus='active'|'ready'|'travel'|'skill-locked'|'area-locked'|'zone-locked'|'upcoming';
export function gatheringNodeAvailability(state:GameState,activity:GatherDef,skillLevel=state.skills.find(row=>row.skillId===activity.skillId)?.level??1){
 const zone=WORLD_ZONES.find(row=>row.id===activity.zoneId);
 const area=regionalArea(activity.zoneId,activity.areaId);
 const inCurrentRegion=activity.zoneId===currentRegionId(state);
 const skillReady=skillLevel>=activity.unlockLevel;
 const areaReady=!area||(state.character?.level??1)>=area.minLevel;
 const zoneStatus=zone?regionTravelAvailability(state,zone):'locked';
 const active=state.activity?.targetId===activity.id;
 // A development placeholder must never become "ready" through old save flags.
 const status:GatheringNodeStatus=active?'active'
  :!zone||worldZoneInDevelopment(zone)?'upcoming'
  :zoneStatus!=='available'?'zone-locked'
  :!areaReady?'area-locked'
  :!skillReady?'skill-locked'
  :inCurrentRegion?'ready':'travel';
 const readyHere=status==='ready';
 const travelReady=status==='travel';
 const rank=active?0:readyHere?1:travelReady?2:status==='skill-locked'?3:status==='area-locked'?4:status==='zone-locked'?5:6;
 return {activity,zone,area,inCurrentRegion,skillReady,areaReady,zoneStatus,active,status,readyHere,travelReady,rank,
  zoneLockReason:zone&&zoneStatus!=='available'?regionTravelLockReason(state,zone):undefined};
}

export function regionalGatheringNodes(state:GameState,{skillId,preferredActionId}:{skillId?:GatheringSkillId;preferredActionId?:string}={}){
 const regionId=currentRegionId(state);
 return [...GATHERING,...HERB_NODES].filter(row=>row.zoneId===regionId&&(!skillId||row.skillId===skillId))
  .sort((a,b)=>gatheringNodeAvailability(state,a).rank-gatheringNodeAvailability(state,b).rank
   ||Number(b.id===preferredActionId)-Number(a.id===preferredActionId)
   ||a.unlockLevel-b.unlockLevel||a.name.localeCompare(b.name));
}
