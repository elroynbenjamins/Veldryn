import type {
  GuildRecruitmentCard,
  GuildSeekerCard,
  PartyActivityPreference,
  PartyContractView,
  PartyGoalTag,
  PartyPlayStyle,
  PartyRecruitmentCard,
  PartySeekerCard,
  PartyView,
} from '../core/party-social';

/**
 * Compatibility transport for clients that expose the v16.1 social operation
 * names. The production RPC repository remains authoritative for persistence;
 * this facade only keeps the presentation/API contract transport-agnostic.
 */
export interface SocialV16Transport {
  call<T>(operation: string, payload?: Record<string, unknown>): Promise<T>;
}

export function socialV16Api(transport: SocialV16Transport) {
  return {
    getParty: () => transport.call<PartyView | null>('get_persistent_party'),
    createParty: (input: { name: string; activityPreference: PartyActivityPreference; playStyle: PartyPlayStyle }) =>
      transport.call<PartyView>('create_persistent_party', input),
    leaveParty: () => transport.call<{ ok: true }>('leave_persistent_party'),
    inviteToParty: (accountId: string) => transport.call<{ ok: true }>('invite_to_persistent_party', { accountId }),
    requestJoinParty: (partyId: string, characterId: string, note = '') =>
      transport.call<{ ok: true }>('request_join_persistent_party', { partyId, characterId, note }),
    respondPartyJoinRequest: (requestId: string, accept: boolean) =>
      transport.call<{ ok: true }>('respond_party_join_request', { requestId, accept }),
    publishPartyRecruitment: (input: { activityPreference: PartyActivityPreference; playStyle: PartyPlayStyle; goalTags: PartyGoalTag[]; description: string }) =>
      transport.call<{ ok: true }>('publish_party_recruitment', input),
    publishPartySeeker: (input: { characterId: string; activityPreference: PartyActivityPreference; playStyle: PartyPlayStyle; goalTags: PartyGoalTag[]; description: string }) =>
      transport.call<{ ok: true }>('publish_party_seeker', input),
    browsePartyRecruitment: (filters?: { activityPreference?: PartyActivityPreference }) =>
      transport.call<{ parties: PartyRecruitmentCard[]; seekers: PartySeekerCard[] }>('browse_party_recruitment', filters),
    getPartyContracts: () => transport.call<{ party: PartyView; contracts: PartyContractView[] }>('get_party_contract_rotation'),
    acceptPartyContract: (definitionId: string) => transport.call<PartyContractView>('accept_party_contract', { definitionId }),
    claimPartyContractReward: (contractInstanceId: string) =>
      transport.call<{ ok: true; rewards: Record<string, number> }>('claim_party_contract_reward', { contractInstanceId }),
    publishGuildRecruitment: (input: { focusTags: string[]; playStyle: PartyPlayStyle; description: string }) =>
      transport.call<{ ok: true }>('publish_guild_recruitment', input),
    publishGuildSeeker: (input: { characterId: string; desiredFocusTags: string[]; playStyle: PartyPlayStyle; description: string }) =>
      transport.call<{ ok: true }>('publish_guild_seeker', input),
    browseGuildRecruitment: () => transport.call<{ guilds: GuildRecruitmentCard[]; seekers: GuildSeekerCard[] }>('browse_guild_recruitment'),
  };
}
