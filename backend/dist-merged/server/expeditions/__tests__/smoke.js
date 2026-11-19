"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const moderation_1 = require("../../chat/moderation");
const create_run_1 = require("../create-run");
const boon_generation_1 = require("../boon-generation");
const encounter_resolver_1 = require("../encounter-resolver");
node_assert_1.strict.equal((0, moderation_1.normalizeChatForMatching)('f . u - c_k'), 'fuck');
const mod = (0, moderation_1.moderateChatMessage)('f . u - c_k', [{ id: '1', term: 'fuck', severity: 2, action: 'mask' }]);
node_assert_1.strict.equal(mod.action, 'mask');
const prepared = (0, create_run_1.prepareExpeditionRun)({
    secret: 'test-secret', runId: '11111111-1111-4111-8111-111111111111', expeditionId: 'EXP_001', tier: 1,
    contentVersion: '4.4', creatorAccountId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', members: [
        { accountId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', characterId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', characterLevel: 25, role: 'tank', loadoutSnapshot: {}, statSnapshot: {} },
        { accountId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', characterId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', characterLevel: 25, role: 'damage', loadoutSnapshot: {}, statSnapshot: {} },
        { accountId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', characterId: 'ffffffff-ffff-4fff-8fff-ffffffffffff', characterLevel: 25, role: 'damage', loadoutSnapshot: {}, statSnapshot: {} },
        { accountId: '12121212-1212-4212-8212-121212121212', characterId: '34343434-3434-4434-8434-343434343434', characterLevel: 25, role: 'support', loadoutSnapshot: {}, statSnapshot: {} },
    ]
});
node_assert_1.strict.ok(prepared.route.length >= 8);
node_assert_1.strict.equal(prepared.route.at(-1)?.type, 'boss');
const offer1 = (0, boon_generation_1.generateBoonOffer)({ secret: 'test-secret', runId: prepared.run.id, characterId: prepared.members[0].characterId, nodeIndex: 2, contentVersion: '4.4', ownedBoonIds: [] });
const offer2 = (0, boon_generation_1.generateBoonOffer)({ secret: 'test-secret', runId: prepared.run.id, characterId: prepared.members[0].characterId, nodeIndex: 2, contentVersion: '4.4', ownedBoonIds: [] });
node_assert_1.strict.deepEqual(offer1, offer2);
node_assert_1.strict.equal(offer1.length, 3);
const encounter = (0, encounter_resolver_1.resolveSimulatedEncounter)({ secret: 'test-secret', runId: prepared.run.id, nodeIndex: 0, tier: 1, nodeDifficultyMultiplier: 1, regionalMechanicMultiplier: 1, routeRiskMultiplier: 1, executionScore: 1, mode: 'server_simulation', members: [
        { characterId: 't', role: 'tank', syncedPower: 1.0, currentHpPct: 1, boonSynergyMultiplier: 1 },
        { characterId: 'd1', role: 'damage', syncedPower: 1.0, currentHpPct: 1, boonSynergyMultiplier: 1 },
        { characterId: 'd2', role: 'damage', syncedPower: 1.0, currentHpPct: 1, boonSynergyMultiplier: 1 },
        { characterId: 's', role: 'support', syncedPower: 1.0, currentHpPct: 1, boonSynergyMultiplier: 1 },
    ] });
node_assert_1.strict.ok(encounter.successProbability >= .03 && encounter.successProbability <= .98);
console.log(JSON.stringify({ routeNodes: prepared.route.length, offer: offer1, encounter }, null, 2));
