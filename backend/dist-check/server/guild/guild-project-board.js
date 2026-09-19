"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.guildProjectWeekKey = guildProjectWeekKey;
exports.buildGuildWeeklyProjectBoard = buildGuildWeeklyProjectBoard;
exports.guildProjectBoardWindow = guildProjectBoardWindow;
exports.autoStartVoteThreshold = autoStartVoteThreshold;
exports.chooseVoteWinner = chooseVoteWinner;
const guild_projects_1 = require("./guild-projects");
function mondayUtcStart(date) {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const daysSinceMonday = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - daysSinceMonday);
    return d;
}
function guildProjectWeekKey(date = new Date()) {
    return mondayUtcStart(date).toISOString().slice(0, 10);
}
function stableHash(input) {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}
function pick(guildId, cycleKey, focus, guildLevel) {
    const options = guild_projects_1.GUILD_WEEKLY_PROJECT_POOL.filter((d) => d.focus === focus && d.minGuildLevel <= guildLevel);
    if (options.length === 0)
        throw new Error(`no_guild_project_candidate:${focus}`);
    return options[stableHash(`${guildId}:${cycleKey}:${focus}`) % options.length];
}
function buildGuildWeeklyProjectBoard(guildId, guildLevel, date = new Date()) {
    if (guildLevel < 10)
        return [];
    const cycleKey = guildProjectWeekKey(date);
    const focuses = ['combat', 'skilling', 'mixed'];
    return focuses.map((focus) => {
        const definition = pick(guildId, cycleKey, focus, guildLevel);
        return { cycleKey, templateId: definition.id, focus, definition };
    });
}
function guildProjectBoardWindow(date = new Date()) {
    const start = mondayUtcStart(date);
    const end = new Date(start.getTime() + 7 * 86_400_000);
    return { cycleKey: start.toISOString().slice(0, 10), startsAt: start.toISOString(), endsAt: end.toISOString() };
}
function autoStartVoteThreshold(activeMemberSnapshot) {
    return Math.min(6, Math.max(2, Math.ceil(Math.max(1, activeMemberSnapshot) * 0.10)));
}
function chooseVoteWinner(candidates, guildId, cycleKey) {
    if (candidates.length === 0)
        return undefined;
    const maxVotes = Math.max(...candidates.map((c) => Math.max(0, c.votes)));
    const tied = candidates.filter((c) => c.votes === maxVotes).sort((a, b) => a.templateId.localeCompare(b.templateId));
    if (tied.length === 1)
        return tied[0].templateId;
    return tied[stableHash(`${guildId}:${cycleKey}:vote-tie`) % tied.length]?.templateId;
}
