"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateGuildWeeklyBoards = generateGuildWeeklyBoards;
exports.autoStartGuildProjectBoards = autoStartGuildProjectBoards;
exports.runGuildProjectMaintenance = runGuildProjectMaintenance;
const guild_project_board_1 = require("./guild-project-board");
async function generateGuildWeeklyBoards(repo, now = new Date()) {
    const window = (0, guild_project_board_1.guildProjectBoardWindow)(now);
    const guilds = await repo.listEligibleGuildsForBoard(window.cycleKey);
    let count = 0;
    for (const guild of guilds) {
        const candidates = (0, guild_project_board_1.buildGuildWeeklyProjectBoard)(guild.guildId, guild.guildLevel, now);
        if (candidates.length === 0)
            continue;
        await repo.replaceWeeklyBoard({ guild, cycleKey: window.cycleKey, startsAt: window.startsAt, endsAt: window.endsAt, candidates });
        count++;
    }
    return { cycleKey: window.cycleKey, guilds: count };
}
/**
 * Members can recommend candidates immediately. Authorized roles may start one at any time.
 * If no authorized member acts for 36h, a sufficiently supported top-voted project can auto-start.
 */
async function autoStartGuildProjectBoards(repo, nowMs = Date.now()) {
    const boards = await repo.listOpenBoardsForAutoStart(nowMs);
    let started = 0;
    for (const board of boards) {
        if (nowMs - board.openedAtMs < 36 * 3_600_000)
            continue;
        const threshold = (0, guild_project_board_1.autoStartVoteThreshold)(board.activeMemberSnapshot);
        const topVotes = Math.max(0, ...board.candidates.map(c => c.votes));
        if (topVotes < threshold)
            continue;
        const winner = (0, guild_project_board_1.chooseVoteWinner)(board.candidates, board.guildId, board.cycleKey);
        if (!winner)
            continue;
        if (await repo.startCandidateByTemplate(board.guildId, board.cycleKey, winner, 'auto_vote') === 'started')
            started++;
    }
    return started;
}
async function runGuildProjectMaintenance(repo, nowMs = Date.now()) {
    const [expiredProjects, finalizedProjects, expiredCandidates, resolvedDecrees, endedDecrees, purgedFeed] = await Promise.all([
        repo.expireDueProjects(nowMs), repo.finalizeCompletedProjects(nowMs), repo.expireBoardCandidates(nowMs),
        repo.resolveExpiredDecreeWindows(nowMs), repo.endExpiredDecrees(nowMs), repo.purgeExpiredFeed(nowMs),
    ]);
    const autoStarted = await autoStartGuildProjectBoards(repo, nowMs);
    return { expiredProjects, finalizedProjects, expiredCandidates, resolvedDecrees, endedDecrees, purgedFeed, autoStarted };
}
