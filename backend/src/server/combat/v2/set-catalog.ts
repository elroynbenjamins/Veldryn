/**
 * Equipment 2.0 set-family structure from the v0.6 concept.
 * Structural definitions only: no gear is issued, modified, or rerolled.
 * Numerical set effects remain unapproved and are intentionally absent.
 */
import type {SetFamilyV2} from './build-contract';

export const EQUIPMENT_TIERS_V2 = ['T1','T2','T3','T4','T5'] as const;
export type EquipmentTierV2 = (typeof EQUIPMENT_TIERS_V2)[number];

export const SET_FAMILIES_V2:readonly SetFamilyV2[] = [
  {id:'oathplate',role:'tank',slots:['helmet','chest','legs','cape'],thresholds:[2,4]},
  {id:'citadel',role:'tank',slots:['helmet','chest','legs','boots','cape','ring'],thresholds:[2,4,6]},
  {id:'bloodsteel',role:'tank',slots:['gloves','boots','amulet','ring'],thresholds:[2,4]},
  {id:'vigilhide',role:'tank',slots:['helmet','gloves','boots'],thresholds:[2,3]},
  {id:'quickstep',role:'damage',slots:['gloves','boots','cape'],thresholds:[2,3]},
  {id:'horizon',role:'damage',slots:['helmet','gloves','amulet','ring'],thresholds:[2,4]},
  {id:'blackscript',role:'damage',slots:['chest','legs','boots','cape'],thresholds:[2,4]},
  {id:'breakerforge',role:'damage',slots:['helmet','chest','legs','boots','amulet','ring'],thresholds:[2,4,6]},
  {id:'brightweave',role:'support',slots:['chest','gloves','cape','amulet'],thresholds:[2,4]},
  {id:'stormthread',role:'support',slots:['helmet','gloves','boots'],thresholds:[2,3]},
  {id:'rootshield',role:'support',slots:['helmet','chest','legs','boots','cape','ring'],thresholds:[2,4,6]},
  {id:'echohide',role:'support',slots:['helmet','legs','boots','ring'],thresholds:[2,4]},
];

export interface TieredSetV2 extends SetFamilyV2 {
  tier:EquipmentTierV2;
  familyId:string;
}
export const TIERED_SETS_V2:readonly TieredSetV2[] = EQUIPMENT_TIERS_V2.flatMap(tier=>
  SET_FAMILIES_V2.map(family=>({
    ...family,
    id:'eq2_'+tier.toLowerCase()+'_'+family.id,
    tier,
    familyId:family.id,
  }))
);
export const SET_FAMILIES_BY_ID_V2:Readonly<Record<string,SetFamilyV2>>=
  Object.fromEntries(SET_FAMILIES_V2.map(family=>[family.id,family]));
export const TIERED_SETS_BY_ID_V2:Readonly<Record<string,TieredSetV2>>=
  Object.fromEntries(TIERED_SETS_V2.map(set=>[set.id,set]));

/**
 * Lookup for the future server-owned equipment catalog. This deliberately
 * returns a definition only; it never grants or transforms an item instance.
 */
export function tieredSetV2(familyId:string,tier:EquipmentTierV2):TieredSetV2|undefined {
  return TIERED_SETS_BY_ID_V2['eq2_'+tier.toLowerCase()+'_'+familyId];
}
