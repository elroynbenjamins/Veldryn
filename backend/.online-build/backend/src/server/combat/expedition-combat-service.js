"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveExpeditionCombat = resolveExpeditionCombat;
const node_crypto_1 = require("node:crypto");
const engine_1 = require("./engine");
const expedition_encounters_1 = require("./content/expedition-encounters");
function resolveExpeditionCombat(input, includeDebugTrace = false) {
    const factory = expedition_encounters_1.EXPEDITION_ENCOUNTERS[input.encounterId];
    if (!factory)
        throw new Error(`unknown_encounter:${input.encounterId}`);
    const enemies = factory().map(enemy => ({ ...enemy, stats: { ...enemy.stats, attackPower: enemy.stats.attackPower * (input.enemyAttackMultiplier ?? 1) } }));
    const result = (0, engine_1.simulateCombat)({ seed: `${input.serverSeed}:${input.runId}:${input.nodeIndex}:${input.encounterId}`, players: input.players, enemies, initialPlayerState: input.initialPlayerState, maxDurationMs: input.maxDurationMs ?? 180000 });
    const eventDigest = (0, node_crypto_1.createHash)('sha256').update(JSON.stringify(result.events)).digest().toString('hex');
    const rec = (xs, pick) => Object.fromEntries(xs.map(x => [x.definition.id, Number(pick(x).toFixed(2))]));
    return { success: result.victory, resultJson: { reason: result.reason, durationMs: result.durationMs, downs: result.players.filter(p => p.downed).map(p => p.definition.id), playerHp: rec(result.players, x => x.hp), enemyHp: rec(result.enemies, x => x.hp), damage: rec(result.players, x => x.damageDone), healing: rec(result.players, x => x.healingDone), interrupts: rec(result.players, x => x.interrupts), eventDigest, eventCount: result.events.length }, endingPlayerState: (0, engine_1.persistentPlayerState)(result), ...(includeDebugTrace ? { debugEvents: result.events } : {}) };
}
