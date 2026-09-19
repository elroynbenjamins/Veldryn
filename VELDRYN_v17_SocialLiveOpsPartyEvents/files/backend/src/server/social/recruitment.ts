import { normalizeRecruitmentDescription, type PartyActivityPreference, type PartyPlayStyle } from '../party/party-policy';

export const RECRUITMENT_POST_TTL_HOURS = 24;
export const GUILD_SEEKER_DESCRIPTION_MAX = 220;
export const MAX_RECRUITMENT_EVENT_TAGS = 3;

export type PartyGoalTag =
  | 'weekly_contracts'
  | 'combat'
  | 'bosses'
  | 'skilling'
  | 'gathering'
  | 'crafting'
  | 'party_events'
  | 'dungeons'
  | 'social';

export type GuildFocusTag =
  | 'social'
  | 'pve'
  | 'skilling'
  | 'progression'
  | 'collections'
  | 'events'
  | 'competitive'
  | 'new_player_friendly';

export interface PartyRecruitmentPost {
  kind: 'party_lfm';
  partyId: string;
  ownerAccountId: string;
  activityPreference: PartyActivityPreference;
  playStyle: PartyPlayStyle;
  goalTags: readonly PartyGoalTag[];
  /** Optional current live-ops interests. Never use these as hard matchmaking requirements. */
  activeEventTags?: readonly string[];
  description: string;
  memberCount: number;
  maxMembers: 4;
}

export interface PlayerPartySeekerPost {
  kind: 'player_lfg';
  accountId: string;
  characterId: string;
  activityPreference: PartyActivityPreference;
  playStyle: PartyPlayStyle;
  goalTags: readonly PartyGoalTag[];
  activeEventTags?: readonly string[];
  description: string;
  classId?: string;
  combatLevel?: number;
}

export interface GuildRecruitmentRequirements {
  minTotalLevel?: number;
  minCombatLevel?: number;
  applicationRequired: boolean;
}

export interface GuildRecruitmentProfile {
  kind: 'guild_lfm';
  guildId: string;
  ownerAccountId: string;
  focusTags: readonly GuildFocusTag[];
  playStyle: PartyPlayStyle;
  activeEventTags?: readonly string[];
  description: string;
  memberCount: number;
  memberCap: number;
  requirements?: GuildRecruitmentRequirements;
}

export interface PlayerGuildSeekerPost {
  kind: 'player_guild_lfg';
  accountId: string;
  characterId: string;
  desiredFocusTags: readonly GuildFocusTag[];
  playStyle: PartyPlayStyle;
  activeEventTags?: readonly string[];
  description: string;
  classId?: string;
  combatLevel?: number;
  totalLevel?: number;
}

export interface RecruitmentCompatibility {
  score: number;
  reasons: string[];
}

function overlap<T extends string>(a: readonly T[], b: readonly T[]): T[] {
  const bSet = new Set(b);
  return a.filter((value) => bSet.has(value));
}

function eventTagOverlap(a: readonly string[] | undefined, b: readonly string[] | undefined): string[] {
  if (!a || !b) return [];
  const bSet = new Set(b);
  return a.filter((value) => bSet.has(value));
}

function playStyleScore(a: PartyPlayStyle, b: PartyPlayStyle): number {
  if (a === b) return 20;
  const order: PartyPlayStyle[] = ['casual', 'balanced', 'active', 'competitive'];
  const distance = Math.abs(order.indexOf(a) - order.indexOf(b));
  return distance === 1 ? 12 : distance === 2 ? 5 : 0;
}

function activityPreferenceScore(a: PartyActivityPreference, b: PartyActivityPreference): number {
  if (a === b) return 45;
  if (a === 'mixed' || b === 'mixed') return 30;
  return 5;
}

function normalizeEventTags(tags: readonly string[] | undefined): string[] | undefined {
  if (!tags) return undefined;
  return [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))].slice(0, MAX_RECRUITMENT_EVENT_TAGS);
}

export function normalizePartyRecruitmentPost(post: PartyRecruitmentPost): PartyRecruitmentPost {
  return {
    ...post,
    goalTags: [...new Set(post.goalTags)].slice(0, 6),
    activeEventTags: normalizeEventTags(post.activeEventTags),
    description: normalizeRecruitmentDescription(post.description),
  };
}

export function normalizePlayerPartySeekerPost(post: PlayerPartySeekerPost): PlayerPartySeekerPost {
  return {
    ...post,
    goalTags: [...new Set(post.goalTags)].slice(0, 6),
    activeEventTags: normalizeEventTags(post.activeEventTags),
    description: normalizeRecruitmentDescription(post.description),
  };
}

export function normalizeGuildSeekerDescription(description: string): string {
  return description.replace(/\s+/g, ' ').trim().slice(0, GUILD_SEEKER_DESCRIPTION_MAX);
}

export function normalizeGuildRecruitmentProfile(profile: GuildRecruitmentProfile): GuildRecruitmentProfile {
  return {
    ...profile,
    focusTags: [...new Set(profile.focusTags)].slice(0, 8),
    activeEventTags: normalizeEventTags(profile.activeEventTags),
    description: normalizeGuildSeekerDescription(profile.description),
    requirements: profile.requirements ? {
      minTotalLevel: profile.requirements.minTotalLevel === undefined ? undefined : Math.max(0, Math.floor(profile.requirements.minTotalLevel)),
      minCombatLevel: profile.requirements.minCombatLevel === undefined ? undefined : Math.max(0, Math.floor(profile.requirements.minCombatLevel)),
      applicationRequired: Boolean(profile.requirements.applicationRequired),
    } : undefined,
  };
}

export function normalizePlayerGuildSeekerPost(post: PlayerGuildSeekerPost): PlayerGuildSeekerPost {
  return {
    ...post,
    desiredFocusTags: [...new Set(post.desiredFocusTags)].slice(0, 8),
    activeEventTags: normalizeEventTags(post.activeEventTags),
    description: normalizeGuildSeekerDescription(post.description),
  };
}

export function guildRequirementsMet(seeker: PlayerGuildSeekerPost, guild: GuildRecruitmentProfile): boolean {
  const requirements = guild.requirements;
  if (!requirements) return true;
  if (requirements.minCombatLevel !== undefined && (seeker.combatLevel ?? 0) < requirements.minCombatLevel) return false;
  if (requirements.minTotalLevel !== undefined && (seeker.totalLevel ?? 0) < requirements.minTotalLevel) return false;
  return true;
}

export function scorePartyCompatibility(
  seeker: PlayerPartySeekerPost,
  party: PartyRecruitmentPost,
): RecruitmentCompatibility {
  const reasons: string[] = [];
  let score = 0;
  const activity = activityPreferenceScore(seeker.activityPreference, party.activityPreference);
  score += activity;
  if (activity >= 30) reasons.push('activity_match');

  const style = playStyleScore(seeker.playStyle, party.playStyle);
  score += style;
  if (style >= 12) reasons.push('play_style_match');

  const sharedGoals = overlap(seeker.goalTags, party.goalTags);
  const goalScore = Math.min(25, sharedGoals.length * 8);
  score += goalScore;
  if (sharedGoals.length > 0) reasons.push('shared_goals');

  // Current event interest is deliberately a small bonus, never a hard requirement.
  const sharedEvents = eventTagOverlap(seeker.activeEventTags, party.activeEventTags);
  if (sharedEvents.length > 0) {
    score += Math.min(10, sharedEvents.length * 5);
    reasons.push('shared_live_event');
  }

  if (party.memberCount < party.maxMembers) {
    score += 5;
    reasons.push('space_available');
  }

  return { score: Math.min(100, score), reasons };
}

export function scoreGuildCompatibility(
  seeker: PlayerGuildSeekerPost,
  guild: GuildRecruitmentProfile,
): RecruitmentCompatibility {
  const reasons: string[] = [];
  if (!guildRequirementsMet(seeker, guild)) return { score: 0, reasons: ['requirements_not_met'] };
  let score = playStyleScore(seeker.playStyle, guild.playStyle);
  if (score >= 12) reasons.push('play_style_match');
  const sharedFocus = overlap(seeker.desiredFocusTags, guild.focusTags);
  score += Math.min(55, sharedFocus.length * 18);
  if (sharedFocus.length > 0) reasons.push('shared_focus');
  const sharedEvents = eventTagOverlap(seeker.activeEventTags, guild.activeEventTags);
  if (sharedEvents.length > 0) {
    score += Math.min(10, sharedEvents.length * 5);
    reasons.push('shared_live_event');
  }
  if (guild.memberCount < guild.memberCap) {
    score += 15;
    reasons.push('space_available');
  }
  return { score: Math.min(100, score), reasons };
}

export function sortPartyMatches(
  seeker: PlayerPartySeekerPost,
  parties: readonly PartyRecruitmentPost[],
): PartyRecruitmentPost[] {
  return [...parties]
    .filter((party) => party.memberCount < party.maxMembers)
    .sort((a, b) => scorePartyCompatibility(seeker, b).score - scorePartyCompatibility(seeker, a).score);
}

export function sortGuildMatches(
  seeker: PlayerGuildSeekerPost,
  guilds: readonly GuildRecruitmentProfile[],
): GuildRecruitmentProfile[] {
  return [...guilds]
    .filter((guild) => guild.memberCount < guild.memberCap && guildRequirementsMet(seeker, guild))
    .sort((a, b) => scoreGuildCompatibility(seeker, b).score - scoreGuildCompatibility(seeker, a).score);
}
