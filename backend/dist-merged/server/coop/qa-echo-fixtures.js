"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QA_ECHO_DEFINITIONS = exports.QA_ECHO_CONTENT_VERSION = void 0;
exports.createQaFrozenLoadout = createQaFrozenLoadout;
exports.createQaEchoPool = createQaEchoPool;
const node_crypto_1 = require("node:crypto");
const launch_combat_1 = require("../combat/content/launch-combat");
const role_readiness_1 = require("./role-readiness");
exports.QA_ECHO_CONTENT_VERSION = 'qa-echo-fixture-v1';
exports.QA_ECHO_DEFINITIONS = Object.freeze([
    { classId: 'IRONWARDEN', launchClassName: 'Ironwarden', label: 'QA Ironwarden' },
    { classId: 'BASTION', launchClassName: 'Bastion', label: 'QA Bastion' },
    { classId: 'DREADGUARD', launchClassName: 'Dreadguard', label: 'QA Dreadguard' },
    { classId: 'WAYFINDER', launchClassName: 'Wayfinder', label: 'QA Wayfinder' },
    { classId: 'RAVAGER', launchClassName: 'Ravager', label: 'QA Ravager' },
    { classId: 'HEXWEAVER', launchClassName: 'Hexweaver', label: 'QA Hexweaver' },
    { classId: 'KNIFE_DANCER', launchClassName: 'Knife Dancer', label: 'QA Knife Dancer' },
    { classId: 'DAWNKEEPER', launchClassName: 'Dawnkeeper', label: 'QA Dawnkeeper' },
    { classId: 'STONECALLER', launchClassName: 'Stonecaller', label: 'QA Stonecaller' },
]);
function fixtureHash(value) {
    return (0, node_crypto_1.createHash)('sha256').update(JSON.stringify(value)).digest('hex');
}
function createQaFrozenLoadout(input) {
    const definition = exports.QA_ECHO_DEFINITIONS.find(row => row.classId === input.classId);
    if (!definition)
        throw new Error(`qa_unknown_class:${input.classId}`);
    const level = input.level ?? 100;
    if (!Number.isInteger(level) || level < 1 || level > 100)
        throw new Error('qa_invalid_level');
    const player = (0, launch_combat_1.launchPlayer)(definition.launchClassName, level), role = (0, role_readiness_1.deriveRole)(input.classId);
    const characterId = input.characterId ?? `qa-char-${input.classId.toLowerCase()}`;
    const snapshot = {
        characterId, classId: input.classId, displayName: definition.label, bodyPresentation: 'male', role, level,
        maxHp: player.stats.maxHp, attackPower: player.stats.attackPower, healingPower: player.stats.healingPower,
        defense: player.stats.defense, accuracy: player.stats.accuracy, evasion: player.stats.evasion,
        critChance: player.stats.critChance, haste: player.stats.haste,
    };
    const frozenBase = {
        accountId: input.accountId, characterId, classId: input.classId,
        loadoutId: `qa-loadout-${input.classId.toLowerCase()}`, revision: 1,
        normalized: {
            snapshot, abilities: structuredClone(player.abilities), effectiveLevel: level,
            normalizationVersion: exports.QA_ECHO_CONTENT_VERSION,
            before: { level, maxHp: snapshot.maxHp, attackPower: snapshot.attackPower, healingPower: snapshot.healingPower, defense: snapshot.defense },
        },
        readiness: { ready: true, role, normalizedScore: 1, failures: [] },
    };
    return { ...frozenBase, snapshotHash: fixtureHash(frozenBase) };
}
/** Test/dev Echo pool with one independent source account per class. Production
 * online play still uses verified 24-hour published Echo profiles from Supabase. */
function createQaEchoPool(input) {
    const contentVersion = input.contentVersion ?? exports.QA_ECHO_CONTENT_VERSION;
    return exports.QA_ECHO_DEFINITIONS.map((definition, index) => {
        const sourceAccountId = `qa-echo-account-${String(index + 1).padStart(2, '0')}`;
        return {
            profileId: `qa-echo-profile-${definition.classId.toLowerCase()}`,
            sourceAccountId, optedIn: true, publishedAtMs: input.nowMs, contentVersion, blockedAccountIds: [],
            snapshot: createQaFrozenLoadout({ accountId: sourceAccountId, classId: definition.classId, level: input.level ?? 100 }),
        };
    });
}
