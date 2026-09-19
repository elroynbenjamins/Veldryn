"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CombatRng = void 0;
const hmac_1 = require("@noble/hashes/hmac");
const sha256_1 = require("@noble/hashes/sha256");
const utils_1 = require("@noble/hashes/utils");
// Node-compatible UTF-8 without requiring Buffer or TextEncoder on Hermes.
function utf8(value) {
    const bytes = [];
    for (const character of value) {
        let n = character.codePointAt(0);
        if (n >= 0xd800 && n <= 0xdfff)
            n = 0xfffd;
        if (n < 0x80)
            bytes.push(n);
        else if (n < 0x800)
            bytes.push(0xc0 | (n >> 6), 0x80 | (n & 63));
        else if (n < 0x10000)
            bytes.push(0xe0 | (n >> 12), 0x80 | ((n >> 6) & 63), 0x80 | (n & 63));
        else
            bytes.push(0xf0 | (n >> 18), 0x80 | ((n >> 12) & 63), 0x80 | ((n >> 6) & 63), 0x80 | (n & 63));
    }
    return new Uint8Array(bytes);
}
class CombatRng {
    constructor(seed) {
        this.cursor = 0;
        this.key = utf8(seed);
    }
    next(label) {
        const payload = `${this.cursor++}:${label}`;
        const hex = (0, utils_1.bytesToHex)((0, hmac_1.hmac)(sha256_1.sha256, this.key, utf8(payload))).slice(0, 13);
        return parseInt(hex, 16) / 0x1fffffffffffff;
    }
    pick(values, label) {
        if (!values.length)
            throw new Error('cannot_pick_empty');
        return values[Math.min(values.length - 1, Math.floor(this.next(label) * values.length))];
    }
}
exports.CombatRng = CombatRng;
