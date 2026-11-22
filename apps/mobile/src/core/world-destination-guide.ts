import {GATHERING} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import {MONSTERS} from '../content/monsters';
import {WORLD_ZONES} from '../content/world-map';
import {gatheringNodeAvailability} from './regional-gathering';
import {regionTravelAvailability,regionTravelLockReason} from './world-navigation';
import type {GameState} from './types';
import type {WorkingTowardDestination} from './working-toward';

const gatheringNodes=[...GATHERING,...HERB_NODES];

export type WorldDestinationGuideModel={
 regionId:string;
 regionName:string;
 targetName:string;
 kind:'gathering'|'combat';
 itemId?:string;
 skillId?:string;
 canTravel:boolean;
 canTravelAndStart:boolean;
 lockReason?:string;
};

/** Return a route only for a real target in another region, never a guessed chapter stop. */
export function worldDestinationGuide(state:GameState,destination?:WorkingTowardDestination):WorldDestinationGuideModel|null{
 if(!destination||!('regionId' in destination)||!destination.regionId||destination.regionId===state.currentRegionId)return null;
 const region=WORLD_ZONES.find(zone=>zone.id===destination.regionId);
 if(!region)return null;
 const canTravel=regionTravelAvailability(state,region)==='available';
 const lockReason=canTravel?undefined:regionTravelLockReason(state,region)??'Region not unlocked';
 if(destination.kind==='skills'&&destination.mode==='gathering'&&destination.actionId){
  const node=gatheringNodes.find(row=>row.id===destination.actionId&&row.zoneId===region.id&&row.skillId===destination.skillId);
  if(!node)return null;
  return {regionId:region.id,regionName:region.name,targetName:node.name,kind:'gathering',itemId:node.itemId,skillId:node.skillId,
   canTravel,canTravelAndStart:canTravel&&gatheringNodeAvailability(state,node).travelReady,lockReason};
 }
 if(destination.kind==='combat'){
  const monster=MONSTERS.find(row=>row.id===destination.monsterId&&row.zone===region.name);
  if(!monster)return null;
  return {regionId:region.id,regionName:region.name,targetName:monster.name,kind:'combat',canTravel,canTravelAndStart:false,lockReason};
 }
 return null;
}

/** Travel actions only consume the pending route when the exact destination was reached. */
export function reachedWorldDestination(destination:WorkingTowardDestination|undefined,regionId:string):boolean{
 return !!destination&&'regionId' in destination&&!!destination.regionId&&destination.regionId===regionId;
}

/** Never bypass profession, sub-area, unreleased-region or regional travel gates on quick start. */
export function canStartGatheringAtDestination(state:GameState,destination:WorkingTowardDestination):boolean{
 if(destination.kind!=='skills'||destination.mode!=='gathering'||!destination.actionId||!destination.regionId||destination.regionId!==state.currentRegionId)return false;
 const node=gatheringNodes.find(row=>row.id===destination.actionId&&row.zoneId===destination.regionId&&row.skillId===destination.skillId);
 if(!node)return false;
 const availability=gatheringNodeAvailability(state,node);
 return availability.readyHere||availability.active;
}
