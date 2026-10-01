import {ClassId} from './types';
export interface ClassCombatStyle{name:string;description:string;speedMultiplier:number;damageTakenMultiplier:number;recoveryPct:number}
export const CLASS_COMBAT_STYLES:Record<ClassId,ClassCombatStyle>={
  IRONWARDEN:{name:'Runic Guard',description:'Reduces incoming damage by 12%.',speedMultiplier:.98,damageTakenMultiplier:.88,recoveryPct:.012},
  BASTION:{name:'Hold the Line',description:'Reduces incoming damage by 16%, but attacks more slowly.',speedMultiplier:.94,damageTakenMultiplier:.84,recoveryPct:.014},
  DREADGUARD:{name:'Dread Momentum',description:'Hunts 4% faster while retaining heavy protection.',speedMultiplier:1.04,damageTakenMultiplier:.94,recoveryPct:.010},
  DAWNKEEPER:{name:'Sunlit Guard',description:'Trades stronger protection for a slightly faster, steadier hunt.',speedMultiplier:1.03,damageTakenMultiplier:.94,recoveryPct:.001},
  WAYFINDER:{name:'Marked Quarry',description:'Hunts 8% faster through careful targeting.',speedMultiplier:1.08,damageTakenMultiplier:1,recoveryPct:.010},
  RAVAGER:{name:'Bloodrush',description:'Hunts 14% faster but takes 9% more damage.',speedMultiplier:1.14,damageTakenMultiplier:1.09,recoveryPct:.008},
  HEXWEAVER:{name:'Withering Hex',description:'Hunts 7% faster and weakens incoming attacks.',speedMultiplier:1.07,damageTakenMultiplier:.95,recoveryPct:.010},
  KNIFE_DANCER:{name:'Blade Rhythm',description:'Hunts 13% faster through rapid strikes.',speedMultiplier:1.13,damageTakenMultiplier:1.03,recoveryPct:.010},
  STONECALLER:{name:'Earthen Ward',description:'Strong damage reduction and offense at the cost of a slower hunt.',speedMultiplier:.95,damageTakenMultiplier:.91,recoveryPct:.001},
};
export const classCombatStyle=(id:ClassId)=>CLASS_COMBAT_STYLES[id];
