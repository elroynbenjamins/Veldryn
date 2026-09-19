"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const coop_loadout_presentation_1 = require("../src/core/coop-loadout-presentation");
const coop_loadout_1 = require("../src/i18n/coop-loadout");
const languages_1 = require("../src/i18n/languages");
const stats = { maxHp: 4000, attackPower: 600, healingPower: 200, defense: 900 };
function equal(actual, expected, message = 'values differ') { if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw new Error(`${message}: ${JSON.stringify(actual)}`); }
function throws(work, pattern) { let message = ''; try {
    work();
}
catch (error) {
    message = error instanceof Error ? error.message : String(error);
} if (!pattern.test(message))
    throw new Error(`Expected ${pattern}, received ${message}`); }
function loadout(role, overrides = {}) { return { id: `load-${role}`, characterId: 'current', revision: 2, verifiedRevision: 2, name: `${role} build`, characterName: 'Hero', className: role === 'tank' ? 'Ironwarden' : role === 'support' ? 'Dawnkeeper' : 'Wayfinder', role, status: 'verified', ready: true, failures: [], level: 30, effectiveLevel: 25, beforeStats: stats, effectiveStats: { ...stats, attackPower: 550 }, skills: ['One'], equipment: ['Set'], ...overrides }; }
for (const role of ['tank', 'damage', 'support'])
    equal((0, coop_loadout_presentation_1.presentCoopLoadout)(loadout(role), 'current').selectable, true, `${role} server projection should be selectable`);
equal((0, coop_loadout_presentation_1.presentCoopLoadout)(loadout('tank', { status: 'ineligible', ready: false, failures: ['missing_tank_capability'] }), 'current').blockingReasons, ['missing_tank_capability']);
equal((0, coop_loadout_presentation_1.presentCoopLoadout)(loadout('damage', { status: 'ineligible', ready: false, failures: ['character_below_min_level'] }), 'current').selectable, false);
equal((0, coop_loadout_presentation_1.presentCoopLoadout)(loadout('support', { revision: 3, verifiedRevision: 2, status: 'stale' }), 'current').blockingReasons.includes('stale_revision'), true);
equal((0, coop_loadout_presentation_1.presentCoopLoadout)(loadout('damage'), 'other-character').blockingReasons.includes('different_character'), true);
equal((0, coop_loadout_presentation_1.presentCoopLoadout)(loadout('support', { status: 'failed', ready: false, effectiveLevel: undefined, effectiveStats: undefined }), 'current').blockingReasons.includes('verification_failed'), true);
throws(() => (0, coop_loadout_presentation_1.buildCoopLoadoutIntent)({ mode: 'live', dungeonId: 'EXP_001', tier: 1, loadout: (0, coop_loadout_presentation_1.presentCoopLoadout)(loadout('tank', { ready: false, status: 'ineligible' }), 'current') }), /loadout_not_server_verified/);
const intent = (0, coop_loadout_presentation_1.buildCoopLoadoutIntent)({ mode: 'qmode', dungeonId: 'EXP_001', tier: 1, loadout: (0, coop_loadout_presentation_1.presentCoopLoadout)(loadout('damage'), 'current') });
equal(intent, { mode: 'qmode', dungeonId: 'EXP_001', tier: 1, characterId: 'current', loadoutId: 'load-damage', loadoutRevision: 2 });
equal('role' in intent, false);
equal('stats' in intent, false);
for (const language of languages_1.SUPPORTED_LANGUAGES)
    equal((0, coop_loadout_1.translatedCoopLoadoutMessageCount)(language), coop_loadout_1.COOP_LOADOUT_MESSAGE_COUNT, `${language} loadout catalog incomplete`);
console.log('coop loadout presentation OK');
