"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COLLECTIBLE_TARGET_LABELS = exports.COLLECTIBLES = void 0;
exports.validateCollectibleCatalog = validateCollectibleCatalog;
const entry = (id, kind, name, target, source, activeBps = 200, requiredCharacterLevel) => ({ id, kind, name, bonusFamilyId: id, target, ownedBps: 50, activeBps: activeBps, source, requiredCharacterLevel });
exports.COLLECTIBLES = [entry('pet_harvest_fox', 'pet', 'Harvest Fox', 'gold', 'Harvestwake reputation milestone'), entry('pet_field_mouse', 'pet', 'Field Mouse', 'skillXp', 'Harvestwake event shop', 250), entry('pet_straw_sparrow', 'pet', 'Straw Sparrow', 'gatheringYield', 'Golden Field Feather discovery'), entry('pet_amber_owl', 'pet', 'Amber Owl', 'dropChance', 'Harvestwake Amber Pantry', 400), entry('pet:feral_rat', 'pet', 'Feral Rat', 'attack', 'Existing legacy pet unlock'), entry('pet:emberhound', 'pet', 'Emberhound', 'attack', 'Existing legacy pet unlock', 300), entry('pet:forgebound_mooncat', 'pet', 'Forgebound Mooncat', 'attack', 'Existing legacy pet unlock', 500), entry('ironwood-dawn', 'background', 'Ironwood Dawn', 'skillXp', 'Reach character level 10', 200, 10), entry('silverbrook-mist', 'background', 'Silverbrook Mist', 'gatheringYield', 'Reach character level 20', 200, 20), entry('oathglass-hall', 'background', 'Oathglass Hall', 'hp', 'Reach character level 25', 200, 25), entry('bg_harvestwake', 'background', 'Golden Fields', 'gold', 'Harvestwake event shop'), entry('bg_grand_storehouse', 'background', 'Grand Storehouse', 'gatheringYield', 'Harvestwake reputation milestone'), entry('bg_spirit_storehouse', 'background', 'Spirit Storehouse', 'defense', 'Guardian Lantern discovery'), entry('frame_amber_vine', 'border', 'Amber Vine', 'defense', 'Harvestwake reputation milestone'), entry('frame_wheat_crown', 'border', 'Wheat Crown', 'gold', 'Harvestwake event shop')];
exports.COLLECTIBLE_TARGET_LABELS = { hp: 'Maximum HP', attack: 'Attack', defense: 'Defense', skillXp: 'Skill XP', characterXp: 'Combat XP', gold: 'Ordinary combat Gold', gatheringYield: 'Ordinary gathered materials', dropChance: 'Ordinary drop chance' };
function validateCollectibleCatalog(catalog = exports.COLLECTIBLES) { const ids = new Set(); for (const row of catalog) {
    if (!row.id || ids.has(row.id) || row.ownedBps !== 50 || row.activeBps < 200 || !exports.COLLECTIBLE_TARGET_LABELS[row.target])
        throw new Error(`Invalid collectible ${row.id}`);
    ids.add(row.id);
} }
validateCollectibleCatalog();
