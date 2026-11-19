"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dungeonRewardState = dungeonRewardState;
exports.enhancedDungeonMarks = enhancedDungeonMarks;
const reward_base_1 = require("../expeditions/reward-base");
const rewards_1 = require("../expeditions/rewards");
/** Authoritative payout is derived from a frozen run, never a client tier or
 * reward estimate. Marks are computed once at terminal node settlement. */
function dungeonRewardState(run) {
    const lastNode = run.lastResolution?.nodeId;
    const last = run.graph.nodes.find(node => node.nodeId === lastNode);
    const visited = run.persistentState.visitedNodeIds.filter(id => id !== run.graph.entryNodeId && id !== run.graph.bossNodeId).length;
    const routeProgress = Math.max(0, Math.min(1, visited / Math.max(1, run.graph.preBossNodeCount)));
    let finalBossHpFraction;
    if (last?.kind === 'boss' && run.phase === 'failed') {
        const summary = run.lastResolution?.result.summary;
        const hp = summary?.enemyHp;
        const combatants = summary?.replayCombatants;
        const boss = combatants?.find(member => member.boss && typeof member.maxHp === 'number' && member.maxHp > 0);
        if (boss && hp && typeof hp[boss.id] === 'number') {
            finalBossHpFraction = Math.max(0, Math.min(1, hp[boss.id] / boss.maxHp));
        }
    }
    return { cleared: run.phase === 'completed', routeProgress, reachedFinalBoss: last?.kind === 'boss', ...(finalBossHpFraction === undefined ? {} : { finalBossHpFraction }) };
}
/** Version 1 Live runs retain their pre-upgrade rewards to avoid changing
 * payments for an already committed run. Fresh runs use the shared formula. */
function enhancedDungeonMarks(run) {
    if (run.phase !== 'completed' && run.phase !== 'failed')
        return 0;
    const mapBaseMarks = (0, reward_base_1.frozenRunBaseMarks)(run);
    if (run.tierScalingVersion !== 2)
        return Math.max(0, Math.round(mapBaseMarks * .8));
    return (0, rewards_1.marksForRun)(mapBaseMarks, run.tier, dungeonRewardState(run));
}
