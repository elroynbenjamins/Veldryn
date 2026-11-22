import type {GearSlot} from '../core/types';
import type {ItemRarity} from '../core/item-rarity';

/**
 * Always-on signature stats for a small, curated group of rare T3/T4 sets.
 * These are definition-owned and shared by EVERY physical copy of a piece.
 * They are NOT random affixes and do not require a set-piece threshold.
 *
 * Basis points: 100 = 1.0 percentage point of the relevant combat modifier.
 * The catalog's role/path/set IDs are authoritative; do not infer bonuses
 * from the name, a guessed color, an instance roll, or the user's class.
 */
export type EquipmentInnatePercentStat='maxHp'|'armor'|'ward'|'critRate'|'haste'|'evasion';
export interface EquipmentInnatePercent {
  readonly stat:EquipmentInnatePercentStat;
  readonly basisPoints:number;
}
const SIGNATURE_RARE_PIECES:Readonly<Record<string,Readonly<Partial<Record<GearSlot,EquipmentInnatePercent>>>>>={
  T3_001:{chest:{stat:'armor',basisPoints:80},cape:{stat:'maxHp',basisPoints:50}},
  T3_007:{chest:{stat:'ward',basisPoints:70},gloves:{stat:'haste',basisPoints:40}},
  T3_013:{gloves:{stat:'critRate',basisPoints:50},boots:{stat:'evasion',basisPoints:40}},
  T4_001:{chest:{stat:'armor',basisPoints:110},cape:{stat:'maxHp',basisPoints:70}},
  T4_007:{chest:{stat:'ward',basisPoints:100},gloves:{stat:'haste',basisPoints:60}},
  T4_013:{gloves:{stat:'critRate',basisPoints:70},boots:{stat:'evasion',basisPoints:60}},
};
export const EQUIPMENT_INNATE_PERCENT_LABELS:Readonly<Record<EquipmentInnatePercentStat,string>>={
 maxHp:'Max HP',armor:'Armor',ward:'Ward',critRate:'Crit Rate',haste:'Haste',evasion:'Evasion',
};
export function equipmentInnatePercentForPiece(setId:string,slot:GearSlot,rarity:ItemRarity|undefined):EquipmentInnatePercent|undefined{
  if(rarity!=='rare')return undefined;
  return SIGNATURE_RARE_PIECES[setId]?.[slot];
}
export function equipmentInnatePercentLabel(bonus:EquipmentInnatePercent):string{
  return '+'+(bonus.basisPoints/100).toFixed(1)+'% '+EQUIPMENT_INNATE_PERCENT_LABELS[bonus.stat];
}
