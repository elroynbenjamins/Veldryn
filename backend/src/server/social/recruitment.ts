import type { PartyFocus } from './party';

export type RecruitmentPostType =
  | 'looking_for_guild'
  | 'guild_recruiting'
  | 'looking_for_party'
  | 'party_recruiting';

export type RecruitmentRole = 'tank' | 'damage' | 'support';
export type RecruitmentDurationDays = 1 | 3;
export type RecruitmentStatus = 'active' | 'closed' | 'expired';
export type RecruitmentFocus = 'combat' | 'skilling' | 'mixed' | 'any';
export type RecruitmentActivityLevel = 'casual' | 'regular' | 'active' | 'hardcore';

export interface RecruitmentPost {
  id: string;
  ownerAccountId: string;
  ownerCharacterId?: string;
  guildId?: string;
  partyId?: string;
  postType: RecruitmentPostType;
  title: string;
  body: string;
  roles: RecruitmentRole[];
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
  createdAtMs: number;
  refreshedAtMs: number;
  expiresAtMs: number;
  status: RecruitmentStatus;
}

export interface RecruitmentFilters {
  postTypes?: RecruitmentPostType[];
  roles?: RecruitmentRole[];
  focuses?: RecruitmentFocus[];
  activityTags?: string[];
  playstyleTags?: string[];
  availabilityTags?: string[];
  guildInterestTags?: string[];
  activityLevels?: RecruitmentActivityLevel[];
  language?: string;
  region?: string;
  search?: string;
  maxMinCombatLevel?: number;
  maxMinTotalLevel?: number;
  requireOpenPartySpot?: boolean;
}

export interface RefreshDecision {
  allowed: boolean;
  retryAfterSeconds: number;
  reason?: 'refresh_cooldown' | 'post_closed';
}

export interface PublishDecision {
  allowed: boolean;
  retryAfterSeconds: number;
  replacePostId?: string;
  reason?: 'publish_cooldown';
}

export interface RecruitmentPublishScope {
  guildId?: string;
  partyId?: string;
}

export const RECRUITMENT_REFRESH_COOLDOWN_MS = 6 * 60 * 60 * 1000;

export function defaultRecruitmentDuration(postType: RecruitmentPostType): RecruitmentDurationDays {
  return postType === 'looking_for_party' || postType === 'party_recruiting' ? 1 : 3;
}

export function allowedRecruitmentDurations(postType: RecruitmentPostType): readonly RecruitmentDurationDays[] {
  return postType === 'looking_for_party' || postType === 'party_recruiting' ? [1] : [1, 3];
}

export function validateRecruitmentDuration(
  postType: RecruitmentPostType,
  durationDays: RecruitmentDurationDays,
): void {
  if (!allowedRecruitmentDurations(postType).includes(durationDays)) {
    throw new Error('invalid_recruitment_duration');
  }
}

export function recruitmentExpiry(
  fromMs: number,
  durationDays: RecruitmentDurationDays,
  postType?: RecruitmentPostType,
): number {
  if (postType) validateRecruitmentDuration(postType, durationDays);
  return fromMs + durationDays * 24 * 60 * 60 * 1000;
}

export function effectiveRecruitmentStatus(post: RecruitmentPost, nowMs: number): RecruitmentStatus {
  if (post.status !== 'active') return post.status;
  return post.expiresAtMs <= nowMs ? 'expired' : 'active';
}

export function isRecruitmentPostVisible(post: RecruitmentPost, nowMs: number): boolean {
  return effectiveRecruitmentStatus(post, nowMs) === 'active';
}

export function canRefreshRecruitmentPost(post: RecruitmentPost, nowMs: number): RefreshDecision {
  if (effectiveRecruitmentStatus(post, nowMs) === 'closed') {
    return { allowed: false, retryAfterSeconds: 0, reason: 'post_closed' };
  }
  const remaining = RECRUITMENT_REFRESH_COOLDOWN_MS - (nowMs - post.refreshedAtMs);
  if (remaining > 0) {
    return { allowed: false, retryAfterSeconds: Math.ceil(remaining / 1000), reason: 'refresh_cooldown' };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Publishing a replacement uses the same six-hour anti-bump window. Closing an advert and
 * immediately reposting therefore cannot bypass the refresh cooldown.
 */
export function canPublishRecruitmentPost(
  posts: readonly RecruitmentPost[],
  ownerAccountId: string,
  postType: RecruitmentPostType,
  nowMs: number,
  scope: RecruitmentPublishScope = {},
): PublishDecision {
  const sameScope = (post: RecruitmentPost): boolean => {
    if (post.postType !== postType) return false;
    if (postType === 'guild_recruiting' && scope.guildId) return post.ownerAccountId===ownerAccountId || post.guildId === scope.guildId;
    if (postType === 'party_recruiting' && scope.partyId) return post.ownerAccountId===ownerAccountId || post.partyId === scope.partyId;
    return post.ownerAccountId === ownerAccountId;
  };
  const scopedPosts = posts.filter(sameScope).sort((a, b) => b.refreshedAtMs - a.refreshedAtMs);
  const newest = scopedPosts[0];
  if (!newest) return { allowed: true, retryAfterSeconds: 0 };

  const remaining = RECRUITMENT_REFRESH_COOLDOWN_MS - (nowMs - newest.refreshedAtMs);
  if (remaining > 0) {
    return { allowed: false, retryAfterSeconds: Math.ceil(remaining / 1000), reason: 'publish_cooldown' };
  }
  const replacePost = scopedPosts.find(post => isRecruitmentPostVisible(post, nowMs));
  return { allowed: true, retryAfterSeconds: 0, replacePostId: replacePost?.id };
}

export function recruitmentTimeRemainingMs(post: RecruitmentPost, nowMs: number): number {
  return Math.max(0, post.expiresAtMs - nowMs);
}

export function validateRecruitmentPostShape(post: RecruitmentPost): void {
  if (!post.id || !post.ownerAccountId) throw new Error('recruitment_missing_identity');
  if (post.title.trim().length < 3 || post.title.trim().length > 80) throw new Error('recruitment_title_length');
  if (post.body.length > 600) throw new Error('recruitment_body_length');
  if (post.currentObjective && post.currentObjective.length > 120) throw new Error('recruitment_objective_length');
  if (post.openSpots !== undefined && (!Number.isInteger(post.openSpots) || post.openSpots < 0 || post.openSpots > 3)) {
    throw new Error('recruitment_open_spots_invalid');
  }
  if ((post.minCombatLevel ?? 0) < 0 || (post.minTotalLevel ?? 0) < 0) throw new Error('recruitment_level_invalid');
  if (post.postType === 'party_recruiting' && !post.partyId) throw new Error('party_recruitment_requires_party');
  if (post.postType === 'party_recruiting' && post.openSpots === undefined) throw new Error('party_recruitment_requires_open_spots');
  if (post.postType === 'guild_recruiting' && !post.guildId) throw new Error('guild_recruitment_requires_guild');
  if (post.postType === 'looking_for_party' && (post.guildId || post.partyId)) throw new Error('lfg_must_be_individual');
  if (post.postType === 'looking_for_guild' && (post.guildId || post.partyId)) throw new Error('guild_seeker_must_be_individual');
  if (post.postType !== 'party_recruiting' && post.openSpots !== undefined) throw new Error('open_spots_only_for_party_recruitment');
}

function overlaps<T>(left: readonly T[], right: readonly T[]): boolean {
  return right.length === 0 || right.some(value => left.includes(value));
}

function normalized(value?: string): string {
  return (value ?? '').trim().toLocaleLowerCase();
}

export function matchesRecruitmentFilters(
  post: RecruitmentPost,
  filters: RecruitmentFilters,
  nowMs: number,
): boolean {
  if (!isRecruitmentPostVisible(post, nowMs)) return false;
  if (filters.postTypes?.length && !filters.postTypes.includes(post.postType)) return false;
  if (filters.roles?.length && !overlaps(post.roles, filters.roles)) return false;
  if (filters.focuses?.length && !filters.focuses.includes(post.focus)) return false;
  if (filters.activityTags?.length && !overlaps(post.activityTags, filters.activityTags)) return false;
  if (filters.playstyleTags?.length && !overlaps(post.playstyleTags, filters.playstyleTags)) return false;
  if (filters.availabilityTags?.length && !overlaps(post.availabilityTags, filters.availabilityTags)) return false;
  if (filters.guildInterestTags?.length && !overlaps(post.guildInterestTags, filters.guildInterestTags)) return false;
  if (filters.activityLevels?.length && (!post.activityLevel || !filters.activityLevels.includes(post.activityLevel))) return false;
  if (filters.language && normalized(post.language) !== normalized(filters.language)) return false;
  if (filters.region && normalized(post.region) !== normalized(filters.region)) return false;
  if (filters.maxMinCombatLevel !== undefined && (post.minCombatLevel ?? 0) > filters.maxMinCombatLevel) return false;
  if (filters.maxMinTotalLevel !== undefined && (post.minTotalLevel ?? 0) > filters.maxMinTotalLevel) return false;
  if (filters.requireOpenPartySpot && post.postType === 'party_recruiting' && (post.openSpots ?? 0) <= 0) return false;

  const q = normalized(filters.search);
  if (q) {
    const haystack = [
      post.title,
      post.body,
      post.language,
      post.region,
      post.focus,
      post.activityLevel,
      post.currentObjective,
      ...post.roles,
      ...post.activityTags,
      ...post.playstyleTags,
      ...post.availabilityTags,
      ...post.guildInterestTags,
    ]
      .map(normalized)
      .join(' ');
    if (!haystack.includes(q)) return false;
  }
  return true;
}

export function filterRecruitmentPosts(
  posts: RecruitmentPost[],
  filters: RecruitmentFilters,
  nowMs: number,
): RecruitmentPost[] {
  return posts
    .filter(post => matchesRecruitmentFilters(post, filters, nowMs))
    .sort((a, b) => b.refreshedAtMs - a.refreshedAtMs || b.createdAtMs - a.createdAtMs);
}

// v17 typed social compatibility projections. Event tags are intentionally soft bonuses.
export type PartyPlayStyle = 'casual' | 'balanced' | 'active' | 'competitive';
export type PartyGoalTag = 'weekly_contracts' | 'combat' | 'bosses' | 'skilling' | 'gathering' | 'crafting' | 'party_events' | 'dungeons' | 'social';
export type GuildFocusTag = 'social' | 'pve' | 'skilling' | 'progression' | 'collections' | 'events' | 'competitive' | 'new_player_friendly';
export interface PartyRecruitmentPost { kind: 'party_lfm'; partyId: string; ownerAccountId: string; activityPreference: PartyFocus; playStyle: PartyPlayStyle; goalTags: readonly PartyGoalTag[]; activeEventTags?: readonly string[]; description: string; memberCount: number; maxMembers: 4; }
export interface PlayerPartySeekerPost { kind: 'player_lfg'; accountId: string; characterId: string; activityPreference: PartyFocus; playStyle: PartyPlayStyle; goalTags: readonly PartyGoalTag[]; activeEventTags?: readonly string[]; description: string; classId?: string; combatLevel?: number; }
export interface GuildRecruitmentRequirements { minTotalLevel?: number; minCombatLevel?: number; applicationRequired: boolean; }
export interface GuildRecruitmentProfile { kind: 'guild_lfm'; guildId: string; ownerAccountId: string; focusTags: readonly GuildFocusTag[]; playStyle: PartyPlayStyle; activeEventTags?: readonly string[]; description: string; memberCount: number; memberCap: number; requirements?: GuildRecruitmentRequirements; }
export interface PlayerGuildSeekerPost { kind: 'player_guild_lfg'; accountId: string; characterId: string; desiredFocusTags: readonly GuildFocusTag[]; playStyle: PartyPlayStyle; activeEventTags?: readonly string[]; description: string; classId?: string; combatLevel?: number; totalLevel?: number; }
export interface RecruitmentCompatibility { score: number; reasons: string[]; }

const tagOverlap = (a: readonly string[] | undefined, b: readonly string[] | undefined) => a && b ? a.filter(value => b.includes(value)) : [];
const styleScore = (a: PartyPlayStyle, b: PartyPlayStyle) => a === b ? 20 : 12;
export function guildRequirementsMet(seeker: PlayerGuildSeekerPost, guild: GuildRecruitmentProfile): boolean {
  const req = guild.requirements; return !req || ((req.minCombatLevel === undefined || (seeker.combatLevel ?? 0) >= req.minCombatLevel) && (req.minTotalLevel === undefined || (seeker.totalLevel ?? 0) >= req.minTotalLevel));
}
export function scorePartyCompatibility(seeker: PlayerPartySeekerPost, party: PartyRecruitmentPost): RecruitmentCompatibility {
  let score = seeker.activityPreference === party.activityPreference || seeker.activityPreference === 'mixed' || party.activityPreference === 'mixed' ? 45 : 5;
  const reasons: string[] = []; score += styleScore(seeker.playStyle, party.playStyle); score += Math.min(25, seeker.goalTags.filter(tag => party.goalTags.includes(tag)).length * 8); score += Math.min(10, (tagOverlap(seeker.activeEventTags, party.activeEventTags)?.length ?? 0) * 5); if (party.memberCount < party.maxMembers) score += 5; return { score: Math.min(100, score), reasons };
}
export function scoreGuildCompatibility(seeker: PlayerGuildSeekerPost, guild: GuildRecruitmentProfile): RecruitmentCompatibility {
  if (!guildRequirementsMet(seeker, guild)) return { score: 0, reasons: ['requirements_not_met'] };
  let score = styleScore(seeker.playStyle, guild.playStyle) + Math.min(55, seeker.desiredFocusTags.filter(tag => guild.focusTags.includes(tag)).length * 18) + Math.min(10, (tagOverlap(seeker.activeEventTags, guild.activeEventTags)?.length ?? 0) * 5); if (guild.memberCount < guild.memberCap) score += 15; return { score: Math.min(100, score), reasons: [] };
}
