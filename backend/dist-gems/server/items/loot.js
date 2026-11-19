"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rollLoot = rollLoot;
const deterministic_rng_1 = require("../combat/deterministic-rng");
function rollLoot(seed, drops, pity) { const rng = new deterministic_rng_1.CombatRng(seed), next = { ...pity }, loot = []; for (const d of drops) {
    const k = d.pityKey;
    const before = k ? (next[k] ?? 0) : 0;
    const forced = !!k && !!d.pityAt && before + 1 >= d.pityAt;
    const hit = forced || rng.next(`drop:${d.itemId}`) < d.chance;
    if (hit) {
        const q = d.min + Math.floor(rng.next(`qty:${d.itemId}`) * (d.max - d.min + 1));
        loot.push({ itemId: d.itemId, quantity: q, bound: forced && !!d.bindOnPity, pityTriggered: forced });
        if (k)
            next[k] = 0;
    }
    else if (k)
        next[k] = before + 1;
} return { loot, pity: next }; }
