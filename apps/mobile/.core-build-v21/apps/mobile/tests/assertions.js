"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.equal = equal;
exports.deepEqual = deepEqual;
function equal(actual, expected, message) { if (actual !== expected)
    throw new Error(`${message}: ${String(actual)} !== ${String(expected)}`); }
function deepEqual(actual, expected, message) { if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw new Error(`${message}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`); }
