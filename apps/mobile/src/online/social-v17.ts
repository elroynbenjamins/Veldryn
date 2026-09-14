import { socialV16Api, type SocialV16Transport } from './social-v16';
import type {
  EventContributionBreakdownView,
  GuildRecruitmentRequirementsView,
  PartyEventLeaderboardView,
  PartyEventView,
  PartyPlayStyle,
} from '../core/party-social';

export function socialV17Api(transport: SocialV16Transport) {
  return {
    ...socialV16Api(transport),
    getActiveLiveOpsEvents: () => transport.call<{ events: PartyEventView[] }>('get_active_liveops_events'),
    getPartyEvent: (eventInstanceId: string) => transport.call<PartyEventView>('get_party_event', { eventInstanceId }),
    getPartyEventLeaderboard: (eventInstanceId: string, audience: 'global' | 'friends' | 'guild' = 'global', cursor?: string) =>
      transport.call<PartyEventLeaderboardView>('get_party_event_leaderboard', { eventInstanceId, audience, cursor }),
    getEventContributionBreakdown: (eventInstanceId: string, dateKey?: string) =>
      transport.call<EventContributionBreakdownView>('get_event_contribution_breakdown', { eventInstanceId, dateKey }),
    claimEventReward: (input: { eventInstanceId: string; kind: 'personal_milestone' | 'party_milestone' | 'ranking'; milestonePoints?: number }) =>
      transport.call<{ claimed: boolean; rewardBundleId?: string }>('claim_liveops_event_reward', input),
    listLiveOpsEventHistory: () => transport.call<{ events: PartyEventView[] }>('list_liveops_event_history'),
    publishGuildRecruitmentV17: (input: {
      focusTags: string[];
      activeEventTags?: string[];
      playStyle: PartyPlayStyle;
      description: string;
      requirements: GuildRecruitmentRequirementsView;
    }) => transport.call<{ ok: true }>('publish_guild_recruitment', input),
    applyToGuild: (guildId: string, characterId: string, note = '') =>
      transport.call<{ ok: true; applicationId: string }>('apply_to_guild', { guildId, characterId, note }),
    respondGuildApplication: (applicationId: string, accept: boolean) =>
      transport.call<{ ok: true }>('respond_guild_application', { applicationId, accept }),
    inviteToGuild: (guildId: string, accountId: string) =>
      transport.call<{ ok: true; inviteId: string }>('invite_to_guild', { guildId, accountId }),
    respondGuildInvite: (inviteId: string, characterId: string, accept: boolean) =>
      transport.call<{ ok: true }>('respond_guild_invite', { inviteId, characterId, accept }),
  };
}
