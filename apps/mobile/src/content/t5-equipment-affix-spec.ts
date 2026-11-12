import type {GearSlot} from '../core/types';

export type T5EquipmentAffixStat='haste'|'critRate'|'evasion';

/** Exactly three of the ten T5 equipment slots carry a restrained secondary stat. */
export const T5_EQUIPMENT_AFFIX_BY_SLOT:Readonly<Partial<Record<GearSlot,T5EquipmentAffixStat>>>=Object.freeze({
  gloves:'haste',
  amulet:'critRate',
  boots:'evasion',
});

/** Affix pieces take modestly more regional material/time and award more profession XP. */
export const T5_AFFIX_MATERIAL_MULTIPLIER=1.15;
export const T5_AFFIX_TIME_MULTIPLIER=1.10;
export const T5_AFFIX_XP_MULTIPLIER=1.20;
export const T5_AFFIX_EXTRA_FIXATIVE=1;

export function isT5EquipmentAffixSlot(slot:GearSlot){return Boolean(T5_EQUIPMENT_AFFIX_BY_SLOT[slot]);}
