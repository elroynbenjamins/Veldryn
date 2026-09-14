import {BUYABLE_PERMANENT_BOOSTS, PET_PERMANENT_BOOSTS, SKIN_PERMANENT_BOOSTS} from '../content/permanent-boosts';
import {GameState} from './types';
import {selectedFaithBlessing} from './faith';

export interface PermanentMultipliers {
  attackMultiplier: number;
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
  attackMultiplier: 1,
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
    attackMultiplier: asMultiplier(d.combatPowerMultiplier),
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
    attackMultiplier: multiply(base.attackMultiplier,incoming.attackMultiplier),
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

  const blessing=selectedFaithBlessing(state);
  if(blessing){
    if(blessing.family==='attack')result=merge(result,{...BASE,attackMultiplier:1+blessing.bonus,combatPowerMultiplier:1+blessing.bonus});
    if(blessing.family==='defense')result=merge(result,{...BASE,incomingDamageMultiplier:1-blessing.bonus});
    if(blessing.family==='hp')result=merge(result,{...BASE,characterXpMultiplier:1,combatPowerMultiplier:1+blessing.bonus*.25});
  }

  for (const skinId of new Set(c.unlockedSkinIds ?? [])) {
    if (SKIN_PERMANENT_BOOSTS[skinId]) result = merge(result, readMultipliers(skinId, SKIN_PERMANENT_BOOSTS));
  }

  for (const petId of new Set([...(c.ownedPetIds ?? []),...(state.account.unlockedCosmeticPetIds ?? [])])) {
    if (PET_PERMANENT_BOOSTS[petId]) {
      const full = readMultipliers(petId, PET_PERMANENT_BOOSTS);
      const share = petId === c.selectedCosmeticPetId ? 1 : PASSIVE_PET_COLLECTION_SHARE;
      const scaled = Object.fromEntries(Object.entries(full).map(([key,value])=>[key,1+(value-1)*share])) as unknown as PermanentMultipliers;
      result = merge(result, scaled);
    }
  }

  for (const boostId of new Set(c.ownedBoostIds ?? [])) {
    if (BUYABLE_PERMANENT_BOOSTS[boostId]) result = merge(result, readMultipliers(boostId, BUYABLE_PERMANENT_BOOSTS));
  }

  return result;
}

export const BASE_PERMANENT_MULTIPLIERS = BASE;
/** All owned pets contribute; the displayed pet contributes its full perk. */
export const PASSIVE_PET_COLLECTION_SHARE = 0.25;
