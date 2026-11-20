import {GATHERING} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import {MONSTERS} from '../content/monsters';
import {regionalArea} from '../content/regional-areas';
import {WORLD_ZONES} from '../content/world-map';
import type {WorkingTowardDestination} from './working-toward';

const gatheringNodes=[...GATHERING,...HERB_NODES];

/**
 * Use catalog IDs, not the screen the player happened to visit last.
 * The route is presentation-only: no travel, combat, queue or save mutation.
 */
export function resolveSourceRoute(destination:WorkingTowardDestination):WorkingTowardDestination{
  if(destination.kind==='combat'){
    const monster=MONSTERS.find(row=>row.id===destination.monsterId);
    if(!monster)return destination;
    const region=WORLD_ZONES.find(row=>row.name===monster.zone);
    return {...destination,zoneName:monster.zone,regionId:region?.id??destination.regionId,areaId:monster.areaId};
  }
  if(destination.kind==='skills'&&destination.mode==='gathering'&&destination.actionId){
    const node=gatheringNodes.find(row=>row.id===destination.actionId);
    return node?{...destination,regionId:node.zoneId,areaId:node.areaId}:destination;
  }
  return destination;
}

export interface SourceRouteView{
  title:string;
  breadcrumb:string;
  regionId?:string;
  areaId?:string;
  sourceItemId?:string;
  target:string;
}

/** Human-readable journey including the exact Sunscar/Frostmarch sub-area. */
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
  const path=[region?.name??route.regionId,area?.name,activity,target].filter((part):part is string=>!!part).join(' › ');
  return {title:route.kind==='combat'?'Hunt '+target:'Gather '+target,breadcrumb:path,regionId,areaId:route.areaId,sourceItemId:route.sourceItemId,target};
}
