import type {ClassId,GearSlot} from '../core/types';
import type {ItemDef} from './items';
import type {Recipe} from './skills';

export interface NoviceSetDef {id:string;classId:ClassId;name:string;weaponName:string;weaponAttack:number;offhandName?:string;slots:GearSlot[];theme:{accent:string;identity:string;material:string};}
// Runtime v1 names, design v5 class mappings; budgets below are provisional prototype values.
const definitions:Omit<NoviceSetDef,'slots'>[]=[
  {id:'ironwarden_recruit',classId:'IRONWARDEN',name:'Ironwarden Recruit',weaponName:'Recruit Sword',weaponAttack:6,offhandName:'Recruit Shield',theme:{accent:'#83a9c8',identity:'Disciplined steel frontline',material:'Steel, blue cloth and field leather'}},
  {id:'wallkeeper_initiate',classId:'BASTION',name:'Wallkeeper Initiate',weaponName:'Initiate Tower Shield',weaponAttack:5,theme:{accent:'#d2a04d',identity:'Maximum defense and immovable presence',material:'Dark plate, gold trim and tower shield'}},
  {id:'chainwatch_novice',classId:'DREADGUARD',name:'Chainwatch Novice',weaponName:'Novice Chained Weapon',weaponAttack:7,offhandName:'Novice Shield',theme:{accent:'#a97070',identity:'Relentless control at close range',material:'Black iron, chain and weathered hide'}},
  {id:'sunlamp_acolyte',classId:'DAWNKEEPER',name:'Sunlamp Acolyte',weaponName:'Acolyte Mace',weaponAttack:5,offhandName:'Acolyte Relic',theme:{accent:'#e2b849',identity:'Radiant support and sacred resolve',material:'Ivory cloth, bronze and sun-gold'}},
  {id:'trailbow_scout',classId:'WAYFINDER',name:'Trailbow Scout',weaponName:'Scout Bow',weaponAttack:7,theme:{accent:'#73a775',identity:'Mobile ranged pathfinder',material:'Greenwood, layered leather and moss cloth'}},
  {id:'breaksteel_marauder',classId:'RAVAGER',name:'Breaksteel Marauder',weaponName:'Marauder Two-Handed Weapon',weaponAttack:8,theme:{accent:'#b06746',identity:'Raw power and two-handed aggression',material:'Spiked iron, dark leather and rust-red cloth'}},
  {id:'runespark_adept',classId:'HEXWEAVER',name:'Runespark Adept',weaponName:'Adept Wand',weaponAttack:6,offhandName:'Adept Focus',theme:{accent:'#9a78d0',identity:'Arcane focus and runic control',material:'Violet weave, brass and crystal'}},
  {id:'twinstep_initiate',classId:'KNIFE_DANCER',name:'Twinstep Initiate',weaponName:'Initiate Main Blade',weaponAttack:6,offhandName:'Initiate Second Blade',theme:{accent:'#a9a8bd',identity:'Speed, precision and paired blades',material:'Light steel, charcoal cloth and soft leather'}},
  {id:'earthseal_disciple',classId:'STONECALLER',name:'Earthseal Disciple',weaponName:'Disciple Staff',weaponAttack:6,offhandName:'Disciple Totem',theme:{accent:'#b49a66',identity:'Earthen endurance and primal support',material:'Stone, bark and ochre wool'}},
];
export const NOVICE_SETS:NoviceSetDef[]=definitions.map(set=>({...set,slots:['chest','weapon',...(set.offhandName?['offhand' as const]:[]),'gloves','boots','helmet','legs']}));
export function noviceSetFor(classId:ClassId){return NOVICE_SETS.find(set=>set.classId===classId)!}
export function noviceItemId(classId:ClassId,slot:GearSlot){return `NOVICE_${classId}_${slot.toUpperCase()}`}
export function noviceRecipeId(classId:ClassId,slot:GearSlot){return `CRAFT_${noviceItemId(classId,slot)}`}
export const NOVICE_STAGE:Partial<Record<GearSlot,number>>={chest:1,weapon:2,offhand:2,gloves:3,boots:3,helmet:4,legs:4};
const labels:Partial<Record<GearSlot,string>>={chest:'Armor',gloves:'Gloves',boots:'Boots',helmet:'Headpiece',legs:'Legguards'};
export const NOVICE_ITEMS:ItemDef[]=NOVICE_SETS.flatMap(set=>set.slots.map(slot=>({
  id:noviceItemId(set.classId,slot),name:slot==='weapon'?set.weaponName:slot==='offhand'?set.offhandName!:`${set.name} ${labels[slot]}`,
  type:'gear',slot,classRestriction:set.classId,noviceSetId:set.id,value:5,readiness:1,
  attack:slot==='weapon'?set.weaponAttack:0,
  defense:slot==='weapon'?(set.classId==='BASTION'?2:set.classId==='DAWNKEEPER'?1:0):slot==='chest'?2:1,
  hp:slot==='chest'?6:slot==='legs'?4:slot==='helmet'?2:slot==='weapon'&&set.classId==='STONECALLER'?5:0,
})));
export const NOVICE_RECIPES:Recipe[]=NOVICE_SETS.flatMap(set=>set.slots.map(slot=>{
  const stage=NOVICE_STAGE[slot]??4;
  const item=NOVICE_ITEMS.find(item=>item.id===noviceItemId(set.classId,slot))!;
  return {id:noviceRecipeId(set.classId,slot),name:item.name,skillId:'smithing',level:1,characterLevel:stage,classId:set.classId,noviceSetId:set.id,
    requiresCraftedItemId:stage===1?undefined:noviceItemId(set.classId,stage===2?'chest':stage===3?'weapon':'boots'),
    xp:20,gold:slot==='weapon'?20:10,seconds:0,
    inputs:[{itemId:'COPPER_ORE',quantity:slot==='chest'||slot==='weapon'?8:4},{itemId:'GREENWOOD_LOG',quantity:slot==='chest'||slot==='weapon'?8:4},{itemId:'MOSS_FIBER',quantity:2}],
    output:{itemId:item.id,quantity:1}};
}));
