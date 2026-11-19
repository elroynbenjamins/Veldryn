"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_crypto_1 = require("node:crypto");
const deterministic_rng_1 = require("../deterministic-rng");
for (const seed of ['', 'veldryn', 'x'.repeat(200), 'Écho 🔥', '\ud800broken\udfff']) {
    const rng = new deterministic_rng_1.CombatRng(seed);
    for (let i = 0; i < 256; i++) {
        const label = `target:${i}:🐉\ud800`;
        const expected = parseInt((0, node_crypto_1.createHmac)('sha256', seed).update(`${i}:${label}`).digest().toString('hex').slice(0, 13), 16) / 0x1fffffffffffff;
        strict_1.default.equal(rng.next(label), expected, 'portable combat must retain every existing deterministic outcome');
    }
}
strict_1.default.throws(() => new deterministic_rng_1.CombatRng('seed').pick([], 'empty'), /cannot_pick_empty/);
console.log('PASS portable combat RNG: 1,280 exact Node HMAC comparisons, long keys, Unicode and malformed surrogates');
