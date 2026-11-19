"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const tags_1 = require("../tags");
function throws(fn, needle) { try {
    fn();
}
catch (error) {
    node_assert_1.strict.ok(String(error).includes(needle));
    return;
} throw new Error(`expected ${needle}`); }
node_assert_1.strict.equal((0, tags_1.normalizeGuildTag)(' arc '), 'ARC');
node_assert_1.strict.equal((0, tags_1.validateGuildTag)('fox'), 'FOX');
throws(() => (0, tags_1.validateGuildTag)('AB'), 'invalid_format');
throws(() => (0, tags_1.validateGuildTag)('ADM'), 'reserved');
throws(() => (0, tags_1.validateGuildTag)('SEX'), 'blocked');
node_assert_1.strict.deepEqual((0, tags_1.guildTagAvailability)('arc', new Set(['ARC'])), { normalizedTag: 'ARC', available: false, reason: 'taken' });
console.log('guild tags v53 backend PASS');
