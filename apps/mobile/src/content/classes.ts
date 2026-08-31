import { ClassId } from '../core/types';

export interface ClassDef {
  id: ClassId;
  name: string;
  role: 'Tank' | 'Support' | 'Damage';
  description: string;
  hp: number;
  attack: number;
  defense: number;
}

export const CLASSES: ClassDef[] = [
  { id:'IRONWARDEN', name:'Ironwarden', role:'Tank', description:'Runic defender built to survive difficult enemies.', hp:155, attack:15, defense:19 },
  { id:'DAWNKEEPER', name:'Dawnkeeper', role:'Support', description:'Solar healer with steady recovery and protection.', hp:118, attack:14, defense:13 },
  { id:'WAYFINDER', name:'Wayfinder', role:'Damage', description:'Precise ranged hunter with reliable damage.', hp:110, attack:21, defense:11 },
  { id:'RAVAGER', name:'Ravager', role:'Damage', description:'Aggressive bruiser that trades safety for power.', hp:128, attack:22, defense:10 },
  { id:'HEXWEAVER', name:'Hexweaver', role:'Damage', description:'Caster using curses and spell chains.', hp:102, attack:23, defense:9 },
  { id:'KNIFE_DANCER', name:'Knife Dancer', role:'Damage', description:'Fast melee attacker built around precision.', hp:106, attack:22, defense:10 },
  { id:'STONECALLER', name:'Stonecaller', role:'Support', description:'Utility support using stone, storm and light healing.', hp:126, attack:15, defense:14 },
];
