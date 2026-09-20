import type {CombatCompanionRarity,CompanionDefinition} from './combat-companion-types';
import {COMPANION_BOND_CONFIG,COMPANION_RARITY_CONFIG} from '../content/combat-companions';
import {companionAscensionCost,companionLevelCost,companionXpToNextLevel} from './combat-companions';
import {COMPANION_MONTHLY_COMPLETION_REWARD,COMPANION_TRIAL_FLOOR_COUNT,COMPANION_WEEKLY_CHALLENGES,companionTrialReward} from '../../../../backend/src/server/companions/content';

export const COMPANION_ECONOMY_TARGETS={
  focusedNaturalXpPerDay:900,
  bond10Xp:COMPANION_BOND_CONFIG.xpThresholds[9],
  monthlyChallengeBondstones:1,
  focusedNaturalDaysByRarity:{
    standard:[6,10],
    rare:[14,22],
    elite:[32,48],
    prestige:[70,100],
  } as const,
} as const;

const requiredTiers:Record<CombatCompanionRarity,readonly (1|2|3|'mastery')[]>={
  standard:[1,2],
  rare:[1,2],
  elite:[1,2,3],
  prestige:[1,2,3,'mastery'],
};

export function fullMonthlyTrialEconomy(){
  let companionEssence=COMPANION_MONTHLY_COMPLETION_REWARD.companionEssence,gold=COMPANION_MONTHLY_COMPLETION_REWARD.gold,bondstones=COMPANION_MONTHLY_COMPLETION_REWARD.bondstones;
  const materials:Record<string,number>={...COMPANION_MONTHLY_COMPLETION_REWARD.materials};
  for(let floor=1;floor<=COMPANION_TRIAL_FLOOR_COUNT;floor++){
    const reward=companionTrialReward(floor,true,floor%5===0);
    companionEssence+=reward.companionEssence;gold+=reward.gold;bondstones+=reward.bondstones;
    for(const [id,quantity] of Object.entries(reward.materials))materials[id]=(materials[id]??0)+quantity;
  }
  return {companionEssence,gold,bondstones,materials};
}

export function monthlyChallengeBondstoneBudget(){
  const monthlyIds=new Set<string>();
  for(const month of ['2026-09','2026-10','2026-11']){
    // The three launch rotations are the economy guardrail for recurring monthly challenge rewards.
    const ids=month==='2026-09'?['NO_PRESTIGE_15','SUNSCAR_PAIR','WORLDLY_TRIO']:month==='2026-10'?['STANDARD_BOSS','FROSTMARCH_PAIR','FLAWLESS_15']:['RARITY_SPECTRUM','ASHLANDS_PAIR','UNDER_POWER_20'];
    ids.forEach(id=>monthlyIds.add(id));
  }
  return Math.max(0,...[...monthlyIds].map(id=>COMPANION_WEEKLY_CHALLENGES.find(row=>row.id===id)?.rewards.bondstones??0));
}

export function companionProgressionBudget(def:CompanionDefinition){
  const maxLevel=COMPANION_RARITY_CONFIG[def.rarity].maxLevel;
  let naturalXpToMax=0,acceleratedTrainingGold=0,acceleratedTrainingEssence=0;
  for(let level=1;level<maxLevel;level++){
    naturalXpToMax+=companionXpToNextLevel(def.rarity,level);
    const cost=companionLevelCost(def.rarity,level);
    acceleratedTrainingGold+=cost.gold;acceleratedTrainingEssence+=cost.companionEssence;
  }
  let ascensionGold=0,ascensionEssence=0,bondstones=0;
  const materials:Record<string,number>={};
  const stages=requiredTiers[def.rarity].map(tier=>{
    const cost=companionAscensionCost(def,tier);
    ascensionGold+=cost.gold;ascensionEssence+=cost.companionEssence;bondstones+=cost.bondstones;
    if(cost.materialId&&cost.materialQuantity)materials[cost.materialId]=(materials[cost.materialId]??0)+cost.materialQuantity;
    return {tier,cost};
  });
  return {
    rarity:def.rarity,maxLevel,naturalXpToMax,
    focusedNaturalDaysToMax:Math.ceil(naturalXpToMax/COMPANION_ECONOMY_TARGETS.focusedNaturalXpPerDay),
    bond10Xp:COMPANION_ECONOMY_TARGETS.bond10Xp,
    acceleratedTraining:{gold:acceleratedTrainingGold,companionEssence:acceleratedTrainingEssence},
    ascension:{gold:ascensionGold,companionEssence:ascensionEssence,bondstones,materials,stages},
    fullPaidPath:{gold:acceleratedTrainingGold+ascensionGold,companionEssence:acceleratedTrainingEssence+ascensionEssence,bondstones},
  };
}
