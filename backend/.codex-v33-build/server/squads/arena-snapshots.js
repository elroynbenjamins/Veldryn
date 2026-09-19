"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ARENA_NORMALIZATION_VERSION = exports.ARENA_MIN_LEVEL = void 0;
exports.freezeArenaSquad = freezeArenaSquad;
exports.arenaPowerBand = arenaPowerBand;
const node_crypto_1 = require("node:crypto");
const normalization_1 = require("../coop/normalization");
const role_readiness_1 = require("../coop/role-readiness");
exports.ARENA_MIN_LEVEL = 15;
exports.ARENA_NORMALIZATION_VERSION = 'arena-normalization-v2';
function canonical(value) { if (Array.isArray(value))
    return `[${value.map(canonical).join(',')}]`; if (value && typeof value === 'object')
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`; return JSON.stringify(value); }
function converge(value, reference, retention, minRatio = .85, maxRatio = 1.15) { const next = reference + (value - reference) * retention; return Math.max(reference * minRatio, Math.min(reference * maxRatio, next)); }
function freezeFighter(accountId, selection, repository) {
    const record = repository.getActiveArenaLoadout(accountId, selection.characterId);
    if (!record || record.accountId !== accountId || record.characterId !== selection.characterId)
        throw new Error('arena_character_not_owned');
    if (record.characterLevel < exports.ARENA_MIN_LEVEL)
        throw new Error('arena_character_below_min_level');
    if (!record.legalEquipment)
        throw new Error('arena_illegal_equipment');
    const role = (0, role_readiness_1.deriveRole)(record.classId), source = { ...record.stats, role, classId: record.classId, characterId: record.characterId, level: record.characterLevel };
    const normalized = (0, normalization_1.normalizeCombatInput)(source, record.abilities, Math.min(100, record.characterLevel), normalization_1.ROOTBOUND_ROLE_REFERENCES[role]);
    if (!Number.isFinite(normalized.snapshot.maxHp) || !Number.isFinite(normalized.snapshot.attackPower) || !Number.isFinite(normalized.snapshot.defense) || !Number.isFinite(normalized.snapshot.healingPower))
        throw new Error('arena_invalid_loadout_stats');
    const reference = normalization_1.ROOTBOUND_ROLE_REFERENCES[role], scale = normalized.snapshot.level / reference.level;
    const snapshot = { ...normalized.snapshot, maxHp: converge(normalized.snapshot.maxHp, reference.maxHp * scale, .35), attackPower: converge(normalized.snapshot.attackPower, reference.attackPower * scale, .30), healingPower: converge(normalized.snapshot.healingPower, reference.healingPower * scale, .30), defense: converge(normalized.snapshot.defense, reference.defense * scale, .35), accuracy: converge(normalized.snapshot.accuracy, reference.accuracy * scale, .5, .9, 1.1), evasion: converge(normalized.snapshot.evasion, reference.evasion * scale, .5, .9, 1.1) };
    const normalizedPower = Math.max(1, Math.round(snapshot.maxHp * .08 + snapshot.attackPower * 1.7 + snapshot.healingPower * .9 + snapshot.defense * .9 + snapshot.accuracy * .15 + snapshot.evasion * .15));
    return { characterId: record.characterId, classId: record.classId, displayName: record.stats.displayName, position: selection.position, role, normalizedPower, stats: snapshot, abilities: structuredClone(normalized.abilities) };
}
function freezeArenaSquad(input) {
    if (input.selections.length !== 3)
        throw new Error('arena_requires_exactly_3_characters');
    if (new Set(input.selections.map(x => x.characterId)).size !== 3)
        throw new Error('arena_duplicate_character');
    if (new Set(input.selections.map(x => x.position)).size !== 3)
        throw new Error('arena_requires_front_middle_back');
    const fighters = input.selections.map(selection => freezeFighter(input.accountId, selection, input.repository));
    const bare = { accountId: input.accountId, squadVersion: input.squadVersion, formationVersion: input.formationVersion, fighters, rating: Math.max(0, Math.round(input.rating)) };
    const snapshotHash = Buffer.from((0, node_crypto_1.createHash)('sha256').update(canonical({ ...bare, normalizationVersion: exports.ARENA_NORMALIZATION_VERSION })).digest()).toString('hex');
    return { ...bare, snapshotHash };
}
function arenaPowerBand(snapshot) { if (snapshot.fighters.length !== 3 || snapshot.fighters.some(fighter => !Number.isFinite(fighter.normalizedPower) || fighter.normalizedPower <= 0))
    throw new Error('arena_invalid_power_band'); return Math.max(1, Math.round(snapshot.fighters.reduce((sum, fighter) => sum + fighter.normalizedPower, 0) / snapshot.fighters.length / 500)); }
