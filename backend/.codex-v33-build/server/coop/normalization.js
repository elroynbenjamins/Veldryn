"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROOTBOUND_ROLE_REFERENCES = exports.COOP_NORMALIZATION_V1 = void 0;
exports.normalizeCombatInput = normalizeCombatInput;
exports.COOP_NORMALIZATION_V1 = Object.freeze({
    version: 'coop-normalization-v1', softThreshold: 1.15,
    primaryRetention: 0.35, secondaryRetention: 0.50, hpRetention: 0.60,
    primaryHardRatio: 1.25, secondaryHardRatio: 1.25, hpHardRatio: 1.35,
    flatEffectHardRatio: 0.35, coefficientHardCap: 3,
});
exports.ROOTBOUND_ROLE_REFERENCES = Object.freeze({
    tank: { level: 25, maxHp: 5_200, attackPower: 420, healingPower: 180, defense: 1_500, accuracy: 680, evasion: 180 },
    damage: { level: 25, maxHp: 3_400, attackPower: 625, healingPower: 120, defense: 750, accuracy: 780, evasion: 250 },
    support: { level: 25, maxHp: 3_800, attackPower: 330, healingPower: 650, defense: 900, accuracy: 700, evasion: 210 },
});
function compress(value, reference, retention, hardRatio, softThreshold) {
    const safe = Math.max(0, value);
    const soft = softThreshold * reference;
    return safe <= soft ? safe : Math.min(hardRatio * reference, soft + (safe - soft) * retention);
}
function normalizeCombatInput(source, abilities, syncLevel, reference, config = exports.COOP_NORMALIZATION_V1) {
    if (!Number.isInteger(source.level) || source.level < 1 || source.level > 100 || !Number.isInteger(syncLevel) || syncLevel < 1 || syncLevel > 100)
        throw new Error('invalid_snapshot_level');
    const sourceStats = [source.maxHp, source.attackPower, source.healingPower, source.defense, source.accuracy, source.evasion, source.critChance, source.haste];
    if (sourceStats.some(value => !Number.isFinite(value)) || source.maxHp <= 0 || [source.attackPower, source.healingPower, source.defense, source.accuracy, source.evasion].some(value => value < 0))
        throw new Error('invalid_snapshot_stats');
    const effectiveLevel = Math.min(source.level, syncLevel);
    const levelRatio = source.level > effectiveLevel ? effectiveLevel / source.level : 1;
    const refScale = effectiveLevel / reference.level;
    const ref = {
        maxHp: reference.maxHp * refScale, attackPower: reference.attackPower * refScale,
        healingPower: reference.healingPower * refScale, defense: reference.defense * refScale,
        accuracy: reference.accuracy * refScale, evasion: reference.evasion * refScale,
    };
    const scaled = {
        maxHp: source.maxHp * levelRatio, attackPower: source.attackPower * levelRatio,
        healingPower: source.healingPower * levelRatio, defense: source.defense * levelRatio,
        accuracy: source.accuracy * levelRatio, evasion: source.evasion * levelRatio,
    };
    const snapshot = {
        ...source,
        level: effectiveLevel,
        maxHp: compress(scaled.maxHp, ref.maxHp, config.hpRetention, config.hpHardRatio, config.softThreshold),
        attackPower: compress(scaled.attackPower, ref.attackPower, config.primaryRetention, config.primaryHardRatio, config.softThreshold),
        healingPower: compress(scaled.healingPower, ref.healingPower, config.primaryRetention, config.primaryHardRatio, config.softThreshold),
        defense: compress(scaled.defense, ref.defense, config.secondaryRetention, config.secondaryHardRatio, config.softThreshold),
        accuracy: compress(scaled.accuracy, ref.accuracy, config.secondaryRetention, config.secondaryHardRatio, config.softThreshold),
        evasion: compress(scaled.evasion, ref.evasion, config.secondaryRetention, config.secondaryHardRatio, config.softThreshold),
    };
    const flatCap = Math.max(ref.attackPower, ref.healingPower, ref.maxHp) * config.flatEffectHardRatio;
    const normalizedAbilities = abilities.map(ability => ({
        ...ability,
        effects: ability.effects.map(effect => ({
            ...effect,
            ...(effect.flat === undefined ? {} : { flat: Math.min(Math.max(0, effect.flat * levelRatio), flatCap) }),
            ...(effect.coeff === undefined ? {} : { coeff: Math.min(Math.max(0, effect.coeff), config.coefficientHardCap) }),
            ...(effect.value === undefined ? {} : { value: effect.kind === 'taunt' ? Math.min(Math.max(0, effect.value * levelRatio), flatCap) : Math.min(Math.max(-1, effect.value), 1) }),
        })),
    }));
    return {
        snapshot, abilities: normalizedAbilities, effectiveLevel, normalizationVersion: config.version,
        before: { level: source.level, maxHp: source.maxHp, attackPower: source.attackPower, healingPower: source.healingPower, defense: source.defense },
    };
}
