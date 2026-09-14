"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const item_rarity_1 = require("../src/core/item-rarity");
const items_1 = require("../src/content/items");
if (item_rarity_1.GEAR_RARITIES.find(x => x.id === 'uncommon').chance !== .07 || item_rarity_1.GEAR_RARITIES.find(x => x.id === 'mythic').chance !== .0005)
    throw new Error('Requested rarity odds missing');
if ((0, items_1.itemDef)('ASTER_IRON_CHEST').rarity !== 'rare' || (0, items_1.itemDef)('OATHSTONE_WARDPLATE').rarity !== 'epic')
    throw new Error('Gear rarity tiers missing');
if ((0, item_rarity_1.rarityMeta)('mythic').statMultiplier <= (0, item_rarity_1.rarityMeta)('legendary').statMultiplier)
    throw new Error('Mythic stats must exceed Legendary');
if (!['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'].includes((0, item_rarity_1.rollGearRarity)('stable-seed')))
    throw new Error('Rarity roll invalid');
console.log('PASS: rarity odds, colors, stat multipliers and deterministic roll API');
