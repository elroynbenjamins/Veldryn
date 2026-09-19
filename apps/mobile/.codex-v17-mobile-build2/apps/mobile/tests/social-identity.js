"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const social_identity_1 = require("../src/core/social-identity");
const classes_1 = require("../src/content/classes");
function assert(value, message) { if (!value)
    throw new Error(message); }
for (const c of classes_1.CLASSES) {
    assert((0, social_identity_1.resolveIdentityClass)(c.id) === c.id, 'Canonical class id ' + c.id);
    assert((0, social_identity_1.resolveIdentityClass)(' ' + c.name.toUpperCase() + ' ') === c.id, 'Display class name ' + c.name);
}
assert((0, social_identity_1.resolveIdentityClass)('Knife-Dancer') === 'KNIFE_DANCER', 'Hyphenated server name');
assert((0, social_identity_1.resolveIdentityClass)('Mystery Mage') === undefined, 'Unknown class must not invent a hero');
assert((0, social_identity_1.resolveIdentityClass)(null) === undefined && (0, social_identity_1.resolveIdentityClass)('') === undefined, 'Absent class uses neutral identity');
console.log('PASS: all canonical/display class identities and unknown fallbacks');
