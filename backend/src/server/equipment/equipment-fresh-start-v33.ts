/**
 * Integration helper for the pre-release fresh Equipment 2.0 cutover.
 * Codex should call this through the repository's real save/account migration layer.
 * Preserve materials, currencies, pets, companions, profile cosmetics, the
 * character's male/female body choice, and account progression.
 * Remove only legacy equipment instances, equipped legacy item references, old equipment-set craft history and retired appearance data.
 */
export interface FreshStartV33Result{removedEquipmentInstances:number;clearedEquippedSlots:number;}
export const FRESH_START_V33_RULES={preserve:['materials','currencies','pets','companions','profileBackgrounds','profileBorders','maleFemaleBodyChoice','accountProgression'],remove:['legacyEquipmentInstances','legacyEquippedItemRefs','legacyEquipmentSetCraftHistory','retiredAppearanceData'],marketRemoved:true} as const;
