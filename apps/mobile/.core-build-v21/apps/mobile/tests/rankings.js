"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rankings_1 = require("../src/core/rankings");
const assert = (condition, message) => { if (!condition)
    throw new Error(message); };
assert(rankings_1.RANKING_BOARDS.length === 19, 'expected all rankings');
assert((0, rankings_1.rankingBoardDefinition)('arena_rating').unit === 'rating', 'arena unit');
assert((0, rankings_1.rankingValueLabel)('dungeon_tier', 7) === 'Tier 7', 'tier label');
assert((0, rankings_1.rankingBoardDefinition)('guild').group === 'Guilds', 'guild group');
console.log('rankings core PASS');
