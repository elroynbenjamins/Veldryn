import {GATHERING} from '../content/skills';

/**
 * Which miniature scene represents a running gathering activity.
 * Presentation only: derived from the activity's own node definition, never from
 * anything the scene animates, and it grants or predicts nothing.
 */
export type GatheringSceneKind='mining'|'woodcutting'|'fishing';
export type GatheringSceneBiome='asterfall'|'sunscar'|'frostmarch'|'ashlands';
export interface GatheringSceneModel{
  kind:GatheringSceneKind;
  biome:GatheringSceneBiome;
  /** Resource the node yields; selects the ore vein or tree variant when art exists. */
  itemId:string;
  /** Underground water (fishing inside a mine) uses a cave backdrop instead of open sky. */
  cavePool:boolean;
}

const ZONE_BIOME:Readonly<Record<string,GatheringSceneBiome>>={SUNSCAR:'sunscar',FROSTMARCH:'frostmarch',ASHLANDS:'ashlands'};
const CAVE_ZONES=new Set(['OLD_MINES']);

/** Regions without a dedicated palette fall back to the temperate Asterfall look. */
export function gatheringSceneBiome(zoneId:string|undefined):GatheringSceneBiome{
  return (zoneId&&ZONE_BIOME[zoneId])||'asterfall';
}

export function isGatheringSceneKind(kind:string|undefined):kind is GatheringSceneKind{
  return kind==='mining'||kind==='woodcutting'||kind==='fishing';
}

export function gatheringSceneModel(activity:{kind:string;targetId:string}|null|undefined):GatheringSceneModel|undefined{
  if(!activity||!isGatheringSceneKind(activity.kind))return undefined;
  const node=GATHERING.find(entry=>entry.id===activity.targetId&&entry.skillId===activity.kind);
  if(!node)return undefined;
  return {
    kind:activity.kind,
    biome:gatheringSceneBiome(node.zoneId),
    itemId:node.itemId,
    cavePool:activity.kind==='fishing'&&CAVE_ZONES.has(node.zoneId),
  };
}

/** What the fishing scene is showing. A catch reaction exists only for a completed action. */
export type FishingScenePhase='cast'|'wait'|'pull';

/**
 * The next fishing phase. `actionCompleted` is true only when the activity clock crossed a
 * real action boundary; without it the angler keeps waiting and never plays a catch.
 */
export function nextFishingPhase(current:FishingScenePhase,event:'clipEnded'|'actionCompleted'):FishingScenePhase{
  if(event==='actionCompleted')return current==='wait'?'pull':current;
  if(current==='cast')return 'wait';
  if(current==='pull')return 'cast';
  return current;
}
