import {ClassId} from './types';
export interface ClassCombatStyle{name:string;description:string;speedMultiplier:number;damageTakenMultiplier:number;recoveryPct:number;onKillAttackHealPct?:number;soloHuntDamageMultiplier:number;soloHuntTempoMultiplier:number}
/** Ordinary solo hunts only: tanks convert counterpressure and supports convert idle
 * healing windows into offense. Dungeon, story-boss and PvP ability output is unchanged.
 * This compensates for sharply lower role Attack from gear; ordinary encounter
 * search time still caps rewards, and Tank mitigation is not changed.
 * Keep these bonuses separate from global class stats and weapon upgrades. */
export const CLASS_COMBAT_STYLES:Record<ClassId,ClassCombatStyle>={
  IRONWARDEN:{name:'Runic Guard',description:'Reduces incoming damage by 12%.',speedMultiplier:.98,damageTakenMultiplier:.88,recoveryPct:.012,soloHuntDamageMultiplier:1.85,soloHuntTempoMultiplier:1.08},
  BASTION:{name:'Hold the Line',description:'Reduces incoming damage by 16%, but attacks more slowly.',speedMultiplier:.94,damageTakenMultiplier:.84,recoveryPct:.014,soloHuntDamageMultiplier:1.90,soloHuntTempoMultiplier:1.08},
  DREADGUARD:{name:'Dread Momentum',description:'Hunts 4% faster while retaining heavy protection.',speedMultiplier:1.04,damageTakenMultiplier:.94,recoveryPct:.010,soloHuntDamageMultiplier:1.60,soloHuntTempoMultiplier:1.05},
  DAWNKEEPER:{name:'Sunlit Guard',description:'Trades stronger protection for a slightly faster, steadier hunt.',speedMultiplier:1.03,damageTakenMultiplier:.94,recoveryPct:.001,soloHuntDamageMultiplier:1.22,soloHuntTempoMultiplier:1.04},
  WAYFINDER:{name:'Marked Quarry',description:'Hunts 8% faster through careful targeting.',speedMultiplier:1.08,damageTakenMultiplier:1,recoveryPct:.010,soloHuntDamageMultiplier:1,soloHuntTempoMultiplier:1},
  RAVAGER:{name:'Bloodrush',description:'Hunts 14% faster, takes 9% more damage and restores a little HP after kills.',speedMultiplier:1.14,damageTakenMultiplier:1.09,recoveryPct:.008,soloHuntDamageMultiplier:1,soloHuntTempoMultiplier:1,onKillAttackHealPct:.01},
  HEXWEAVER:{name:'Withering Hex',description:'Hunts 7% faster and weakens incoming attacks.',speedMultiplier:1.07,damageTakenMultiplier:.95,recoveryPct:.010,soloHuntDamageMultiplier:1,soloHuntTempoMultiplier:1},
  KNIFE_DANCER:{name:'Blade Rhythm',description:'Hunts 13% faster and avoids 12% of incoming damage.',speedMultiplier:1.13,damageTakenMultiplier:.88,recoveryPct:.010,soloHuntDamageMultiplier:1,soloHuntTempoMultiplier:1},
  STONECALLER:{name:'Earthen Ward',description:'Strong damage reduction and offense at the cost of a slower hunt.',speedMultiplier:.95,damageTakenMultiplier:.91,recoveryPct:.001,soloHuntDamageMultiplier:1.04,soloHuntTempoMultiplier:1.06},
};
export const classCombatStyle=(id:ClassId)=>CLASS_COMBAT_STYLES[id];
