"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PASSIVE_PET_COLLECTION_SHARE = exports.BASE_PERMANENT_MULTIPLIERS = void 0;
exports.characterPermanentMultipliers = characterPermanentMultipliers;
const permanent_boosts_1 = require("../content/permanent-boosts");
const faith_1 = require("./faith");
const BASE = {
    attackMultiplier: 1,
    combatSpeedMultiplier: 1,
    combatPowerMultiplier: 1,
    gatheringSpeedMultiplier: 1,
    incomingDamageMultiplier: 1,
    skillXpMultiplier: 1,
    characterXpMultiplier: 1,
    goldMultiplier: 1,
    dropChanceMultiplier: 1,
};
function normalizeMultiplier(value) {
    if (!Number.isFinite(value))
        return 1;
    if (value < 0.75)
        return 0.75;
    if (value > 2)
        return 2;
    return value;
}
function asMultiplier(value) {
    return normalizeMultiplier(value ?? 1);
}
function multiply(base, value) {
    return normalizeMultiplier(base * value);
}
function readMultipliers(definitionId, map) {
    if (!definitionId || !map[definitionId])
        return BASE;
    const d = map[definitionId];
    return {
        attackMultiplier: asMultiplier(d.combatPowerMultiplier),
        combatSpeedMultiplier: asMultiplier(d.combatSpeedMultiplier),
        combatPowerMultiplier: asMultiplier(d.combatPowerMultiplier),
        gatheringSpeedMultiplier: asMultiplier(d.gatheringSpeedMultiplier),
        incomingDamageMultiplier: asMultiplier(d.incomingDamageMultiplier),
        skillXpMultiplier: asMultiplier(d.skillXpMultiplier),
        characterXpMultiplier: asMultiplier(d.characterXpMultiplier),
        goldMultiplier: asMultiplier(d.goldMultiplier),
        dropChanceMultiplier: asMultiplier(d.dropChanceMultiplier),
    };
}
function merge(base, incoming) {
    return {
        attackMultiplier: multiply(base.attackMultiplier, incoming.attackMultiplier),
        combatSpeedMultiplier: multiply(base.combatSpeedMultiplier, incoming.combatSpeedMultiplier),
        combatPowerMultiplier: multiply(base.combatPowerMultiplier, incoming.combatPowerMultiplier),
        gatheringSpeedMultiplier: multiply(base.gatheringSpeedMultiplier, incoming.gatheringSpeedMultiplier),
        incomingDamageMultiplier: multiply(base.incomingDamageMultiplier, incoming.incomingDamageMultiplier),
        skillXpMultiplier: multiply(base.skillXpMultiplier, incoming.skillXpMultiplier),
        characterXpMultiplier: multiply(base.characterXpMultiplier, incoming.characterXpMultiplier),
        goldMultiplier: multiply(base.goldMultiplier, incoming.goldMultiplier),
        dropChanceMultiplier: multiply(base.dropChanceMultiplier, incoming.dropChanceMultiplier),
    };
}
function characterPermanentMultipliers(state) {
    let result = { ...BASE };
    const c = state.character;
    if (!c)
        return result;
    const blessing = (0, faith_1.selectedFaithBlessing)(state);
    if (blessing) {
        if (blessing.family === 'attack')
            result = merge(result, { ...BASE, attackMultiplier: 1 + blessing.bonus, combatPowerMultiplier: 1 + blessing.bonus });
        if (blessing.family === 'defense')
            result = merge(result, { ...BASE, incomingDamageMultiplier: 1 - blessing.bonus });
        if (blessing.family === 'hp')
            result = merge(result, { ...BASE, characterXpMultiplier: 1, combatPowerMultiplier: 1 + blessing.bonus * .25 });
    }
    for (const skinId of new Set(c.unlockedSkinIds ?? [])) {
        if (permanent_boosts_1.SKIN_PERMANENT_BOOSTS[skinId])
            result = merge(result, readMultipliers(skinId, permanent_boosts_1.SKIN_PERMANENT_BOOSTS));
    }
    for (const petId of new Set([...(c.ownedPetIds ?? []), ...(state.account.unlockedCosmeticPetIds ?? [])])) {
        if (permanent_boosts_1.PET_PERMANENT_BOOSTS[petId]) {
            const full = readMultipliers(petId, permanent_boosts_1.PET_PERMANENT_BOOSTS);
            const share = petId === c.selectedCosmeticPetId ? 1 : exports.PASSIVE_PET_COLLECTION_SHARE;
            const scaled = Object.fromEntries(Object.entries(full).map(([key, value]) => [key, 1 + (value - 1) * share]));
            result = merge(result, scaled);
        }
    }
    for (const boostId of new Set(c.ownedBoostIds ?? [])) {
        if (permanent_boosts_1.BUYABLE_PERMANENT_BOOSTS[boostId])
            result = merge(result, readMultipliers(boostId, permanent_boosts_1.BUYABLE_PERMANENT_BOOSTS));
    }
    return result;
}
exports.BASE_PERMANENT_MULTIPLIERS = BASE;
/** All owned pets contribute; the displayed pet contributes its full perk. */
exports.PASSIVE_PET_COLLECTION_SHARE = 0.25;
