"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuildRecruitmentError = void 0;
exports.applyToGuild = applyToGuild;
exports.respondGuildApplication = respondGuildApplication;
exports.invitePlayerToGuild = invitePlayerToGuild;
exports.respondGuildInvite = respondGuildInvite;
class GuildRecruitmentError extends Error {
    code;
    constructor(code) {
        super(code);
        this.code = code;
    }
}
exports.GuildRecruitmentError = GuildRecruitmentError;
async function applyToGuild(repo, accountId, characterId, guildId, note, nowMs = Date.now()) {
    if (await repo.accountGuildId(accountId))
        throw new GuildRecruitmentError('already_in_guild');
    if (!await repo.guildHasSpace(guildId))
        throw new GuildRecruitmentError('guild_full');
    return repo.createApplication({ guildId, accountId, characterId, note: note.replace(/\s+/g, ' ').trim().slice(0, 180), expiresAtMs: nowMs + 72 * 60 * 60 * 1000 });
}
async function respondGuildApplication(repo, managerAccountId, applicationId, accept, nowMs = Date.now()) {
    const application = await repo.getApplication(applicationId);
    if (!application || application.status !== 'pending')
        throw new GuildRecruitmentError('application_not_available');
    if (!await repo.canManageRecruitment(managerAccountId, application.guildId))
        throw new GuildRecruitmentError('recruitment_permission_required');
    if (application.expiresAtMs <= nowMs) {
        await repo.setApplicationStatus(applicationId, 'expired');
        throw new GuildRecruitmentError('application_expired');
    }
    if (!accept) {
        await repo.setApplicationStatus(applicationId, 'declined');
        return;
    }
    if (await repo.accountGuildId(application.accountId))
        throw new GuildRecruitmentError('applicant_already_in_guild');
    if (!await repo.guildHasSpace(application.guildId))
        throw new GuildRecruitmentError('guild_full');
    await repo.addGuildMember(application.guildId, application.accountId, application.characterId);
    await repo.setApplicationStatus(applicationId, 'accepted');
}
async function invitePlayerToGuild(repo, managerAccountId, guildId, targetAccountId, nowMs = Date.now()) {
    if (!await repo.canManageRecruitment(managerAccountId, guildId))
        throw new GuildRecruitmentError('recruitment_permission_required');
    if (!await repo.guildHasSpace(guildId))
        throw new GuildRecruitmentError('guild_full');
    if (await repo.accountGuildId(targetAccountId))
        throw new GuildRecruitmentError('target_already_in_guild');
    return repo.createInvite({ guildId, accountId: targetAccountId, invitedByAccountId: managerAccountId, expiresAtMs: nowMs + 72 * 60 * 60 * 1000 });
}
async function respondGuildInvite(repo, accountId, characterId, inviteId, accept, nowMs = Date.now()) {
    const invite = await repo.getInvite(inviteId);
    if (!invite || invite.accountId !== accountId || invite.status !== 'pending')
        throw new GuildRecruitmentError('invite_not_available');
    if (invite.expiresAtMs <= nowMs) {
        await repo.setInviteStatus(inviteId, 'expired');
        throw new GuildRecruitmentError('invite_expired');
    }
    if (!accept) {
        await repo.setInviteStatus(inviteId, 'declined');
        return;
    }
    if (await repo.accountGuildId(accountId))
        throw new GuildRecruitmentError('already_in_guild');
    if (!await repo.guildHasSpace(invite.guildId))
        throw new GuildRecruitmentError('guild_full');
    await repo.addGuildMember(invite.guildId, accountId, characterId);
    await repo.setInviteStatus(inviteId, 'accepted');
}
