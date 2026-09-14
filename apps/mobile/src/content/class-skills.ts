import type {ClassId} from '../core/types';
export interface ClassSkillDefinition{id:string;name:string;theme:string;}
const skill=(id:string,name:string,theme:string):ClassSkillDefinition=>({id,name,theme});
const guard=skill('guardcraft','Guardcraft','Physical protection'),ward=skill('warding','Warding','Magical protection');
/** Seven workbook pairs, with the two additional tank classes using matching disciplines. */
export const CLASS_SKILLS:Record<ClassId,readonly [ClassSkillDefinition,ClassSkillDefinition]>={
 IRONWARDEN:[guard,ward],BASTION:[guard,ward],DREADGUARD:[skill('might','Might','Weapon power'),ward],
 DAWNKEEPER:[skill('restoration','Restoration','Healing and recovery'),skill('sanctity','Sanctity','Protection and cleansing')],
 WAYFINDER:[skill('marksmanship','Marksmanship','Ranged power'),skill('tracking','Tracking','Hunting precision')],
 RAVAGER:[skill('might','Might','Weapon power'),skill('breaking','Breaking','Armor pressure')],
 HEXWEAVER:[skill('spellcraft','Spellcraft','Magical power'),skill('hexcraft','Hexcraft','Hex potency')],
 KNIFE_DANCER:[skill('blade_rhythm','Blade Rhythm','Attack rhythm'),skill('precision','Precision','Accuracy and evasion')],
 STONECALLER:[skill('resonance','Resonance','Support and recovery'),skill('geomancy','Geomancy','Protection and resilience')],
};
export const classSkillsFor=(id:ClassId)=>CLASS_SKILLS[id];
