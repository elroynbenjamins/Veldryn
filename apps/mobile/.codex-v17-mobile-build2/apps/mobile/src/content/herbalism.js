"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HERB_ITEMS = exports.HERB_NODES = void 0;
/** Regional nodes continue the same hand-picking activity lane beyond Asterfall. */
exports.HERB_NODES = [
    { id: 'DEWLEAF_PATCH', name: 'Dewleaf Patch', itemId: 'DEWLEAF', zoneId: 'GREENFIELDS', unlockLevel: 1, seconds: 30, xp: 9 },
    { id: 'RIVER_MINT_BED', name: 'River Mint Bed', itemId: 'RIVER_MINT', zoneId: 'SILVERBROOK', unlockLevel: 8, seconds: 40, xp: 20 },
    { id: 'IRONBLOOM_THICKET', name: 'Ironbloom Thicket', itemId: 'IRONBLOOM', zoneId: 'IRONWOOD', unlockLevel: 18, seconds: 50, xp: 38 },
    { id: 'CAVELICHEN_COLONY', name: 'Cavelichen Colony', itemId: 'CAVELICHEN', zoneId: 'OLD_MINES', unlockLevel: 30, seconds: 60, xp: 68 },
    { id: 'CROWN_SAGE_GROVE', name: 'Crown Sage Grove', itemId: 'CROWN_SAGE', zoneId: 'KINGS_ROAD', unlockLevel: 45, seconds: 70, xp: 110 },
    { id: 'OATHBLOSSOM_PATCH', name: 'Oathblossom Patch', itemId: 'OATHBLOSSOM', zoneId: 'KINGS_ROAD', unlockLevel: 60, seconds: 80, xp: 170 },
    { id: 'SUNSCALE_BLOOM', name: 'Sunscale Bloom', itemId: 'SUNSCALE', zoneId: 'SUNSCAR', unlockLevel: 26, seconds: 92, xp: 215 },
    { id: 'FROSTBELL_FLOWER', name: 'Frostbell Flower', itemId: 'FROSTBLOOM', zoneId: 'FROSTMARCH', unlockLevel: 46, seconds: 118, xp: 310 },
    { id: 'ASHEN_MYRRH_GROVE', name: 'Ashen Myrrh Grove', itemId: 'ASHEN_MYRRH', zoneId: 'ASHLANDS', unlockLevel: 71, seconds: 145, xp: 440 },
].map(node => ({ ...node, skillId: 'herbalism', min: 1, max: 1, difficultyMultiplier: 1, recommendedToolTier: 0 }));
exports.HERB_ITEMS = [
    { id: 'DEWLEAF', name: 'Dewleaf', type: 'material', value: 2, rarity: 'common' },
    { id: 'RIVER_MINT', name: 'River Mint', type: 'material', value: 4, rarity: 'common' },
    { id: 'IRONBLOOM', name: 'Ironbloom', type: 'material', value: 8, rarity: 'uncommon' },
    { id: 'CAVELICHEN', name: 'Cavelichen', type: 'material', value: 14, rarity: 'uncommon' },
    { id: 'CROWN_SAGE', name: 'Crown Sage', type: 'material', value: 22, rarity: 'rare' },
    { id: 'OATHBLOSSOM', name: 'Oathblossom', type: 'material', value: 32, rarity: 'rare' },
    { id: 'SUNSCALE', name: 'Sunscale Bloom', type: 'material', value: 48, rarity: 'rare' },
    { id: 'FROSTBLOOM', name: 'Frostbell Flower', type: 'material', value: 72, rarity: 'rare' },
    { id: 'ASHEN_MYRRH', name: 'Ashen Myrrh', type: 'material', value: 105, rarity: 'epic' },
];
