import type {ClassId} from '../core/types';
/**
 * V33 fresh-start registry.
 * All legacy novice/progression/standalone/event equipment-skin art entries were intentionally removed.
 * Preserve only the fixed approved male and female mannequin/base-character assets.
 * Hair, skin-tone, face, and procedural appearance variation are not part of the v33 design.
 * New generated skins should be rendered directly on those two fixed mannequins and registered only after both variants pass visual review.
 */
export interface CharacterSkinSetDef {id:string;classId:ClassId;name:string;appearanceId:string;itemIds:string[];unlockEventSkinId?:string;}
export const CHARACTER_SKIN_SETS:CharacterSkinSetDef[]=[];
export function characterSkinSetsFor(_classId:ClassId){return [] as CharacterSkinSetDef[];}
