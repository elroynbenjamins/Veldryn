export type PartyActivityPreference = 'combat' | 'skilling' | 'mixed';
export type PartyPlayStyle = 'casual' | 'balanced' | 'active' | 'competitive';
export type PartyGoalTag = 'weekly_contracts' | 'combat' | 'bosses' | 'skilling' | 'gathering' | 'crafting' | 'party_events' | 'dungeons' | 'social';
export type GuildFocusTag = 'social' | 'pve' | 'skilling' | 'progression' | 'collections' | 'events' | 'competitive' | 'new_player_friendly';
export type LiveOpsActivityKind = 'combat' | 'gathering' | 'processing' | 'crafting' | 'fishing' | 'hunting' | 'alchemy' | 'delivery';

export interface PartyMemberView {
  accountId: string;
  characterId: string;
  displayName: string;
  className?: string;
  combatLevel?: number;
  isLeader: boolean;
  online?: boolean;
}

export interface PartyView {
  id: string;
  name: string;
  activityPreference: PartyActivityPreference;
  playStyle: PartyPlayStyle;
  members: PartyMemberView[];
  recruitmentOpen: boolean;
}

export interface PartyContractView {
  id: string;
  name: string;
  focus: PartyActivityPreference;
  description: string;
  targetPoints: number;
  totalPoints: number;
  combatPoints: number;
  skillingPoints: number;
  personalPoints: number;
  eligible: boolean;
  complete: boolean;
  expiresAt: string;
}

export interface PartyRecruitmentCard {
  id: string;
  partyName: string;
  memberCount: number;
  activityPreference: PartyActivityPreference;
  playStyle: PartyPlayStyle;
  goalTags: PartyGoalTag[];
  activeEventTags?: string[];
  description: string;
  compatibilityScore?: number;
}

export interface PartySeekerCard {
  accountId: string;
  characterId: string;
  displayName: string;
  className?: string;
  combatLevel?: number;
  activityPreference: PartyActivityPreference;
  playStyle: PartyPlayStyle;
  goalTags: PartyGoalTag[];
  activeEventTags?: string[];
  description: string;
}

export interface GuildRecruitmentRequirementsView {
  minTotalLevel?: number;
  minCombatLevel?: number;
  applicationRequired: boolean;
}

export interface GuildRecruitmentCard {
  guildId: string;
  guildName: string;
  memberCount: number;
  memberCap: number;
  focusTags: GuildFocusTag[];
  activeEventTags?: string[];
  playStyle: PartyPlayStyle;
  description: string;
  requirements?: GuildRecruitmentRequirementsView;
  compatibilityScore?: number;
}

export interface GuildSeekerCard {
  accountId: string;
  characterId: string;
  displayName: string;
  className?: string;
  combatLevel?: number;
  totalLevel?: number;
  desiredFocusTags: GuildFocusTag[];
  activeEventTags?: string[];
  playStyle: PartyPlayStyle;
  description: string;
}

export type LiveOpsEventStatus = 'scheduled' | 'active' | 'settling' | 'finalized';
export interface LiveOpsMilestoneView {
  points: number;
  reached: boolean;
  claimed: boolean;
  rewardBundleId?: string;
}
export interface PartyEventMemberView {
  accountId: string;
  displayName: string;
  points: number;
  meaningful: boolean;
  rewardEligible: boolean;
}
export interface EventContributionActivityView {
  activityKind: LiveOpsActivityKind;
  points: number;
}
export interface EventContributionDetailView {
  contentId: string;
  activityKind: LiveOpsActivityKind;
  points: number;
}
export interface PartyEventView {
  instanceId: string;
  definitionId: string;
  name: string;
  shortDescription: string;
  eventTags: string[];
  status: LiveOpsEventStatus;
  startsAt: string;
  endsAt: string;
  personalPoints: number;
  personalDailyCap: number;
  personalPointsToday: number;
  partyId?: string;
  partyName?: string;
  partyScore: number;
  partyRank?: number;
  partyPercentile?: number;
  rankedEligible: boolean;
  rankedEligibilityMissing: string[];
  combatPoints: number;
  skillingPoints: number;
  personalMilestones: LiveOpsMilestoneView[];
  partyMilestones: LiveOpsMilestoneView[];
  members: PartyEventMemberView[];
  contributionByActivity: EventContributionActivityView[];
}
export interface PartyEventLeaderboardEntryView {
  partyId: string;
  partyName: string;
  score: number;
  rank: number;
  percentile: number;
  meaningfulContributors: number;
  isOwnParty?: boolean;
}
export interface PartyEventLeaderboardView {
  audience: 'global' | 'friends' | 'guild';
  totalRankedParties: number;
  entries: PartyEventLeaderboardEntryView[];
  ownParty?: PartyEventLeaderboardEntryView;
}
export interface EventContributionBreakdownView {
  totalPoints: number;
  byActivity: EventContributionActivityView[];
  topDetails: EventContributionDetailView[];
}

export const activityPreferenceLabel: Record<PartyActivityPreference, string> = {
  combat: 'Combat', skilling: 'Skilling', mixed: 'Mixed',
};
export const playStyleLabel: Record<PartyPlayStyle, string> = {
  casual: 'Casual', balanced: 'Balanced', active: 'Active', competitive: 'Competitive',
};
export const eventActivityLabel: Record<LiveOpsActivityKind, string> = {
  combat: 'Combat', gathering: 'Gathering', processing: 'Processing', crafting: 'Crafting',
  fishing: 'Fishing', hunting: 'Hunting', alchemy: 'Alchemy', delivery: 'Deliveries',
};

export function contractProgressPercent(contract: PartyContractView): number {
  if (contract.targetPoints <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((contract.totalPoints / contract.targetPoints) * 100)));
}
export function contractEligibilityLabel(contract: PartyContractView): string {
  if (contract.eligible) return 'Reward eligible';
  if (contract.complete) return 'Contribute more to claim';
  return 'Keep contributing';
}
export function milestoneProgressPercent(points: number, milestone: number): number {
  if (milestone <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round((points / milestone) * 100)));
}
export function nextUnreachedMilestone(points: number, milestones: LiveOpsMilestoneView[]): LiveOpsMilestoneView | undefined {
  return milestones.find((milestone) => !milestone.reached && milestone.points > points) ?? milestones.find((milestone) => !milestone.reached);
}
