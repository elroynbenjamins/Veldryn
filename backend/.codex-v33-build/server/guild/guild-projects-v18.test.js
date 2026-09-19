"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const guild_project_board_1 = require("./guild-project-board");
const guild_decrees_1 = require("./guild-decrees");
const guild_project_ranking_1 = require("./guild-project-ranking");
const guild_projects_1 = require("./guild-projects");
const guild_social_1 = require("./guild-social");
function run() {
    node_assert_1.strict.equal((0, guild_projects_1.guildProjectSlotCap)(4), 0);
    node_assert_1.strict.equal((0, guild_projects_1.guildProjectSlotCap)(5), 1);
    node_assert_1.strict.equal((0, guild_projects_1.guildProjectSlotCap)(10), 2);
    node_assert_1.strict.equal((0, guild_projects_1.guildProjectSlotCap)(25), 3);
    const small = (0, guild_projects_1.deriveGuildWeeklyProjectBalance)(4);
    const large = (0, guild_projects_1.deriveGuildWeeklyProjectBalance)(40);
    node_assert_1.strict.equal(small.targetPoints, 6800);
    node_assert_1.strict.equal(large.targetPoints, 32000);
    node_assert_1.strict.equal(small.minimumMeaningfulContributors, 2);
    node_assert_1.strict.equal(large.minimumMeaningfulContributors, 8);
    node_assert_1.strict.ok(large.singleAccountCompletionShareCap < small.singleAccountCompletionShareCap);
    const profile = { id: 'combat.test', category: 'combat', expectedSecondsPerUnit: 3600, challenge: 'routine' };
    const credit = (0, guild_projects_1.creditGuildProjectContribution)({ profile, units: 5, pointsCreditedToday: 0, completionPointsByAccount: 0, balance: small });
    node_assert_1.strict.equal(credit.dailyCreditedPoints, 2400, 'daily cap must stop one settlement from dumping unlimited effort');
    node_assert_1.strict.ok(credit.completionCreditedPoints <= Math.ceil(small.targetPoints * small.singleAccountCompletionShareCap));
    const mixed = guild_projects_1.GUILD_WEEKLY_PROJECT_POOL.find(x => x.focus === 'mixed');
    const mixedBalance = (0, guild_projects_1.deriveGuildWeeklyProjectBalance)(10);
    const fail = (0, guild_projects_1.evaluateGuildProject)(mixed, mixedBalance, [{ accountId: 'a', rawPoints: 5000, completionPoints: 5000, combatPoints: 5000, skillingPoints: 0 }, { accountId: 'b', rawPoints: 7000, completionPoints: 7000, combatPoints: 7000, skillingPoints: 0 }]);
    node_assert_1.strict.equal(fail.complete, false);
    node_assert_1.strict.ok(fail.missing.includes('mixed_skilling_share'));
    const pass = (0, guild_projects_1.evaluateGuildProject)(mixed, mixedBalance, [{ accountId: 'a', rawPoints: 6000, completionPoints: 6000, combatPoints: 6000, skillingPoints: 0 }, { accountId: 'b', rawPoints: 5000, completionPoints: 5000, combatPoints: 0, skillingPoints: 5000 }]);
    node_assert_1.strict.equal(pass.complete, true);
    node_assert_1.strict.equal((0, guild_projects_1.memberEligibleForGuildProjectCompletionReward)(mixedBalance, { accountId: 'x', rawPoints: 1000, completionPoints: 1000, combatPoints: 500, skillingPoints: 500 }, { currentMember: true, wasMemberAtStart: true, projectStartedAtMs: 0, projectCompletedAtMs: 10 }), true);
    node_assert_1.strict.equal((0, guild_projects_1.memberEligibleForGuildProjectCompletionReward)(mixedBalance, { accountId: 'x', rawPoints: 1000, completionPoints: 1000, combatPoints: 500, skillingPoints: 500 }, { currentMember: true, wasMemberAtStart: false, joinedAtMs: 0, progressFractionAtJoin: .2, projectStartedAtMs: 0, projectCompletedAtMs: 49 * 3600000 }), true);
    node_assert_1.strict.equal((0, guild_projects_1.memberEligibleForGuildProjectCompletionReward)(mixedBalance, { accountId: 'x', rawPoints: 1000, completionPoints: 1000, combatPoints: 500, skillingPoints: 500 }, { currentMember: true, wasMemberAtStart: false, joinedAtMs: 0, progressFractionAtJoin: .8, projectStartedAtMs: 0, projectCompletedAtMs: 72 * 3600000 }), false);
    node_assert_1.strict.deepEqual((0, guild_projects_1.reachedGuildMilestones)(12500, 10000), [25, 50, 75, 100, 125]);
    const board1 = (0, guild_project_board_1.buildGuildWeeklyProjectBoard)('11111111-1111-1111-1111-111111111111', 25, new Date('2026-09-14T12:00:00Z'));
    const board2 = (0, guild_project_board_1.buildGuildWeeklyProjectBoard)('11111111-1111-1111-1111-111111111111', 25, new Date('2026-09-15T12:00:00Z'));
    node_assert_1.strict.deepEqual(board1.map(x => x.templateId), board2.map(x => x.templateId));
    node_assert_1.strict.deepEqual(board1.map(x => x.focus), ['combat', 'skilling', 'mixed']);
    node_assert_1.strict.equal((0, guild_project_board_1.autoStartVoteThreshold)(30), 3);
    node_assert_1.strict.equal((0, guild_project_board_1.autoStartVoteThreshold)(60), 6);
    node_assert_1.strict.ok((0, guild_project_board_1.chooseVoteWinner)([{ templateId: 'a', votes: 2 }, { templateId: 'b', votes: 2 }], 'g', '2026-09-14'));
    node_assert_1.strict.equal((0, guild_decrees_1.cappedGuildSourcedBonus)(.10, (0, guild_decrees_1.decreeCandidates)('g', 'w', 50)[0]), Math.min((0, guild_decrees_1.decreeCandidates)('g', 'w', 50)[0].guildSourcedHardCap, .10 + (0, guild_decrees_1.decreeCandidates)('g', 'w', 50)[0].bonusValue));
    const weekly = guild_projects_1.GUILD_WEEKLY_PROJECT_POOL[0];
    node_assert_1.strict.equal((0, guild_project_ranking_1.guildProjectSeasonScore)({ definition: weekly, priorCompletionsOfSameTemplateThisSeason: 0, reachedStretchMilestone: false }), 40);
    node_assert_1.strict.equal((0, guild_project_ranking_1.guildProjectSeasonScore)({ definition: weekly, priorCompletionsOfSameTemplateThisSeason: 3, reachedStretchMilestone: false }), 14);
    node_assert_1.strict.equal((0, guild_social_1.roleHasPermission)('quartermaster', 'manage_vault'), true);
    node_assert_1.strict.equal((0, guild_social_1.roleHasPermission)('recruiter', 'start_project'), false);
    let bulletinFailed = false;
    try {
        (0, guild_social_1.validateGuildBulletin)('x'.repeat(281));
    }
    catch {
        bulletinFailed = true;
    }
    node_assert_1.strict.equal(bulletinFailed, true);
    node_assert_1.strict.equal((0, guild_social_1.validateGuildBulletin)(' hello '), 'hello');
    console.log('v18 guild projects/social tests passed');
}
run();
