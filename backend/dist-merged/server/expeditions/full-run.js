"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveFullExpedition = resolveFullExpedition;
const rng_1 = require("./rng");
const engine_1 = require("../combat/engine");
const build_effects_1 = require("../combat/build-effects");
function resolveFullExpedition(input) { const players = input.players.map(p => (0, build_effects_1.applyRunBuild)(p, input.build)); const combats = []; for (let i = 0; i < input.nodes.length; i++) {
    const n = input.nodes[i];
    if (!n.encounter?.length)
        continue;
    const c = (0, engine_1.simulateCombat)({ seed: (0, rng_1.deterministicDigest)(input.serverSecret, input.runId, i, n.id).toString('hex'), players, enemies: n.encounter });
    combats.push(c);
    if (!c.victory)
        return { cleared: false, completedNodes: i, combats, stoppedAt: n.id };
} return { cleared: true, completedNodes: input.nodes.length, combats }; }
