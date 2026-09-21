import type {CoopUiAssetId} from './coop-ui-contract';

export type CoopRoomType='battle'|'elite'|'event'|'shrine'|'camp'|'treasure'|'merchant'|'echo'|'risk'|'boss';
export type CoopTier=1|2|3|4|5;

export interface CoopDungeonProjection{
  id:string;
  name:string;
  region?:string;
  description?:string;
  minLevel:number;
  recommendedLevel?:number;
  syncLevel:number;
  available?:boolean;
  lockedReason?:string;
  enabledRoomTypes?:CoopRoomType[];
  difficulties?:CoopTier[];
  preBossRoomMin?:number;
  preBossRoomMax?:number;
  rewardBudgetState?:string;
  estimatedMinutes?:{min:number;max:number};
  tierMinLevels?:Partial<Record<CoopTier,number>>;
}

export interface CoopDungeonView extends CoopDungeonProjection{
  artId?:CoopUiAssetId;
  heroArtId?:CoopUiAssetId;
  available:boolean;
  description:string;
  recommendedLevel:number;
  enabledRoomTypes:CoopRoomType[];
  difficulties:CoopTier[];
  preBossRoomMin:number;
  preBossRoomMax:number;
  estimatedMinutes:{min:number;max:number};
  tierMinLevels:Record<CoopTier,number>;
}

const artById:Record<string,{card:CoopUiAssetId;hero?:CoopUiAssetId}>={
  EXP_001:{card:'forest_thumbnail',hero:'rootbound_hero'},EXP_002:{card:'forest_thumbnail'},
  EXP_003:{card:'lava_thumbnail'},EXP_004:{card:'lava_thumbnail'},
  COP_007:{card:'ice_thumbnail'},COP_008:{card:'ice_thumbnail'},COP_009:{card:'ice_thumbnail'},
  EXP_007:{card:'sunken_thumbnail'},EXP_008:{card:'sunken_thumbnail'},
};
const supportedRooms=new Set<CoopRoomType>(['battle','elite','event','shrine','camp','treasure','merchant','echo','risk','boss']);

export function presentCoopDungeon(source:CoopDungeonProjection):CoopDungeonView{
  const art=artById[source.id],enabledRoomTypes=(source.enabledRoomTypes??[]).filter(room=>supportedRooms.has(room));
  return {...source,artId:art?.card,heroArtId:art?.hero??art?.card,available:source.available??!source.lockedReason,
    description:source.description?.trim()||'Authoritative description unavailable.',recommendedLevel:source.recommendedLevel??source.syncLevel,
    enabledRoomTypes,difficulties:[...new Set(source.difficulties??[])],preBossRoomMin:source.preBossRoomMin??5,preBossRoomMax:source.preBossRoomMax??5,
    estimatedMinutes:source.estimatedMinutes??{min:6,max:8},tierMinLevels:{1:source.tierMinLevels?.[1]??source.minLevel,2:source.tierMinLevels?.[2]??source.minLevel+5,3:source.tierMinLevels?.[3]??source.minLevel+10,4:source.tierMinLevels?.[4]??source.minLevel+15,5:source.tierMinLevels?.[5]??source.minLevel+20}};
}

export function filterCoopDungeons(dungeons:CoopDungeonView[],filter:'all'|'available'):CoopDungeonView[]{
  return filter==='available'?dungeons.filter(dungeon=>dungeon.available):dungeons;
}

export function groupCoopDungeonsByRegion(dungeons:CoopDungeonView[]):Array<{region:string;dungeons:CoopDungeonView[];availableCount:number}>{
  const groups=new Map<string,CoopDungeonView[]>();
  for(const dungeon of dungeons){const region=dungeon.region?.trim()||'Other';groups.set(region,[...(groups.get(region)??[]),dungeon])}
  return [...groups].map(([region,items])=>{const sorted=[...items].sort((a,b)=>a.minLevel-b.minLevel||a.name.localeCompare(b.name));return{region,dungeons:sorted,availableCount:sorted.filter(item=>item.available).length}});
}

export function coopTierEligibility(dungeon:CoopDungeonView,tier:CoopTier,currentLevel:number):{eligible:boolean;requiredLevel:number}{
  const requiredLevel=dungeon.tierMinLevels[tier];
  return{eligible:dungeon.available&&dungeon.difficulties.includes(tier)&&Number.isInteger(currentLevel)&&currentLevel>=requiredLevel,requiredLevel};
}

export function highestEligibleCoopTier(dungeon:CoopDungeonView,currentLevel:number):CoopTier|undefined{
  if(!dungeon.available||!Number.isInteger(currentLevel))return undefined;
  return [...dungeon.difficulties].sort((a,b)=>b-a).find(tier=>currentLevel>=dungeon.tierMinLevels[tier]);
}

export function validateCoopDungeonView(view:CoopDungeonView):void{
  if(!view.id||!view.name||view.minLevel<1||view.recommendedLevel<view.minLevel)throw new Error('invalid_dungeon_projection');
  if(!view.available&&!view.lockedReason)throw new Error('locked_reason_required');
  if(view.preBossRoomMin!==5||view.preBossRoomMax!==5)throw new Error('invalid_route_room_range');
  if(view.estimatedMinutes.min!==6||view.estimatedMinutes.max!==8)throw new Error('invalid_run_duration_target');
  if(view.difficulties.some(tier=>view.tierMinLevels[tier]<view.minLevel))throw new Error('invalid_tier_level_requirement');
  if(view.difficulties.some(tier=>tier<1||tier>5))throw new Error('invalid_difficulty');
}
