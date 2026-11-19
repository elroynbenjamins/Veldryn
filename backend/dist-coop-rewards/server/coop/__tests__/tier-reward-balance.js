"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const reward_base_1 = require("../../expeditions/reward-base");
const constants_1 = require("../../expeditions/constants");
const rewards_1 = require("../../expeditions/rewards");
const tier_balance_1 = require("../../expeditions/tier-balance");
const config_1 = require("../config");
const dungeon_reward_balance_1 = require("../dungeon-reward-balance");
const launch_combat_1 = require("../../combat/content/launch-combat");
const node_resolution_1 = require("../../expeditions/node-resolution");
const route_generation_1 = require("../../expeditions/route-generation");
const config_2 = require("../config");
const tiers = [1, 2, 3, 4, 5];
const expectedMarks = [74, 81, 93, 107, 126];
let lastAttack = 0, lastHp = 0, lastDefense = 0;
tiers.forEach((tier, i) => {
    const scale = (0, tier_balance_1.coopTierEnemyMultipliers)(tier);
    node_assert_1.strict.equal((0, rewards_1.marksForRun)(74, tier, { cleared: true, routeProgress: 1, reachedFinalBoss: true }), expectedMarks[i]);
    node_assert_1.strict.ok(scale.attack >= lastAttack && scale.hp >= lastHp && scale.defense >= lastDefense);
    node_assert_1.strict.equal(Number(scale.attack.toFixed(2)), constants_1.EXPEDITION.difficultyIndex[tier]);
    lastAttack = scale.attack;
    lastHp = scale.hp;
    lastDefense = scale.defense;
});
node_assert_1.strict.deepEqual((0, tier_balance_1.coopTierEnemyMultipliers)(1), { attack: 1, hp: 1, defense: 1 });
node_assert_1.strict.equal((0, config_1.readinessEligibleCoopTier)(15, (0, config_2.rebaseLegacyCombatLevel)(25), .8), 1, 'Minimal gear must not be auto-queued at the highest unlocked tier');
node_assert_1.strict.equal((0, config_1.readinessEligibleCoopTier)(15, (0, config_2.rebaseLegacyCombatLevel)(35), 1.05), 3, 'Strong verified gear is capped at newly published Tier III');
node_assert_1.strict.equal((0, config_1.readinessEligibleCoopTier)(15, (0, config_2.rebaseLegacyCombatLevel)(20), 1.5), 2, 'Character level remains an upper bound');
node_assert_1.strict.equal((0, config_1.readinessEligibleCoopTier)(15, 25, .79), undefined, 'Invalid role readiness cannot auto-queue');
const roster = ['Ironwarden', 'Wayfinder', 'Ravager', 'Dawnkeeper'].map(className => (0, launch_combat_1.launchPlayer)(className, 25));
const graph = (0, route_generation_1.generateCoopRouteGraph)('balance-audit', 'EXP_001', 'test-run', 'v2', 'v2');
const first = graph.nodes.find(node => node.nodeId === 'd1-c0');
const seedState = (0, node_resolution_1.initialPersistentRunState)(roster);
const firstNormal = (0, node_resolution_1.resolveCoopNode)({ runId: 'test-run', serverSecret: 'balance-audit', node: first, players: roster, state: seedState, tier: 1 });
const firstLegacy = (0, node_resolution_1.resolveCoopNode)({ runId: 'test-run', serverSecret: 'balance-audit', node: first, players: roster, state: seedState });
node_assert_1.strict.deepEqual(firstNormal, firstLegacy, 'Tier I must preserve original combat balance byte-for-byte');
const stronger = (0, node_resolution_1.resolveCoopNode)({ runId: 'test-run', serverSecret: 'balance-audit', node: first, players: roster, state: seedState, tier: 5 });
node_assert_1.strict.equal(stronger.summary.kind, 'combat');
node_assert_1.strict.equal(firstNormal.summary.kind, 'combat');
const run = { id: 'test-run', expeditionId: 'EXP_001', tier: 5, phase: 'completed', tierScalingVersion: 2,
    graph, persistentState: { ...seedState, visitedNodeIds: [first.nodeId] }, lastResolution: { nodeId: graph.bossNodeId, result: { summary: { kind: 'combat' } } }
};
node_assert_1.strict.equal((0, dungeon_reward_balance_1.enhancedDungeonMarks)(run), 126);
const legacy = { ...run, tierScalingVersion: undefined };
node_assert_1.strict.equal((0, dungeon_reward_balance_1.enhancedDungeonMarks)(legacy), Math.round(reward_base_1.LEGACY_DUNGEON_BASE_MARKS.EXP_001 * .8), 'Legacy live in-progress payouts are preserved');
const failedEarly = { ...run, phase: 'failed', persistentState: { ...seedState, visitedNodeIds: [first.nodeId] }, lastResolution: { nodeId: first.nodeId, result: { summary: { kind: 'combat' } } } };
node_assert_1.strict.equal((0, dungeon_reward_balance_1.enhancedDungeonMarks)(failedEarly), 6, 'Early failures earn a small progress payment');
const boss = graph.nodes.find(node => node.kind === 'boss');
const failedBoss = { ...run, phase: 'failed', persistentState: { ...seedState, visitedNodeIds: graph.nodes.filter(node => node.nodeId.startsWith('d') && node.nodeId.endsWith('-c0')).map(node => node.nodeId) }, lastResolution: { nodeId: boss.nodeId, result: { summary: { kind: 'combat', enemyHp: { chief: 20 }, replayCombatants: [{ id: 'chief', boss: true, maxHp: 100 }] } } } };
node_assert_1.strict.equal((0, dungeon_reward_balance_1.dungeonRewardState)(failedBoss).finalBossHpFraction, .2);
node_assert_1.strict.equal((0, dungeon_reward_balance_1.enhancedDungeonMarks)(failedBoss), 63, 'Near-boss defeat earns half of tier-correct full Marks');
node_assert_1.strict.equal((0, dungeon_reward_balance_1.enhancedDungeonMarks)({ ...failedBoss, lastResolution: { nodeId: boss.nodeId, result: { summary: { kind: 'combat', enemyHp: { chief: 80 }, replayCombatants: [{ id: 'chief', boss: true, maxHp: 100 }] } } } }), 44, 'Other boss defeats earn 35%');
node_assert_1.strict.equal((0, dungeon_reward_balance_1.enhancedDungeonMarks)({ ...run, phase: 'awaiting_choice' }), 0, 'No reward before terminal settlement');
// Lightweight deterministic audit. These figures are diagnostics, not claims
// about production clear rates; larger calibrated trials gate the rollout.
const baselineParties = [
    { name: 'restoration', party: ['Ironwarden', 'Wayfinder', 'Ravager', 'Dawnkeeper'].map(name => (0, launch_combat_1.launchPlayer)(name, 25)) },
    { name: 'utility', party: ['Ironwarden', 'Hexweaver', 'Knife Dancer', 'Stonecaller'].map(name => (0, launch_combat_1.launchPlayer)(name, 25)) },
];
const trials = 60;
const audit = [];
for (const baseline of baselineParties) {
    for (const tier of tiers) {
        let wins = 0;
        for (let n = 0; n < trials; n++) {
            const id = `tier-audit-${baseline.name}-${n}`;
            const tree = (0, route_generation_1.generateCoopRouteGraph)('tier-audit', 'EXP_001', id, 'audit-v2', 'audit-v2');
            let state = (0, node_resolution_1.initialPersistentRunState)(baseline.party), current = tree.entryNodeId, alive = true;
            for (let depth = 1; depth <= tree.preBossNodeCount; depth++) {
                const currentNode = tree.nodes.find(node => node.nodeId === current);
                const choices = currentNode.nextNodeIds.map(nodeId => tree.nodes.find(node => node.nodeId === nodeId));
                const node = choices.find(item => item.kind === 'camp') ?? choices[0];
                const result = (0, node_resolution_1.resolveCoopNode)({ runId: id, serverSecret: 'tier-audit', node, players: baseline.party, state, tier });
                state = result.state;
                current = node.nodeId;
                if (!result.success) {
                    alive = false;
                    break;
                }
            }
            if (alive) {
                const bossNode = tree.nodes.find(node => node.nodeId === tree.bossNodeId);
                const result = (0, node_resolution_1.resolveCoopNode)({ runId: id, serverSecret: 'tier-audit', node: bossNode, players: baseline.party, state, tier });
                alive = result.success;
            }
            if (alive)
                wins++;
        }
        audit.push({ party: baseline.name, tier, clears: wins, rate: Number((wins / trials).toFixed(3)) });
    }
}
console.log('Tier balance audit (diagnostic, n=60 per tier/party):', JSON.stringify(audit));
console.log('PASS tier enemy scaling, Tier I legacy compatibility, and Solo/Live tier-aware failure rewards');
