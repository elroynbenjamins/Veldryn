import type {ClassId,GearSlot} from '../core/types';
import type {ItemDef} from './items';
import type {Recipe} from './skills';
import {EQUIPMENT_CRAFT_SKILL_BY_CLASS} from './equipment-recipes-v33';

export interface NoviceSetDef {id:string;classId:ClassId;name:string;appearanceId:string;weaponName:string;weaponAttack:number;offhandName?:string;slots:GearSlot[];setBonus:{name:string;attack:number;defense:number;hp:number;description:string};theme:{accent:string;identity:string;material:string};}
// Runtime v1 names, design v5 class mappings; budgets below are provisional prototype values.
const definitions:Omit<NoviceSetDef,'slots'>[]=[
  {id:'ironwarden_recruit',classId:'IRONWARDEN',name:'Ironwarden Recruit',appearanceId:'beginner-ironwarden-recruit',weaponName:'Recruit Sword',weaponAttack:6,offhandName:'Recruit Shield',setBonus:{name:'Runic Formation',attack:3,defense:8,hp:28,description:'+8 DEF and +28 HP while the full set is equipped.'},theme:{accent:'#83a9c8',identity:'Disciplined steel frontline',material:'Steel, blue cloth and field leather'}},
  {id:'wallkeeper_initiate',classId:'BASTION',name:'Wallkeeper Initiate',appearanceId:'beginner-wallkeeper-initiate',weaponName:'Initiate Tower Shield',weaponAttack:5,offhandName:'Initiate Guard Bell',setBonus:{name:'Unbroken Wall',attack:1,defense:12,hp:42,description:'+12 DEF and +42 HP while the full set is equipped.'},theme:{accent:'#d2a04d',identity:'Maximum defense and immovable presence',material:'Dark plate, gold trim and tower shield'}},
  {id:'chainwatch_novice',classId:'DREADGUARD',name:'Chainwatch Novice',appearanceId:'beginner-chainwatch-novice',weaponName:'Novice Chained Weapon',weaponAttack:7,offhandName:'Novice Shield',setBonus:{name:'Dread Chain',attack:7,defense:3,hp:18,description:'+7 ATK and +18 HP while the full set is equipped.'},theme:{accent:'#a97070',identity:'Relentless control at close range',material:'Black iron, chain and weathered hide'}},
  {id:'sunlamp_acolyte',classId:'DAWNKEEPER',name:'Sunlamp Acolyte',appearanceId:'beginner-sunlamp-acolyte',weaponName:'Acolyte Mace',weaponAttack:5,offhandName:'Acolyte Relic',setBonus:{name:'Sunlit Benediction',attack:3,defense:4,hp:55,description:'+55 HP and +3 ATK while the full set is equipped.'},theme:{accent:'#e2b849',identity:'Radiant support and sacred resolve',material:'Ivory cloth, bronze and sun-gold'}},
  {id:'trailbow_scout',classId:'WAYFINDER',name:'Trailbow Scout',appearanceId:'beginner-trailbow-scout',weaponName:'Scout Bow',weaponAttack:7,offhandName:'Scout Hunting Knife',setBonus:{name:'Trail Instinct',attack:8,defense:2,hp:12,description:'+8 ATK and +12 HP while the full set is equipped.'},theme:{accent:'#73a775',identity:'Mobile ranged pathfinder',material:'Greenwood, layered leather and moss cloth'}},
  {id:'breaksteel_marauder',classId:'RAVAGER',name:'Breaksteel Marauder',appearanceId:'beginner-breaksteel-marauder',weaponName:'Marauder Two-Handed Weapon',weaponAttack:8,offhandName:'Marauder War Charm',setBonus:{name:'Breaksteel Fury',attack:10,defense:0,hp:10,description:'+10 ATK while the full set is equipped.'},theme:{accent:'#b06746',identity:'Raw power and two-handed aggression',material:'Spiked iron, dark leather and rust-red cloth'}},
  {id:'runespark_adept',classId:'HEXWEAVER',name:'Runespark Adept',appearanceId:'accepted-front-runespark-adept',weaponName:'Adept Wand',weaponAttack:6,offhandName:'Adept Focus',setBonus:{name:'Runic Resonance',attack:8,defense:2,hp:22,description:'+8 ATK and +22 HP while the full set is equipped.'},theme:{accent:'#9a78d0',identity:'Arcane focus and runic control',material:'Violet weave, brass and crystal'}},
  {id:'twinstep_initiate',classId:'KNIFE_DANCER',name:'Twinstep Initiate',appearanceId:'beginner-twinstep-initiate',weaponName:'Initiate Main Blade',weaponAttack:6,offhandName:'Initiate Second Blade',setBonus:{name:'Twin Tempo',attack:9,defense:1,hp:8,description:'+9 ATK while the full set is equipped.'},theme:{accent:'#a9a8bd',identity:'Speed, precision and paired blades',material:'Light steel, charcoal cloth and soft leather'}},
  {id:'earthseal_disciple',classId:'STONECALLER',name:'Earthseal Disciple',appearanceId:'beginner-earthseal-disciple',weaponName:'Disciple Staff',weaponAttack:6,offhandName:'Disciple Totem',setBonus:{name:'Earthen Resonance',attack:4,defense:6,hp:34,description:'+6 DEF and +34 HP while the full set is equipped.'},theme:{accent:'#b49a66',identity:'Earthen endurance and primal support',material:'Stone, bark and ochre wool'}},
];
// Every first-crafted set is a full loadout, including a visible cape and two
// accessory slots. Rings and amulets do not alter the body sprite, but are
// required for the full equipment milestone and carry meaningful stats.
export const NOVICE_SETS:NoviceSetDef[]=definitions.map(set=>({...set,slots:['chest','weapon',...(set.offhandName?['offhand' as const]:[]),'gloves','boots','helmet','legs','cape','amulet','ring']}));
export function noviceSetFor(classId:ClassId){return NOVICE_SETS.find(set=>set.classId===classId)!}
export function noviceItemId(classId:ClassId,slot:GearSlot){return `NOVICE_${classId}_${slot.toUpperCase()}`}
export function noviceRecipeId(classId:ClassId,slot:GearSlot){return `CRAFT_${noviceItemId(classId,slot)}`}
export const NOVICE_STAGE:Partial<Record<GearSlot,number>>={chest:1,weapon:2,offhand:2,gloves:3,boots:3,helmet:4,legs:4,cape:4,amulet:5,ring:5};
const labels:Partial<Record<GearSlot,string>>={chest:'Armor',gloves:'Gloves',boots:'Boots',helmet:'Headpiece',legs:'Legguards',cape:'Cloak',amulet:'Amulet',ring:'Signet Ring'};
const prerequisite:Partial<Record<GearSlot,GearSlot>>={weapon:'chest',offhand:'chest',gloves:'weapon',boots:'weapon',helmet:'boots',legs:'boots',cape:'boots',amulet:'cape',ring:'amulet'};
export const NOVICE_ITEMS:ItemDef[]=NOVICE_SETS.flatMap(set=>set.slots.map(slot=>({
  id:noviceItemId(set.classId,slot),name:slot==='weapon'?set.weaponName:slot==='offhand'?set.offhandName!:`${set.name} ${labels[slot]}`,
  type:'gear',slot,classRestriction:set.classId,noviceSetId:set.id,value:5,readiness:1,
  attack:slot==='weapon'?set.weaponAttack:slot==='ring'?1:0,
  defense:slot==='weapon'?(set.classId==='BASTION'?2:set.classId==='DAWNKEEPER'?1:0):slot==='chest'?2:slot==='cape'?1:1,
  hp:slot==='chest'?6:slot==='legs'?4:slot==='helmet'?2:slot==='cape'?3:slot==='amulet'?5:slot==='weapon'&&set.classId==='STONECALLER'?5:0,
})));
export const NOVICE_RECIPES:Recipe[]=NOVICE_SETS.flatMap(set=>set.slots.map(slot=>{
  const stage=NOVICE_STAGE[slot]??4;
  const item=NOVICE_ITEMS.find(item=>item.id===noviceItemId(set.classId,slot))!;
  return {id:noviceRecipeId(set.classId,slot),name:item.name,skillId:EQUIPMENT_CRAFT_SKILL_BY_CLASS[set.classId],level:1,characterLevel:stage,classId:set.classId,noviceSetId:set.id,
    requiresCraftedItemId:prerequisite[slot]?noviceItemId(set.classId,prerequisite[slot]!):undefined,
    // Full loadouts include relic slots now. Keep their investment aligned with
    // the 2× progression economy rather than letting a 24-hour AFK session
    // fund several complete crafted sets.
    xp:stage*40,gold:(slot==='weapon'||slot==='amulet'||slot==='ring'?20:stage===4?15:10)*2,seconds:0,
    inputs:[{itemId:'COPPER_ORE',quantity:(stage>=4?16:slot==='chest'||slot==='weapon'?16:8)*2},{itemId:'GREENWOOD_LOG',quantity:(stage>=4?16:slot==='chest'||slot==='weapon'?16:8)*2},{itemId:'MOSS_FIBER',quantity:(stage>=5?8:4)*2}],
    output:{itemId:item.id,quantity:1}};
}));
