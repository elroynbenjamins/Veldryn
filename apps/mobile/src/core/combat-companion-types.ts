/**
 * Active Combat Companion / Combat Unit model.
 *
 * This is intentionally separate from the passive collectible Pet system.
 * Definitions are static content; OwnedCompanionProgress is account save data.
 */
export type CombatCompanionRole='damage'|'tank'|'support';
export type CombatCompanionRarity='standard'|'rare'|'elite'|'prestige';
export type CompanionOriginType='region'|'story'|'achievement'|'event'|'raid'|'meta';
export type CompanionUnlockRequirementType='quest'|'achievement'|'boss_kills'|'dungeon_clears'|'monster_mastery'|'skill_level'|'reputation'|'collection'|'event_currency'|'event_challenge'|'meta';
export type CompanionEffectKind='damage'|'damage_reduction'|'shield'|'haste'|'resource_restore'|'defense_shred'|'interrupt'|'execute'|'accuracy'|'cleanse'|'cooldown_reduction'|'armor_pierce'|'chain_damage'|'utility';
export type CompanionBondSource='battle'|'boss'|'dungeon'|'companion_objective'|'future_activity';
export type CompanionSanctuaryUpgrade='trainingGround'|'essenceBasin'|'bondHall'|'expeditionPens'|'masteryChamber';
export type CompanionAvailabilityStatus='available'|'equipped'|'expedition'|'active_trial'|'locked'|'unavailable';
export type VeldrynClassId='IRONWARDEN'|'BASTION'|'DREADGUARD'|'DAWNKEEPER'|'WAYFINDER'|'RAVAGER'|'HEXWEAVER'|'KNIFE_DANCER'|'STONECALLER';

export interface CompanionUnlockRequirement{
  type:CompanionUnlockRequirementType;
  target?:string;
  amount?:number;
  value?:string|number|boolean;
  originId?:string;
  description:string;
}
export interface CompanionOrigin{
  type:CompanionOriginType;
  id:string;
  name:string;
}
export interface CompanionAvailability{
  eventSource?:string;
  originalReleaseYear?:number;
  recurringAvailability?:'annual'|'seasonal'|'permanent'|'manual';
  veteranCosmeticEligibility?:boolean;
}
export interface CompanionEffectDefinition{
  kind:CompanionEffectKind;
  value:number;
  secondaryValue?:number;
  condition?:string;
  durationSeconds?:number;
  cap?:number;
  description:string;
}
export interface CompanionAbilityScaling{
  /** Ability coefficient/value at level 1. */
  baseValue:number;
  /** Linear addition per companion level. The final resolver applies explicit caps. */
  perLevel:number;
  maxValue?:number;
  /** Optional additional effect unlocked by Ascension tier. */
  ascensionEffects?:Partial<Record<1|2|3,CompanionEffectDefinition>>;
}
export interface CompanionAbilityDefinition{
  id:string;
  name:string;
  description:string;
  cooldownSeconds:number;
  target:string;
  effect:CompanionEffectDefinition;
  scaling:CompanionAbilityScaling;
}
export interface CompanionBondTraitDefinition{
  id:string;
  name:string;
  description:string;
  effect:CompanionEffectDefinition;
}
export interface CompanionAscensionMaterialCost{
  tier:1|2|3|'mastery';
  itemId:string;
  quantity:number;
}
export interface CompanionDefinition{
  id:string;
  name:string;
  description:string;
  archetype:string;
  role:CombatCompanionRole;
  rarity:CombatCompanionRarity;
  origin:CompanionOrigin;
  unlockRequirements:CompanionUnlockRequirement[];
  baseStats:{hp:number;power:number;defense:number;attackSpeed:number};
  activeAbility:CompanionAbilityDefinition;
  passiveAbility:CompanionEffectDefinition;
  bondTrait:CompanionBondTraitDefinition;
  ascensionMaterialId?:string;
  ascensionMaterialCosts?:CompanionAscensionMaterialCost[];
  availability?:CompanionAvailability;
  visual?:{portraitId?:string;pixelSize?:string;rarityFrameKey?:string;rarityIcon?:string;rarityLabel?:string;accessibilityLabel?:string;summonEffect?:string;idleEffect?:string;profileFrame?:string;masteryMarker?:string;nameplateTreatment?:string;animationRef?:string;reducedMotionFallback?:string};
}
export interface OwnedCompanionProgress{
  level:number;
  xp:number;
  ascensionTier:0|1|2|3;
  bondLevel:number;
  bondXp:number;
  bondTraitUnlocked:boolean;
  mastered?:boolean;
  obtainedAtMs?:number;
  originalEventReleaseYear?:number;
  veteranCosmeticEligible?:boolean;
  selectedTechniqueId?:string;
}
export interface CompanionSanctuaryState{
  trainingGroundLevel:number;
  essenceBasinLevel:number;
  bondHallLevel:number;
  expeditionPensLevel:number;
  masteryChamberLevel:number;
  lastTrainingClaimAtMs?:number;
  lastEssenceClaimAtMs?:number;
}
export interface CompanionLevelCost{gold:number;companionEssence:number;}
export interface CompanionAscensionCost extends CompanionLevelCost{bondstones:number;materialId?:string;materialQuantity?:number;}
export interface CompanionCombatContribution{
  /** Multiplier applied to owner encounter output/speed; not to raw player stats. */
  outputMultiplier:number;
  /** Multiplier applied to incoming encounter damage. */
  incomingDamageMultiplier:number;
  /** Multiplier applied to between-encounter recovery. */
  recoveryMultiplier:number;
  /** Informational contribution budget used by combat/UI tests. */
  contributionPct:number;
}


/** Cached server projections for Phase 2/3. They are never reward authority on the client. */
export interface CompanionTrialClientProjection{
  seasonKey:string;title:string;serverNow:string;endsAt:string;notice:string;currentFloor:number;checkpointFloor:number;currentSeasonHighestFloor:number;lifetimeHighestFloor:number;activeRunId?:string;teamPower?:number;
}
export interface CompanionAssignmentClientProjection{assignmentId:string;missionId:string;companionIds:string[];startedAt:string;endsAt:string;status:'active'|'completed'|'claimed'|'cancelled';performanceGrade?:'C'|'B'|'A'|'S';}
export interface CompanionPhase2ProfileState{favoriteCompanionId?:string;showcaseCompanionIds:string[];showcaseSlotsUnlocked?:number;discoveredCompanionIds?:string[];claimedCodexMilestoneIds?:string[];codexRewardIds?:string[];bestCompanionTeamPower?:number;highestCompanionTrialFloor?:number;}
export interface CompanionProvingGroundClientProjection{weekKey:string;serverNow:string;challengeIds:string[];progress:Record<string,number>;completedIds:string[];claimedIds:string[];}
export interface CompanionCodexClientSummary{totalOwned:number;byRarity:Record<CombatCompanionRarity,number>;byOrigin:Record<string,number>;maxLevelCount:number;bond10Count:number;masteredCount:number;eventCompanionCount:number;trialBossCompanionCount:number;originsOwned:number;}
export interface CompanionCodexClientProjection{summary:CompanionCodexClientSummary;milestones:Array<{id:string;name:string;description:string;reward:{companionEssence:number;rewardIds:string[];showcaseSlots?:number};complete:boolean;claimed:boolean}>;favoriteCompanionId?:string;showcaseCompanionIds:string[];showcaseSlotsUnlocked:number;}
export interface CompanionOverflowConversionState{weekKey:string;essenceConvertedThisWeek:number;}
