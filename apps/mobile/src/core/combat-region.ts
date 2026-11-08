import {WORLD_ZONES,worldZoneInDevelopment} from '../content/world-map';
import type {GameState} from './types';
import {regionTravelAvailability} from './world-navigation';

/** Resolves the persisted player location, with a safe fallback for legacy saves. */
export function currentRegionId(state:GameState){
  const level=state.character?.level??1;
  const usable=(id?:string|null)=>WORLD_ZONES.find(zone=>zone.id===id&&!worldZoneInDevelopment(zone)&&level>=zone.minLevel&&regionTravelAvailability(state,zone)==='available')?.id;
  const saved=usable(state.currentRegionId);
  if(saved)return saved;
  const activityZone=usable(state.activity?.environment?.zoneId);
  if(activityZone)return activityZone;
  // Existing saves may point into a newly story-locked *or unreleased* region.
  // Resolve to the nearest earlier playable region without altering stored progress.
  const savedZone=WORLD_ZONES.find(zone=>zone.id===state.currentRegionId);
  if(savedZone){
    const previous=[...WORLD_ZONES].reverse().find(zone=>zone.minLevel<savedZone.minLevel&&usable(zone.id));
    if(previous)return previous.id;
  }
  return WORLD_ZONES[0].id;
}

/** Compatibility name retained for existing callers and tests. */
export const currentCombatRegionId=currentRegionId;
