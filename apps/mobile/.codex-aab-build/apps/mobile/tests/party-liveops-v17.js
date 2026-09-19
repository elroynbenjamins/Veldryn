"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const party_social_1 = require("../src/core/party-social");
function assert(value, message) { if (!value)
    throw new Error(message); }
const milestones = [{ points: 250, reached: true, claimed: true }, { points: 750, reached: true, claimed: false }, { points: 1500, reached: false, claimed: false }];
assert((0, party_social_1.milestoneProgressPercent)(375, 750) === 50, 'milestone percent');
assert((0, party_social_1.nextUnreachedMilestone)(800, milestones)?.points === 1500, 'next unreached milestone');
console.log('mobile-party-liveops-v17 ok');
