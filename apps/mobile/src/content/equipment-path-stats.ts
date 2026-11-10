import type {ClassId} from '../core/types';

/** The shipped V33 catalog has exactly two paths per class and tier. */
export type EquipmentSetPath='Foundation'|'Alternate';
export interface FlatEquipmentStats{attack:number;defense:number;hp:number}

/** One budget point is one Attack, one Defense, or four Max HP. */
export const EQUIPMENT_PATH_HP_PER_POINT=4;
/**
 * These weights exactly match the sum of the existing ten V33 slot templates:
 * 21 Attack, 33 Defense and 76 HP = 73 budget points.
 * Using the same neutral anchor for both paths means their average full-set
 * Attack/Defense/HP totals remain equal to the previous implementation.
 */
const FULL_SET_BUDGET=73;
const NEUTRAL_ANCHOR=.26;
const ORIGINAL_FULL_SET_SHARES={
  attack:21/FULL_SET_BUDGET,
  defense:33/FULL_SET_BUDGET,
  hp:19/FULL_SET_BUDGET,
} as const;

/**
 * Alternate's direction relative to the neutral profile, measured in budget
 * shares. Foundation takes the exact opposite direction. These sum to zero:
 * neither path receives extra aggregate gear budget or stronger rarity rolls.
 * - Damage classes + Ironwarden/Dreadguard: consistency/guard vs pressure.
 * - Bastion: mitigation vs maximum-health/barrier-oriented preparation.
 * - Dawnkeeper/Stonecaller: active throughput vs protective utility.
 */
const ALTERNATE_BUDGET_SHIFTS:Readonly<Record<ClassId,Readonly<{attack:number;defense:number;hp:number}>>>={
  IRONWARDEN:{attack:.035,defense:-.022,hp:-.013},
  BASTION:{attack:0,defense:-.035,hp:.035},
  DREADGUARD:{attack:.035,defense:-.022,hp:-.013},
  DAWNKEEPER:{attack:-.035,defense:.022,hp:.013},
  WAYFINDER:{attack:.035,defense:-.022,hp:-.013},
  RAVAGER:{attack:.035,defense:-.022,hp:-.013},
  HEXWEAVER:{attack:.035,defense:-.022,hp:-.013},
  KNIFE_DANCER:{attack:.035,defense:-.022,hp:-.013},
  STONECALLER:{attack:-.035,defense:.035,hp:0},
};

/**
 * Reallocate each piece's EXISTING flat budget between two competing builds.
 * A small shared neutral anchor allows armor to carry a little offense and
 * weapons to carry a little protection, so the choice is visible on every
 * slot, even when its former primary stat was zero.
 *
 * No new item IDs, tiers, recipes, rarity, quality or set thresholds are added.
 * This runs before enhancements/rarity/quality, so every UI and combat stat
 * consumer gets the same actual values rather than a cosmetic preview boost.
 */
export function equipmentStatsForSetPath(classId:ClassId,path:string,base:FlatEquipmentStats):FlatEquipmentStats{
  if(path!=='Foundation'&&path!=='Alternate')throw new Error('Unknown equipment set path: '+path);
  if(!Number.isFinite(base.attack)||!Number.isFinite(base.defense)||!Number.isFinite(base.hp)
    ||base.attack<0||base.defense<0||base.hp<0)throw new Error('Invalid base equipment stats');
  const shift=ALTERNATE_BUDGET_SHIFTS[classId];
  if(!shift)throw new Error('Unknown equipment class: '+classId);
  const budget=base.attack+base.defense+base.hp/EQUIPMENT_PATH_HP_PER_POINT;
  const sign=path==='Alternate'?1:-1;
  const neutralAttack=(1-NEUTRAL_ANCHOR)*base.attack+NEUTRAL_ANCHOR*budget*ORIGINAL_FULL_SET_SHARES.attack;
  const neutralDefense=(1-NEUTRAL_ANCHOR)*base.defense+NEUTRAL_ANCHOR*budget*ORIGINAL_FULL_SET_SHARES.defense;
  const neutralHpBudget=(1-NEUTRAL_ANCHOR)*(base.hp/EQUIPMENT_PATH_HP_PER_POINT)
    +NEUTRAL_ANCHOR*budget*ORIGINAL_FULL_SET_SHARES.hp;
  const round=(value:number)=>Number(value.toFixed(6));
  return {
    attack:round(neutralAttack+sign*budget*shift.attack),
    defense:round(neutralDefense+sign*budget*shift.defense),
    hp:round((neutralHpBudget+sign*budget*shift.hp)*EQUIPMENT_PATH_HP_PER_POINT),
  };
}
