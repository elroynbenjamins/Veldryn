"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.voteGuildProject = voteGuildProject;
exports.startGuildProject = startGuildProject;
exports.donateToGuildProject = donateToGuildProject;
exports.claimGuildProjectReward = claimGuildProjectReward;
exports.updateGuildBulletin = updateGuildBulletin;
exports.updateGuildMemberRole = updateGuildMemberRole;
exports.voteGuildDecree = voteGuildDecree;
exports.confirmGuildDecree = confirmGuildDecree;
const guild_social_1 = require("./guild-social");
async function requireActor(repo, accountId) { const actor = await repo.actor(accountId); if (!actor)
    throw new Error('guild_membership_required'); return actor; }
async function voteGuildProject(repo, accountId, candidateId) { const a = await requireActor(repo, accountId); await repo.castBoardVote(a.guildId, a.accountId, candidateId); }
async function startGuildProject(repo, accountId, candidateId) { const a = await requireActor(repo, accountId); if (!(0, guild_social_1.roleHasPermission)(a.role, 'start_project'))
    throw new Error('guild_permission_denied'); return repo.startCandidate(a.guildId, a.accountId, candidateId); }
async function donateToGuildProject(repo, accountId, input) { const a = await requireActor(repo, accountId); if (!Number.isInteger(input.amount) || input.amount <= 0)
    throw new Error('invalid_donation_amount'); if (input.idempotencyKey.trim().length < 8)
    throw new Error('idempotency_key_required'); return repo.donate({ guildId: a.guildId, accountId: a.accountId, ...input }); }
async function claimGuildProjectReward(repo, accountId, projectInstanceId, rewardKey) { const a = await requireActor(repo, accountId); return repo.claimReward({ guildId: a.guildId, accountId: a.accountId, projectInstanceId, rewardKey }); }
async function updateGuildBulletin(repo, accountId, body) { const a = await requireActor(repo, accountId); if (!(0, guild_social_1.roleHasPermission)(a.role, 'edit_bulletin'))
    throw new Error('guild_permission_denied'); if (body.trim().length > 280)
    throw new Error('guild_bulletin_too_long'); await repo.setBulletin(a.guildId, a.accountId, body.trim()); }
async function updateGuildMemberRole(repo, accountId, targetAccountId, role) { const a = await requireActor(repo, accountId); if (!(0, guild_social_1.roleHasPermission)(a.role, 'edit_ranks'))
    throw new Error('guild_permission_denied'); await repo.setMemberRole(a.guildId, a.accountId, targetAccountId, role); }
async function voteGuildDecree(repo, accountId, windowId, decreeId) { const a = await requireActor(repo, accountId); await repo.voteDecree(a.guildId, a.accountId, windowId, decreeId); }
async function confirmGuildDecree(repo, accountId, windowId, decreeId) { const a = await requireActor(repo, accountId); if (!(0, guild_social_1.roleHasPermission)(a.role, 'manage_decree'))
    throw new Error('guild_permission_denied'); await repo.confirmDecree(a.guildId, a.accountId, windowId, decreeId); }
