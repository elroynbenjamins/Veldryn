import {hasExactCoopRoles,roleCounts} from '../coop/invariants';
export type PartyRole='tank'|'damage'|'support'; export interface PartyMember{characterId:string;role:PartyRole;power:number;online:boolean}
export function composition(m:PartyMember[]){const c={tank:0,damage:0,support:0};m.forEach(x=>c[x.role]++);return{...c,standard:c.tank===1&&c.damage===2&&c.support===1,size:m.length};}
export function canStartExpedition(m:PartyMember[]){if(m.length<1||m.length>4)return false;return m.every(x=>x.online);}

export type PartyFocus = 'combat' | 'skilling' | 'mixed';
export type PersistentPartyStatus = 'forming' | 'active' | 'disbanded';

export interface PersistentPartyMember {
  accountId: string;
  characterId: string;
  role?: PartyRole;
  joinedAtMs: number;
}

export interface PersistentPartyState {
  id: string;
  leaderAccountId: string;
  leaderCharacterId: string;
  focus: PartyFocus;
  status: PersistentPartyStatus;
  members: PersistentPartyMember[];
}

export interface PartyInviteDecision {
  allowed: boolean;
  reason?:
    | 'party_inactive'
    | 'party_full'
    | 'already_member'
    | 'account_already_in_party'
    | 'duplicate_character';
}

export interface PartyLeaveResult {
  state: PersistentPartyState;
  disbanded: boolean;
  transferredLeadershipToAccountId?: string;
}

export const PERSISTENT_PARTY_MIN_SIZE = 1;
export const PERSISTENT_PARTY_MAX_SIZE = 4;

function hasDuplicateAccounts(members: readonly PersistentPartyMember[]): boolean {
  return new Set(members.map(member => member.accountId)).size !== members.length;
}

function hasDuplicateCharacters(members: readonly PersistentPartyMember[]): boolean {
  return new Set(members.map(member => member.characterId)).size !== members.length;
}

export function validatePersistentParty(state: PersistentPartyState): void {
  if (!state.id || !state.leaderAccountId || !state.leaderCharacterId) {
    throw new Error('party_missing_identity');
  }
  if (state.members.length < PERSISTENT_PARTY_MIN_SIZE || state.members.length > PERSISTENT_PARTY_MAX_SIZE) {
    throw new Error('party_size_invalid');
  }
  if (hasDuplicateAccounts(state.members)) throw new Error('party_duplicate_account');
  if (hasDuplicateCharacters(state.members)) throw new Error('party_duplicate_character');
  const leader = state.members.find(member => member.accountId === state.leaderAccountId);
  if (!leader) throw new Error('party_leader_not_member');
  if (leader.characterId !== state.leaderCharacterId) throw new Error('party_leader_character_mismatch');
}

export function canJoinPersistentParty(
  state: PersistentPartyState,
  candidate: Pick<PersistentPartyMember, 'accountId' | 'characterId'>,
  accountAlreadyInAnotherPersistentParty = false,
): PartyInviteDecision {
  if (state.status === 'disbanded') return { allowed: false, reason: 'party_inactive' };
  if (state.members.length >= PERSISTENT_PARTY_MAX_SIZE) return { allowed: false, reason: 'party_full' };
  if (state.members.some(member => member.accountId === candidate.accountId)) {
    return { allowed: false, reason: 'already_member' };
  }
  if (state.members.some(member => member.characterId === candidate.characterId)) {
    return { allowed: false, reason: 'duplicate_character' };
  }
  if (accountAlreadyInAnotherPersistentParty) {
    return { allowed: false, reason: 'account_already_in_party' };
  }
  return { allowed: true };
}

export function joinPersistentParty(
  state: PersistentPartyState,
  candidate: PersistentPartyMember,
  accountAlreadyInAnotherPersistentParty = false,
): PersistentPartyState {
  const decision = canJoinPersistentParty(state, candidate, accountAlreadyInAnotherPersistentParty);
  if (!decision.allowed) throw new Error(decision.reason ?? 'party_join_rejected');
  const next: PersistentPartyState = {
    ...state,
    status: 'active',
    members: [...state.members, { ...candidate }],
  };
  validatePersistentParty(next);
  return next;
}

export function leavePersistentParty(state: PersistentPartyState, accountId: string): PartyLeaveResult {
  if (!state.members.some(member => member.accountId === accountId)) throw new Error('party_member_not_found');
  const members = state.members.filter(member => member.accountId !== accountId);
  if (members.length === 0) {
    return {
      state: { ...state, status: 'disbanded', members: [] },
      disbanded: true,
    };
  }

  if (state.leaderAccountId !== accountId) {
    const next = { ...state, members };
    validatePersistentParty(next);
    return { state: next, disbanded: false };
  }

  const successor = [...members].sort((a, b) => a.joinedAtMs - b.joinedAtMs || a.accountId.localeCompare(b.accountId))[0];
  const next: PersistentPartyState = {
    ...state,
    leaderAccountId: successor.accountId,
    leaderCharacterId: successor.characterId,
    members,
  };
  validatePersistentParty(next);
  return { state: next, disbanded: false, transferredLeadershipToAccountId: successor.accountId };
}

export function canAccessPersistentPartyChat(state: PersistentPartyState, accountId: string): boolean {
  return state.status !== 'disbanded' && state.members.some(member => member.accountId === accountId);
}

export function shouldShowPartyChat(state: PersistentPartyState | null, accountId: string): boolean {
  return !!state && canAccessPersistentPartyChat(state, accountId);
}

export interface LiveDungeonComposition {
  size: number;
  tank: number;
  damage: number;
  support: number;
  valid: boolean;
}

/**
 * Persistent Parties are intentionally NOT role-locked. Live Dungeons remain a separate
 * synchronous queue and must still enforce exactly 1 Tank / 2 Damage / 1 Support.
 */
export function evaluateLiveDungeonComposition(members: readonly PersistentPartyMember[]): LiveDungeonComposition {
  const roles=members.flatMap(member=>member.role?[member.role]:[]);
  const counts = roleCounts(roles);
  return {
    size: members.length,
    ...counts,
    valid: roles.length===members.length&&hasExactCoopRoles(roles),
  };
}

export function persistentPartyCanExistWithCurrentRoles(members: readonly PersistentPartyMember[]): boolean {
  return members.length >= PERSISTENT_PARTY_MIN_SIZE
    && members.length <= PERSISTENT_PARTY_MAX_SIZE
    && !hasDuplicateAccounts(members)
    && !hasDuplicateCharacters(members);
}
