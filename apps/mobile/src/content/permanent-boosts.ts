import {COLLECTIBLES} from './collectibles';

export interface PermanentBoostDefinition {
  id: string;
  name: string;
  combatSpeedMultiplier?: number;
  combatPowerMultiplier?: number;
  gatheringSpeedMultiplier?: number;
  gatheringYieldMultiplier?: number;
  fishingSpeedMultiplier?: number;
  herbalismSpeedMultiplier?: number;
  cookingSpeedMultiplier?: number;
  craftingSpeedMultiplier?: number;
  materialPreservationMultiplier?: number;
  healingEffectivenessMultiplier?: number;
  dungeonRewardMultiplier?: number;
  guildContributionMultiplier?: number;
  incomingDamageMultiplier?: number;
  skillXpMultiplier?: number;
  characterXpMultiplier?: number;
  goldMultiplier?: number;
  dropChanceMultiplier?: number;
}

type SourceBoostId = string;

// V33 skins start as fresh full-character renders. No equipment skin is
// gameplay-active until its male and female mannequin variants are approved.
export const SKIN_PERMANENT_BOOSTS: Record<SourceBoostId, PermanentBoostDefinition> = {
  starting: {
    id: 'starting', name: 'Campaign skin', combatSpeedMultiplier: 1,
    combatPowerMultiplier: 1, gatheringSpeedMultiplier: 1, gatheringYieldMultiplier:1,
    characterXpMultiplier: 1, skillXpMultiplier: 1, goldMultiplier: 1,
    dropChanceMultiplier: 1, incomingDamageMultiplier: 1,
  },
};

const petBoostFor=(pet:{id:string;name:string;target:string;activeBps:number}):PermanentBoostDefinition=>{
  const amount=1+pet.activeBps/10000;
  const base={id:pet.id,name:pet.name};
  switch(pet.target){
    case 'attack': return {...base,combatPowerMultiplier:amount};
    case 'defense':
    case 'hp': return {...base,incomingDamageMultiplier:2-amount};
    case 'skillXp': return {...base,skillXpMultiplier:amount};
    case 'characterXp': return {...base,characterXpMultiplier:amount};
    case 'gold': return {...base,goldMultiplier:amount};
    case 'dropChance': return {...base,dropChanceMultiplier:amount};
    case 'dungeonReward': return {...base,dungeonRewardMultiplier:amount};
    case 'actionSpeed': return {...base,combatSpeedMultiplier:amount,gatheringSpeedMultiplier:amount};
    case 'gatheringYield': return {...base,gatheringYieldMultiplier:amount};
    case 'fishingSpeed': return {...base,fishingSpeedMultiplier:amount};
    case 'herbalismSpeed': return {...base,herbalismSpeedMultiplier:amount};
    case 'cookingSpeed': return {...base,cookingSpeedMultiplier:amount};
    case 'craftingSpeed': return {...base,craftingSpeedMultiplier:amount};
    case 'materialPreservation': return {...base,materialPreservationMultiplier:amount};
    case 'healingEffectiveness': return {...base,healingEffectivenessMultiplier:amount};
    case 'guildContribution': return {...base,guildContributionMultiplier:amount};
    default: return base;
  }
};

/**
 * Catalog mirror kept for diagnostics/tests. Runtime collection math is applied
 * from collectionBonusBreakdown(), so every pet always gets exactly +0.50%
 * owned passive plus its authored selected bonus rather than a percentage of
 * the active value.
 */
export const PET_PERMANENT_BOOSTS:Record<SourceBoostId,PermanentBoostDefinition>=Object.fromEntries(
  COLLECTIBLES.filter(row=>row.kind==='pet').map(pet=>[pet.id,petBoostFor(pet)])
);

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
