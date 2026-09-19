export const PERSISTENT_PARTY_MAX_MEMBERS = 4;
export const PARTY_RECRUITMENT_DESCRIPTION_MAX = 180;

export type PartyActivityPreference = 'combat' | 'skilling' | 'mixed';
export type PartyJoinPolicy = 'invite_only' | 'request_to_join';
export type PartyPlayStyle = 'casual' | 'balanced' | 'active' | 'competitive';

export interface PersistentPartyMember {
  accountId: string;
  characterId: string;
  joinedAtMs: number;
}

export interface PersistentPartySnapshot {
  partyId: string;
  leaderAccountId: string;
  members: readonly PersistentPartyMember[];
  joinPolicy: PartyJoinPolicy;
  activityPreference: PartyActivityPreference;
}

export interface PartyMembershipDecision {
  allowed: boolean;
  reason?: 'party_full' | 'already_member' | 'account_already_in_party' | 'invite_required';
}

export function canJoinPersistentParty(
  party: PersistentPartySnapshot,
  candidateAccountId: string,
  accountAlreadyInParty: boolean,
  hasInvite = false,
): PartyMembershipDecision {
  if (party.members.some((member) => member.accountId === candidateAccountId)) {
    return { allowed: false, reason: 'already_member' };
  }
  if (accountAlreadyInParty) return { allowed: false, reason: 'account_already_in_party' };
  if (party.members.length >= PERSISTENT_PARTY_MAX_MEMBERS) return { allowed: false, reason: 'party_full' };
  if (party.joinPolicy === 'invite_only' && !hasInvite) return { allowed: false, reason: 'invite_required' };
  return { allowed: true };
}

export function canManagePersistentParty(party: PersistentPartySnapshot, accountId: string): boolean {
  return party.leaderAccountId === accountId;
}

export function canAdvertisePersistentParty(party: PersistentPartySnapshot, accountId: string): boolean {
  return canManagePersistentParty(party, accountId) && party.members.length < PERSISTENT_PARTY_MAX_MEMBERS;
}

export function partyHasRoom(party: PersistentPartySnapshot): boolean {
  return party.members.length < PERSISTENT_PARTY_MAX_MEMBERS;
}

/**
 * Base Party Mode deliberately has no Tank/Damage/Support composition rule.
 * Live Dungeons keep their own strict 1 Tank / 2 Damage / 1 Support validator.
 */
export function basePartyCompositionAllowed(memberCount: number): boolean {
  return memberCount >= 1 && memberCount <= PERSISTENT_PARTY_MAX_MEMBERS;
}

export function normalizeRecruitmentDescription(value: string, max = PARTY_RECRUITMENT_DESCRIPTION_MAX): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}
