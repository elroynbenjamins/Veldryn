"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EQUIPMENT_SCREEN_RULES_V33 = exports.EQUIPMENT_SLOT_ORDER_V33 = void 0;
exports.EQUIPMENT_SLOT_ORDER_V33 = ['Helmet', 'Chest', 'Gloves', 'Legs', 'Boots', 'Weapon', 'Off-hand', 'Cape', 'Amulet', 'Ring'];
exports.EQUIPMENT_SCREEN_RULES_V33 = {
    tabs: ['Equipped', 'Sets', 'Skins'],
    slotOrder: exports.EQUIPMENT_SLOT_ORDER_V33,
    setThresholds: [2, 4, 6, 8, 10],
    allSlotsCountForSetBonus: true,
    skinCraftRequirement: 10,
    showRarityBorder: true, showUpgradeBadge: true, showTwoGemPips: true, craftMissingFromEmptySlot: true,
    neverShowGenderToggle: true, neverShowPlayerMarketAction: true,
    freshGeneratedEquipmentArtOnly: true,
};
