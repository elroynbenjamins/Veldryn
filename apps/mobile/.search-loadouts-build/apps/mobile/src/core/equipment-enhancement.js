"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UPGRADE_STAT_PER_RANK = exports.MAX_UPGRADE_RANK = void 0;
exports.gearEnhancement = gearEnhancement;
exports.hasEnhancement = hasEnhancement;
exports.gemSocketCapacity = gemSocketCapacity;
exports.upgradeQuote = upgradeQuote;
exports.combinedQuantity = combinedQuantity;
exports.attemptEquipmentUpgrade = attemptEquipmentUpgrade;
exports.socketGem = socketGem;
exports.unsocketGem = unsocketGem;
exports.gearStatsAtRank = gearStatsAtRank;
exports.enhancedGearStats = enhancedGearStats;
exports.equippedGemBonuses = equippedGemBonuses;
const items_1 = require("../content/items");
const item_rarity_1 = require("./item-rarity");
exports.MAX_UPGRADE_RANK = 10;
exports.UPGRADE_STAT_PER_RANK = .03;
const SUCCESS_BY_TARGET = [0, 1, .95, .85, .70, .55, .40, .28, .18, .10, .05];
const DUST_BY_TARGET = [0, 4, 8, 15, 24, 36, 52, 72, 96, 125, 160];
const CORE_BY_TARGET = [0, 0, 0, 0, 1, 2, 3, 5, 7, 10, 14];
const RARITY_COST = { common: 1, uncommon: 1.2, rare: 1.6, epic: 2.2, legendary: 3.2, mythic: 4.5 };
const SOCKETS = { common: 0, uncommon: 1, rare: 1, epic: 2, legendary: 2, mythic: 3 };
function gearEnhancement(state, itemId) {
    const raw = state.character?.gearEnhancements?.[itemId];
    return { rank: Math.max(0, Math.min(exports.MAX_UPGRADE_RANK, Math.floor(raw?.rank ?? 0))), failures: Math.max(0, Math.floor(raw?.failures ?? 0)), gemIds: Array.isArray(raw?.gemIds) ? raw.gemIds.slice(0, 3) : [] };
}
function hasEnhancement(state, itemId) { const enhancement = gearEnhancement(state, itemId); return enhancement.rank > 0 || enhancement.gemIds.length > 0; }
function gemSocketCapacity(itemId) { const item = (0, items_1.itemDef)(itemId); return item.type === 'gear' ? SOCKETS[(0, item_rarity_1.itemRarity)(item)] : 0; }
function upgradeQuote(state, itemId) {
    const item = (0, items_1.itemDef)(itemId);
    if (item.type !== 'gear')
        throw new Error('Only equipment can be upgraded');
    const current = gearEnhancement(state, itemId), targetRank = current.rank + 1;
    if (targetRank > exports.MAX_UPGRADE_RANK)
        return { currentRank: current.rank, targetRank, successChance: 0, dust: 0, cores: 0, gold: 0, maxed: true };
    const rarity = (0, item_rarity_1.itemRarity)(item), pity = Math.min(.10, current.failures * .02);
    return { currentRank: current.rank, targetRank, successChance: Math.min(1, SUCCESS_BY_TARGET[targetRank] + pity), dust: DUST_BY_TARGET[targetRank], cores: CORE_BY_TARGET[targetRank], gold: Math.ceil(150 * targetRank * targetRank * RARITY_COST[rarity] / 10) * 10, maxed: false };
}
function qty(stacks, id) { return stacks.find(s => s.itemId === id)?.quantity ?? 0; }
function combinedQuantity(state, id) { return qty(state.inventory.stacks, id) + qty(state.bank.stacks, id); }
function consume(stacks, id, amount) { let left = amount; return stacks.map(stack => { if (stack.itemId !== id || left <= 0)
    return stack; const used = Math.min(left, stack.quantity); left -= used; return { ...stack, quantity: stack.quantity - used }; }).filter(stack => stack.quantity > 0); }
function consumeAcross(state, id, amount) { if (combinedQuantity(state, id) < amount)
    throw new Error(`Need ${amount} ${(0, items_1.itemDef)(id).name}`); const inventory = consume(state.inventory.stacks, id, amount), used = qty(state.inventory.stacks, id) - qty(inventory, id); return { ...state, inventory: { ...state.inventory, stacks: inventory }, bank: { ...state.bank, stacks: consume(state.bank.stacks, id, amount - used) } }; }
function setEnhancement(state, itemId, value) { return { ...state, character: { ...state.character, gearEnhancements: { ...(state.character.gearEnhancements ?? {}), [itemId]: value } } }; }
function requireEquipped(state, itemId) { if (!state.character || !Object.values(state.character.equipment).includes(itemId))
    throw new Error('Equip this item first'); }
function attemptEquipmentUpgrade(state, itemId, roll = Math.random()) {
    requireEquipped(state, itemId);
    if (roll < 0 || roll >= 1)
        throw new Error('Invalid upgrade roll');
    const quote = upgradeQuote(state, itemId);
    if (quote.maxed)
        throw new Error('This item is already +10');
    if (state.character.gold < quote.gold)
        throw new Error(`Need ${quote.gold} gold`);
    let next = { ...state, character: { ...state.character, gold: state.character.gold - quote.gold } };
    next = consumeAcross(next, 'TEMPERING_DUST', quote.dust);
    if (quote.cores)
        next = consumeAcross(next, 'TEMPERING_CORE', quote.cores);
    const prior = gearEnhancement(state, itemId), success = roll < quote.successChance;
    // Failed attempts are already a severe material sink; items are never destroyed or downgraded.
    const rank = success ? quote.targetRank : prior.rank;
    next = setEnhancement(next, itemId, { ...prior, rank, failures: success ? 0 : prior.failures + 1 });
    return { state: next, result: { success, oldRank: prior.rank, newRank: rank, successChance: quote.successChance, downgraded: !success && rank < prior.rank } };
}
function socketGem(state, itemId, gemId) {
    requireEquipped(state, itemId);
    const gem = (0, items_1.itemDef)(gemId);
    if (gem.type !== 'gem' || !gem.gemStat)
        throw new Error('That item is not a gem');
    const enhancement = gearEnhancement(state, itemId), capacity = gemSocketCapacity(itemId);
    if (enhancement.gemIds.length >= capacity)
        throw new Error(capacity ? 'All sockets are filled' : 'This rarity has no gem sockets');
    let next = consumeAcross(state, gemId, 1);
    next = setEnhancement(next, itemId, { ...enhancement, gemIds: [...enhancement.gemIds, gemId] });
    return next;
}
function addInventory(state, itemId) { const existing = state.inventory.stacks.find(s => s.itemId === itemId); if (!existing && state.inventory.stacks.length >= state.inventory.capacity)
    throw new Error('Inventory is full'); const stacks = existing ? state.inventory.stacks.map(s => s.itemId === itemId ? { ...s, quantity: s.quantity + 1 } : s) : [...state.inventory.stacks, { itemId, quantity: 1 }]; return { ...state, inventory: { ...state.inventory, stacks } }; }
function unsocketGem(state, itemId, index) {
    requireEquipped(state, itemId);
    const enhancement = gearEnhancement(state, itemId), gemId = enhancement.gemIds[index];
    if (!gemId)
        throw new Error('That socket is empty');
    const fee = ((0, items_1.itemDef)(gemId).gemTier ?? 1) * 500;
    if (state.character.gold < fee)
        throw new Error(`Need ${fee} gold to safely extract this gem`);
    let next = { ...state, character: { ...state.character, gold: state.character.gold - fee } };
    next = addInventory(next, gemId);
    next = setEnhancement(next, itemId, { ...enhancement, gemIds: enhancement.gemIds.filter((_, i) => i !== index) });
    return next;
}
function gearStatsAtRank(itemId, rank) { const item = (0, items_1.itemDef)(itemId), m = 1 + Math.max(0, Math.min(exports.MAX_UPGRADE_RANK, rank)) * exports.UPGRADE_STAT_PER_RANK, scale = (value) => value > 0 ? Math.ceil(value * m) : Math.round(value * m); return { hp: scale(item.hp ?? 0), attack: scale(item.attack ?? 0), defense: scale(item.defense ?? 0) }; }
function enhancedGearStats(state, itemId) { return gearStatsAtRank(itemId, gearEnhancement(state, itemId).rank); }
function equippedGemBonuses(state) { const result = { attack: 0, defense: 0, hp: 0 }; if (!state.character)
    return result; for (const itemId of Object.values(state.character.equipment)) {
    if (!itemId)
        continue;
    for (const gemId of gearEnhancement(state, itemId).gemIds) {
        const gem = (0, items_1.itemDef)(gemId);
        if (gem.type === 'gem' && gem.gemStat)
            result[gem.gemStat] += gem.gemPercent ?? 0;
    }
} return result; }
