"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BASE_PERMANENT_MULTIPLIERS = void 0;
exports.characterPermanentMultipliers = characterPermanentMultipliers;
const permanent_boosts_1 = require("../content/permanent-boosts");
const BASE = {
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
    for (const skinId of new Set(c.unlockedSkinIds ?? [])) {
        if (permanent_boosts_1.SKIN_PERMANENT_BOOSTS[skinId])
            result = merge(result, readMultipliers(skinId, permanent_boosts_1.SKIN_PERMANENT_BOOSTS));
    }
    for (const petId of new Set(c.ownedPetIds ?? [])) {
        if (permanent_boosts_1.PET_PERMANENT_BOOSTS[petId])
            result = merge(result, readMultipliers(petId, permanent_boosts_1.PET_PERMANENT_BOOSTS));
    }
    for (const boostId of new Set(c.ownedBoostIds ?? [])) {
        if (permanent_boosts_1.BUYABLE_PERMANENT_BOOSTS[boostId])
            result = merge(result, readMultipliers(boostId, permanent_boosts_1.BUYABLE_PERMANENT_BOOSTS));
    }
    return result;
}
exports.BASE_PERMANENT_MULTIPLIERS = BASE;
