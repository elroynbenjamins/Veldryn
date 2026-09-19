export type CharacterBodyVariantV33='male'|'female';

/**
 * V33 appearance policy: character art uses exactly two fixed approved mannequins.
 * There are no runtime hair, skin-tone, face, or body-composition options.
 */
export const CHARACTER_BODY_VARIANTS_V33:readonly CharacterBodyVariantV33[]=['male','female'];
export const CHARACTER_APPEARANCE_VARIATION_V33={
  hair:false,
  skinTone:false,
  face:false,
  runtimeComposition:false,
  equipmentPiecePaperDoll:false,
  fullSetSkinOnFixedMannequin:true,
} as const;

export function normalizeCharacterBodyVariantV33(value:unknown):CharacterBodyVariantV33{
  return value==='female'?'female':'male';
}
