import {ASCENDANT_BLESSING_PARITY_APPROVED,ASCENDANT_PROGRESSION_BLESSINGS_RELEASED} from './release-flags';
/** Ascendant progression blessings are intentionally separate from legacy collectible bonuses.
 * The paid visual collection must not silently inherit ownedBps/activeBps or stack by ownership.
 * Authoritative ownership and free-equivalent parity are required before activation.
 */
export type AscendantBlessing='gathering_speed'|'skill_xp'|'combat_xp';
export type AscendantBlessingSlot='pet'|'background';

export const ASCENDANT_BLESSING_CHOICES:readonly AscendantBlessing[]=['gathering_speed','skill_xp','combat_xp'];
export const ASCENDANT_PET_BLESSING_BPS=500 as const;
export const ASCENDANT_BACKGROUND_BLESSING_BPS=300 as const;
/** Hard launch gate. Do not enable until gameplay-earned equivalent bonuses and settlement order are approved. */
export const ASCENDANT_PROGRESSION_BLESSINGS_ENABLED=ASCENDANT_PROGRESSION_BLESSINGS_RELEASED&&ASCENDANT_BLESSING_PARITY_APPROVED;

export interface AscendantBlessingSelection{
 blessing?:AscendantBlessing|null;
 /** Must describe the currently equipped cosmetic, not merely an owned cosmetic. */
 equipped:boolean;
 /** Must come from authoritative account ownership/entitlement validation. */
 owned:boolean;
 /** True only for an approved Ascendant blessing-bearing cosmetic. */
 eligible:boolean;
}
export interface AscendantBlessingInput{
 pet?:AscendantBlessingSelection|null;
 background?:AscendantBlessingSelection|null;
}
export type AscendantBlessingTotals=Readonly<Record<AscendantBlessing,number>>;

const ZERO:AscendantBlessingTotals={gathering_speed:0,skill_xp:0,combat_xp:0};
export function isAscendantBlessing(value:unknown):value is AscendantBlessing{
 return typeof value==='string'&&(ASCENDANT_BLESSING_CHOICES as readonly string[]).includes(value);
}
function slotBps(slot:AscendantBlessingSlot){return slot==='pet'?ASCENDANT_PET_BLESSING_BPS:ASCENDANT_BACKGROUND_BLESSING_BPS;}
function validSelection(row:AscendantBlessingSelection|undefined|null){
 return !!row&&row.equipped&&row.owned&&row.eligible&&isAscendantBlessing(row.blessing);
}
/** Review/simulation only: computes the approved 5%/3% contract without activating gameplay. */
export function previewAscendantBlessingTotals(input:AscendantBlessingInput):AscendantBlessingTotals{
 const out:{gathering_speed:number;skill_xp:number;combat_xp:number}={...ZERO};
 for(const [slot,row] of [['pet',input.pet],['background',input.background]] as const){
  if(validSelection(row))out[row!.blessing!]+=slotBps(slot);
 }
 return out;
}
/** Gameplay settlement must call this function. It is deliberately zero while the launch gate is closed. */
export function activeAscendantBlessingTotals(input:AscendantBlessingInput):AscendantBlessingTotals{
 if(!ASCENDANT_PROGRESSION_BLESSINGS_ENABLED)return ZERO;
 return previewAscendantBlessingTotals(input);
}
export function ascendantBlessingLabel(blessing:AscendantBlessing){
 return blessing==='gathering_speed'?'Gathering Speed':blessing==='skill_xp'?'Skill XP':'Combat XP';
}
