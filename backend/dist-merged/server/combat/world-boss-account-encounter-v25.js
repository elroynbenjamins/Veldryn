"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORLD_BOSS_V25_ENGINE_VERSION = exports.WORLD_BOSS_V25_AUTHORED_ENCOUNTERS_LIVE = void 0;
exports.simulateWorldBossAuthoredAccountEncounterV25 = simulateWorldBossAuthoredAccountEncounterV25;
/**
 * Hidden V25: 14 authored World Boss rounds with 1–5 verified owned
 * characters, distinct local Guard and role-attributed utility.
 *
 * This is a pure engineering prototype, NOT wired into the V23 HP settlement
 * worker, live events, public routes, account inventory or World Sigils.
 * Only trusted server-frozen V12/V22 data may enter this boundary.
 */
const sha256_1 = require("@noble/hashes/sha256");
const utils_1 = require("@noble/hashes/utils");
const world_boss_round_prototype_1 = require("./world-boss-round-prototype");
const world_boss_account_raid_v22_1 = require("./world-boss-account-raid-v22");
const world_boss_war_camp_v11_1 = require("./world-boss-war-camp-v11");
const world_boss_encounter_profile_v13_1 = require("./world-boss-encounter-profile-v13");
const potion_modifiers_1 = require("../coop/potion-modifiers");
exports.WORLD_BOSS_V25_AUTHORED_ENCOUNTERS_LIVE = false;
exports.WORLD_BOSS_V25_ENGINE_VERSION = 'world-boss-account-rounds-v25-prototype';
const ID = /^[A-Za-z0-9][A-Za-z0-9:_-]{0,159}$/;
const DIGEST = /^[a-f0-9]{64}$/;
const SERVER_SEED = /^[A-Za-z0-9:_-]{24,512}$/;
const finite = (x) => Number.isFinite(x) && x >= 0;
const hash = (obj) => (0, utils_1.bytesToHex)((0, sha256_1.sha256)(new TextEncoder().encode(JSON.stringify(obj))));
const near = (a, b) => Math.abs(a - b) <= .05;
function simulateWorldBossAuthoredAccountEncounterV25(input) {
    if (!input || !ID.test(input.eventId) || !ID.test(input.requestId) ||
        !SERVER_SEED.test(input.serverSeed) ||
        !['steady_assault', 'hold_line', 'break_armor'].includes(input.order) ||
        !['hollowroot', 'sunscar', 'frostmarch'].includes(input.boss) ||
        !['armored', 'exposed', 'enraged'].includes(input.phase))
        throw Error('world_boss_v25_invalid_account_encounter');
    const { roster } = input;
    if (!roster || !ID.test(roster.accountId) ||
        !Number.isSafeInteger(roster.capturedAtUtcMs) || roster.capturedAtUtcMs <= 0 ||
        !Array.isArray(roster.characters) || roster.characters.length < 1 ||
        roster.characters.length > 5 || !DIGEST.test(roster.rosterDigest))
        throw Error('world_boss_v25_invalid_frozen_roster');
    const characters = roster.characters;
    const ids = new Set();
    for (const c of characters) {
        if (!c || !ID.test(c.characterId) || ids.has(c.characterId) ||
            !ID.test(c.snapshotId) || !DIGEST.test(c.sourceHash) ||
            !Number.isSafeInteger(c.sourceRevision) || c.sourceRevision < 1 ||
            !c.combatant || c.combatant.id !== c.characterId ||
            c.combatant.team !== 'players' ||
            !['tank', 'damage', 'support'].includes(c.combatant.role) ||
            !finite(c.combatant.stats.maxHp) || c.combatant.stats.maxHp <= 0 ||
            !finite(c.combatant.stats.attackPower) || c.combatant.stats.attackPower <= 0)
            throw Error('world_boss_v25_invalid_verified_character');
        ids.add(c.characterId);
    }
    const expected = hash({ version: world_boss_account_raid_v22_1.WORLD_BOSS_V22_ENGINE_VERSION,
        accountId: roster.accountId,
        characters: characters.map(c => ({
            id: c.characterId, snapshotId: c.snapshotId,
            sourceRevision: c.sourceRevision, sourceHash: c.sourceHash,
            combatant: c.combatant,
        })) });
    if (expected !== roster.rosterDigest)
        throw Error('world_boss_v25_roster_digest_mismatch');
    (0, world_boss_encounter_profile_v13_1.verifyWorldBossEncounterProfileV13)(input.encounter, input.boss, input.phase, input.eventId);
    if (input.warCamp && input.warCamp.eventId !== input.eventId)
        throw Error('world_boss_v25_foreign_war_camp');
    (0, world_boss_war_camp_v11_1.deriveWorldBossWarCampEffectsV11)(input.warCamp);
    const tonicItemId = input.tonicItemId ?? null;
    if (tonicItemId !== null && !Object.prototype.hasOwnProperty.call(potion_modifiers_1.DUNGEON_ROLE_TONIC_MODIFIERS, tonicItemId))
        throw Error('world_boss_v25_unknown_tonic');
    const tonic = tonicItemId === null ? undefined :
        { ...potion_modifiers_1.DUNGEON_ROLE_TONIC_MODIFIERS[tonicItemId] };
    const result = (0, world_boss_round_prototype_1.simulateWorldBossAccountRoundsV25)({
        seed: [exports.WORLD_BOSS_V25_ENGINE_VERSION, input.eventId, roster.accountId,
            input.serverSeed].join(':'),
        boss: input.boss, phase: input.phase, order: input.order,
        players: characters.map(c => structuredClone(c.combatant)),
        serverEncounterProfile: input.encounter,
        serverWarCamp: input.warCamp,
        serverTonic: tonic,
    });
    const characterLedger = characters.map(c => {
        const row = result.participants[c.characterId];
        if (!row || !finite(row.bossHpDamage) || !finite(row.guardDamage) ||
            !finite(row.effectiveHealing) || !finite(row.shieldConsumed) ||
            !finite(row.tankProtection) || !finite(row.cleansePrevented) ||
            !Number.isSafeInteger(row.interrupts) || row.interrupts < 0 ||
            typeof row.survived !== 'boolean')
            throw Error('world_boss_v25_untrusted_round_ledger');
        return {
            characterId: c.characterId, role: c.combatant.role,
            bossHpDamage: row.bossHpDamage,
            localGuardDamage: row.guardDamage, effectiveHealing: row.effectiveHealing,
            shieldConsumed: row.shieldConsumed, tankProtection: row.tankProtection,
            cleansePrevented: row.cleansePrevented, interrupts: row.interrupts,
            survived: row.survived,
        };
    });
    if (Object.keys(result.participants).length !== characters.length ||
        result.roundsCompleted < 1 || result.roundsCompleted > 14 ||
        !finite(result.bossHpDamage) || !finite(result.localGuardDamage) ||
        !finite(result.remainingGuard) || !finite(result.guardRestored) ||
        !near(characterLedger.reduce((s, c) => s + c.bossHpDamage, 0), result.bossHpDamage) ||
        !near(characterLedger.reduce((s, c) => s + c.localGuardDamage, 0), result.localGuardDamage))
        throw Error('world_boss_v25_incoherent_authored_results');
    const proposedWorldHpDamage = (0, world_boss_account_raid_v22_1.worldBossAccountDamageV22)(characterLedger.map(c => ({
        characterId: c.characterId, rawDamage: c.bossHpDamage,
    })));
    return {
        schema: 'world-boss-v25-authored-account-rounds',
        engineVersion: exports.WORLD_BOSS_V25_ENGINE_VERSION,
        eventId: input.eventId, accountId: roster.accountId, requestId: input.requestId,
        boss: input.boss, phase: input.phase, order: input.order,
        rosterDigest: roster.rosterDigest, encounterDigest: input.encounter.digest,
        warCampDigest: input.warCamp?.digest ?? null, tonicItemId,
        roundsCompleted: result.roundsCompleted, survived: result.survived,
        rawBossHpDamage: result.bossHpDamage,
        proposedWorldHpDamage, localGuardDamage: result.localGuardDamage,
        remainingGuard: result.remainingGuard, guardRestored: result.guardRestored,
        events: result.events, characterLedger, result,
        persisted: false, rewarded: false,
    };
}
