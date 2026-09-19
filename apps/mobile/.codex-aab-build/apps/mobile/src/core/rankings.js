"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RANKING_GROUPS = exports.RANKING_BOARDS = exports.RANKING_PROFESSIONS = void 0;
exports.rankingBoardDefinition = rankingBoardDefinition;
exports.rankingValueLabel = rankingValueLabel;
exports.RANKING_PROFESSIONS = ['mining', 'woodcutting', 'fishing', 'smithing', 'cooking', 'herbalism', 'alchemy', 'hunting', 'exploration', 'tailoring', 'enchanting', 'faith'];
const skillName = (id) => id === 'faith' ? 'Faith' : id.charAt(0).toUpperCase() + id.slice(1);
exports.RANKING_BOARDS = Object.freeze([{ id: 'profession_total', name: 'Profession Total', group: 'Account', description: 'Combined server-tracked profession levels across all account characters.', unit: 'levels' }, { id: 'achievement_score', name: 'Achievement Score', group: 'Account', description: 'Prestige points from claimed account achievements.', unit: 'points' }, ...exports.RANKING_PROFESSIONS.map(id => ({ id, name: skillName(id), group: 'Professions', description: `Highest ${skillName(id)} level on one account character.`, unit: 'level' })), { id: 'arena_rating', name: 'Arena Rating', group: 'Competitive', description: 'Current Arena-season rating.', unit: 'rating' }, { id: 'arena_wins', name: 'Arena Wins', group: 'Competitive', description: 'Current Arena-season wins.', unit: 'wins' }, { id: 'dungeon_tier', name: 'Dungeon Tier', group: 'Dungeons', description: 'Highest cleared co-op tier, then clears at that tier.', unit: 'tier' }, { id: 'dungeon_clears', name: 'Dungeon Clears', group: 'Dungeons', description: 'Lifetime participant clear entitlements from co-op Dungeons.', unit: 'clears' }, { id: 'guild', name: 'Guild Prestige', group: 'Guilds', description: 'Guild level, then Guild XP. Prestige-only.', unit: 'level' }]);
exports.RANKING_GROUPS = ['Account', 'Professions', 'Competitive', 'Dungeons', 'Guilds'];
function rankingBoardDefinition(id) { const row = exports.RANKING_BOARDS.find(board => board.id === id); if (!row)
    throw new Error(`Unknown ranking board ${id}`); return row; }
function rankingValueLabel(board, value) { const def = rankingBoardDefinition(board); return board === 'dungeon_tier' ? `Tier ${Math.max(0, Math.floor(value))}` : `${Math.floor(value).toLocaleString()} ${def.unit}`; }
