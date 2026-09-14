export type GuildRecruitmentRequestStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';

export interface GuildRecruitmentActor {
  accountId: string;
  guildId?: string;
  canManageRecruitment: boolean;
}

export interface GuildApplicationRecord {
  id: string;
  guildId: string;
  accountId: string;
  characterId: string;
  note: string;
  status: GuildRecruitmentRequestStatus;
  expiresAtMs: number;
}

export interface GuildInviteRecord {
  id: string;
  guildId: string;
  accountId: string;
  invitedByAccountId: string;
  status: GuildRecruitmentRequestStatus;
  expiresAtMs: number;
}

export interface GuildRecruitmentRepository {
  accountGuildId(accountId: string): Promise<string | null>;
  guildHasSpace(guildId: string): Promise<boolean>;
  canManageRecruitment(accountId: string, guildId: string): Promise<boolean>;
  createApplication(input: Omit<GuildApplicationRecord, 'id' | 'status'>): Promise<GuildApplicationRecord>;
  getApplication(id: string): Promise<GuildApplicationRecord | null>;
  setApplicationStatus(id: string, status: GuildRecruitmentRequestStatus): Promise<void>;
  createInvite(input: Omit<GuildInviteRecord, 'id' | 'status'>): Promise<GuildInviteRecord>;
  getInvite(id: string): Promise<GuildInviteRecord | null>;
  setInviteStatus(id: string, status: GuildRecruitmentRequestStatus): Promise<void>;
  addGuildMember(guildId: string, accountId: string, characterId: string): Promise<void>;
}

export class GuildRecruitmentError extends Error {
  constructor(public readonly code: string) { super(code); }
}

export async function applyToGuild(
  repo: GuildRecruitmentRepository,
  accountId: string,
  characterId: string,
  guildId: string,
  note: string,
  nowMs = Date.now(),
): Promise<GuildApplicationRecord> {
  if (await repo.accountGuildId(accountId)) throw new GuildRecruitmentError('already_in_guild');
  if (!await repo.guildHasSpace(guildId)) throw new GuildRecruitmentError('guild_full');
  return repo.createApplication({ guildId, accountId, characterId, note: note.replace(/\s+/g, ' ').trim().slice(0, 180), expiresAtMs: nowMs + 72 * 60 * 60 * 1000 });
}

export async function respondGuildApplication(
  repo: GuildRecruitmentRepository,
  managerAccountId: string,
  applicationId: string,
  accept: boolean,
  nowMs = Date.now(),
): Promise<void> {
  const application = await repo.getApplication(applicationId);
  if (!application || application.status !== 'pending') throw new GuildRecruitmentError('application_not_available');
  if (!await repo.canManageRecruitment(managerAccountId, application.guildId)) throw new GuildRecruitmentError('recruitment_permission_required');
  if (application.expiresAtMs <= nowMs) {
    await repo.setApplicationStatus(applicationId, 'expired');
    throw new GuildRecruitmentError('application_expired');
  }
  if (!accept) {
    await repo.setApplicationStatus(applicationId, 'declined');
    return;
  }
  if (await repo.accountGuildId(application.accountId)) throw new GuildRecruitmentError('applicant_already_in_guild');
  if (!await repo.guildHasSpace(application.guildId)) throw new GuildRecruitmentError('guild_full');
  await repo.addGuildMember(application.guildId, application.accountId, application.characterId);
  await repo.setApplicationStatus(applicationId, 'accepted');
}

export async function invitePlayerToGuild(
  repo: GuildRecruitmentRepository,
  managerAccountId: string,
  guildId: string,
  targetAccountId: string,
  nowMs = Date.now(),
): Promise<GuildInviteRecord> {
  if (!await repo.canManageRecruitment(managerAccountId, guildId)) throw new GuildRecruitmentError('recruitment_permission_required');
  if (!await repo.guildHasSpace(guildId)) throw new GuildRecruitmentError('guild_full');
  if (await repo.accountGuildId(targetAccountId)) throw new GuildRecruitmentError('target_already_in_guild');
  return repo.createInvite({ guildId, accountId: targetAccountId, invitedByAccountId: managerAccountId, expiresAtMs: nowMs + 72 * 60 * 60 * 1000 });
}

export async function respondGuildInvite(
  repo: GuildRecruitmentRepository,
  accountId: string,
  characterId: string,
  inviteId: string,
  accept: boolean,
  nowMs = Date.now(),
): Promise<void> {
  const invite = await repo.getInvite(inviteId);
  if (!invite || invite.accountId !== accountId || invite.status !== 'pending') throw new GuildRecruitmentError('invite_not_available');
  if (invite.expiresAtMs <= nowMs) {
    await repo.setInviteStatus(inviteId, 'expired');
    throw new GuildRecruitmentError('invite_expired');
  }
  if (!accept) {
    await repo.setInviteStatus(inviteId, 'declined');
    return;
  }
  if (await repo.accountGuildId(accountId)) throw new GuildRecruitmentError('already_in_guild');
  if (!await repo.guildHasSpace(invite.guildId)) throw new GuildRecruitmentError('guild_full');
  await repo.addGuildMember(invite.guildId, accountId, characterId);
  await repo.setInviteStatus(inviteId, 'accepted');
}
