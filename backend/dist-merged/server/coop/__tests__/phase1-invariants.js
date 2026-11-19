"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const config_1 = require("../config");
const invariants_1 = require("../invariants");
const party_1 = require("../../social/party");
function expectError(fn, code) {
    let message = '';
    try {
        fn();
    }
    catch (error) {
        message = error instanceof Error ? error.message : String(error);
    }
    node_assert_1.strict.equal(message, code);
}
node_assert_1.strict.equal(config_1.COOP_ROGUELITE_CONFIG.featureFlag, 'coopRogueliteV1');
node_assert_1.strict.equal(config_1.COOP_ROGUELITE_CONFIG.enabledByDefault, false);
node_assert_1.strict.equal((0, invariants_1.hasExactCoopRoles)(['tank', 'damage', 'damage', 'support']), true);
node_assert_1.strict.equal((0, invariants_1.hasExactCoopRoles)(['damage', 'damage', 'damage', 'damage']), false);
node_assert_1.strict.equal((0, invariants_1.hasExactCoopRoles)(['tank', 'tank', 'damage', 'support']), false);
expectError(() => (0, invariants_1.validateCoopRoster)([
    { accountId: 'a', characterId: '1', role: 'tank' },
    { accountId: 'a', characterId: '2', role: 'damage' },
    { accountId: 'c', characterId: '3', role: 'damage' },
    { accountId: 'd', characterId: '4', role: 'support' },
]), 'duplicate_coop_account');
(0, invariants_1.validatePreBossNodeCount)(5);
for (const count of [4, 6, 7])
    expectError(() => (0, invariants_1.validatePreBossNodeCount)(count), 'invalid_coop_route_length');
node_assert_1.strict.deepEqual([1, 2, 3, 4, 5].map(tier => (0, config_1.coopRequiredLevel)(15, tier)), [15, 20, 25, 30, 35]);
node_assert_1.strict.equal(config_1.COOP_ROGUELITE_CONFIG.targetRunMinutesMin, 6);
node_assert_1.strict.equal(config_1.COOP_ROGUELITE_CONFIG.targetRunMinutesMax, 8);
// The legacy party/squad boundary remains untouched by this feature module.
node_assert_1.strict.equal((0, party_1.canStartExpedition)([{ characterId: 'legacy', role: 'damage', power: 1, online: true }]), true);
console.log('coop phase1 invariants OK');
