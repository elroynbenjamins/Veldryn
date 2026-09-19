"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.faithBlessingDef = exports.HOLY_WATER_SOURCES = exports.FAITH_BLESSINGS = exports.FAITH_TIERS = exports.HOLY_WATER_ID = void 0;
exports.HOLY_WATER_ID = 'HOLY_WATER';
exports.FAITH_TIERS = [
    { id: 'FAITH_QUIET', name: 'Quiet prayer', level: 1, water: 1, xp: 120, seconds: 30 },
    { id: 'FAITH_CANDLE', name: 'Candle vigil', level: 10, water: 2, xp: 260, seconds: 30 },
    { id: 'FAITH_LITANY', name: 'Sacred litany', level: 25, water: 4, xp: 560, seconds: 30 },
    { id: 'FAITH_DEVOTION', name: 'Devotion', level: 40, water: 8, xp: 1200, seconds: 30 },
    { id: 'FAITH_COMMUNION', name: 'Communion', level: 60, water: 16, xp: 2560, seconds: 30 },
    { id: 'FAITH_ASCENDANT', name: 'Ascendant prayer', level: 80, water: 32, xp: 5440, seconds: 30 },
];
exports.FAITH_BLESSINGS = [
    { id: 'EMBER_VOW', name: 'Ember Vow', level: 1, family: 'attack', bonus: .02 },
    { id: 'WARD_OF_STONE', name: 'Ward of Stone', level: 10, family: 'defense', bonus: .03 },
    { id: 'WELLSPRING', name: 'Wellspring', level: 15, family: 'hp', bonus: .04 },
    { id: 'SUNFIRE_VOW', name: 'Sunfire Vow', level: 40, family: 'attack', bonus: .04 },
    { id: 'IRON_SANCTUARY', name: 'Iron Sanctuary', level: 45, family: 'defense', bonus: .06 },
    { id: 'LIVING_GRACE', name: 'Living Grace', level: 50, family: 'hp', bonus: .08 },
    { id: 'DAWN_COVENANT', name: 'Dawn Covenant', level: 80, family: 'attack', bonus: .06 },
    { id: 'ETERNAL_BASTION', name: 'Eternal Bastion', level: 85, family: 'defense', bonus: .09 },
    { id: 'UNDYING_LIGHT', name: 'Undying Light', level: 90, family: 'hp', bonus: .12 },
];
exports.HOLY_WATER_SOURCES = [{ monsterId: 'FIELD_WISP', chance: .12 }, { monsterId: 'DROWNED_PILGRIM', chance: .30 }, { monsterId: 'OATHBOUND_SQUIRE', chance: .24 }];
const faithBlessingDef = (id) => exports.FAITH_BLESSINGS.find(b => b.id === id);
exports.faithBlessingDef = faithBlessingDef;
