import {ClassId} from './types';
export interface ClassCombatStyle{name:string;description:string;speedMultiplier:number;damageTakenMultiplier:number;recoveryPct:number}
export const CLASS_COMBAT_STYLES:Record<ClassId,ClassCombatStyle>={
  IRONWARDEN:{name:'Runic Guard',description:'Reduces incoming damage by 12%.',speedMultiplier:.98,damageTakenMultiplier:.88,recoveryPct:.012},
  BASTION:{name:'Hold the Line',description:'Reduces incoming damage by 16%, but attacks more slowly.',speedMultiplier:.94,damageTakenMultiplier:.84,recoveryPct:.014},
  DREADGUARD:{name:'Dread Momentum',description:'Hunts 7% faster while retaining heavy protection.',speedMultiplier:1.07,damageTakenMultiplier:.94,recoveryPct:.010},
  DAWNKEEPER:{name:'Sunlit Mending',description:'Recovers 2.8% maximum health after each victory.',speedMultiplier:1,damageTakenMultiplier:.96,recoveryPct:.028},
  WAYFINDER:{name:'Marked Quarry',description:'Hunts 11% faster through careful targeting.',speedMultiplier:1.11,damageTakenMultiplier:1,recoveryPct:.010},
  RAVAGER:{name:'Bloodrush',description:'Hunts 14% faster but takes 9% more damage.',speedMultiplier:1.14,damageTakenMultiplier:1.09,recoveryPct:.008},
  HEXWEAVER:{name:'Withering Hex',description:'Hunts 9% faster and weakens incoming attacks.',speedMultiplier:1.09,damageTakenMultiplier:.95,recoveryPct:.010},
  KNIFE_DANCER:{name:'Blade Rhythm',description:'Hunts 13% faster through rapid strikes.',speedMultiplier:1.13,damageTakenMultiplier:1.03,recoveryPct:.010},
  STONECALLER:{name:'Earthen Renewal',description:'Reduces damage and recovers 2.2% health per victory.',speedMultiplier:.97,damageTakenMultiplier:.92,recoveryPct:.022},
};
export const classCombatStyle=(id:ClassId)=>CLASS_COMBAT_STYLES[id];
