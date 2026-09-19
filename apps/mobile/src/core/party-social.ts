export type PartyRole = 'tank' | 'damage' | 'support';
export type PartyActivityPreference = PartyFocus;
export type PartyPlayStyle = 'casual' | 'balanced' | 'active' | 'competitive';
export type PartyGoalTag = 'weekly_contracts' | 'combat' | 'bosses' | 'skilling' | 'gathering' | 'crafting' | 'party_events' | 'dungeons' | 'social';
export type GuildFocusTag = 'social' | 'pve' | 'skilling' | 'progression' | 'collections' | 'events' | 'competitive' | 'new_player_friendly';
export type PartyFocus = 'combat' | 'skilling' | 'mixed';
export type RecruitmentFocus = PartyFocus | 'any';
export type RecruitmentPostType = 'looking_for_guild' | 'guild_recruiting' | 'looking_for_party' | 'party_recruiting';
export type RecruitmentActivityLevel = 'casual' | 'regular' | 'active' | 'hardcore';

export type LiveOpsEventStatus = 'scheduled' | 'active' | 'settling' | 'finalized' | 'archived';
export type LiveOpsActivityKind = 'combat' | 'gathering' | 'processing' | 'crafting' | 'fishing' | 'hunting' | 'alchemy' | 'delivery';
export interface LiveOpsMilestoneView { points: number; reached: boolean; claimed: boolean; }
export interface PartyEventMemberView { accountId: string; displayName: string; points: number; meaningful: boolean; rewardEligible: boolean; }
export interface PartyEventView { eventInstanceId: string; status: LiveOpsEventStatus; name: string; shortDescription: string; eventTags: string[]; personalPoints: number; personalPointsToday: number; personalDailyCap: number; partyId?: string; partyName?: string; partyScore: number; partyRank?: number; rankedEligible: boolean; rankedEligibilityMissing: string[]; personalMilestones: LiveOpsMilestoneView[]; partyMilestones: LiveOpsMilestoneView[]; members: PartyEventMemberView[]; }
export interface PartyEventLeaderboardEntry { partyId: string; partyName: string; rank: number; score: number; meaningfulContributors: number; percentile: number; isOwnParty?: boolean; }
export interface PartyEventLeaderboardView { audience: 'global' | 'friends' | 'guild'; entries: PartyEventLeaderboardEntry[]; ownParty?: PartyEventLeaderboardEntry; }
export interface EventContributionBreakdownRow { activityKind: LiveOpsActivityKind; points: number; }
export interface EventContributionDetail { activityKind: LiveOpsActivityKind; contentId: string; points: number; }
export interface EventContributionBreakdownView { totalPoints: number; byActivity: EventContributionBreakdownRow[]; topDetails: EventContributionDetail[]; }
export interface GuildRecruitmentRequirementsView { minTotalLevel?: number; minCombatLevel?: number; applicationRequired: boolean; }
export const eventActivityLabel: Record<LiveOpsActivityKind, string> = { combat:'Combat', gathering:'Gathering', processing:'Processing', crafting:'Crafting', fishing:'Fishing', hunting:'Hunting', alchemy:'Alchemy', delivery:'Deliveries' };
export function nextUnreachedMilestone(current: number, milestones: readonly LiveOpsMilestoneView[]): LiveOpsMilestoneView | undefined { return milestones.find(m => !m.reached && m.points > current) ?? milestones.find(m => !m.reached); }
export function milestoneProgressPercent(current: number, target: number): number { return target <= 0 ? 100 : Math.max(0, Math.min(100, Math.round((current / target) * 100))); }

export interface PartyMemberSummary {
  accountId: string;
  characterId: string;
  characterName: string;
  className: string;
  role: PartyRole;
  isLeader: boolean;
}

export interface PersistentPartySummary {
  id: string;
  focus: PartyFocus;
  members: PartyMemberSummary[];
  maxMembers: 4;
}

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

export interface PartyContractObjectiveView {
  id: string;
  label: string;
  progressUnits: number;
  targetUnits: number;
  normalizedPoints: number;
  pointBudget: number;
}

export interface PartyContractView {
  id: string;
  name: string;
  category?: PartyFocus;
  cadence?: 'weekly' | 'mini_event';
  endsAtMs?: number;
  totalPoints: number;
  targetPoints: number;
  minimumPersonalPoints?: number;
  personalPoints?: number;
  objectives?: PartyContractObjectiveView[];
  focus?: PartyActivityPreference;
  description?: string;
  combatPoints?: number;
  skillingPoints?: number;
  eligible?: boolean;
  complete?: boolean;
  expiresAt?: string;
  status?: 'active' | 'completed' | 'expired';
  rewards?: {id:string;reward:{gold:number};claimed:boolean}[];
}

export interface PartyRecruitmentCard {
  id: string;
  partyName: string;
  memberCount: number;
  activityPreference: PartyActivityPreference;
  playStyle: PartyPlayStyle;
  goalTags: PartyGoalTag[];
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
  description: string;
}

export interface GuildRecruitmentCard {
  guildId: string;
  guildName: string;
  memberCount: number;
  memberCap: number;
  focusTags: GuildFocusTag[];
  playStyle: PartyPlayStyle;
  description: string;
  compatibilityScore?: number;
}

export interface GuildSeekerCard {
  accountId: string;
  characterId: string;
  displayName: string;
  className?: string;
  combatLevel?: number;
  desiredFocusTags: GuildFocusTag[];
  playStyle: PartyPlayStyle;
  description: string;
}

export interface RecruitmentCardView {
  id: string;
  ownerAccountId?: string;
  partyId?: string;
  guildId?: string;
  status?: 'active' | 'closed' | 'expired';
  postType: RecruitmentPostType;
  ownerName: string;
  guildTag?: string | null;
  guildTagColorId?: string | null;
  guildName?: string;
  partyName?: string;
  title: string;
  body: string;
  roles: PartyRole[];
  focus: RecruitmentFocus;
  activityTags: string[];
  playstyleTags: string[];
  availabilityTags: string[];
  guildInterestTags: string[];
  activityLevel?: RecruitmentActivityLevel;
  currentObjective?: string;
  openSpots?: number;
  language?: string;
  region?: string;
  minCombatLevel?: number;
  minTotalLevel?: number;
  expiresAtMs: number;
}

export interface RecruitmentClientFilters {
  query: string;
  postTypes: RecruitmentPostType[];
  focuses: RecruitmentFocus[];
  roles: PartyRole[];
  activityTags: string[];
  playstyleTags?: string[];
  availabilityTags?: string[];
  guildInterestTags?: string[];
  activityLevels?: RecruitmentActivityLevel[];
  language?: string;
  region?: string;
  maxMinCombatLevel?: number;
  maxMinTotalLevel?: number;
  requireOpenPartySpot?: boolean;
}

export const EMPTY_RECRUITMENT_FILTERS: RecruitmentClientFilters = {
  query: '', postTypes: [], focuses: [], roles: [], activityTags: [],
};

export function partyOpenSpots(party: PersistentPartySummary): number {
  return Math.max(0, party.maxMembers - party.members.length);
}

export function shouldShowPartyChat(party: PersistentPartySummary | null, accountId: string): boolean {
  return !!party && party.members.some(member => member.accountId === accountId);
}

export function recruitmentTimeLabel(expiresAtMs: number, nowMs: number): { text: string; urgency: 'normal' | 'soon' | 'expired' } {
  const remaining = expiresAtMs - nowMs;
  if (remaining <= 0) return { text: 'Expired', urgency: 'expired' };
  const hours = Math.ceil(remaining / 3_600_000);
  if (hours <= 6) return { text: `${hours}h left`, urgency: 'soon' };
  if (hours < 24) return { text: `${hours}h left`, urgency: 'normal' };
  return { text: `${Math.ceil(hours / 24)}d left`, urgency: 'normal' };
}

export function contractProgressRatio(contract: PartyContractView): number {
  if (contract.targetPoints <= 0) return 0;
  return Math.max(0, Math.min(1, contract.totalPoints / contract.targetPoints));
}

export function personalContributionEligible(contract: PartyContractView): boolean {
  return (contract.personalPoints ?? 0) >= (contract.minimumPersonalPoints ?? 0);
}

export const activityPreferenceLabel:Record<PartyActivityPreference,string>={combat:'Combat',skilling:'Skilling',mixed:'Mixed'};
export const playStyleLabel:Record<PartyPlayStyle,string>={casual:'Casual',balanced:'Balanced',active:'Active',competitive:'Competitive'};
export function contractProgressPercent(contract:PartyContractView):number{return Math.max(0,Math.min(100,Math.round(contractProgressRatio(contract)*100)));}
export function contractEligibilityLabel(contract:PartyContractView):string{if(contract.eligible)return 'Reward eligible';if(contract.complete)return 'Contribute more to claim';return 'Keep contributing';}

function lower(value?: string): string { return (value ?? '').trim().toLocaleLowerCase(); }
function overlaps<T>(a: readonly T[], b: readonly T[]): boolean { return b.length === 0 || b.some(value => a.includes(value)); }

/** Client-side convenience filter for already-authorized active results. Server browse remains authoritative. */
export function filterRecruitmentCards(cards: readonly RecruitmentCardView[], filters: RecruitmentClientFilters, nowMs?: number): RecruitmentCardView[] {
  const query = lower(filters.query);
  return cards.filter(card => {
    if (card.status && card.status !== 'active') return false;
    if (nowMs !== undefined && card.expiresAtMs <= nowMs) return false;
    if (filters.postTypes.length && !filters.postTypes.includes(card.postType)) return false;
    if (filters.focuses.length && !filters.focuses.includes(card.focus)) return false;
    if (filters.roles.length && !overlaps(card.roles, filters.roles)) return false;
    if (filters.activityTags.length && !overlaps(card.activityTags, filters.activityTags)) return false;
    if (filters.playstyleTags?.length && !overlaps(card.playstyleTags,filters.playstyleTags)) return false;
    if (filters.availabilityTags?.length && !overlaps(card.availabilityTags,filters.availabilityTags)) return false;
    if (filters.guildInterestTags?.length && !overlaps(card.guildInterestTags,filters.guildInterestTags)) return false;
    if (filters.activityLevels?.length && (!card.activityLevel || !filters.activityLevels.includes(card.activityLevel))) return false;
    if (filters.language && lower(card.language)!==lower(filters.language)) return false;
    if (filters.region && lower(card.region)!==lower(filters.region)) return false;
    if (filters.maxMinCombatLevel!==undefined && (card.minCombatLevel??0)>filters.maxMinCombatLevel) return false;
    if (filters.maxMinTotalLevel!==undefined && (card.minTotalLevel??0)>filters.maxMinTotalLevel) return false;
    if (filters.requireOpenPartySpot && card.postType==='party_recruiting' && (card.openSpots??0)<1) return false;
    if (!query) return true;
    const haystack = [card.title, card.body, card.ownerName, card.guildName, card.partyName, card.focus, card.language, card.region,
      card.activityLevel, card.currentObjective, ...card.roles, ...card.activityTags, ...card.playstyleTags,
      ...card.availabilityTags, ...card.guildInterestTags].map(lower).join(' ');
    return haystack.includes(query);
  });
}

export const PARTY_SOCIAL_TUTORIAL_STEPS = [
  'Parties are persistent groups of 1–4 players. You can stay together while doing different activities.',
  'Weekly Party Contracts combine verified Combat, Skilling, or Mixed progress. Harder and slower activities are worth more normalized contribution.',
  'Everyone shares Contract progress, but each member must contribute a minimum amount to earn the completion reward.',
  'Looking for Party and Looking for Members adverts last 1 day. Guild and Guild-Seeker adverts normally last 3 days, so old posts disappear automatically.',
  'Use Search and Filters to find the activity focus, role, availability, playstyle, or guild style you want. Your current Contract is only context and never blocks discovery.',
  'Party Chat appears only while you are currently in a Party.',
  'Live Dungeons are separate: they still require exactly 1 Tank, 2 Damage, and 1 Support.',
] as const;
