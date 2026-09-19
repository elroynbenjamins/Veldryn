"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GLOBAL_CRAFT_RARITY_V28 = exports.RARITY_STAT_MULT_V26 = void 0;
exports.rarityChancesV26 = rarityChancesV26;
exports.rollCraftedRarityV26 = rollCraftedRarityV26;
exports.nextArtisanInsightV26 = nextArtisanInsightV26;
exports.rarityAtLeastV26 = rarityAtLeastV26;
exports.RARITY_STAT_MULT_V26 = { Common: 1, Uncommon: 1.015, Rare: 1.03, Epic: 1.05, Mythic: 1.07 };
exports.GLOBAL_CRAFT_RARITY_V28 = [
    { rarity: 'Common', chance: .888 }, { rarity: 'Uncommon', chance: .08 }, { rarity: 'Rare', chance: .025 }, { rarity: 'Epic', chance: .006 }, { rarity: 'Mythic', chance: .001 }
];
const order = ['Common', 'Uncommon', 'Rare', 'Epic', 'Mythic'];
function normalize(v) { const total = v.reduce((a, b) => a + b.chance, 0); return v.map(x => ({ ...x, chance: x.chance / total })); }
function rarityChancesV26(_tier, professionLevel, recipeMinProfessionLevel, artisanInsight) {
    const base = exports.GLOBAL_CRAFT_RARITY_V28.map(v => ({ ...v }));
    const common = base.find(v => v.rarity === 'Common');
    const rare = base.find(v => v.rarity === 'Rare');
    const epic = base.find(v => v.rarity === 'Epic');
    const myth = base.find(v => v.rarity === 'Mythic');
    const steps = Math.max(0, Math.min(5, Math.floor((professionLevel - recipeMinProfessionLevel) / 10)));
    for (let i = 0; i < steps; i++) {
        common.chance -= .0055;
        rare.chance += .005;
        epic.chance += .0005;
    }
    if (artisanInsight >= 20) {
        common.chance -= .044;
        epic.chance += .044;
    }
    myth.chance = .001;
    return normalize(base);
}
function rollCraftedRarityV26(input) {
    if (input.randomUnit < 0 || input.randomUnit >= 1)
        throw new Error('random_unit_out_of_range');
    const chances = rarityChancesV26(input.tier, input.professionLevel, input.recipeMinProfessionLevel, input.artisanInsight);
    let cursor = 0;
    for (const c of chances) {
        cursor += c.chance;
        if (input.randomUnit < cursor)
            return c.rarity;
    }
    return chances[chances.length - 1].rarity;
}
function nextArtisanInsightV26(current, rolled) { return rolled === 'Epic' || rolled === 'Mythic' ? 0 : Math.min(20, current + 1); }
function rarityAtLeastV26(a, b) { return order.indexOf(a) >= order.indexOf(b); }
