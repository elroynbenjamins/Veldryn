"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ONLINE_COOP_BALANCE_VERSION = void 0;
exports.deriveOnlineCoopLoadout = deriveOnlineCoopLoadout;
exports.onlineCoopLoadoutHash = onlineCoopLoadoutHash;
exports.assessOnlineCoopLoadout = assessOnlineCoopLoadout;
const node_crypto_1 = require("node:crypto");
const classes_1 = require("../../apps/mobile/src/content/classes");
const items_1 = require("../../apps/mobile/src/content/items");
const novice_sets_1 = require("../../apps/mobile/src/content/novice-sets");
const game_1 = require("../../apps/mobile/src/core/game");
const launch_combat_1 = require("../src/server/combat/content/launch-combat");
const role_readiness_1 = require("../src/server/coop/role-readiness");
const normalization_1 = require("../src/server/coop/normalization");
const companion_runtime_1 = require("../../apps/mobile/src/core/companion-runtime");
const policy_1 = require("../src/server/companions/policy");
exports.ONLINE_COOP_BALANCE_VERSION = 'online-coop-loadout-v1';
/** Converts the two existing stat units without changing solo gameplay. A complete,
 * unenhanced class novice outfit is the existing co-op kit's level-25 reference.
 * Actual equipped gear (including enhancements/gems) scales each matching stat.
 * This calibration state is never persisted or granted to an account. */
function referenceStats(classId) {
    const reference = (0, game_1.createCharacter)((0, game_1.newGame)(0), classId, 'Calibration');
    reference.character.equipment = Object.fromEntries((0, novice_sets_1.noviceSetFor)(classId).slots.map(slot => [slot, (0, novice_sets_1.noviceItemId)(classId, slot)]));
    return (0, game_1.effectiveStats)(reference);
}
/** Only call with a state loaded from online_game_states by the trusted server.
 * HTTP callers supply a selection/revision, never this state or its stats. */
function deriveOnlineCoopLoadout(accountId, state, version) {
    const character = state.character;
    if (!character)
        throw new Error('character_required');
    if (!Number.isSafeInteger(version) || version < 1)
        throw new Error('invalid_game_version');
    const definition = classes_1.CLASSES.find(row => row.id === character.classId);
    if (!definition)
        throw new Error('unknown_class');
    const role = (0, role_readiness_1.deriveRole)(character.classId);
    const kit = (0, launch_combat_1.launchPlayer)(definition.name, 25), reference = referenceStats(character.classId), actual = (0, game_1.effectiveStats)(state), levelScale = character.level / 25;
    const legalEquipment = Boolean(character.equipment.weapon) && Object.entries(character.equipment).every(([slot, id]) => {
        if (!id)
            return true;
        const item = (0, items_1.itemDef)(id);
        return item.type === 'gear' && item.slot === slot && (!item.classRestriction || item.classRestriction === character.classId);
    });
    const capabilities = role === 'tank' ? ['threat', 'defense'] : role === 'support' ? ['restore', 'mitigate', 'utility'] : ['damage'];
    const companionId = character.equippedCombatCompanionId;
    const companionPolicy = (0, policy_1.validateCompanionLoadout)({ classId: character.classId, companionId, ownedCompanionIds: state.account.unlockedCombatCompanionIds ?? [] });
    if (!companionPolicy.ok)
        throw new Error(companionPolicy.reason);
    if (companionId)
        (0, companion_runtime_1.assertCompanionIdle)(state, companionId);
    const combatCompanion = companionId ? (0, companion_runtime_1.companionOwned)(state)[companionId] : undefined;
    if (companionId && !combatCompanion)
        throw new Error('missing_companion_progress');
    return { accountId, characterId: character.id, classId: character.classId, loadoutId: 'current', revision: version, characterLevel: character.level,
        dungeonUnlocked: true, legalEquipment, capabilities, abilities: structuredClone(kit.abilities), stats: {
            characterId: character.id, classId: character.classId, displayName: character.name, level: character.level,
            ...(combatCompanion ? { combatCompanion: structuredClone(combatCompanion) } : {}),
            maxHp: kit.stats.maxHp * actual.hp / reference.hp * levelScale,
            attackPower: kit.stats.attackPower * actual.attack / reference.attack * levelScale,
            healingPower: kit.stats.healingPower * actual.attack / reference.attack * levelScale,
            defense: kit.stats.defense * actual.defense / reference.defense * levelScale,
            accuracy: kit.stats.accuracy * levelScale, evasion: kit.stats.evasion * levelScale,
            critChance: kit.stats.critChance, haste: kit.stats.haste,
        } };
}
function onlineCoopLoadoutHash(record) {
    const canonical = (value) => Array.isArray(value) ? '[' + value.map(canonical).join(',') + ']' : value !== null && typeof value === 'object' ? '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}' : JSON.stringify(value);
    // PostgreSQL jsonb reorders object keys. Publication hashes must survive that
    // round trip so the final commitment can revalidate the exact donor snapshot.
    return (0, node_crypto_1.createHash)('sha256').update(canonical({ version: exports.ONLINE_COOP_BALANCE_VERSION, record })).digest('hex');
}
/** Entry-screen diagnostics include ineligible equipment; queue commitment still
 * uses resolveAndFreezeLoadout and checks the selected dungeon and revision. */
function assessOnlineCoopLoadout(record, syncLevel = 25) {
    const role = (0, role_readiness_1.deriveRole)(record.classId), reference = normalization_1.ROOTBOUND_ROLE_REFERENCES[role];
    const normalized = (0, normalization_1.normalizeCombatInput)({ ...record.stats, role }, record.abilities, syncLevel, reference);
    const scale = normalized.effectiveLevel / reference.level;
    const primary = (role === 'tank' ? normalized.snapshot.defense / reference.defense : role === 'support' ? Math.max(normalized.snapshot.healingPower / reference.healingPower, normalized.snapshot.defense / reference.defense) : normalized.snapshot.attackPower / reference.attackPower) / scale;
    const readiness = (0, role_readiness_1.evaluateRoleReadiness)(record.classId, primary, record.capabilities);
    if (!record.legalEquipment) {
        readiness.ready = false;
        readiness.failures.push('illegal_equipment');
    }
    return { normalized, readiness };
}
