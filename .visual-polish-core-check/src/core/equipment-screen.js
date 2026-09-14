"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EQUIPMENT_SLOT_LABELS = exports.EQUIPMENT_SLOT_ORDER = void 0;
exports.equipmentScreenModel = equipmentScreenModel;
const loadouts_1 = require("../content/loadouts");
const items_1 = require("../content/items");
const game_1 = require("./game");
const equipment_enhancement_1 = require("./equipment-enhancement");
exports.EQUIPMENT_SLOT_ORDER = ['helmet', 'amulet', 'chest', 'ring', 'gloves', 'weapon', 'legs', 'offhand', 'boots', 'cape'];
exports.EQUIPMENT_SLOT_LABELS = { helmet: 'Helmet', amulet: 'Amulet', chest: 'Chest', ring: 'Ring', gloves: 'Gloves', weapon: 'Weapon', legs: 'Legs', offhand: 'Off-hand', boots: 'Boots', cape: 'Cape' };
function equipmentScreenModel(state) {
    if (!state.character)
        throw new Error('Equipment requires a character');
    const stats = (0, game_1.effectiveStats)(state), readiness = (0, game_1.regionalReadiness)(state);
    const slots = exports.EQUIPMENT_SLOT_ORDER.map(slot => { const itemId = state.character.equipment[slot], enhancement = itemId ? (0, equipment_enhancement_1.gearEnhancement)(state, itemId) : undefined; return { slot, label: exports.EQUIPMENT_SLOT_LABELS[slot], itemId, item: itemId ? (0, items_1.itemDef)(itemId) : undefined, enhancement, enhancedStats: itemId ? (0, equipment_enhancement_1.enhancedGearStats)(state, itemId) : undefined, socketCapacity: itemId ? (0, equipment_enhancement_1.gemSocketCapacity)(itemId) : 0 }; });
    return { slots, equippedCount: slots.filter(slot => slot.item).length, stats: { maxHp: stats.hp, currentHp: state.character.currentHp, attack: stats.attack, defense: stats.defense, power: stats.power, readiness: readiness.total }, loadouts: (0, loadouts_1.equipmentLoadoutGuidesFor)(state.character.classId) };
}
