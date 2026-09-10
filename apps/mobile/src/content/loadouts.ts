import type {ClassId} from '../core/types';

export interface EquipmentLoadoutGuide {
  id:string; name:string; classId:ClassId; gearProfile:string; useCase:string; weaponProfile:string; foodProfile:string;
}

/** Canonical v5.6 loadout guides. The offline save currently stores one live equipment set. */
export const EQUIPMENT_LOADOUT_GUIDES:EquipmentLoadoutGuide[]=[
  {id:'LOAD_001',name:'Arcane Tank',classId:'IRONWARDEN',gearProfile:'Runeward',useCase:'Magic bosses',weaponProfile:'Sword + Shield',foodProfile:'HP food · Ward potion'},
  {id:'LOAD_002',name:'Physical Tank',classId:'IRONWARDEN',gearProfile:'Ironwall',useCase:'Physical bosses',weaponProfile:'Sword + Shield',foodProfile:'Armor food · Armor potion'},
  {id:'LOAD_003',name:'Endurance Tank',classId:'IRONWARDEN',gearProfile:'Stoneheart',useCase:'Mixed or unavoidable damage',weaponProfile:'Sword + Shield',foodProfile:'HP food · Regen potion'},
  {id:'LOAD_004',name:'Rapid Cleanse',classId:'DAWNKEEPER',gearProfile:'Quickprayer',useCase:'Fast debuff fights',weaponProfile:'Mace + Relic',foodProfile:'Resource food · Haste potion'},
  {id:'LOAD_005',name:'Boss Tracker',classId:'WAYFINDER',gearProfile:'Tracker',useCase:'Boss hunts',weaponProfile:'Bow',foodProfile:'Accuracy food · Focus potion'},
  {id:'LOAD_006',name:'Precision Duelist',classId:'KNIFE_DANCER',gearProfile:'Duelist',useCase:'Evasive targets',weaponProfile:'Dual Blades',foodProfile:'Accuracy food · Haste potion'},
];

export function equipmentLoadoutGuidesFor(classId:ClassId){return EQUIPMENT_LOADOUT_GUIDES.filter(loadout=>loadout.classId===classId);}
