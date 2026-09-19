import {
  PERSISTENT_PARTY_MAX_MEMBERS,
  canJoinPersistentParty,
  type PartyActivityPreference,
  type PartyJoinPolicy,
  type PartyPlayStyle,
  type PersistentPartySnapshot,
} from './party-policy';

export type PartyRequestStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';

export interface CreatePartyInput {
  leaderAccountId: string;
  leaderCharacterId: string;
  name: string;
  activityPreference: PartyActivityPreference;
  playStyle: PartyPlayStyle;
  joinPolicy?: PartyJoinPolicy;
}

export interface PartyInviteRecord {
  id: string;
  partyId: string;
  invitedAccountId: string;
  status: PartyRequestStatus;
  expiresAtMs: number;
}

export interface PartyJoinRequestRecord {
  id: string;
  partyId: string;
  accountId: string;
  characterId: string;
  status: PartyRequestStatus;
  expiresAtMs: number;
}

export interface PersistentPartyRepository {
  getPartyForAccount(accountId: string): Promise<PersistentPartySnapshot | null>;
  getParty(partyId: string): Promise<PersistentPartySnapshot | null>;
  createParty(input: CreatePartyInput & { joinPolicy: PartyJoinPolicy }): Promise<PersistentPartySnapshot>;
  deleteParty(partyId: string): Promise<void>;
  transferLeadership(partyId: string, accountId: string): Promise<void>;
  removeMember(partyId: string, accountId: string): Promise<void>;
  addMember(partyId: string, accountId: string, characterId: string): Promise<void>;
  createInvite(input: { partyId: string; invitedAccountId: string; invitedByAccountId: string; expiresAtMs: number }): Promise<PartyInviteRecord>;
  getInvite(inviteId: string): Promise<PartyInviteRecord | null>;
  updateInviteStatus(inviteId: string, status: PartyRequestStatus): Promise<void>;
  createJoinRequest(input: { partyId: string; accountId: string; characterId: string; note: string; expiresAtMs: number }): Promise<PartyJoinRequestRecord>;
  getJoinRequest(requestId: string): Promise<PartyJoinRequestRecord | null>;
  updateJoinRequestStatus(requestId: string, status: PartyRequestStatus): Promise<void>;
}

export class PartyDomainError extends Error {
  constructor(public readonly code: string) { super(code); }
}

export async function createPersistentParty(repo: PersistentPartyRepository, input: CreatePartyInput): Promise<PersistentPartySnapshot> {
  if (await repo.getPartyForAccount(input.leaderAccountId)) throw new PartyDomainError('account_already_in_party');
  return repo.createParty({ ...input, joinPolicy: input.joinPolicy ?? 'request_to_join' });
}

export async function inviteToPersistentParty(
  repo: PersistentPartyRepository,
  actorAccountId: string,
  invitedAccountId: string,
  nowMs = Date.now(),
): Promise<PartyInviteRecord> {
  const party = await repo.getPartyForAccount(actorAccountId);
  if (!party) throw new PartyDomainError('party_not_found');
  if (party.leaderAccountId !== actorAccountId) throw new PartyDomainError('leader_required');
  if (party.members.length >= PERSISTENT_PARTY_MAX_MEMBERS) throw new PartyDomainError('party_full');
  if (await repo.getPartyForAccount(invitedAccountId)) throw new PartyDomainError('target_already_in_party');
  return repo.createInvite({ partyId: party.partyId, invitedAccountId, invitedByAccountId: actorAccountId, expiresAtMs: nowMs + 24 * 60 * 60 * 1000 });
}

export async function acceptPartyInvite(
  repo: PersistentPartyRepository,
  actorAccountId: string,
  actorCharacterId: string,
  inviteId: string,
  nowMs = Date.now(),
): Promise<void> {
  const invite = await repo.getInvite(inviteId);
  if (!invite || invite.invitedAccountId !== actorAccountId || invite.status !== 'pending') throw new PartyDomainError('invite_not_available');
  if (invite.expiresAtMs <= nowMs) {
    await repo.updateInviteStatus(inviteId, 'expired');
    throw new PartyDomainError('invite_expired');
  }
  const party = await repo.getParty(invite.partyId);
  if (!party) throw new PartyDomainError('party_not_found');
  const decision = canJoinPersistentParty(party, actorAccountId, Boolean(await repo.getPartyForAccount(actorAccountId)), true);
  if (!decision.allowed) throw new PartyDomainError(decision.reason ?? 'cannot_join');
  await repo.addMember(party.partyId, actorAccountId, actorCharacterId);
  await repo.updateInviteStatus(inviteId, 'accepted');
}

export async function requestJoinPersistentParty(
  repo: PersistentPartyRepository,
  actorAccountId: string,
  actorCharacterId: string,
  partyId: string,
  note: string,
  nowMs = Date.now(),
): Promise<PartyJoinRequestRecord> {
  const party = await repo.getParty(partyId);
  if (!party) throw new PartyDomainError('party_not_found');
  const decision = canJoinPersistentParty(party, actorAccountId, Boolean(await repo.getPartyForAccount(actorAccountId)), false);
  if (!decision.allowed) throw new PartyDomainError(decision.reason ?? 'cannot_join');
  return repo.createJoinRequest({ partyId, accountId: actorAccountId, characterId: actorCharacterId, note: note.trim().slice(0, 120), expiresAtMs: nowMs + 24 * 60 * 60 * 1000 });
}

export async function respondPartyJoinRequest(
  repo: PersistentPartyRepository,
  leaderAccountId: string,
  requestId: string,
  accept: boolean,
  nowMs = Date.now(),
): Promise<void> {
  const request = await repo.getJoinRequest(requestId);
  if (!request || request.status !== 'pending') throw new PartyDomainError('request_not_available');
  const party = await repo.getParty(request.partyId);
  if (!party) throw new PartyDomainError('party_not_found');
  if (party.leaderAccountId !== leaderAccountId) throw new PartyDomainError('leader_required');
  if (request.expiresAtMs <= nowMs) {
    await repo.updateJoinRequestStatus(requestId, 'expired');
    throw new PartyDomainError('request_expired');
  }
  if (!accept) {
    await repo.updateJoinRequestStatus(requestId, 'declined');
    return;
  }
  const decision = canJoinPersistentParty(party, request.accountId, Boolean(await repo.getPartyForAccount(request.accountId)), true);
  if (!decision.allowed) throw new PartyDomainError(decision.reason ?? 'cannot_join');
  await repo.addMember(party.partyId, request.accountId, request.characterId);
  await repo.updateJoinRequestStatus(requestId, 'accepted');
}

export async function leavePersistentParty(repo: PersistentPartyRepository, actorAccountId: string): Promise<void> {
  const party = await repo.getPartyForAccount(actorAccountId);
  if (!party) throw new PartyDomainError('party_not_found');
  if (party.members.length === 1) {
    await repo.deleteParty(party.partyId);
    return;
  }
  if (party.leaderAccountId === actorAccountId) {
    const nextLeader = [...party.members]
      .filter((member) => member.accountId !== actorAccountId)
      .sort((a, b) => a.joinedAtMs - b.joinedAtMs)[0];
    if (!nextLeader) throw new PartyDomainError('leadership_transfer_failed');
    await repo.transferLeadership(party.partyId, nextLeader.accountId);
  }
  await repo.removeMember(party.partyId, actorAccountId);
}
