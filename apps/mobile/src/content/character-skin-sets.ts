import type {ClassId} from '../core/types';
import {EQUIPMENT_SETS} from './equipment-sets';
/**
 * V33 fresh-start registry.
 * All legacy novice/progression/standalone/event equipment-skin art entries were intentionally removed.
 * Preserve only the fixed approved male and female mannequin/base-character assets.
 * Hair, skin-tone, face, and procedural appearance variation are not part of the v33 design.
 * New generated skins should be rendered directly on those two fixed mannequins and registered only after both variants pass visual review.
 */
export interface CharacterSkinSetDef {id:string;classId:ClassId;name:string;appearanceId:string;itemIds:string[];unlockEventSkinId?:string;}
export const CHARACTER_SKIN_SETS:CharacterSkinSetDef[]=EQUIPMENT_SETS
  .filter(set=>set.appearanceId)
  .map(set=>({id:set.id,classId:set.classId,name:set.name,appearanceId:set.appearanceId!,itemIds:set.itemIds}));
export function characterSkinSetsFor(classId:ClassId){return CHARACTER_SKIN_SETS.filter(set=>set.classId===classId);}
