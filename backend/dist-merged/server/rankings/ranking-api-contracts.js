"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRankingBoard = parseRankingBoard;
exports.parseRankingLimit = parseRankingLimit;
exports.parseRankingOffset = parseRankingOffset;
const ranking_types_1 = require("./ranking-types");
const BOARDS = new Set(['profession_total', ...ranking_types_1.RANKING_PROFESSION_BOARDS, 'arena_rating', 'arena_wins', 'dungeon_tier', 'dungeon_clears', 'achievement_score', 'guild']);
function parseRankingBoard(value) { if (typeof value !== 'string' || !BOARDS.has(value))
    throw new Error('invalid_ranking_board'); return value; }
function parseRankingLimit(value, defaultValue = 50) { if (value === undefined || value === null || value === '')
    return defaultValue; const n = typeof value === 'string' ? Number(value) : value; if (typeof n !== 'number' || !Number.isSafeInteger(n) || n < 1 || n > 100)
    throw new Error('invalid_ranking_limit'); return n; }
function parseRankingOffset(value) { if (value === undefined || value === null || value === '')
    return 0; const n = typeof value === 'string' ? Number(value) : value; if (typeof n !== 'number' || !Number.isSafeInteger(n) || n < 0 || n > 10000)
    throw new Error('invalid_ranking_offset'); return n; }
