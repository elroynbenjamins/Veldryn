"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deterministicDigest = deterministicDigest;
exports.deterministicUnit = deterministicUnit;
exports.deterministicInt = deterministicInt;
exports.deterministicShuffle = deterministicShuffle;
const node_crypto_1 = require("node:crypto");
function deterministicDigest(secret, ...parts) {
    return (0, node_crypto_1.createHmac)('sha256', secret).update(parts.join('|')).digest();
}
function deterministicUnit(secret, ...parts) {
    const digest = deterministicDigest(secret, ...parts);
    const value = digest.readUInt32BE(0);
    return value / 0x1_0000_0000;
}
function deterministicInt(secret, min, maxInclusive, ...parts) {
    if (!Number.isInteger(min) || !Number.isInteger(maxInclusive) || maxInclusive < min)
        throw new Error('invalid deterministicInt bounds');
    return min + Math.floor(deterministicUnit(secret, ...parts) * (maxInclusive - min + 1));
}
function deterministicShuffle(secret, values, ...parts) {
    return values
        .map((value, index) => ({ value, key: deterministicDigest(secret, ...parts, index).toString('hex') }))
        .sort((a, b) => a.key.localeCompare(b.key))
        .map((x) => x.value);
}
