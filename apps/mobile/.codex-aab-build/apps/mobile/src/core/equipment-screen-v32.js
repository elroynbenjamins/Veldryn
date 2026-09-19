"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EQUIPMENT_SCREEN_RULES_V32 = void 0;
exports.equipmentBadgeV32 = equipmentBadgeV32;
exports.EQUIPMENT_SCREEN_RULES_V32 = { tabs: ['Equipped', 'Sets', 'Skins'], slotOrder: ['Helmet', 'Chest', 'Gloves', 'Legs', 'Boots', 'Weapon', 'Off-hand'], showRarityBorder: true, showUpgradeBadge: true, showTwoGemPips: true, showSetPipsOnArmorOnly: true, craftMissingFromEmptySlot: true, neverShowGenderToggle: true, neverShowPlayerMarketAction: true };
function equipmentBadgeV32(v) { return { rarity: v.rarity, upgrade: v.upgradeRank ? `+${v.upgradeRank}` : '', statGemFilled: Boolean(v.statGemId), effectGemFilled: Boolean(v.effectGemId) }; }
