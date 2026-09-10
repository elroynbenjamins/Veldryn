import {WORLD_ZONES} from '../content/world-map';
import type {GameState} from './types';

/** Resolves the persisted player location, with a safe fallback for legacy saves. */
export function currentRegionId(state:GameState){
  const level=state.character?.level??1;
  const usable=(id?:string|null)=>WORLD_ZONES.find(zone=>zone.id===id&&level>=zone.minLevel)?.id;
  const saved=usable(state.currentRegionId);
  if(saved)return saved;
  const activityZone=usable(state.activity?.environment?.zoneId);
  if(activityZone)return activityZone;
  return WORLD_ZONES[0].id;
}

/** Compatibility name retained for existing callers and tests. */
export const currentCombatRegionId=currentRegionId;
