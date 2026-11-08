/**
 * Hidden Party Events v2: service-only deterministic event/supply blueprint.
 * The input roster and skill levels MUST come from authoritative server state.
 * Do not serialize it to clients or connect it until the private release gate is on.
 */
import {
  buildWeeklyPartySupplyOrders,
  partyEventCadenceAt,
  selectPartyEventVariation,
  weeklyPartyBudget,
  type PartySupplyOrder,
  type ResourceCategory,
  type ResourceTier,
  type WeeklyPartyDifficulty,
  type WeeklyPartyFamily,
} from './weekly-party-events-v2';

export type TrustedGatherSkill = 'woodcutting' | 'mining' | 'herbalism';
export interface TrustedPartyParticipant {
  accountId: string;
  levels: Readonly<Record<TrustedGatherSkill, number>>;
}
export interface TrustedPartyCreationInput {
  partyId: string;
  participants: readonly TrustedPartyParticipant[];
  difficulty: WeeklyPartyDifficulty;
  /** Unpredictable, nonnegative, server-generated seed. */
  seed: number;
  atMs: number;
  /** Must come from the private server-side gate, never from an app request. */
  gateEnabled: boolean;
}
export interface PartyEventBlueprint {
  partyId: string;
  startsAtMs: number;
  endsAtMs: number;
  family: WeeklyPartyFamily;
  variation: string;
  difficulty: WeeklyPartyDifficulty;
  seed: number;
  accountIds: readonly string[];
  orders: readonly PartySupplyOrder[];
  targetPoints: number;
  requiredGatherMinutes: number;
  optionalGatherMinutes: number;
}

interface CanonicalPartySupplyMaterial {
  itemId: string;
  category: ResourceCategory;
  tier: ResourceTier;
  skill: TrustedGatherSkill;
  minLevel: number;
  secondsPerUnit: number;
}

/**
 * Source items and unlock levels checked against Veldryn's HERB_NODES and
 * GATHERING_ACTIVITIES. Durations are approximate effective acquisition rates
 * and MUST be rebalanced before production (drops/speed buffs affect them).
 * Keep aligned with private.party_event_supply_item_policy_v2.
 */
export const PARTY_EVENT_CANONICAL_RESOURCES_V2: readonly CanonicalPartySupplyMaterial[] = [
  { itemId: 'GREENWOOD_LOG', category: 'wood', tier: 'common', skill: 'woodcutting', minLevel: 1, secondsPerUnit: 20 },
  { itemId: 'IRONWOOD_LOG', category: 'wood', tier: 'uncommon', skill: 'woodcutting', minLevel: 7, secondsPerUnit: 32 },
  { itemId: 'CROWNWOOD_LOG', category: 'wood', tier: 'advanced', skill: 'woodcutting', minLevel: 15, secondsPerUnit: 72 },
  { itemId: 'COPPER_ORE', category: 'ore', tier: 'common', skill: 'mining', minLevel: 1, secondsPerUnit: 20 },
  { itemId: 'ASTER_IRON_ORE', category: 'ore', tier: 'uncommon', skill: 'mining', minLevel: 8, secondsPerUnit: 32 },
  { itemId: 'OATHSTONE_ORE', category: 'ore', tier: 'advanced', skill: 'mining', minLevel: 16, secondsPerUnit: 72 },
  { itemId: 'DEWLEAF', category: 'herb', tier: 'common', skill: 'herbalism', minLevel: 1, secondsPerUnit: 30 },
  { itemId: 'RIVER_MINT', category: 'herb', tier: 'common', skill: 'herbalism', minLevel: 8, secondsPerUnit: 40 },
  { itemId: 'IRONBLOOM', category: 'herb', tier: 'uncommon', skill: 'herbalism', minLevel: 18, secondsPerUnit: 50 },
  { itemId: 'CAVELICHEN', category: 'herb', tier: 'uncommon', skill: 'herbalism', minLevel: 30, secondsPerUnit: 60 },
  { itemId: 'CROWN_SAGE', category: 'herb', tier: 'advanced', skill: 'herbalism', minLevel: 45, secondsPerUnit: 70 },
] as const;

export function planServerPartyEvent(input: TrustedPartyCreationInput): PartyEventBlueprint {
  if (!input.gateEnabled) throw new Error('PARTY_WEEKLY_EVENTS_DISABLED');
  if (!input.partyId || !Number.isSafeInteger(input.seed) || input.seed < 0) {
    throw new Error('invalid_party_event_creation');
  }
  const ids = input.participants.map(participant => participant.accountId);
  if (ids.length < 2 || ids.length > 4 || new Set(ids).size !== ids.length || ids.some(id=>!id)) {
    throw new Error('party_event_invalid_roster');
  }
  for (const member of input.participants) {
    if (Object.values(member.levels).some(value=>!Number.isSafeInteger(value) || value < 1)) {
      throw new Error('party_event_invalid_server_skill_snapshot');
    }
  }
  const cadence = partyEventCadenceAt(input.atMs);
  if (!cadence.active) throw new Error('PARTY_EVENT_NOT_SCHEDULED');

  // Every order is gatherable by *all* enrolled members, allowing small parties
  // to supply materials themselves rather than relying on forced market buys.
  const available = PARTY_EVENT_CANONICAL_RESOURCES_V2.map(resource=>({
    itemId: resource.itemId,
    category: resource.category,
    tier: resource.tier,
    secondsPerUnit: resource.secondsPerUnit,
    unlocked: input.participants.every(member => member.levels[resource.skill] >= resource.minLevel),
  }));
  const budget = weeklyPartyBudget(ids.length,input.difficulty);
  const orders = buildWeeklyPartySupplyOrders(cadence.family,budget,available,input.seed);
  return {
    partyId: input.partyId,
    startsAtMs: cadence.eventStartsAtMs,
    endsAtMs: cadence.eventEndsAtMs,
    family: cadence.family,
    variation: selectPartyEventVariation(cadence.family,input.seed),
    difficulty: input.difficulty,
    seed: input.seed,
    accountIds: ids,
    orders,
    targetPoints: budget.progressTarget,
    requiredGatherMinutes: budget.requiredGatherMinutes,
    optionalGatherMinutes: budget.optionalGatherMinutes,
  };
}
