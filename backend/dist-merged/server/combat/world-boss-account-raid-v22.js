"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORLD_BOSS_V22_ENGINE_VERSION = exports.WORLD_BOSS_V22_MAX_CHARACTERS = exports.WORLD_BOSS_V22_ACCOUNT_RAID_LIVE = void 0;
exports.freezeWorldBossAccountRosterV22 = freezeWorldBossAccountRosterV22;
exports.worldBossAccountDamageV22 = worldBossAccountDamageV22;
exports.simulateWorldBossAccountRaidV22 = simulateWorldBossAccountRaidV22;
/**
 * World Boss V22 — HIDDEN, standalone account-roster combat prototype.
 *
 * One authenticated account may fight with all 1–5 owned characters in the
 * same battle. No other players' Echoes, NPC backfills, forced roles, routes,
 * currency credits, SQL transactions, or deployed World Boss are involved.
 *
 * The owner-only load is private/server-trusted. The result can be shown as
 * an honest local replay, but must never be accepted as global HP damage
 * from a client: only an atomic private DB settlement can credit the world.
 */
const sha256_1 = require("@noble/hashes/sha256");
const utils_1 = require("@noble/hashes/utils");
const engine_1 = require("./engine");
const snapshot_adapter_1 = require("./snapshot-adapter");
const world_boss_war_camp_v11_1 = require("./world-boss-war-camp-v11");
const world_boss_encounter_profile_v13_1 = require("./world-boss-encounter-profile-v13");
exports.WORLD_BOSS_V22_ACCOUNT_RAID_LIVE = false;
exports.WORLD_BOSS_V22_MAX_CHARACTERS = 5;
exports.WORLD_BOSS_V22_ENGINE_VERSION = 'world-boss-account-raid-v22-prototype';
const weights = [1, .12, .07, .05, .04]; // tentative, NOT approved balance
const ID = /^[A-Za-z0-9][A-Za-z0-9:_-]{0,159}$/;
const DIGEST = /^[a-f0-9]{64}$/;
const maxAge = 60000;
const finite = (x) => Number.isFinite(x) && x >= 0;
const safeSeed = (x) => typeof x === 'string' && x.length >= 24 && x.length <= 512 && ID.test(x.slice(0, 160));
const hash = (value) => (0, utils_1.bytesToHex)((0, sha256_1.sha256)(new TextEncoder().encode(JSON.stringify(value))));
/**
 * Accepts ONLY recent V12-derived snapshots from a backend account-ownership
 * reader, not a client roster. Allows repeated classes and any role mixture.
 */
function freezeWorldBossAccountRosterV22(input) {
    const { accountId, atUtcMs, verified } = input;
    if (!ID.test(accountId) || !Number.isSafeInteger(atUtcMs) || atUtcMs <= 0 ||
        !Array.isArray(verified) || verified.length < 1 ||
        verified.length > exports.WORLD_BOSS_V22_MAX_CHARACTERS)
        throw Error('world_boss_v22_invalid_owned_roster');
    const unique = new Set();
    const characters = verified.map(({ snapshot, sourceHash, gameVersion }) => {
        if (!snapshot || snapshot.ownerAccountId !== accountId || !snapshot.eligible ||
            !ID.test(snapshot.snapshotId) || !ID.test(snapshot.verified?.characterId) ||
            unique.has(snapshot.verified.characterId) ||
            !Number.isSafeInteger(snapshot.capturedAtUtcMs) ||
            snapshot.capturedAtUtcMs > atUtcMs ||
            atUtcMs - snapshot.capturedAtUtcMs > maxAge ||
            !Number.isSafeInteger(gameVersion) || gameVersion < 1 ||
            !DIGEST.test(sourceHash))
            throw Error('world_boss_v22_unverified_or_foreign_character');
        unique.add(snapshot.verified.characterId);
        const combatant = (0, snapshot_adapter_1.combatantFromVerifiedSnapshot)(snapshot.verified, structuredClone(snapshot.abilities));
        if (combatant.id !== snapshot.verified.characterId ||
            combatant.team !== 'players' ||
            !['tank', 'damage', 'support'].includes(combatant.role) ||
            !finite(combatant.stats.maxHp) || combatant.stats.maxHp <= 0 ||
            !finite(combatant.stats.attackPower) || combatant.stats.attackPower <= 0)
            throw Error('world_boss_v22_invalid_verified_combatant');
        return { characterId: combatant.id, snapshotId: snapshot.snapshotId,
            sourceRevision: gameVersion, sourceHash, combatant: structuredClone(combatant) };
    });
    // Server's character DB selection order must not change battle outputs.
    characters.sort((a, b) => a.characterId.localeCompare(b.characterId));
    return {
        accountId, capturedAtUtcMs: atUtcMs, characters,
        rosterDigest: hash({ version: exports.WORLD_BOSS_V22_ENGINE_VERSION, accountId,
            characters: characters.map(c => ({
                id: c.characterId, snapshotId: c.snapshotId,
                sourceRevision: c.sourceRevision, sourceHash: c.sourceHash,
                combatant: c.combatant,
            })) }),
    };
}
function worldBossAccountDamageV22(ledger) {
    if (!Array.isArray(ledger) || ledger.length < 1 || ledger.length > 5 ||
        ledger.some(x => !x || !ID.test(x.characterId) || !finite(x.rawDamage)) ||
        new Set(ledger.map(x => x.characterId)).size !== ledger.length)
        throw Error('world_boss_v22_invalid_damage_ledger');
    const sorted = [...ledger].map(x => x.rawDamage).sort((a, b) => b - a);
    const scored = sorted.reduce((sum, n, i) => sum + n * weights[i], 0);
    if (!finite(scored) || scored > Number.MAX_SAFE_INTEGER)
        throw Error('world_boss_v22_damage_out_of_range');
    return Math.floor(scored);
}
const bossName = {
    hollowroot: 'Hollowroot Colossus', sunscar: 'Sunscar Devourer',
    frostmarch: 'Frostmarch Warden',
};
/** A time-driven enemy adapted to the real combat engine for offline V22 tests.
 * This is NOT yet the final 14-round authored V6/V13 boss encounter.
 */
function offlineAccountRaidBoss(input) {
    const e = (0, world_boss_war_camp_v11_1.deriveWorldBossWarCampEffectsV11)(input.warCamp);
    const phaseAttack = input.phase === 'enraged' ? 1.2 : input.phase === 'exposed' ? 1.08 : 1;
    const armorFactor = input.order === 'break_armor' ? .95 : 1;
    const defense = input.profile.defense * armorFactor;
    const attack = input.profile.attack * phaseAttack * (1 - e.bossDamageReduction) *
        (input.order === 'hold_line' ? .95 : 1);
    const areaType = input.boss === 'hollowroot' ? 'nature' :
        input.boss === 'sunscar' ? 'fire' : 'ice';
    return {
        id: 'WB22_' + input.boss.toUpperCase(), name: bossName[input.boss],
        team: 'enemies', role: 'enemy', level: 25, boss: true,
        basicAttackMs: 2800, basicAttackCoeff: .7,
        stats: {
            maxHp: 1_000_000_000, attackPower: attack, healingPower: 0,
            defense, accuracy: 700, evasion: 120, critChance: .05, critMultiplier: 1.5, haste: 0,
        },
        abilities: [{
                id: 'WB22_' + input.boss + '_SWEEP', name: 'World Sweep',
                cooldownMs: 10000, castTimeMs: 900, target: 'all_enemies', priority: 80,
                interruptible: false, effects: [{ kind: 'damage', coeff: .42, damageType: areaType }],
            }, {
                id: 'WB22_' + input.boss + '_CAST', name: 'World Cast',
                cooldownMs: 16000, castTimeMs: 1400, target: 'current_target',
                priority: 95, interruptible: true,
                effects: [{ kind: 'damage', coeff: 1.15, damageType: areaType }],
            }],
    };
}
/**
 * A single deterministic battle with all owned fighters present. No
 * cross-account borrowing, no mandatory role composition. The result uses
 * the engine's actual per-character damage/healing and replay log.
 */
function simulateWorldBossAccountRaidV22(input) {
    const { eventId, requestId, roster, order, boss, phase, encounter, warCamp } = input;
    if (!ID.test(eventId) || !ID.test(requestId) || !safeSeed(input.serverSeed) ||
        !['steady_assault', 'hold_line', 'break_armor'].includes(order) ||
        !['hollowroot', 'sunscar', 'frostmarch'].includes(boss) ||
        !['armored', 'exposed', 'enraged'].includes(phase) ||
        !roster || !ID.test(roster.accountId) ||
        roster.characters.length < 1 || roster.characters.length > 5)
        throw Error('world_boss_v22_invalid_account_battle');
    (0, world_boss_encounter_profile_v13_1.verifyWorldBossEncounterProfileV13)(encounter, boss, phase, eventId);
    if (warCamp && warCamp.eventId !== eventId)
        throw Error('world_boss_v22_foreign_war_camp');
    const effects = (0, world_boss_war_camp_v11_1.deriveWorldBossWarCampEffectsV11)(warCamp);
    const expected = hash({ version: exports.WORLD_BOSS_V22_ENGINE_VERSION, accountId: roster.accountId,
        characters: roster.characters.map(c => ({
            id: c.characterId, snapshotId: c.snapshotId,
            sourceRevision: c.sourceRevision, sourceHash: c.sourceHash,
            combatant: c.combatant,
        })) });
    if (!DIGEST.test(roster.rosterDigest) || expected !== roster.rosterDigest ||
        new Set(roster.characters.map(c => c.characterId)).size !== roster.characters.length)
        throw Error('world_boss_v22_frozen_roster_digest_mismatch');
    const players = roster.characters.map(c => ({
        ...structuredClone(c.combatant),
        stats: { ...c.combatant.stats,
            maxHp: c.combatant.stats.maxHp * effects.startingHpMultiplier,
            healingPower: c.combatant.stats.healingPower * effects.healingMultiplier,
        },
    }));
    const combat = (0, engine_1.simulateCombat)({
        seed: [exports.WORLD_BOSS_V22_ENGINE_VERSION, eventId, roster.accountId,
            input.serverSeed].join(':'),
        players, enemies: [offlineAccountRaidBoss({ boss, phase, profile: encounter, warCamp, order })],
        maxDurationMs: 80000, tickMs: 100,
    });
    const characterLedger = combat.players.map(p => ({
        characterId: p.definition.id, rawDamage: p.damageDone,
        rawHealing: p.healingDone, damageTaken: p.damageTaken,
        interrupts: p.interrupts, survived: p.alive,
    }));
    const rawPartyDamage = characterLedger.reduce((sum, p) => sum + p.rawDamage, 0);
    const proposedWorldHpDamage = worldBossAccountDamageV22(characterLedger);
    return {
        schema: 'world-boss-v22-account-raid-prototype',
        eventId, accountId: roster.accountId, requestId, boss, phase, order,
        rosterDigest: roster.rosterDigest, encounterDigest: encounter.digest,
        warCampDigest: warCamp?.digest ?? null,
        engineVersion: exports.WORLD_BOSS_V22_ENGINE_VERSION,
        combat, rawPartyDamage, proposedWorldHpDamage,
        characterLedger, persisted: false,
    };
}
