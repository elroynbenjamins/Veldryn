import type { PartyActivityPreference } from './party-policy';

export const PARTY_POINTS_PER_STANDARD_HOUR = 1000;
export const PARTY_CONTRACT_DAILY_CREDIT_CAP = 1600;
export const PARTY_CONTRACT_MAX_ACCOUNT_COMPLETION_SHARE = 0.85;
export const PARTY_CONTRACT_MIN_QUALIFYING_CONTRIBUTORS = 2;
export const PARTY_CONTRACT_PERSONAL_ELIGIBILITY_FRACTION = 0.06;
export const PARTY_CONTRACT_PERSONAL_ELIGIBILITY_FLOOR = 250;

export type ContributionCategory = 'combat' | 'skilling';
export type ContributionChallenge = 'routine' | 'demanding' | 'elite' | 'boss';

export const CONTRIBUTION_CHALLENGE_MULTIPLIER: Record<ContributionChallenge, number> = {
  routine: 1,
  demanding: 1.1,
  elite: 1.2,
  boss: 1.35,
};

export interface AuthoritativeContributionProfile {
  /** Server-owned content/action identifier. Never accept this profile from an untrusted client. */
  id: string;
  category: ContributionCategory;
  expectedSecondsPerUnit: number;
  challenge: ContributionChallenge;
}

export interface ContributionScoreInput {
  profile: AuthoritativeContributionProfile;
  units: number;
}

export interface ContributionCreditInput {
  rawEventPoints: number;
  pointsCreditedToday: number;
  pointsCreditedForCompletionByAccount: number;
  contractTargetPoints: number;
}

export interface ContributionCreditResult {
  rawPoints: number;
  dailyCreditedPoints: number;
  completionCreditedPoints: number;
  dailyCapRemaining: number;
  completionShareCapRemaining: number;
}

export interface PartyContractDefinition {
  id: string;
  name: string;
  focus: PartyActivityPreference;
  description: string;
  targetPoints: number;
  estimatedPartyHours: number;
  mixedMinimumFractionPerCategory?: number;
  rewardTier: 'standard' | 'enhanced';
}

export interface PartyContractMemberProgress {
  accountId: string;
  rawPoints: number;
  completionPoints: number;
  combatPoints: number;
  skillingPoints: number;
}

export interface PartyContractEvaluation {
  complete: boolean;
  completionPoints: number;
  combatPoints: number;
  skillingPoints: number;
  personalEligibilityPoints: number;
  qualifyingContributors: string[];
  missing: string[];
}

export function scoreContribution(input: ContributionScoreInput): number {
  if (!Number.isFinite(input.units) || input.units <= 0) return 0;
  const seconds = Math.max(1, input.profile.expectedSecondsPerUnit) * input.units;
  const multiplier = CONTRIBUTION_CHALLENGE_MULTIPLIER[input.profile.challenge];
  return Math.max(1, Math.round((seconds / 3600) * PARTY_POINTS_PER_STANDARD_HOUR * multiplier));
}

export function personalEligibilityPoints(targetPoints: number): number {
  return Math.max(
    PARTY_CONTRACT_PERSONAL_ELIGIBILITY_FLOOR,
    Math.ceil(targetPoints * PARTY_CONTRACT_PERSONAL_ELIGIBILITY_FRACTION),
  );
}

/**
 * Applies the anti-AFK / anti-carry credit limits. Raw points may still be recorded for diagnostics,
 * but contract completion only receives the capped completion contribution.
 */
export function creditContribution(input: ContributionCreditInput): ContributionCreditResult {
  const rawPoints = Math.max(0, Math.floor(input.rawEventPoints));
  const dailyCapRemaining = Math.max(0, PARTY_CONTRACT_DAILY_CREDIT_CAP - Math.max(0, input.pointsCreditedToday));
  const dailyCreditedPoints = Math.min(rawPoints, dailyCapRemaining);
  const completionShareCap = Math.ceil(input.contractTargetPoints * PARTY_CONTRACT_MAX_ACCOUNT_COMPLETION_SHARE);
  const completionShareCapRemaining = Math.max(
    0,
    completionShareCap - Math.max(0, input.pointsCreditedForCompletionByAccount),
  );
  const completionCreditedPoints = Math.min(dailyCreditedPoints, completionShareCapRemaining);
  return {
    rawPoints,
    dailyCreditedPoints,
    completionCreditedPoints,
    dailyCapRemaining: Math.max(0, dailyCapRemaining - dailyCreditedPoints),
    completionShareCapRemaining: Math.max(0, completionShareCapRemaining - completionCreditedPoints),
  };
}

export function evaluatePartyContract(
  definition: PartyContractDefinition,
  memberProgress: readonly PartyContractMemberProgress[],
): PartyContractEvaluation {
  const completionPoints = memberProgress.reduce((sum, member) => sum + Math.max(0, member.completionPoints), 0);
  const combatPoints = memberProgress.reduce((sum, member) => sum + Math.max(0, member.combatPoints), 0);
  const skillingPoints = memberProgress.reduce((sum, member) => sum + Math.max(0, member.skillingPoints), 0);
  const threshold = personalEligibilityPoints(definition.targetPoints);
  const qualifyingContributors = memberProgress
    .filter((member) => member.rawPoints >= threshold)
    .map((member) => member.accountId);

  const missing: string[] = [];
  if (completionPoints < definition.targetPoints) missing.push('party_points');
  if (qualifyingContributors.length < PARTY_CONTRACT_MIN_QUALIFYING_CONTRIBUTORS) {
    missing.push('distinct_contributors');
  }

  if (definition.focus === 'combat' && combatPoints < definition.targetPoints) missing.push('combat_points');
  if (definition.focus === 'skilling' && skillingPoints < definition.targetPoints) missing.push('skilling_points');
  if (definition.focus === 'mixed') {
    const requiredFraction = definition.mixedMinimumFractionPerCategory ?? 0.30;
    const minimumPerCategory = Math.ceil(definition.targetPoints * requiredFraction);
    if (combatPoints < minimumPerCategory) missing.push('mixed_combat_share');
    if (skillingPoints < minimumPerCategory) missing.push('mixed_skilling_share');
  }

  return {
    complete: missing.length === 0,
    completionPoints,
    combatPoints,
    skillingPoints,
    personalEligibilityPoints: threshold,
    qualifyingContributors,
    missing,
  };
}

export function memberEligibleForFullContractReward(
  definition: PartyContractDefinition,
  progress: PartyContractMemberProgress | undefined,
): boolean {
  if (!progress) return false;
  return progress.rawPoints >= personalEligibilityPoints(definition.targetPoints);
}

/**
 * Initial v16 balancing: one contract is ~3.6-4.0 standardized party-hours in total.
 * A four-person party therefore averages roughly 55-60 minutes each, while two players can still finish
 * without needing an extreme grind. Exact rewards remain economy-configurable.
 */
export const PARTY_CONTRACT_POOL: readonly PartyContractDefinition[] = [
  {
    id: 'party_combat_frontier_suppression',
    name: 'Frontier Suppression',
    focus: 'combat',
    description: 'Earn Combat contribution by defeating normal enemies, elites and bosses anywhere eligible this week.',
    targetPoints: 3600,
    estimatedPartyHours: 3.6,
    rewardTier: 'standard',
  },
  {
    id: 'party_combat_elite_hunt',
    name: 'Elite Hunt',
    focus: 'combat',
    description: 'Push difficult combat content. Elites and bosses are more efficient because challenge is reflected in points.',
    targetPoints: 3800,
    estimatedPartyHours: 3.8,
    rewardTier: 'enhanced',
  },
  {
    id: 'party_combat_regional_watch',
    name: 'Regional Watch',
    focus: 'combat',
    description: 'Keep dangerous regions under control through regular combat, elite encounters and regional bosses.',
    targetPoints: 3700,
    estimatedPartyHours: 3.7,
    rewardTier: 'standard',
  },
  {
    id: 'party_skilling_watchtower_rebuild',
    name: 'Rebuild the Watch',
    focus: 'skilling',
    description: 'Contribute through gathering, processing and crafting. Higher-tier and slower recipes receive appropriate effort points.',
    targetPoints: 3600,
    estimatedPartyHours: 3.6,
    rewardTier: 'standard',
  },
  {
    id: 'party_skilling_supply_drive',
    name: 'Frontier Supply Drive',
    focus: 'skilling',
    description: 'Gather and process useful supplies, craft equipment or consumables, and complete eligible delivery work.',
    targetPoints: 3800,
    estimatedPartyHours: 3.8,
    rewardTier: 'enhanced',
  },
  {
    id: 'party_skilling_artisan_relief',
    name: 'Artisan Relief',
    focus: 'skilling',
    description: 'Support the realm through a broad mix of gathering and production skills without requiring one exact profession.',
    targetPoints: 3700,
    estimatedPartyHours: 3.7,
    rewardTier: 'standard',
  },
  {
    id: 'party_mixed_rift_response',
    name: 'Rift Response',
    focus: 'mixed',
    description: 'Earn both Combat and Skilling contribution. Neither side can provide less than 30% of the target.',
    targetPoints: 4000,
    estimatedPartyHours: 4,
    mixedMinimumFractionPerCategory: 0.30,
    rewardTier: 'enhanced',
  },
  {
    id: 'party_mixed_frontier_relief',
    name: 'Frontier Relief',
    focus: 'mixed',
    description: 'Fight threats while supplying the affected region. Combat and Skilling must both contribute meaningfully.',
    targetPoints: 3800,
    estimatedPartyHours: 3.8,
    mixedMinimumFractionPerCategory: 0.30,
    rewardTier: 'standard',
  },
  {
    id: 'party_mixed_road_recovery',
    name: 'Road Recovery',
    focus: 'mixed',
    description: 'Clear hostile routes and rebuild supplies using a balanced mix of combat and skilling.',
    targetPoints: 3800,
    estimatedPartyHours: 3.8,
    mixedMinimumFractionPerCategory: 0.30,
    rewardTier: 'standard',
  },
] as const;
