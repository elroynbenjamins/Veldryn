/** HIDDEN authoritative Equipment 2.0 family eligibility. Not a live V33 rule.
 * Role and original maker/class theme are advisory; families and hand slots are enforced.
 * No arbitrary damage penalty when a compatible class uses another class's armament.
 */
export const V2_EQUIPMENT_FAMILY_CLASSES = {
 sword:['IRONWARDEN','BASTION','RAVAGER','DREADGUARD'],
 axe:['IRONWARDEN','BASTION','RAVAGER','DREADGUARD'],
 mace:['IRONWARDEN','BASTION','RAVAGER','DREADGUARD','DAWNKEEPER'],
 greatblade:['RAVAGER','DREADGUARD'],
 scourge:['DREADGUARD','RAVAGER'],
 bow:['WAYFINDER'],
 daggers:['KNIFE_DANCER','WAYFINDER'],
 wand:['HEXWEAVER','STONECALLER','DAWNKEEPER'],
 staff:['HEXWEAVER','STONECALLER','DAWNKEEPER'],
 shield:['IRONWARDEN','BASTION','DAWNKEEPER','DREADGUARD'],
 focus:['HEXWEAVER','STONECALLER','DAWNKEEPER'],
} as const;
export type V2EquipmentFamily=keyof typeof V2_EQUIPMENT_FAMILY_CLASSES;
export function v2EquipmentFamilyCompatible(classId:string,family:string):boolean{
 return Object.prototype.hasOwnProperty.call(V2_EQUIPMENT_FAMILY_CLASSES,family)
  &&(V2_EQUIPMENT_FAMILY_CLASSES[family as V2EquipmentFamily] as readonly string[]).includes(classId);
}
export function v2EquipmentFamilyClasses(family:V2EquipmentFamily):readonly string[]{
 return V2_EQUIPMENT_FAMILY_CLASSES[family];
}
