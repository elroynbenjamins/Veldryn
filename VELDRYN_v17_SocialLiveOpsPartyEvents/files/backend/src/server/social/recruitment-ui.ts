import type {
  GuildRecruitmentProfile,
  PartyRecruitmentPost,
  PlayerGuildSeekerPost,
  PlayerPartySeekerPost,
} from './recruitment';

export type RecruitmentBoardItem =
  | { type: 'party'; id: string; title: string; subtitle: string; description: string; tags: string[]; eventTags: string[]; action: 'request_join' }
  | { type: 'party_seeker'; id: string; title: string; subtitle: string; description: string; tags: string[]; eventTags: string[]; action: 'invite_to_party' }
  | { type: 'guild'; id: string; title: string; subtitle: string; description: string; tags: string[]; eventTags: string[]; action: 'apply_to_guild' }
  | { type: 'guild_seeker'; id: string; title: string; subtitle: string; description: string; tags: string[]; eventTags: string[]; action: 'invite_to_guild' };

export function partyPostToBoardItem(post: PartyRecruitmentPost): RecruitmentBoardItem {
  return {
    type: 'party', id: post.partyId, title: `${post.memberCount}/${post.maxMembers} Party`,
    subtitle: `${post.activityPreference} · ${post.playStyle}`, description: post.description,
    tags: [...post.goalTags], eventTags: [...(post.activeEventTags ?? [])], action: 'request_join',
  };
}

export function partySeekerToBoardItem(post: PlayerPartySeekerPost): RecruitmentBoardItem {
  return {
    type: 'party_seeker', id: post.accountId,
    title: post.classId ? `${post.classId}${post.combatLevel ? ` · Lv ${post.combatLevel}` : ''}` : 'Player looking for Party',
    subtitle: `${post.activityPreference} · ${post.playStyle}`, description: post.description,
    tags: [...post.goalTags], eventTags: [...(post.activeEventTags ?? [])], action: 'invite_to_party',
  };
}

export function guildPostToBoardItem(post: GuildRecruitmentProfile): RecruitmentBoardItem {
  const requirements = post.requirements;
  const requirementParts = [
    requirements?.minTotalLevel ? `Total ${requirements.minTotalLevel}+` : '',
    requirements?.minCombatLevel ? `Combat ${requirements.minCombatLevel}+` : '',
  ].filter(Boolean);
  return {
    type: 'guild', id: post.guildId, title: `${post.memberCount}/${post.memberCap} Guild`,
    subtitle: [post.playStyle, ...requirementParts].join(' · '), description: post.description,
    tags: [...post.focusTags], eventTags: [...(post.activeEventTags ?? [])], action: 'apply_to_guild',
  };
}

export function guildSeekerToBoardItem(post: PlayerGuildSeekerPost): RecruitmentBoardItem {
  return {
    type: 'guild_seeker', id: post.accountId,
    title: post.classId ? `${post.classId}${post.combatLevel ? ` · Lv ${post.combatLevel}` : ''}` : 'Player looking for Guild',
    subtitle: `${post.playStyle}${post.totalLevel ? ` · Total ${post.totalLevel}` : ''}`, description: post.description,
    tags: [...post.desiredFocusTags], eventTags: [...(post.activeEventTags ?? [])], action: 'invite_to_guild',
  };
}
