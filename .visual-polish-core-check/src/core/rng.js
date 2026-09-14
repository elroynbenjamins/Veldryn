"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hash32 = hash32;
exports.random01 = random01;
function hash32(input) {
    let h = 2166136261;
    for (let i = 0; i < input.length; i++) {
        h ^= input.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}
function random01(seed, index) {
    let x = (hash32(seed) + Math.imul(index + 1, 0x9e3779b1)) >>> 0;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
}
