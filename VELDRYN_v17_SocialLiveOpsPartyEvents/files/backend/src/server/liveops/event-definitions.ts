import type { ContributionCategory, ContributionChallenge } from '../party/party-contracts';

export type LiveOpsEventScope = 'party';
export type LiveOpsActivityKind =
  | 'combat'
  | 'gathering'
  | 'processing'
  | 'crafting'
  | 'fishing'
  | 'hunting'
  | 'alchemy'
  | 'delivery';

export type LiveOpsRewardTier = 'participation' | 'milestone' | 'prestige';

export interface RewardBundleRef {
  /** Existing economy/content reward bundle. v17 intentionally creates no new currency. */
  bundleId: string;
  tier: LiveOpsRewardTier;
}

export interface LiveOpsMilestoneDefinition {
  points: number;
  reward: RewardBundleRef;
}

export interface PartyEventRankingRewards {
  qualified: RewardBundleRef;
  top25Percent?: RewardBundleRef;
  top10Percent?: RewardBundleRef;
  top100?: RewardBundleRef;
  top10?: RewardBundleRef;
}

export interface EventContributionRules {
  allowedCategories: readonly ContributionCategory[];
  allowedActivityKinds?: readonly LiveOpsActivityKind[];
  allowedRegionIds?: readonly string[];
  requiredAnyTags?: readonly string[];
  /** Fine tuning on top of time-normalized v16 scoring. Keep close to 1.0. */
  activityMultipliers?: Partial<Record<LiveOpsActivityKind, number>>;
  challengeMultipliers?: Partial<Record<ContributionChallenge, number>>;
  minimumCategoryFraction?: Partial<Record<ContributionCategory, number>>;
  dailyAccountCreditCap: number;
}

export interface PartyLiveOpsEventDefinition {
  id: string;
  version: number;
  scope: LiveOpsEventScope;
  name: string;
  shortDescription: string;
  durationHours: number;
  contributionRules: EventContributionRules;
  personalMilestones: readonly LiveOpsMilestoneDefinition[];
  partyMilestones: readonly LiveOpsMilestoneDefinition[];
  personalPartyRewardEligibilityPoints: number;
  rankedMinimumPartyPoints: number;
  rankedMinimumMeaningfulContributors: number;
  meaningfulContributorPoints: number;
  /** Once an account has this many points for one party, party reward/rank binding is locked for the event. */
  partyBindingLockPoints: number;
  rankingRewards: PartyEventRankingRewards;
  eventTags: readonly string[];
}

export interface ScheduledPartyEvent {
  instanceId: string;
  definition: PartyLiveOpsEventDefinition;
  startsAtMs: number;
  endsAtMs: number;
  settlementGraceMinutes: number;
}

export const PARTY_EVENT_MIN_DURATION_HOURS = 24;
export const PARTY_EVENT_MAX_DURATION_HOURS = 72;
export const PARTY_EVENT_DEFAULT_SETTLEMENT_GRACE_MINUTES = 10;

export function validatePartyEventDefinition(definition: PartyLiveOpsEventDefinition): string[] {
  const errors: string[] = [];
  if (!definition.id.trim()) errors.push('id_required');
  if (!Number.isInteger(definition.version) || definition.version < 1) errors.push('version_invalid');
  if (definition.durationHours < PARTY_EVENT_MIN_DURATION_HOURS || definition.durationHours > PARTY_EVENT_MAX_DURATION_HOURS) errors.push('duration_out_of_range');
  if (definition.contributionRules.allowedCategories.length === 0) errors.push('allowed_categories_required');
  if (definition.contributionRules.dailyAccountCreditCap <= 0) errors.push('daily_cap_invalid');
  if (definition.personalPartyRewardEligibilityPoints <= 0) errors.push('personal_party_eligibility_invalid');
  if (definition.rankedMinimumMeaningfulContributors < 2) errors.push('ranked_contributors_too_low');
  if (definition.meaningfulContributorPoints <= 0) errors.push('meaningful_contributor_points_invalid');
  if (definition.partyBindingLockPoints < definition.meaningfulContributorPoints) errors.push('binding_lock_below_meaningful_threshold');
  if (definition.rankedMinimumPartyPoints <= 0) errors.push('ranked_minimum_party_points_invalid');

  const validateMilestones = (name: string, milestones: readonly LiveOpsMilestoneDefinition[]) => {
    let previous = 0;
    for (const milestone of milestones) {
      if (milestone.points <= previous) errors.push(`${name}_milestones_not_strictly_increasing`);
      if (!milestone.reward.bundleId) errors.push(`${name}_reward_bundle_required`);
      previous = milestone.points;
    }
  };
  validateMilestones('personal', definition.personalMilestones);
  validateMilestones('party', definition.partyMilestones);

  for (const [kind, multiplier] of Object.entries(definition.contributionRules.activityMultipliers ?? {})) {
    if (typeof multiplier !== 'number' || multiplier < 0.5 || multiplier > 1.5) errors.push(`activity_multiplier_out_of_range:${kind}`);
  }
  for (const [challenge, multiplier] of Object.entries(definition.contributionRules.challengeMultipliers ?? {})) {
    if (typeof multiplier !== 'number' || multiplier < 0.75 || multiplier > 1.5) errors.push(`challenge_multiplier_out_of_range:${challenge}`);
  }
  for (const [category, fraction] of Object.entries(definition.contributionRules.minimumCategoryFraction ?? {})) {
    if (typeof fraction !== 'number' || fraction < 0 || fraction > 0.8) errors.push(`category_fraction_out_of_range:${category}`);
  }
  return [...new Set(errors)];
}

const participation: RewardBundleRef = { bundleId: 'party_event_participation_v1', tier: 'participation' };
const personal1: RewardBundleRef = { bundleId: 'party_event_personal_250_v1', tier: 'milestone' };
const personal2: RewardBundleRef = { bundleId: 'party_event_personal_750_v1', tier: 'milestone' };
const personal3: RewardBundleRef = { bundleId: 'party_event_personal_1500_v1', tier: 'milestone' };
const personal4: RewardBundleRef = { bundleId: 'party_event_personal_2500_v1', tier: 'milestone' };
const party1: RewardBundleRef = { bundleId: 'party_event_party_2000_v1', tier: 'milestone' };
const party2: RewardBundleRef = { bundleId: 'party_event_party_4000_v1', tier: 'milestone' };
const party3: RewardBundleRef = { bundleId: 'party_event_party_6000_v1', tier: 'milestone' };
const party4: RewardBundleRef = { bundleId: 'party_event_party_9000_v1', tier: 'milestone' };

const commonPersonalMilestones = [
  { points: 250, reward: personal1 },
  { points: 750, reward: personal2 },
  { points: 1500, reward: personal3 },
  { points: 2500, reward: personal4 },
] as const;
const commonPartyMilestones = [
  { points: 2000, reward: party1 },
  { points: 4000, reward: party2 },
  { points: 6000, reward: party3 },
  { points: 9000, reward: party4 },
] as const;
const commonRankingRewards: PartyEventRankingRewards = {
  qualified: participation,
  top25Percent: { bundleId: 'party_event_rank_top25_v1', tier: 'milestone' },
  top10Percent: { bundleId: 'party_event_rank_top10pct_v1', tier: 'prestige' },
  top100: { bundleId: 'party_event_rank_top100_v1', tier: 'prestige' },
  top10: { bundleId: 'party_event_rank_top10_v1', tier: 'prestige' },
};

/**
 * v17 launch template pool. These are templates, not a hard-coded calendar. Live-ops scheduling creates immutable instances.
 * 1,000 points is approximately one standardized active hour before the small event-specific multipliers below.
 */
export const PARTY_EVENT_TEMPLATE_POOL: readonly PartyLiveOpsEventDefinition[] = [
  {
    id: 'party_event_rift_surge', version: 1, scope: 'party', name: 'Rift Surge',
    shortDescription: 'Stabilize a spreading Rift through combat and realm-support activities.', durationHours: 48,
    contributionRules: {
      allowedCategories: ['combat', 'skilling'], dailyAccountCreditCap: 2400,
      minimumCategoryFraction: { combat: 0.30, skilling: 0.30 },
      challengeMultipliers: { elite: 1.05, boss: 1.10 },
    },
    personalMilestones: commonPersonalMilestones, partyMilestones: commonPartyMilestones,
    personalPartyRewardEligibilityPoints: 250, rankedMinimumPartyPoints: 4000,
    rankedMinimumMeaningfulContributors: 2, meaningfulContributorPoints: 250, partyBindingLockPoints: 250,
    rankingRewards: commonRankingRewards, eventTags: ['rift', 'mixed', 'party_event'],
  },
  {
    id: 'party_event_sunscar_invasion', version: 1, scope: 'party', name: 'Sunscar Invasion',
    shortDescription: 'Drive back an invasion with efficient combat, elite hunts and regional boss clears.', durationHours: 48,
    contributionRules: {
      allowedCategories: ['combat'], allowedActivityKinds: ['combat'], allowedRegionIds: ['sunscar'], dailyAccountCreditCap: 2400,
      challengeMultipliers: { elite: 1.08, boss: 1.12 },
    },
    personalMilestones: commonPersonalMilestones, partyMilestones: commonPartyMilestones,
    personalPartyRewardEligibilityPoints: 250, rankedMinimumPartyPoints: 4000,
    rankedMinimumMeaningfulContributors: 2, meaningfulContributorPoints: 250, partyBindingLockPoints: 250,
    rankingRewards: commonRankingRewards, eventTags: ['sunscar', 'combat', 'party_event'],
  },
  {
    id: 'party_event_asterfall_reconstruction', version: 1, scope: 'party', name: 'Rebuild Asterfall',
    shortDescription: 'Gather, process and craft supplies to restore damaged frontier infrastructure.', durationHours: 48,
    contributionRules: {
      allowedCategories: ['skilling'], allowedActivityKinds: ['gathering', 'processing', 'crafting', 'delivery'],
      allowedRegionIds: ['asterfall'], dailyAccountCreditCap: 2400,
      activityMultipliers: { processing: 1.03, crafting: 1.05, delivery: 1.05 },
    },
    personalMilestones: commonPersonalMilestones, partyMilestones: commonPartyMilestones,
    personalPartyRewardEligibilityPoints: 250, rankedMinimumPartyPoints: 4000,
    rankedMinimumMeaningfulContributors: 2, meaningfulContributorPoints: 250, partyBindingLockPoints: 250,
    rankingRewards: commonRankingRewards, eventTags: ['asterfall', 'skilling', 'party_event'],
  },
  {
    id: 'party_event_frostmarch_supply_crisis', version: 1, scope: 'party', name: 'Frostmarch Supply Crisis',
    shortDescription: 'Keep remote settlements supplied through fishing, hunting, gathering and crafting.', durationHours: 48,
    contributionRules: {
      allowedCategories: ['skilling'], allowedActivityKinds: ['fishing', 'hunting', 'gathering', 'processing', 'crafting', 'delivery'],
      allowedRegionIds: ['frostmarch'], dailyAccountCreditCap: 2400,
      activityMultipliers: { fishing: 1.03, hunting: 1.03, delivery: 1.08 },
    },
    personalMilestones: commonPersonalMilestones, partyMilestones: commonPartyMilestones,
    personalPartyRewardEligibilityPoints: 250, rankedMinimumPartyPoints: 4000,
    rankedMinimumMeaningfulContributors: 2, meaningfulContributorPoints: 250, partyBindingLockPoints: 250,
    rankingRewards: commonRankingRewards, eventTags: ['frostmarch', 'skilling', 'party_event'],
  },
  {
    id: 'party_event_blackened_wells', version: 1, scope: 'party', name: 'Blackened Wells',
    shortDescription: 'Contain poisoned threats while gathering reagents and producing emergency remedies.', durationHours: 48,
    contributionRules: {
      allowedCategories: ['combat', 'skilling'], allowedActivityKinds: ['combat', 'gathering', 'alchemy', 'crafting'],
      requiredAnyTags: ['poison', 'antidote', 'tainted'], dailyAccountCreditCap: 2400,
      minimumCategoryFraction: { combat: 0.25, skilling: 0.25 }, activityMultipliers: { alchemy: 1.08 },
    },
    personalMilestones: commonPersonalMilestones, partyMilestones: commonPartyMilestones,
    personalPartyRewardEligibilityPoints: 250, rankedMinimumPartyPoints: 4000,
    rankedMinimumMeaningfulContributors: 2, meaningfulContributorPoints: 250, partyBindingLockPoints: 250,
    rankingRewards: commonRankingRewards, eventTags: ['mixed', 'poison', 'party_event'],
  },
] as const;

for (const definition of PARTY_EVENT_TEMPLATE_POOL) {
  const errors = validatePartyEventDefinition(definition);
  if (errors.length > 0) throw new Error(`invalid_party_event_definition:${definition.id}:${errors.join(',')}`);
}
