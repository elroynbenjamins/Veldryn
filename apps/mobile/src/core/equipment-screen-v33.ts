export const EQUIPMENT_SLOT_ORDER_V33=['Helmet','Chest','Gloves','Legs','Boots','Weapon','Off-hand','Cape','Amulet','Ring'] as const;
export const EQUIPMENT_SCREEN_RULES_V33={
 tabs:['Equipped','Sets','Skins'] as const,
 slotOrder:EQUIPMENT_SLOT_ORDER_V33,
 setThresholds:[2,4,6,8,10] as const,
 allSlotsCountForSetBonus:true,
 skinCraftRequirement:10,
 showRarityBorder:true,showUpgradeBadge:true,showTwoGemPips:true,craftMissingFromEmptySlot:true,
 neverShowGenderToggle:true,neverShowPlayerMarketAction:true,
 freshGeneratedEquipmentArtOnly:true,
} as const;
