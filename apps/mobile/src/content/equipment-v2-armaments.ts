import type {ClassId} from '../core/types';
import type {EquipmentV2Profile,EquipmentV2Tier,EquipmentV2WeaponHands} from '../core/equipment-crafting-v2-foundation';
import {equipmentV2PreviewArmamentStats,equipmentV2PreviewBaseStats} from '../core/equipment-crafting-v2-foundation';
import {EQUIPMENT_V2_CLASS_WEAPONS} from './equipment-v2-catalog';

/** HIDDEN class-compatible weapon and off-hand archetype templates for all four
 * early tiers. They do not spawn items or change current equip restrictions.
 */
export interface V2Armament{
 id:string;name:string;tier:EquipmentV2Tier;classId:ClassId;slot:'weapon'|'offhand';
 profile:EquipmentV2Profile;hands:EquipmentV2WeaponHands;material:'steel'|'leather'|'cloth';
}
export interface V2ClassArmamentSpec{
 classId:ClassId;weaponName:string;weaponProfile:EquipmentV2Profile;hands:EquipmentV2WeaponHands;
 material:'steel'|'leather'|'cloth';offhandName?:string;offhandProfile?:EquipmentV2Profile;
}
const V2_CLASS_OFFHAND_DESIGN:Readonly<Record<ClassId,{material:'steel'|'leather'|'cloth';offhandName?:string;offhandProfile?:EquipmentV2Profile}>>={
 IRONWARDEN:{material:'steel',offhandName:'Guardian Shield',offhandProfile:'defense_health'},
 BASTION:{material:'steel',offhandName:'Tower Shield',offhandProfile:'defense_health'},
 DREADGUARD:{material:'steel'},
 WAYFINDER:{material:'leather'},
 RAVAGER:{material:'steel'},
 HEXWEAVER:{material:'cloth',offhandName:'Hex Focus',offhandProfile:'attack_defense'},
 KNIFE_DANCER:{material:'leather'},
 DAWNKEEPER:{material:'steel',offhandName:'Dawn Aegis',offhandProfile:'defense_health'},
 STONECALLER:{material:'cloth'},
};
export const V2_CLASS_ARMAMENT_SPECS:readonly V2ClassArmamentSpec[]=EQUIPMENT_V2_CLASS_WEAPONS.map(weapon=>({
 classId:weapon.classId,weaponName:weapon.name,weaponProfile:weapon.profile,hands:weapon.hands,
 ...V2_CLASS_OFFHAND_DESIGN[weapon.classId],
}));
const TIER_NAMES:Readonly<Record<EquipmentV2Tier,string>>={
 1:'Fieldborn',2:'Ironwood',3:'Sunscar',4:'Glassbound',
};
export const EQUIPMENT_V2_ARMAMENTS:readonly V2Armament[]=
 ([1,2,3,4] as const).flatMap(tier=>V2_CLASS_ARMAMENT_SPECS.flatMap(spec=>{
  const base={tier,classId:spec.classId,material:spec.material};
  const weapon:V2Armament={...base,slot:'weapon',profile:spec.weaponProfile,hands:spec.hands,
   id:'EQ2_WEAPON_T'+tier+'_'+spec.classId,name:TIER_NAMES[tier]+' '+spec.weaponName};
  if(!spec.offhandName||!spec.offhandProfile)return [weapon];
  const offhand:V2Armament={...base,slot:'offhand',profile:spec.offhandProfile,hands:'one',
   id:'EQ2_OFFHAND_T'+tier+'_'+spec.classId,name:TIER_NAMES[tier]+' '+spec.offhandName};
  return [weapon,offhand];
 }));
export function equipmentV2ArmamentStats(item:V2Armament,quality=50,rarityMultiplier=1){
 return item.slot==='weapon'
  ?equipmentV2PreviewArmamentStats(item.tier,item.profile,item.hands,quality,rarityMultiplier)
  :equipmentV2PreviewBaseStats(item.tier,'offhand',item.profile,quality,rarityMultiplier);
}
export function equipmentV2ClassLoadoutArmaments(tier:EquipmentV2Tier,classId:ClassId){
 return EQUIPMENT_V2_ARMAMENTS.filter(row=>row.tier===tier&&row.classId===classId);
}
