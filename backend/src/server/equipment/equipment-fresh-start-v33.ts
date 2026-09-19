/**
 * Integration helper for the pre-release fresh Equipment 2.0 cutover.
 * Codex should call this through the repository's real save/account migration layer.
 * Preserve materials, currencies, pets, companions, profile cosmetics, the
 * character's male/female body choice, and account progression.
 * Remove only legacy equipment instances, equipped legacy item references, old equipment-set craft history and old equipment-skin selections/ownership.
 */
export interface FreshStartV33Result{removedEquipmentInstances:number;clearedEquippedSlots:number;removedEquipmentSkins:number;}
export const FRESH_START_V33_RULES={preserve:['materials','currencies','pets','companions','profileBackgrounds','profileBorders','maleFemaleBodyChoice','accountProgression'],remove:['legacyEquipmentInstances','legacyEquippedItemRefs','legacyEquipmentSetCraftHistory','legacyEquipmentSkinOwnership','legacyEquipmentSkinSelection','legacyHairSelection','legacySkinToneSelection','legacyFaceSelection','legacyBodyMorphSelection'],marketRemoved:true} as const;
