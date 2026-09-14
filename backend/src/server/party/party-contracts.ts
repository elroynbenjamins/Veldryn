import type { PartyFocus } from '../social/party';

/** Shared v17 contribution contract. Profiles are server-owned settlement data. */
export type ContributionCategory = 'combat' | 'skilling';
export type ContributionChallenge = 'routine' | 'demanding' | 'elite' | 'boss';

export interface AuthoritativeContributionProfile {
  id: string;
  category: ContributionCategory;
  expectedSecondsPerUnit: number;
  challenge: ContributionChallenge;
}

export interface ContributionScoreInput {
  profile: AuthoritativeContributionProfile;
  units: number;
}

export const CONTRIBUTION_CHALLENGE_MULTIPLIER: Record<ContributionChallenge, number> = {
  routine: 1,
  demanding: 1.1,
  elite: 1.2,
  boss: 1.35,
};

export const PARTY_POINTS_PER_STANDARD_HOUR = 1000;

export function scoreContribution(input: ContributionScoreInput): number {
  if (!Number.isFinite(input.units) || input.units <= 0) return 0;
  const seconds = Math.max(1, input.profile.expectedSecondsPerUnit) * input.units;
  return Math.max(1, Math.round(
    (seconds / 3600) * PARTY_POINTS_PER_STANDARD_HOUR * CONTRIBUTION_CHALLENGE_MULTIPLIER[input.profile.challenge],
  ));
}

export type PartyContractCategory = PartyFocus;
export type PartyContractCadence = 'weekly' | 'mini_event';
export type ContractDifficulty = 'routine' | 'standard' | 'hard' | 'elite' | 'boss';
export type ContractActivityKind = 'combat' | 'gathering' | 'crafting' | 'mixed';

export interface PartyContractObjectiveDefinition {
  id: string;
  activityKind: ContractActivityKind;
  metric: string;
  targetUnits: number;
  expectedSecondsPerUnit: number;
  setupMinutes?: number;
  preparationMinutesPerUnit?: number;
  difficulty: ContractDifficulty;
}

export interface PartyContractDefinition {
  id: string;
  version: number;
  name: string;
  category: PartyContractCategory;
  cadence: PartyContractCadence;
  objectives: PartyContractObjectiveDefinition[];
  minimumPersonalContributionRate?: number;
}

export interface ObjectiveBudget extends PartyContractObjectiveDefinition {
  expectedMinutes: number;
  pointBudget: number;
}

export interface PartyContractBudget {
  definitionId: string;
  definitionVersion: number;
  totalExpectedMinutes: number;
  totalTargetPoints: number;
  minimumPersonalPoints: number;
  objectives: ObjectiveBudget[];
}

export interface PartyContractProgress {
  objectiveUnits: Record<string, number>;
  memberPoints: Record<string, number>;
  processedContributionKeys: Record<string, true>;
}

export interface VerifiedContributionInput {
  idempotencyKey: string;
  accountId: string;
  objectiveId: string;
  deltaUnits: number;
}

export interface VerifiedContributionResult {
  progress: PartyContractProgress;
  acceptedUnits: number;
  normalizedPoints: number;
  replayed: boolean;
}

export interface ContractCompletionResult {
  complete: boolean;
  totalEarnedPoints: number;
  totalTargetPoints: number;
  eligibleAccountIds: string[];
  ineligibleAccountIds: string[];
}

export interface RankedPartyScore {
  partyId: string;
  normalizedPoints: number;
  completedAtMs?: number;
}

export interface PartyMiniEventWindow {
  eventKey: string;
  definition: PartyContractDefinition;
  startsAtMs: number;
  endsAtMs: number;
}

export const BASE_POINTS_PER_EXPECTED_MINUTE = 10;
export const DEFAULT_MINIMUM_PERSONAL_CONTRIBUTION_RATE = 0.08;

const DIFFICULTY_MULTIPLIER: Record<ContractDifficulty, number> = {
  routine: 0.9,
  standard: 1,
  hard: 1.2,
  elite: 1.45,
  boss: 1.75,
};

export function createEmptyPartyContractProgress(): PartyContractProgress {
  return { objectiveUnits: {}, memberPoints: {}, processedContributionKeys: {} };
}

export function expectedObjectiveMinutes(objective: PartyContractObjectiveDefinition): number {
  if (!Number.isFinite(objective.targetUnits) || objective.targetUnits <= 0) throw new Error('invalid_contract_target_units');
  if (!Number.isFinite(objective.expectedSecondsPerUnit) || objective.expectedSecondsPerUnit <= 0) {
    throw new Error('invalid_expected_seconds_per_unit');
  }
  if (!Number.isFinite(objective.setupMinutes ?? 0) || !Number.isFinite(objective.preparationMinutesPerUnit ?? 0) || (objective.setupMinutes ?? 0) < 0 || (objective.preparationMinutesPerUnit ?? 0) < 0) {
    throw new Error('invalid_contract_preparation_time');
  }
  const actionMinutes = objective.targetUnits * objective.expectedSecondsPerUnit / 60;
  const preparationMinutes = objective.targetUnits * (objective.preparationMinutesPerUnit ?? 0);
  return actionMinutes + preparationMinutes + (objective.setupMinutes ?? 0);
}

/**
 * Points come from expected effort and difficulty, never a universal raw-unit rule.
 * A fast fish, expensive craft, elite and boss can therefore contribute comparably when
 * canonical content definitions model their real time/preparation burden accurately.
 */
export function objectivePointBudget(objective: PartyContractObjectiveDefinition): number {
  const minutes = expectedObjectiveMinutes(objective);
  return Math.max(1, Math.round(minutes * BASE_POINTS_PER_EXPECTED_MINUTE * DIFFICULTY_MULTIPLIER[objective.difficulty]));
}

export function buildPartyContractBudget(definition: PartyContractDefinition): PartyContractBudget {
  if (!definition.id || !Number.isInteger(definition.version) || definition.version < 1) {
    throw new Error('invalid_contract_definition_identity');
  }
  if (definition.objectives.length === 0) throw new Error('party_contract_requires_objective');
  if (new Set(definition.objectives.map(objective => objective.id)).size !== definition.objectives.length) {
    throw new Error('party_contract_duplicate_objective');
  }

  const objectives = definition.objectives.map(objective => ({
    ...objective,
    expectedMinutes: expectedObjectiveMinutes(objective),
    pointBudget: objectivePointBudget(objective),
  }));
  const totalExpectedMinutes = objectives.reduce((sum, objective) => sum + objective.expectedMinutes, 0);
  const totalTargetPoints = objectives.reduce((sum, objective) => sum + objective.pointBudget, 0);
  const personalRate = definition.minimumPersonalContributionRate ?? DEFAULT_MINIMUM_PERSONAL_CONTRIBUTION_RATE;
  if (!Number.isFinite(personalRate) || personalRate < 0 || personalRate > 0.5) throw new Error('invalid_personal_contribution_rate');

  return {
    definitionId: definition.id,
    definitionVersion: definition.version,
    totalExpectedMinutes,
    totalTargetPoints,
    minimumPersonalPoints: Math.max(1, Math.ceil(totalTargetPoints * personalRate)),
    objectives,
  };
}

export function normalizedPointsForCumulativeUnits(objective: ObjectiveBudget, units: number): number {
  const boundedUnits = Math.max(0, Math.min(objective.targetUnits, units));
  return Math.floor(objective.pointBudget * boundedUnits / objective.targetUnits);
}

export function normalizedContributionDelta(
  objective: ObjectiveBudget,
  previousUnits: number,
  submittedDeltaUnits: number,
): { acceptedUnits: number; normalizedPoints: number; newUnits: number } {
  if (!Number.isFinite(submittedDeltaUnits) || submittedDeltaUnits <= 0) {
    throw new Error('invalid_contribution_delta');
  }
  const oldUnits = Math.max(0, Math.min(objective.targetUnits, previousUnits));
  const newUnits = Math.min(objective.targetUnits, oldUnits + submittedDeltaUnits);
  const acceptedUnits = newUnits - oldUnits;
  return {
    acceptedUnits,
    normalizedPoints: normalizedPointsForCumulativeUnits(objective, newUnits)
      - normalizedPointsForCumulativeUnits(objective, oldUnits),
    newUnits,
  };
}

/**
 * Accept only trusted/server-verified activity events here. Client-reported kills, fish,
 * crafts or boss clears must never call this function directly in production.
 */
export function recordVerifiedContribution(
  budget: PartyContractBudget,
  progress: PartyContractProgress,
  participatingAccountIds: readonly string[],
  input: VerifiedContributionInput,
): VerifiedContributionResult {
  if (!input.idempotencyKey || input.idempotencyKey.length < 8) throw new Error('invalid_contribution_idempotency_key');
  if (Object.hasOwn(progress.processedContributionKeys, input.idempotencyKey)) {
    return { progress, acceptedUnits: 0, normalizedPoints: 0, replayed: true };
  }
  if (!participatingAccountIds.includes(input.accountId)) throw new Error('contributor_not_party_participant');
  const objective = budget.objectives.find(candidate => candidate.id === input.objectiveId);
  if (!objective) throw new Error('party_contract_objective_not_found');

  const delta = normalizedContributionDelta(
    objective,
    progress.objectiveUnits[input.objectiveId] ?? 0,
    input.deltaUnits,
  );
  const next: PartyContractProgress = {
    objectiveUnits: { ...progress.objectiveUnits, [input.objectiveId]: delta.newUnits },
    memberPoints: {
      ...progress.memberPoints,
      [input.accountId]: (progress.memberPoints[input.accountId] ?? 0) + delta.normalizedPoints,
    },
    processedContributionKeys: { ...progress.processedContributionKeys, [input.idempotencyKey]: true },
  };
  return { progress: next, acceptedUnits: delta.acceptedUnits, normalizedPoints: delta.normalizedPoints, replayed: false };
}

export function evaluateContractCompletion(
  budget: PartyContractBudget,
  progress: PartyContractProgress,
  participatingAccountIds: readonly string[],
): ContractCompletionResult {
  const objectivesComplete = budget.objectives.every(objective =>
    (progress.objectiveUnits[objective.id] ?? 0) >= objective.targetUnits,
  );
  const totalEarnedPoints = budget.objectives.reduce((sum, objective) =>
    sum + normalizedPointsForCumulativeUnits(objective, progress.objectiveUnits[objective.id] ?? 0),
  0);
  const eligibleAccountIds = participatingAccountIds.filter(accountId =>
    (progress.memberPoints[accountId] ?? 0) >= budget.minimumPersonalPoints,
  );
  const ineligibleAccountIds = participatingAccountIds.filter(accountId => !eligibleAccountIds.includes(accountId));

  return {
    complete: objectivesComplete && totalEarnedPoints >= budget.totalTargetPoints,
    totalEarnedPoints,
    totalTargetPoints: budget.totalTargetPoints,
    eligibleAccountIds,
    ineligibleAccountIds,
  };
}

export function utcWeekKey(atMs: number): string {
  const date = new Date(atMs);
  const utcDay = date.getUTCDay();
  const daysSinceMonday = (utcDay + 6) % 7;
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - daysSinceMonday));
  return monday.toISOString().slice(0, 10);
}

export function isMiniEventActive(window: PartyMiniEventWindow, atMs: number): boolean {
  return atMs >= window.startsAtMs && atMs < window.endsAtMs;
}

export function rankPartyScores(scores: readonly RankedPartyScore[]): RankedPartyScore[] {
  return [...scores].sort((a, b) => {
    if (b.normalizedPoints !== a.normalizedPoints) return b.normalizedPoints - a.normalizedPoints;
    const aDone = a.completedAtMs ?? Number.MAX_SAFE_INTEGER;
    const bDone = b.completedAtMs ?? Number.MAX_SAFE_INTEGER;
    if (aDone !== bDone) return aDone - bDone;
    return a.partyId.localeCompare(b.partyId);
  });
}

export const SAMPLE_WEEKLY_CONTRACTS: readonly PartyContractDefinition[] = [
  {
    id: 'party_weekly_combat_v1',
    version: 1,
    name: 'Hold the Frontier',
    category: 'combat',
    cadence: 'weekly',
    objectives: [
      { id: 'standard_hunts', activityKind: 'combat', metric: 'verified_standard_enemy_kills', targetUnits: 120, expectedSecondsPerUnit: 28, difficulty: 'standard', setupMinutes: 10 },
      { id: 'elite_hunts', activityKind: 'combat', metric: 'verified_elite_kills', targetUnits: 12, expectedSecondsPerUnit: 150, difficulty: 'elite', setupMinutes: 6 },
      { id: 'boss_hunts', activityKind: 'combat', metric: 'verified_regional_boss_kills', targetUnits: 2, expectedSecondsPerUnit: 720, difficulty: 'boss', setupMinutes: 8 },
    ],
  },
  {
    id: 'party_weekly_skilling_v1',
    version: 1,
    name: 'Supply the Roads',
    category: 'skilling',
    cadence: 'weekly',
    objectives: [
      { id: 'gather_materials', activityKind: 'gathering', metric: 'verified_weighted_gather_actions', targetUnits: 160, expectedSecondsPerUnit: 22, difficulty: 'standard', setupMinutes: 8 },
      { id: 'craft_orders', activityKind: 'crafting', metric: 'verified_weighted_crafts', targetUnits: 32, expectedSecondsPerUnit: 55, preparationMinutesPerUnit: 0.8, difficulty: 'hard', setupMinutes: 8 },
    ],
  },
  {
    id: 'party_weekly_mixed_v1',
    version: 1,
    name: 'Guildroad Expedition',
    category: 'mixed',
    cadence: 'weekly',
    objectives: [
      { id: 'mixed_hunts', activityKind: 'combat', metric: 'verified_standard_enemy_kills', targetUnits: 70, expectedSecondsPerUnit: 30, difficulty: 'standard', setupMinutes: 6 },
      { id: 'mixed_gather', activityKind: 'gathering', metric: 'verified_weighted_gather_actions', targetUnits: 90, expectedSecondsPerUnit: 22, difficulty: 'standard', setupMinutes: 5 },
      { id: 'mixed_craft', activityKind: 'crafting', metric: 'verified_weighted_crafts', targetUnits: 16, expectedSecondsPerUnit: 60, preparationMinutesPerUnit: 0.9, difficulty: 'hard', setupMinutes: 5 },
    ],
  },
] as const;

export const SAMPLE_MINI_EVENT_CONTRACTS: readonly PartyContractDefinition[] = [
  {
    id: 'party_event_frontier_rush_v1',
    version: 1,
    name: 'Frontier Rush',
    category: 'mixed',
    cadence: 'mini_event',
    minimumPersonalContributionRate: 0.1,
    objectives: [
      { id: 'rush_elites', activityKind: 'combat', metric: 'verified_elite_kills', targetUnits: 18, expectedSecondsPerUnit: 145, difficulty: 'elite', setupMinutes: 5 },
      { id: 'rush_supplies', activityKind: 'gathering', metric: 'verified_weighted_gather_actions', targetUnits: 100, expectedSecondsPerUnit: 24, difficulty: 'standard', setupMinutes: 4 },
      { id: 'rush_crafts', activityKind: 'crafting', metric: 'verified_weighted_crafts', targetUnits: 20, expectedSecondsPerUnit: 60, preparationMinutesPerUnit: 0.8, difficulty: 'hard', setupMinutes: 4 },
    ],
  },
] as const;
