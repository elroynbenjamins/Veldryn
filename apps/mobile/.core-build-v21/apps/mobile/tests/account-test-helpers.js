"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exactEqual = void 0;
exports.test = test;
exports.equal = equal;
exports.ok = ok;
exports.throws = throws;
exports.close = close;
exports.skillLevels = skillLevels;
function test(name, fn) { try {
    fn();
    console.log('PASS ' + name);
}
catch (error) {
    console.error('FAIL ' + name, error);
    throw error;
} }
function equal(actual, expected, message) { if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw new Error(`${message}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`); }
exports.exactEqual = equal;
function ok(value, message) { if (!value)
    throw new Error(message); }
function throws(fn, message) { let failed = false; try {
    fn();
}
catch {
    failed = true;
} if (!failed)
    throw new Error(message); }
function close(actual, expected, message) { if (Math.abs(actual - expected) > .0001)
    throw new Error(`${message}: ${actual} !== ${expected}`); }
const progression_1 = require("../src/core/progression");
function skillLevels(state, levels) { const skills = state.skills.map((s, i) => i < levels.length ? { ...s, level: levels[i], xp: (0, progression_1.totalXpAtLevel)(levels[i]) } : s); return { ...state, skills }; }
