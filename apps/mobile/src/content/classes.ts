import { ClassId } from '../core/types';

export interface ClassDef {
  id: ClassId;
  name: string;
  role: 'Tank' | 'Support' | 'Damage';
  description: string;
  hp: number;
  attack: number;
  defense: number;
  starterEquipment: { weapon:string; offhand?:string };
}

export const CLASSES: ClassDef[] = [
  { id:'IRONWARDEN', name:'Ironwarden', role:'Tank', description:'Runic defender built around guard, threat and counterplay.', hp:155, attack:15, defense:19, starterEquipment:{weapon:'basic_sword'} },
  { id:'BASTION', name:'Bastion', role:'Tank', description:'Fortress tank using layered barriers and heavy protection.', hp:164, attack:14, defense:20, starterEquipment:{weapon:'basic_tower_shield'} },
  { id:'DREADGUARD', name:'Dreadguard', role:'Tank', description:'Aggressive control tank using threat, dread and self-sustain.', hp:150, attack:17, defense:17, starterEquipment:{weapon:'basic_chained_weapon'} },
  { id:'DAWNKEEPER', name:'Dawnkeeper', role:'Support', description:'Solar support focused on healing, cleansing and protection.', hp:118, attack:14, defense:13, starterEquipment:{weapon:'basic_mace'} },
  { id:'WAYFINDER', name:'Wayfinder', role:'Damage', description:'Precise ranged hunter with reliable sustained damage.', hp:110, attack:21, defense:11, starterEquipment:{weapon:'basic_bow'} },
  { id:'RAVAGER', name:'Ravager', role:'Damage', description:'Aggressive heavy melee fighter built around breaking defenses.', hp:128, attack:22, defense:10, starterEquipment:{weapon:'basic_two_handed_weapon'} },
  { id:'HEXWEAVER', name:'Hexweaver', role:'Damage', description:'Arcane damage caster weaving hexes through wand and focus.', hp:108, attack:17, defense:11, starterEquipment:{weapon:'basic_wand'} },
  { id:'KNIFE_DANCER', name:'Knife Dancer', role:'Damage', description:'Fast melee attacker built around precision, crits and execution.', hp:106, attack:22, defense:10, starterEquipment:{weapon:'basic_main_hand_blade'} },
  { id:'STONECALLER', name:'Stonecaller', role:'Support', description:'Earth-and-storm support caster using resonance, geomancy and totems.', hp:120, attack:20, defense:12, starterEquipment:{weapon:'basic_staff'} },
];
