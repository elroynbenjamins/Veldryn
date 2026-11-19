"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GEM_UNSOCKET_COST_V1 = exports.GEM_DISMANTLE_DUST_V1 = exports.GEM_COMBINE_COSTS_V1 = void 0;
exports.gemCombineSuccessPercentV1 = gemCombineSuccessPercentV1;
exports.combineGemV1 = combineGemV1;
exports.dismantleGemV1 = dismantleGemV1;
/** Odds are based on the consumed grade. Only G1-G4 can currently merge. */
function gemCombineSuccessPercentV1(from) {
    if (!Number.isSafeInteger(from) || from < 1)
        throw new Error('invalid_combine_grade');
    return from <= 4 ? 100 - from * 10 : from <= 6 ? 60 - (from - 4) * 5 : Math.max(10, 50 - (from - 6) * 5);
}
exports.GEM_COMBINE_COSTS_V1 = [
    { from: 1, to: 2, copies: 3, dust: 0, gold: 1800, durationSeconds: 300, successChancePercent: 90 },
    { from: 2, to: 3, copies: 3, dust: 5, gold: 6000, durationSeconds: 900, successChancePercent: 80 },
    { from: 3, to: 4, copies: 3, dust: 15, gold: 21600, durationSeconds: 2700, successChancePercent: 70, catalyst: 'regional' },
    { from: 4, to: 5, copies: 3, dust: 40, gold: 72000, durationSeconds: 7200, successChancePercent: 60, catalyst: 'radiant' },
];
exports.GEM_DISMANTLE_DUST_V1 = { 1: 1, 2: 3, 3: 8, 4: 22, 5: 60 };
exports.GEM_UNSOCKET_COST_V1 = {
    1: { gold: 0, dust: 0 }, 2: { gold: 0, dust: 0 }, 3: { gold: 500, dust: 0 }, 4: { gold: 1500, dust: 1 }, 5: { gold: 5000, dust: 3 },
};
function replaceStack(stacks, familyId, grade, delta) {
    const next = stacks.map(v => ({ ...v }));
    const i = next.findIndex(v => v.familyId === familyId && v.grade === grade);
    const q = (i >= 0 ? next[i].quantity : 0) + delta;
    if (q < 0)
        throw new Error('insufficient_gems');
    if (i >= 0) {
        if (q === 0)
            next.splice(i, 1);
        else
            next[i] = { ...next[i], quantity: q };
    }
    else if (q > 0)
        next.push({ familyId, grade, quantity: q });
    return next;
}
function combineGemV1(wallet, familyId, from, roll = Math.random()) {
    const cost = exports.GEM_COMBINE_COSTS_V1.find(v => v.from === from);
    if (!cost)
        throw new Error('invalid_combine_grade');
    if (!Number.isFinite(roll) || roll < 0 || roll >= 1)
        throw new Error('invalid_combine_roll');
    if (wallet.gold < cost.gold)
        throw new Error('insufficient_gold');
    if (wallet.dust < cost.dust)
        throw new Error('insufficient_gem_dust');
    if (cost.catalyst === 'regional' && wallet.regionalCatalysts < 1)
        throw new Error('missing_regional_catalyst');
    if (cost.catalyst === 'radiant' && wallet.radiantCatalysts < 1)
        throw new Error('missing_radiant_catalyst');
    // Validate ownership of all 3 before consuming; failure destroys only one.
    if ((wallet.gems.find(v => v.familyId === familyId && v.grade === from)?.quantity ?? 0) < cost.copies)
        throw new Error('insufficient_gems');
    const succeeded = roll < cost.successChancePercent / 100;
    let gems = replaceStack(wallet.gems, familyId, from, succeeded ? -3 : -1);
    if (succeeded)
        gems = replaceStack(gems, familyId, cost.to, 1);
    return { ...wallet, gold: wallet.gold - cost.gold, dust: wallet.dust - cost.dust, regionalCatalysts: wallet.regionalCatalysts - (cost.catalyst === 'regional' ? 1 : 0), radiantCatalysts: wallet.radiantCatalysts - (cost.catalyst === 'radiant' ? 1 : 0), gems };
}
function dismantleGemV1(wallet, familyId, grade, quantity = 1) {
    if (!Number.isInteger(quantity) || quantity < 1)
        throw new Error('invalid_quantity');
    const gems = replaceStack(wallet.gems, familyId, grade, -quantity);
    return { ...wallet, dust: wallet.dust + exports.GEM_DISMANTLE_DUST_V1[grade] * quantity, gems };
}
