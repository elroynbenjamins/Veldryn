"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERSISTENT_PARTY_MAX_SIZE = exports.PERSISTENT_PARTY_MIN_SIZE = void 0;
exports.composition = composition;
exports.canStartExpedition = canStartExpedition;
exports.validatePersistentParty = validatePersistentParty;
exports.canJoinPersistentParty = canJoinPersistentParty;
exports.joinPersistentParty = joinPersistentParty;
exports.leavePersistentParty = leavePersistentParty;
exports.canAccessPersistentPartyChat = canAccessPersistentPartyChat;
exports.shouldShowPartyChat = shouldShowPartyChat;
exports.evaluateLiveDungeonComposition = evaluateLiveDungeonComposition;
exports.persistentPartyCanExistWithCurrentRoles = persistentPartyCanExistWithCurrentRoles;
const invariants_1 = require("../coop/invariants");
function composition(m) { const c = { tank: 0, damage: 0, support: 0 }; m.forEach(x => c[x.role]++); return { ...c, standard: c.tank === 1 && c.damage === 2 && c.support === 1, size: m.length }; }
function canStartExpedition(m) { if (m.length < 1 || m.length > 4)
    return false; return m.every(x => x.online); }
exports.PERSISTENT_PARTY_MIN_SIZE = 1;
exports.PERSISTENT_PARTY_MAX_SIZE = 4;
function hasDuplicateAccounts(members) {
    return new Set(members.map(member => member.accountId)).size !== members.length;
}
function hasDuplicateCharacters(members) {
    return new Set(members.map(member => member.characterId)).size !== members.length;
}
function validatePersistentParty(state) {
    if (!state.id || !state.leaderAccountId || !state.leaderCharacterId) {
        throw new Error('party_missing_identity');
    }
    if (state.members.length < exports.PERSISTENT_PARTY_MIN_SIZE || state.members.length > exports.PERSISTENT_PARTY_MAX_SIZE) {
        throw new Error('party_size_invalid');
    }
    if (hasDuplicateAccounts(state.members))
        throw new Error('party_duplicate_account');
    if (hasDuplicateCharacters(state.members))
        throw new Error('party_duplicate_character');
    const leader = state.members.find(member => member.accountId === state.leaderAccountId);
    if (!leader)
        throw new Error('party_leader_not_member');
    if (leader.characterId !== state.leaderCharacterId)
        throw new Error('party_leader_character_mismatch');
}
function canJoinPersistentParty(state, candidate, accountAlreadyInAnotherPersistentParty = false) {
    if (state.status === 'disbanded')
        return { allowed: false, reason: 'party_inactive' };
    if (state.members.length >= exports.PERSISTENT_PARTY_MAX_SIZE)
        return { allowed: false, reason: 'party_full' };
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
function joinPersistentParty(state, candidate, accountAlreadyInAnotherPersistentParty = false) {
    const decision = canJoinPersistentParty(state, candidate, accountAlreadyInAnotherPersistentParty);
    if (!decision.allowed)
        throw new Error(decision.reason ?? 'party_join_rejected');
    const next = {
        ...state,
        status: 'active',
        members: [...state.members, { ...candidate }],
    };
    validatePersistentParty(next);
    return next;
}
function leavePersistentParty(state, accountId) {
    if (!state.members.some(member => member.accountId === accountId))
        throw new Error('party_member_not_found');
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
    const next = {
        ...state,
        leaderAccountId: successor.accountId,
        leaderCharacterId: successor.characterId,
        members,
    };
    validatePersistentParty(next);
    return { state: next, disbanded: false, transferredLeadershipToAccountId: successor.accountId };
}
function canAccessPersistentPartyChat(state, accountId) {
    return state.status !== 'disbanded' && state.members.some(member => member.accountId === accountId);
}
function shouldShowPartyChat(state, accountId) {
    return !!state && canAccessPersistentPartyChat(state, accountId);
}
/**
 * Persistent Parties are intentionally NOT role-locked. Live Dungeons remain a separate
 * synchronous queue and must still enforce exactly 1 Tank / 2 Damage / 1 Support.
 */
function evaluateLiveDungeonComposition(members) {
    const roles = members.flatMap(member => member.role ? [member.role] : []);
    const counts = (0, invariants_1.roleCounts)(roles);
    return {
        size: members.length,
        ...counts,
        valid: roles.length === members.length && (0, invariants_1.hasExactCoopRoles)(roles),
    };
}
function persistentPartyCanExistWithCurrentRoles(members) {
    return members.length >= exports.PERSISTENT_PARTY_MIN_SIZE
        && members.length <= exports.PERSISTENT_PARTY_MAX_SIZE
        && !hasDuplicateAccounts(members)
        && !hasDuplicateCharacters(members);
}
