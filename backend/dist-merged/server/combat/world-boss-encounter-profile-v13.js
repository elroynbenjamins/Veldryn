"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORLD_BOSS_V13_GUARD_SHARES = exports.WORLD_BOSS_V13_PROFILE_LIVE = void 0;
exports.makeWorldBossEncounterProfileV13 = makeWorldBossEncounterProfileV13;
exports.verifyWorldBossEncounterProfileV13 = verifyWorldBossEncounterProfileV13;
exports.proposeWorldBossGearBandProfileV13 = proposeWorldBossGearBandProfileV13;
/**
 * World Boss V13: server-frozen, bracket-specific encounter threat profile.
 * HIDDEN TEST/REVIEW CONTRACT ONLY; NOT an approved live balance curve.
 *
 * Build this ONLY from trusted offline reference cohorts or signed service
 * config. Client-defined attack/guard/bracket MUST NEVER pass this boundary.
 * SHA256 validates integrity, not origin/permission. There is no DB/endpoint.
 */
const sha256_1 = require("@noble/hashes/sha256");
const utils_1 = require("@noble/hashes/utils");
exports.WORLD_BOSS_V13_PROFILE_LIVE = false;
const safe = (s) => typeof s === 'string' && /^[A-Za-z0-9][A-Za-z0-9:_-]{0,159}$/.test(s);
const validNum = (x, minimum) => Number.isFinite(x) && x >= minimum && x <= 1e8;
const money = (x) => Math.round(x * 100) / 100;
const clean = (v) => ({
    version: v.version, eventId: v.eventId, configVersion: v.configVersion,
    boss: v.boss, phase: v.phase, gearBand: v.gearBand,
    attack: v.attack, defense: v.defense, guardMax: v.guardMax,
});
const digest = (v) => (0, utils_1.bytesToHex)((0, sha256_1.sha256)(new TextEncoder().encode(JSON.stringify(clean(v)))));
function makeWorldBossEncounterProfileV13(input) {
    if (!safe(input.eventId) || !safe(input.configVersion) ||
        !['hollowroot', 'sunscar', 'frostmarch'].includes(input.boss) ||
        !['armored', 'exposed', 'enraged'].includes(input.phase) ||
        ![1, 2, 3, 4].includes(input.gearBand) ||
        !validNum(input.attack, .01) || !validNum(input.defense, 0) || !validNum(input.guardMax, 0))
        throw Error('world_boss_v13_invalid_server_encounter_profile');
    const p = {
        version: 'world-boss-encounter-v13-draft', eventId: input.eventId,
        configVersion: input.configVersion, boss: input.boss, phase: input.phase,
        gearBand: input.gearBand, attack: money(input.attack), defense: money(input.defense),
        guardMax: money(input.guardMax),
    };
    return { ...p, digest: digest(p) };
}
function verifyWorldBossEncounterProfileV13(p, boss, phase, eventId) {
    if (!p || p.version !== 'world-boss-encounter-v13-draft' || !safe(p.eventId) ||
        !safe(p.configVersion) || p.boss !== boss || p.phase !== phase ||
        eventId !== undefined && p.eventId !== eventId ||
        ![1, 2, 3, 4].includes(p.gearBand) ||
        !validNum(p.attack, .01) || !validNum(p.defense, 0) || !validNum(p.guardMax, 0) ||
        !/^[0-9a-f]{64}$/.test(p.digest) || digest(p) !== p.digest)
        throw Error('world_boss_v13_invalid_or_foreign_profile');
}
/**
 * Pure offline candidate generator, not a production encounter tuner.
 * A relative guard budget based on the authentic equipped reference's
 * measured 14-round ungarded damage avoids T1 Frostmarch 0-damage traps.
 * Each band gets a frozen baseline; a player's stats cannot inflate its guard.
 *
 * Design-only shares: Hollowroot attrition 16%, Sunscar armor 21%,
 * Frostmarch barrier 28%. All need real loadout/mixed Echo approval.
 */
exports.WORLD_BOSS_V13_GUARD_SHARES = {
    hollowroot: .16, sunscar: .21, frostmarch: .28,
};
function proposeWorldBossGearBandProfileV13(input) {
    if (!validNum(input.referenceAttack, .01) || !validNum(input.referenceDefense, 0) ||
        !validNum(input.referenceUnguardedHpDamage, .01))
        throw Error('world_boss_v13_invalid_reference_cohort');
    const share = exports.WORLD_BOSS_V13_GUARD_SHARES[input.boss];
    return makeWorldBossEncounterProfileV13({
        eventId: input.eventId, configVersion: 'v13-fixture-reference-not-production',
        boss: input.boss, phase: input.phase, gearBand: input.gearBand,
        attack: input.referenceAttack * 1.1, defense: input.referenceDefense * .55,
        guardMax: input.referenceUnguardedHpDamage * share,
    });
}
