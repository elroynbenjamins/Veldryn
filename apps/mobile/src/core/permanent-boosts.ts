import {BUYABLE_PERMANENT_BOOSTS,SKIN_PERMANENT_BOOSTS,type PermanentBoostDefinition} from '../content/permanent-boosts';
import type {CollectibleTarget} from '../content/collectibles';
import {GameState} from './types';
import {selectedFaithBlessing} from './faith';
import {collectionBonusBreakdown} from './collectibles';

export interface PermanentMultipliers {
  attackMultiplier: number;
  combatSpeedMultiplier: number;
  combatPowerMultiplier: number;
  gatheringSpeedMultiplier: number;
  gatheringYieldMultiplier: number;
  fishingSpeedMultiplier: number;
  herbalismSpeedMultiplier: number;
  cookingSpeedMultiplier: number;
  craftingSpeedMultiplier: number;
  materialPreservationMultiplier: number;
  healingEffectivenessMultiplier: number;
  dungeonRewardMultiplier: number;
  guildContributionMultiplier: number;
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
  gatheringYieldMultiplier: 1,
  fishingSpeedMultiplier: 1,
  herbalismSpeedMultiplier: 1,
  cookingSpeedMultiplier: 1,
  craftingSpeedMultiplier: 1,
  materialPreservationMultiplier: 1,
  healingEffectivenessMultiplier: 1,
  dungeonRewardMultiplier: 1,
  guildContributionMultiplier: 1,
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

function readMultipliers(definitionId:string|undefined,map:Record<string,PermanentBoostDefinition>):PermanentMultipliers {
  if(!definitionId||!map[definitionId])return BASE;
  const d=map[definitionId];
  return {
    attackMultiplier:asMultiplier(d.combatPowerMultiplier),
    combatSpeedMultiplier:asMultiplier(d.combatSpeedMultiplier),
    combatPowerMultiplier:asMultiplier(d.combatPowerMultiplier),
    gatheringSpeedMultiplier:asMultiplier(d.gatheringSpeedMultiplier),
    gatheringYieldMultiplier:asMultiplier(d.gatheringYieldMultiplier),
    fishingSpeedMultiplier:asMultiplier(d.fishingSpeedMultiplier),
    herbalismSpeedMultiplier:asMultiplier(d.herbalismSpeedMultiplier),
    cookingSpeedMultiplier:asMultiplier(d.cookingSpeedMultiplier),
    craftingSpeedMultiplier:asMultiplier(d.craftingSpeedMultiplier),
    materialPreservationMultiplier:asMultiplier(d.materialPreservationMultiplier),
    healingEffectivenessMultiplier:asMultiplier(d.healingEffectivenessMultiplier),
    dungeonRewardMultiplier:asMultiplier(d.dungeonRewardMultiplier),
    guildContributionMultiplier:asMultiplier(d.guildContributionMultiplier),
    incomingDamageMultiplier:asMultiplier(d.incomingDamageMultiplier),
    skillXpMultiplier:asMultiplier(d.skillXpMultiplier),
    characterXpMultiplier:asMultiplier(d.characterXpMultiplier),
    goldMultiplier:asMultiplier(d.goldMultiplier),
    dropChanceMultiplier:asMultiplier(d.dropChanceMultiplier),
  };
}

function merge(base:PermanentMultipliers,incoming:PermanentMultipliers):PermanentMultipliers {
  return {
    attackMultiplier:multiply(base.attackMultiplier,incoming.attackMultiplier),
    combatSpeedMultiplier:multiply(base.combatSpeedMultiplier,incoming.combatSpeedMultiplier),
    combatPowerMultiplier:multiply(base.combatPowerMultiplier,incoming.combatPowerMultiplier),
    gatheringSpeedMultiplier:multiply(base.gatheringSpeedMultiplier,incoming.gatheringSpeedMultiplier),
    gatheringYieldMultiplier:multiply(base.gatheringYieldMultiplier,incoming.gatheringYieldMultiplier),
    fishingSpeedMultiplier:multiply(base.fishingSpeedMultiplier,incoming.fishingSpeedMultiplier),
    herbalismSpeedMultiplier:multiply(base.herbalismSpeedMultiplier,incoming.herbalismSpeedMultiplier),
    cookingSpeedMultiplier:multiply(base.cookingSpeedMultiplier,incoming.cookingSpeedMultiplier),
    craftingSpeedMultiplier:multiply(base.craftingSpeedMultiplier,incoming.craftingSpeedMultiplier),
    materialPreservationMultiplier:multiply(base.materialPreservationMultiplier,incoming.materialPreservationMultiplier),
    healingEffectivenessMultiplier:multiply(base.healingEffectivenessMultiplier,incoming.healingEffectivenessMultiplier),
    dungeonRewardMultiplier:multiply(base.dungeonRewardMultiplier,incoming.dungeonRewardMultiplier),
    guildContributionMultiplier:multiply(base.guildContributionMultiplier,incoming.guildContributionMultiplier),
    incomingDamageMultiplier:multiply(base.incomingDamageMultiplier,incoming.incomingDamageMultiplier),
    skillXpMultiplier:multiply(base.skillXpMultiplier,incoming.skillXpMultiplier),
    characterXpMultiplier:multiply(base.characterXpMultiplier,incoming.characterXpMultiplier),
    goldMultiplier:multiply(base.goldMultiplier,incoming.goldMultiplier),
    dropChanceMultiplier:multiply(base.dropChanceMultiplier,incoming.dropChanceMultiplier),
  };
}

function collectibleTargetMultipliers(target:CollectibleTarget,appliedBps:number):PermanentMultipliers{
  const amount=normalizeMultiplier(1+Math.max(0,appliedBps)/10000),out={...BASE};
  switch(target){
    case 'attack':out.combatPowerMultiplier=amount;break;
    case 'defense':
    case 'hp':out.incomingDamageMultiplier=normalizeMultiplier(2-amount);break;
    case 'skillXp':out.skillXpMultiplier=amount;break;
    case 'characterXp':out.characterXpMultiplier=amount;break;
    case 'gold':out.goldMultiplier=amount;break;
    case 'dropChance':out.dropChanceMultiplier=amount;break;
    case 'actionSpeed':out.combatSpeedMultiplier=amount;out.gatheringSpeedMultiplier=amount;break;
    case 'gatheringYield':out.gatheringYieldMultiplier=amount;break;
    case 'fishingSpeed':out.fishingSpeedMultiplier=amount;break;
    case 'herbalismSpeed':out.herbalismSpeedMultiplier=amount;break;
    case 'cookingSpeed':out.cookingSpeedMultiplier=amount;break;
    case 'craftingSpeed':out.craftingSpeedMultiplier=amount;break;
    case 'materialPreservation':out.materialPreservationMultiplier=amount;break;
    case 'healingEffectiveness':out.healingEffectivenessMultiplier=amount;break;
    case 'dungeonReward':out.dungeonRewardMultiplier=amount;break;
    case 'guildContribution':out.guildContributionMultiplier=amount;break;
  }
  return out;
}

export function characterPermanentMultipliers(state:GameState):PermanentMultipliers {
  let result={...BASE};
  const c=state.character;
  if(!c)return result;

  const blessing=selectedFaithBlessing(state);
  if(blessing){
    if(blessing.family==='attack')result=merge(result,{...BASE,attackMultiplier:1+blessing.bonus,combatPowerMultiplier:1+blessing.bonus});
    if(blessing.family==='defense')result=merge(result,{...BASE,incomingDamageMultiplier:1-blessing.bonus});
    if(blessing.family==='hp')result=merge(result,{...BASE,characterXpMultiplier:1,combatPowerMultiplier:1+blessing.bonus*.25});
  }

  for(const skinId of new Set(c.unlockedSkinIds??[])){
    if(SKIN_PERMANENT_BOOSTS[skinId])result=merge(result,readMultipliers(skinId,SKIN_PERMANENT_BOOSTS));
  }

  // One source of truth for pets/backgrounds/borders. This is the same capped
  // +0.50% owned passive + selected active math shown by the collection UI.
  for(const row of collectionBonusBreakdown(state)){
    if(row.appliedBps>0)result=merge(result,collectibleTargetMultipliers(row.target,row.appliedBps));
  }

  for(const boostId of new Set(c.ownedBoostIds??[])){
    if(BUYABLE_PERMANENT_BOOSTS[boostId])result=merge(result,readMultipliers(boostId,BUYABLE_PERMANENT_BOOSTS));
  }

  return result;
}

export const BASE_PERMANENT_MULTIPLIERS=BASE;
/** @deprecated Runtime collection bonuses now use exact basis-point math. */
export const PASSIVE_PET_COLLECTION_SHARE=0.25;
