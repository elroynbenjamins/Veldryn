"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DUNGEON_POTION_CHARGES_BY_TIER = exports.DUNGEON_FOOD_ALLOWED = void 0;
exports.dungeonConsumablePolicy = dungeonConsumablePolicy;
exports.planDungeonPotionUse = planDungeonPotionUse;
exports.consumeAuthoritativeDungeonPotion = consumeAuthoritativeDungeonPotion;
const healing_potion_catalog_1 = require("../../shared/healing-potion-catalog");
exports.DUNGEON_FOOD_ALLOWED = false;
/** Per-character, per-run crafted potion allowance. Food is disabled and healing always spends authoritative inventory. */
exports.DUNGEON_POTION_CHARGES_BY_TIER = { 1: 3, 2: 3, 3: 4, 4: 4, 5: 5 };
function dungeonConsumablePolicy(tier) {
    if (!Number.isFinite(tier))
        throw new Error('invalid_dungeon_tier');
    const safe = Math.max(1, Math.min(5, Math.floor(tier)));
    return { foodAllowed: exports.DUNGEON_FOOD_ALLOWED, potionCharges: exports.DUNGEON_POTION_CHARGES_BY_TIER[safe] };
}
const MAX_RECEIPT_ID_LENGTH = 120;
function verifiedInventoryTake(stacks, itemId) {
    const available = stacks.reduce((n, row) => n + (row.itemId === itemId && Number.isSafeInteger(row.quantity) && row.quantity > 0 ? row.quantity : 0), 0);
    if (available < 1)
        throw new Error('dungeon_potion_out_of_stock');
    let left = 1;
    return stacks.flatMap(row => {
        if (row.itemId !== itemId || left === 0)
            return [row];
        const used = Math.min(left, row.quantity);
        left -= used;
        return row.quantity > used ? [{ ...row, quantity: row.quantity - used }] : [];
    });
}
function planDungeonPotionUse(input) {
    const { runId, phase, actorId, ownerCharacterId, requestId, persistentState, characterState, maxHp } = input;
    if (!runId.trim() || !actorId.trim() || !ownerCharacterId.trim() || !requestId.trim() || requestId.length > MAX_RECEIPT_ID_LENGTH)
        throw new Error('invalid_dungeon_potion_request');
    const character = characterState.character;
    if (!character || character.id !== ownerCharacterId || actorId !== ownerCharacterId)
        throw new Error('dungeon_potion_character_mismatch');
    const actor = persistentState.actors[actorId];
    if (!actor)
        throw new Error('dungeon_potion_actor_not_found');
    const cap = dungeonConsumablePolicy(input.tier).potionCharges;
    const already = persistentState.dungeonPotionReceipts?.[requestId];
    const used = persistentState.dungeonPotionChargesUsed ?? 0;
    if (!Number.isSafeInteger(used) || used < 0 || used > cap)
        throw new Error('invalid_dungeon_potion_budget');
    if (already) {
        if (already.actorId !== actorId || !already.itemId || !Number.isFinite(already.healedHp))
            throw new Error('dungeon_potion_receipt_conflict');
        return { persistentState, characterState, receipt: already, replayed: true, remainingCharges: cap - used };
    }
    if (phase !== 'awaiting_choice')
        throw new Error('dungeon_potion_run_not_active');
    if (used >= cap)
        throw new Error('dungeon_potion_charges_exhausted');
    if (actor.downed || !Number.isFinite(actor.hp) || actor.hp <= 0)
        throw new Error('dungeon_potion_actor_downed');
    if (!Number.isFinite(maxHp) || maxHp <= 0 || actor.hp >= maxHp)
        throw new Error('dungeon_potion_health_full');
    const itemId = character.equippedHealingPotionId;
    const healFraction = itemId ? (0, healing_potion_catalog_1.healingPotionFraction)(itemId) : undefined;
    if (!itemId || healFraction === undefined)
        throw new Error('dungeon_healing_potion_not_selected');
    const stacks = verifiedInventoryTake(characterState.inventory.stacks, itemId);
    const heal = Math.min(maxHp - actor.hp, Math.max(1, Math.ceil(maxHp * healFraction)));
    const receipt = { requestId, actorId, itemId, healedHp: heal, chargesUsed: used + 1 };
    const nextState = {
        ...persistentState,
        actors: { ...persistentState.actors, [actorId]: { ...actor, hp: actor.hp + heal } },
        dungeonPotionChargesUsed: used + 1,
        dungeonPotionReceipts: { ...persistentState.dungeonPotionReceipts, [requestId]: receipt },
    };
    const nextCharacter = { ...characterState, inventory: { ...characterState.inventory, stacks } };
    return { persistentState: nextState, characterState: nextCharacter, receipt, replayed: false, remainingCharges: cap - used - 1 };
}
async function consumeAuthoritativeDungeonPotion(store, request) {
    if (!request.accountId.trim() || !request.runId.trim())
        throw new Error('dungeon_potion_auth_required');
    const result = await store.transact(request, verified => {
        if (verified.runId !== request.runId || verified.ownerAccountId !== request.accountId)
            throw new Error('dungeon_potion_owner_mismatch');
        return planDungeonPotionUse({ ...verified, requestId: request.requestId });
    });
    return { receipt: result.receipt, replayed: result.replayed, remainingCharges: result.remainingCharges };
}
