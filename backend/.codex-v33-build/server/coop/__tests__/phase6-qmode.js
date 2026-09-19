"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const launch_combat_1 = require("../../combat/content/launch-combat");
const qmode_1 = require("../qmode");
function frozen(accountId, classId, characterId) {
    const player = (0, launch_combat_1.launchPlayer)(classId, 25);
    const role = player.role;
    const snapshot = { characterId, classId, role, level: 25, ...player.stats };
    return { accountId, characterId, classId, loadoutId: `load-${characterId}`, revision: 1, normalized: { snapshot, abilities: player.abilities, effectiveLevel: 25, normalizationVersion: 'test', before: { level: 25, maxHp: snapshot.maxHp, attackPower: snapshot.attackPower, healingPower: snapshot.healingPower, defense: snapshot.defense } }, readiness: { ready: true, role, normalizedScore: 1, failures: [] }, snapshotHash: `hash-${characterId}` };
}
function echo(accountId, classId, characterId) { return { profileId: `profile-${characterId}`, sourceAccountId: accountId, optedIn: true, publishedAtMs: 9_000, contentVersion: 'v1', blockedAccountIds: [], snapshot: frozen(accountId, classId, characterId) }; }
const profiles = [echo('tank-owner', 'Ironwarden', 'tank-char'), echo('damage-owner-1', 'Wayfinder', 'damage-char-1'), echo('damage-owner-2', 'Ravager', 'damage-char-2'), echo('support-owner', 'Stonecaller', 'support-char')];
const repository = new qmode_1.MemoryQModeRunRepository();
const firstService = new qmode_1.QModeService(repository, 'q-secret-success');
let run = firstService.create({ requestId: 'request-1', runId: 'q-run-1', controllerAccountId: 'controller', controllerSnapshot: frozen('controller', 'Dawnkeeper', 'controller-char'), expeditionId: 'EXP_001', tier: 1, contentVersion: 'v1', balanceVersion: 'b1', nowMs: 10_000, profiles });
node_assert_1.strict.equal(run.players.length, 4);
node_assert_1.strict.equal(new Set(run.echoSourceAccountIds).size, 3);
node_assert_1.strict.equal(run.phase, 'awaiting_choice');
node_assert_1.strict.equal(firstService.create({ requestId: 'request-1', runId: 'different', controllerAccountId: 'controller', controllerSnapshot: frozen('controller', 'Dawnkeeper', 'controller-char'), expeditionId: 'EXP_001', tier: 1, contentVersion: 'v1', balanceVersion: 'b1', nowMs: 10_000, profiles }).id, 'q-run-1');
let denied = '';
try {
    firstService.getAuthorized(run.id, 'tank-owner');
}
catch (error) {
    denied = error instanceof Error ? error.message : String(error);
}
node_assert_1.strict.equal(denied, 'not_participant');
const resumedService = new qmode_1.QModeService(repository, 'q-secret-success');
for (let depth = 1; depth <= run.graph.preBossNodeCount; depth++) {
    const current = run.graph.nodes.find(node => node.nodeId === run.currentNodeId);
    const options = current.nextNodeIds.map(id => run.graph.nodes.find(node => node.nodeId === id));
    const selected = options.find(node => node.kind === 'camp') ?? options[0];
    run = resumedService.choose({ runId: run.id, controllerAccountId: 'controller', optionNodeId: selected.nodeId });
    node_assert_1.strict.equal(run.phase, 'awaiting_choice');
}
run = resumedService.choose({ runId: run.id, controllerAccountId: 'controller', optionNodeId: 'boss' });
node_assert_1.strict.equal(run.phase, 'completed');
node_assert_1.strict.ok((run.rewardMarks ?? 0) > 0);
node_assert_1.strict.equal(run.persistentState.visitedNodeIds.length, run.graph.preBossNodeCount + 1);
console.log('coop phase6 qmode OK', JSON.stringify({ echoes: run.echoSourceAccountIds.length, preBoss: run.graph.preBossNodeCount, rewardMarks: run.rewardMarks }));
