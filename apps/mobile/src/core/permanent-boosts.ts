import {BUYABLE_PERMANENT_BOOSTS, PET_PERMANENT_BOOSTS, SKIN_PERMANENT_BOOSTS} from '../content/permanent-boosts';
import {GameState} from './types';

export interface PermanentMultipliers {
  combatSpeedMultiplier: number;
  combatPowerMultiplier: number;
  gatheringSpeedMultiplier: number;
  incomingDamageMultiplier: number;
  skillXpMultiplier: number;
  characterXpMultiplier: number;
  goldMultiplier: number;
  dropChanceMultiplier: number;
}

const BASE: PermanentMultipliers = {
  combatSpeedMultiplier: 1,
  combatPowerMultiplier: 1,
  gatheringSpeedMultiplier: 1,
  incomingDamageMultiplier: 1,
  skillXpMultiplier: 1,
  characterXpMultiplier: 1,
  goldMultiplier: 1,
  dropChanceMultiplier: 1,
};

function normalizeMultiplier(value: number) {
  if (!Number.isFinite(value)) return 1;
  if (value < 0.75) return 0.75;
  if (value > 2) return 2;
  return value;
}

function asMultiplier(value: number | undefined) {
  return normalizeMultiplier(value ?? 1);
}

function multiply(base: number, value: number) {
  return normalizeMultiplier(base * value);
}

function readMultipliers(
  definitionId: string | undefined,
  map: Record<string, {combatSpeedMultiplier?: number; combatPowerMultiplier?: number; gatheringSpeedMultiplier?: number; incomingDamageMultiplier?: number; skillXpMultiplier?: number; characterXpMultiplier?: number; goldMultiplier?: number; dropChanceMultiplier?: number}>,
) {
  if (!definitionId || !map[definitionId]) return BASE;
  const d = map[definitionId];
  return {
    combatSpeedMultiplier: asMultiplier(d.combatSpeedMultiplier),
    combatPowerMultiplier: asMultiplier(d.combatPowerMultiplier),
    gatheringSpeedMultiplier: asMultiplier(d.gatheringSpeedMultiplier),
    incomingDamageMultiplier: asMultiplier(d.incomingDamageMultiplier),
    skillXpMultiplier: asMultiplier(d.skillXpMultiplier),
    characterXpMultiplier: asMultiplier(d.characterXpMultiplier),
    goldMultiplier: asMultiplier(d.goldMultiplier),
    dropChanceMultiplier: asMultiplier(d.dropChanceMultiplier),
  };
}

function merge(base: PermanentMultipliers, incoming: PermanentMultipliers): PermanentMultipliers {
  return {
    combatSpeedMultiplier: multiply(base.combatSpeedMultiplier, incoming.combatSpeedMultiplier),
    combatPowerMultiplier: multiply(base.combatPowerMultiplier, incoming.combatPowerMultiplier),
    gatheringSpeedMultiplier: multiply(base.gatheringSpeedMultiplier, incoming.gatheringSpeedMultiplier),
    incomingDamageMultiplier: multiply(base.incomingDamageMultiplier, incoming.incomingDamageMultiplier),
    skillXpMultiplier: multiply(base.skillXpMultiplier, incoming.skillXpMultiplier),
    characterXpMultiplier: multiply(base.characterXpMultiplier, incoming.characterXpMultiplier),
    goldMultiplier: multiply(base.goldMultiplier, incoming.goldMultiplier),
    dropChanceMultiplier: multiply(base.dropChanceMultiplier, incoming.dropChanceMultiplier),
  };
}

export function characterPermanentMultipliers(state: GameState): PermanentMultipliers {
  let result = {...BASE};
  const c = state.character;
  if (!c) return result;

  for (const skinId of new Set(c.unlockedSkinIds ?? [])) {
    if (SKIN_PERMANENT_BOOSTS[skinId]) result = merge(result, readMultipliers(skinId, SKIN_PERMANENT_BOOSTS));
  }

  for (const petId of new Set(c.ownedPetIds ?? [])) {
    if (PET_PERMANENT_BOOSTS[petId]) result = merge(result, readMultipliers(petId, PET_PERMANENT_BOOSTS));
  }

  for (const boostId of new Set(c.ownedBoostIds ?? [])) {
    if (BUYABLE_PERMANENT_BOOSTS[boostId]) result = merge(result, readMultipliers(boostId, BUYABLE_PERMANENT_BOOSTS));
  }

  return result;
}

export const BASE_PERMANENT_MULTIPLIERS = BASE;
