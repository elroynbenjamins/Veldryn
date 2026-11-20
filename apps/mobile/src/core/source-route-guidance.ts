import {GATHERING} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import {MONSTERS} from '../content/monsters';
import {regionalArea} from '../content/regional-areas';
import {WORLD_ZONES} from '../content/world-map';
import type {WorkingTowardDestination} from './working-toward';

const gatheringNodes=[...GATHERING,...HERB_NODES];

/** Transient, UI-only destination detail; never add this to persisted gameplay state. */
export type SourceRouteDestination=WorkingTowardDestination & {
  areaId?:string;
  sourceItemId?:string;
};

/**
 * Resolve by canonical catalog ID, ignoring stale caller region/area metadata.
 * This is presentation-only: it never performs travel or starts an activity.
 */
export function resolveSourceRoute(destination:WorkingTowardDestination,sourceItemId?:string):SourceRouteDestination{
  const base={...destination,...(sourceItemId?{sourceItemId}:{})};
  if(destination.kind==='combat'){
    const monster=MONSTERS.find(row=>row.id===destination.monsterId);
    if(!monster)return base;
    const region=WORLD_ZONES.find(row=>row.name===monster.zone);
    return {...base,zoneName:monster.zone,regionId:region?.id??destination.regionId,areaId:monster.areaId};
  }
  if(destination.kind==='skills'&&destination.mode==='gathering'&&destination.actionId){
    const node=gatheringNodes.find(row=>row.id===destination.actionId);
    return node?{...base,regionId:node.zoneId,areaId:node.areaId}:base;
  }
  return base;
}

export interface SourceRouteView{
  breadcrumb:string;
  regionId?:string;
  areaId?:string;
  sourceItemId?:string;
  target:string;
  action:'Hunt'|'Gather';
}

/** Exact chapter, sub-area, activity and target for source UI breadcrumbs. */
export function sourceRouteView(destination:WorkingTowardDestination):SourceRouteView|undefined{
  const route=resolveSourceRoute(destination);
  if(route.kind!=='combat'&&!(route.kind==='skills'&&route.mode==='gathering'&&route.actionId))return undefined;
  const regionId=route.regionId;
  const region=WORLD_ZONES.find(row=>row.id===regionId);
  const area=regionId?regionalArea(regionId,route.areaId):undefined;
  const target=route.kind==='combat'
    ?MONSTERS.find(row=>row.id===route.monsterId)?.name??route.monsterId
    :gatheringNodes.find(row=>row.id===route.actionId)?.name??route.actionId!;
  const activity=route.kind==='combat'?'Combat':'Gathering';
  const breadcrumb=[region?.name??regionId,area?.name,activity,target].filter((part):part is string=>!!part).join(' › ');
  return {action:route.kind==='combat'?'Hunt':'Gather',breadcrumb,regionId,areaId:route.areaId,sourceItemId:route.sourceItemId,target};
}
