export interface PermanentBoostDefinition {
  id: string;
  name: string;
  combatSpeedMultiplier?: number;
  combatPowerMultiplier?: number;
  gatheringSpeedMultiplier?: number;
  incomingDamageMultiplier?: number;
  skillXpMultiplier?: number;
  characterXpMultiplier?: number;
  goldMultiplier?: number;
  dropChanceMultiplier?: number;
}

type SourceBoostId = string;

import {EQUIPMENT_SETS} from './equipment-sets';
import {equipmentSetSkinId} from '../core/character-skins';

function buildTieredSkinBoosts() {
  const boosts: Record<SourceBoostId, PermanentBoostDefinition> = {
    starting: {
      id: 'starting',
      name: 'Campaign skin',
      combatSpeedMultiplier: 1,
      combatPowerMultiplier: 1,
      gatheringSpeedMultiplier: 1,
      characterXpMultiplier: 1,
      skillXpMultiplier: 1,
      goldMultiplier: 1,
      dropChanceMultiplier: 1,
      incomingDamageMultiplier: 1,
    },
  };

  for (const set of EQUIPMENT_SETS) {
    const skinId = equipmentSetSkinId(set.id);
    const isLegendary = set.id.startsWith('SUNSCORED_');
    const isPrimal = set.id === 'rimewall_oath';
    boosts[skinId] = isPrimal
      ? {
          id: skinId,
          name: `${set.name} skin`,
          combatSpeedMultiplier: 1.06,
          combatPowerMultiplier: 1.05,
          gatheringSpeedMultiplier: 1.025,
          incomingDamageMultiplier: 0.97,
          skillXpMultiplier: 1.045,
          characterXpMultiplier: 1.035,
          goldMultiplier: 1.025,
          dropChanceMultiplier: 1.05,
        }
      : isLegendary
        ? {
            id: skinId,
            name: `${set.name} skin`,
            combatSpeedMultiplier: 1.045,
            combatPowerMultiplier: 1.035,
            gatheringSpeedMultiplier: 1.02,
            skillXpMultiplier: 1.03,
            characterXpMultiplier: 1.03,
            goldMultiplier: 1.025,
            dropChanceMultiplier: 1.03,
            incomingDamageMultiplier: 0.985,
          }
        : {
            id: skinId,
            name: `${set.name} skin`,
            combatSpeedMultiplier: 1.025,
            combatPowerMultiplier: 1.02,
            gatheringSpeedMultiplier: 1.01,
            skillXpMultiplier: 1.015,
            characterXpMultiplier: 1.012,
            goldMultiplier: 1.012,
            dropChanceMultiplier: 1.012,
            incomingDamageMultiplier: 0.995,
          };
  }

  return boosts;
}

export const SKIN_PERMANENT_BOOSTS = buildTieredSkinBoosts();

export const PET_PERMANENT_BOOSTS: Record<SourceBoostId, PermanentBoostDefinition> = {
  'pet_harvest_fox': {
    id: 'pet_harvest_fox',
    name: 'Harvest Fox',
    combatSpeedMultiplier: 1.025,
    combatPowerMultiplier: 1.02,
    gatheringSpeedMultiplier: 1.045,
    incomingDamageMultiplier: 0.985,
    skillXpMultiplier: 1.02,
    characterXpMultiplier: 1.015,
    goldMultiplier: 1.02,
    dropChanceMultiplier: 1.025,
  },
  'pet_field_mouse': {
    id: 'pet_field_mouse',
    name: 'Field Mouse',
    combatSpeedMultiplier: 1.02,
    combatPowerMultiplier: 1.01,
    gatheringSpeedMultiplier: 1.05,
    incomingDamageMultiplier: 1,
    skillXpMultiplier: 1.025,
    characterXpMultiplier: 1.02,
    goldMultiplier: 1,
    dropChanceMultiplier: 1.02,
  },
  'pet_amber_owl': {
    id: 'pet_amber_owl',
    name: 'Amber Owl',
    combatSpeedMultiplier: 1.035,
    combatPowerMultiplier: 1.03,
    incomingDamageMultiplier: 0.98,
    skillXpMultiplier: 1.02,
    characterXpMultiplier: 1.015,
    gatheringSpeedMultiplier: 1.02,
    goldMultiplier: 1.035,
    dropChanceMultiplier: 1.04,
  },
  'pet:feral_rat': {
    id: 'pet:feral_rat',
    name: 'Feral Rat',
    combatSpeedMultiplier: 1.03,
    combatPowerMultiplier: 1.02,
    gatheringSpeedMultiplier: 1.06,
    incomingDamageMultiplier: 0.985,
    skillXpMultiplier: 1.02,
    characterXpMultiplier: 1.02,
    goldMultiplier: 1,
    dropChanceMultiplier: 1.015,
  },
  'pet:emberhound': {
    id: 'pet:emberhound',
    name: 'Emberhound',
    combatSpeedMultiplier: 1.04,
    combatPowerMultiplier: 1.03,
    incomingDamageMultiplier: 0.98,
    skillXpMultiplier: 1,
    characterXpMultiplier: 1,
    gatheringSpeedMultiplier: 1.01,
    goldMultiplier: 1,
    dropChanceMultiplier: 1.03,
  },
  'pet:forgebound_mooncat': {
    id: 'pet:forgebound_mooncat',
    name: 'Forgebound Mooncat',
    combatPowerMultiplier: 1.05,
    incomingDamageMultiplier: 0.98,
    skillXpMultiplier: 1.015,
    gatheringSpeedMultiplier: 1.02,
    characterXpMultiplier: 1.015,
    goldMultiplier: 1.02,
    dropChanceMultiplier: 1.02,
  },
};

export const BUYABLE_PERMANENT_BOOSTS: Record<SourceBoostId, PermanentBoostDefinition> = {
  'boost:combat_focus': {
    id: 'boost:combat_focus',
    name: 'Combat Focus Sigil',
    combatSpeedMultiplier: 1.08,
    combatPowerMultiplier: 1.06,
    incomingDamageMultiplier: 0.99,
    skillXpMultiplier: 1,
    characterXpMultiplier: 1,
    goldMultiplier: 1.02,
    dropChanceMultiplier: 1.02,
  },
  'boost:craftsman_charm': {
    id: 'boost:craftsman_charm',
    name: 'Craftsman Charm',
    combatSpeedMultiplier: 1,
    combatPowerMultiplier: 1,
    gatheringSpeedMultiplier: 1.06,
    skillXpMultiplier: 1.08,
    characterXpMultiplier: 1,
    goldMultiplier: 1.03,
    dropChanceMultiplier: 1.01,
    incomingDamageMultiplier: 1,
  },
  'boost:prospector_ledger': {
    id: 'boost:prospector_ledger',
    name: 'Prospector Ledger',
    gatheringSpeedMultiplier: 1.08,
    characterXpMultiplier: 1,
    skillXpMultiplier: 1.04,
    goldMultiplier: 1.06,
    dropChanceMultiplier: 1.05,
    combatSpeedMultiplier: 1,
    combatPowerMultiplier: 1,
    incomingDamageMultiplier: 1,
  },
  'boost:wardcaller_banner': {
    id: 'boost:wardcaller_banner',
    name: 'Wardcaller Banner',
    characterXpMultiplier: 1.06,
    combatSpeedMultiplier: 1.02,
    combatPowerMultiplier: 1.02,
    incomingDamageMultiplier: 0.985,
    gatheringSpeedMultiplier: 1.03,
    skillXpMultiplier: 1.02,
    goldMultiplier: 1.025,
    dropChanceMultiplier: 1.02,
  },
};

export const PERMANENT_BOOSTS_BASE: Record<string, PermanentBoostDefinition> = {
  none: {id: 'none', name: 'No permanent boosts'},
  ...SKIN_PERMANENT_BOOSTS,
  ...PET_PERMANENT_BOOSTS,
  ...BUYABLE_PERMANENT_BOOSTS,
};
