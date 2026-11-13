import {ALL_COMBAT_COMPANIONS,COMBAT_COMPANIONS} from '../content/combat-companions';
import {WORLD_ZONES} from '../content/world-map';
import type {CompanionDefinition} from './combat-companion-types';

/**
 * Discovery groups reflect content release state, not ownership.
 * Keep unreleased seasonal definitions out of the visible roster; only their
 * aggregate count is shown, so future event identities cannot leak.
 */
export type CompanionIndexGroup='available'|'event'|'comingSoon';
const playerFacingIds=new Set(COMBAT_COMPANIONS.map(def=>def.id));
const pendingRegionOrigins=new Set(WORLD_ZONES.filter(zone=>zone.availability==='inDevelopment').map(zone=>'REG_'+zone.id));

export function companionIndexGroup(def:CompanionDefinition):CompanionIndexGroup{
 if(def.origin.type==='event')return playerFacingIds.has(def.id)?'event':'comingSoon';
 return pendingRegionOrigins.has(def.origin.id)?'comingSoon':'available';
}

export const COMPANION_INDEX_COUNTS:Readonly<Record<CompanionIndexGroup,number>>={
 available:COMBAT_COMPANIONS.filter(def=>companionIndexGroup(def)==='available').length,
 event:COMBAT_COMPANIONS.filter(def=>companionIndexGroup(def)==='event').length,
 comingSoon:ALL_COMBAT_COMPANIONS.filter(def=>companionIndexGroup(def)==='comingSoon').length,
};

export const UNRELEASED_SEASONAL_COMPANION_COUNT=ALL_COMBAT_COMPANIONS.filter(def=>
 def.origin.type==='event'&&!playerFacingIds.has(def.id)
).length;
