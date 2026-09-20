import type {CompanionRarity,CompanionRole} from './policy';

export type CompanionCombatContext='character_assist'|'companion_trial'|'companion_roguelite'|'companion_arena';
export type CompanionOriginId='REG_001'|'REG_SUNSCAR'|'REG_FROSTMARCH'|'REG_ASHLANDS'|string;
export type CompanionTargetRule='owner'|'self'|'lowest_hp_ally'|'current_target'|'all_allies'|'all_enemies'|'random_enemy';
export type EngineTargetRule='self'|'current_target'|'lowest_hp_ally'|'all_allies'|'all_enemies'|'random_enemy';
export type EngineEffectKind='damage'|'heal'|'shield'|'dot'|'hot'|'interrupt'|'taunt'|'buff'|'debuff';
export type CompanionAvailabilityStatus='available'|'equipped'|'expedition'|'active_trial'|'locked'|'unavailable';

export interface CompanionContextTargeting{assistTarget:CompanionTargetRule;standaloneTarget:CompanionTargetRule;}
export interface CompanionCombatAbilityDefinition{
  id:string;name:string;cooldownMs:number;baseCoeff:number;perLevelCoeff:number;effectKind:'damage'|'shield'|'heal'|'utility'|'interrupt'|'mitigation';
  targeting:CompanionContextTargeting;condition?:string;
}
export interface CompanionVisualMetadata{
  rarityFrame?:string;summonEffect?:string;idleEffect?:string;profileFrame?:string;masteryMarker?:string;nameplateTreatment?:string;animationRef?:string;
  rarityIcon:string;rarityLabel:string;accessibilityLabel:string;reducedMotionFallback?:string;
}
export interface CompanionIdentityModifiers{
  basicDamageMultiplier?:number;defenseMultiplier?:number;hasteBonus?:number;activeDamageMultiplier?:number;activeHealMultiplier?:number;activeShieldMultiplier?:number;activeCooldownMultiplier?:number;activeReflectPct?:number;activeExecuteBonus?:number;mitigationMultiplier?:number;utilityMultiplier?:number;
}
export interface CompanionIdentityProfile extends CompanionIdentityModifiers{activeName?:string;bond?:CompanionIdentityModifiers;}
export interface CompanionServerDefinition{
  id:string;name:string;role:CompanionRole;rarity:CompanionRarity;originId:CompanionOriginId;
  baseStats:{hp:number;power:number;defense:number;attackSpeed:number};
  active:CompanionCombatAbilityDefinition;
  tags:string[];
  identity?:CompanionIdentityProfile;
  visual?:CompanionVisualMetadata;
}
export interface CompanionTechniqueDefinition{
  id:string;companionId:string;name:string;description:string;mutuallyExclusiveGroup:string;
  unlock:{ascensionTier:number;bondLevel:number;mode:'any'|'all'};
  effects:Array<{kind:'shield_strength'|'reflect'|'execute'|'cooldown'|'heal_strength'|'haste'|'defense'|'damage';value:number}>;
}
export interface OwnedCompanionSnapshot{
  companionId:string;level:number;xp:number;ascensionTier:0|1|2|3;bondLevel:number;bondXp:number;bondTraitUnlocked:boolean;mastered?:boolean;selectedTechniqueId?:string;
  obtainedAt?:string;originalEventReleaseYear?:number;veteranCosmeticEligible?:boolean;
}
export interface CompanionEconomyState{gold:number;companionEssence:number;bondstones:number;materials:Record<string,number>;}
export interface SanctuaryProgress{trainingGroundLevel:number;essenceBasinLevel:number;bondHallLevel:number;expeditionPensLevel:number;masteryChamberLevel:number;}
export interface CompanionOverflowState{weekKey:string;essenceConvertedThisWeek:number;}
export interface CompanionCodexProfileState{
  favoriteCompanionId?:string;showcaseCompanionIds:string[];discoveredCompanionIds?:string[];claimedCodexMilestoneIds?:string[];codexRewardIds?:string[];showcaseSlotsUnlocked?:number;
}

export interface EngineAbilityEffect{kind:EngineEffectKind;coeff?:number;flat?:number;durationMs?:number;value?:number;tag?:string;executeBelowHpPct?:number;executeBonus?:number;shieldReflectPct?:number;}
export interface EngineAbilityDefinition{id:string;name:string;cooldownMs:number;castTimeMs:number;interruptible?:boolean;target:EngineTargetRule;exactTargetId?:string;effects:EngineAbilityEffect[];priority:number;aiCondition?:'always'|'self_below_50'|'ally_below_50'|'target_casting'|'multiple_enemies';tags?:string[];}
export interface EngineBossPhaseDefinition{id:string;name?:string;hpPct:number;target:EngineTargetRule;effects:EngineAbilityEffect[];}
export interface CompanionCombatantDefinition{
  id:string;name:string;team:'players'|'enemies';role:'tank'|'damage'|'support'|'enemy';level:number;
  stats:{maxHp:number;attackPower:number;healingPower:number;defense:number;accuracy:number;evasion:number;critChance:number;critMultiplier:number;haste:number};
  basicAttackMs:number;basicAttackCoeff:number;abilities:EngineAbilityDefinition[];boss?:boolean;phases?:EngineBossPhaseDefinition[];tags?:string[];
}
export interface CompanionCombatResult{victory:boolean;durationMs:number;reason:'victory'|'wipe'|'timeout';players?:Array<{definition:{id:string};alive:boolean}>;}
export interface CompanionCombatExecutor{simulate(input:{seed:string;players:CompanionCombatantDefinition[];enemies:CompanionCombatantDefinition[];mitigationConstant?:number}):CompanionCombatResult;}

export interface CompanionTeamSelection{companionIds:[string,string,string];}
export interface CompanionTeamMemberView{companionId:string;role:CompanionRole;rarity:CompanionRarity;originId:string;power:number;}
export interface CompanionSynergy{key:string;combatMultiplier:number;hasteBonus:number;rewardEssenceMultiplier:number;description:string;}

export type CompanionTrialRestriction=
  |{type:'max_rarity';rarities:CompanionRarity[]}
  |{type:'require_rarity';rarity:CompanionRarity;count:number}
  |{type:'prohibit_rarity';rarity:CompanionRarity}
  |{type:'require_origin';originId:string;count:number}
  |{type:'different_origins';count:number}
  |{type:'rarity_mix';rarities:CompanionRarity[]}
  |{type:'max_team_power';value:number}
  |{type:'no_defeats'};
export interface CompanionWeeklyChallengeDefinition{id:string;name:string;description:string;minimumFloor:number;restrictions:CompanionTrialRestriction[];rewards:{companionEssence:number;bondstones:number;gold:number;materials?:Record<string,number>};}
export interface CompanionTrialSeasonDefinition{
  seasonKey:string;startsAt:string;endsAt:string;floorSetId:string;modifiers:string[];rewardSetId:string;specialChallenges:string[];featuredOrigin?:string;featuredCompanionIds?:string[];
}
export interface CompanionTrialRun{
  runId:string;seasonKey:string;teamCompanionIds:[string,string,string];startedAt:string;contentVersion:string;currentFloor:number;startFloor:number;seed:string;restrictionIds:string[];
}
export interface CompanionTrialSeasonState{
  monthlyChallengeClaims?:string[];
  seasonKey:string;currentFloor:number;checkpointFloor:number;currentSeasonHighestFloor:number;firstClearFloors:number[];bossRewardFloors:number[];
  specialObjectives:Record<string,boolean>;monthlyChallengeCompletion:Record<string,boolean>;leaderboardScore:number;weeklyChallengeWeekKey?:string;weeklyChallengeCompletion:Record<string,boolean>;weeklyChallengeClaims:string[];activeRun?:CompanionTrialRun;
}
export interface CompanionTrialLifetimeStats{
  lifetimeHighestFloor:number;totalTrialBossesDefeated:number;totalTrialFloorsCleared:number;monthlySeasonsParticipated:number;monthlyFloor30Clears:number;bestEverCompanionTeamPower:number;
}
export interface CompanionTrialArchive{seasonKey:string;highestFloor:number;floor30Cleared:boolean;leaderboardScore:number;}
export interface CompanionTrialProgress{season:CompanionTrialSeasonState;lifetime:CompanionTrialLifetimeStats;archive:CompanionTrialArchive[];}

export type CompanionMissionRequirement=
  |{type:'role_count';role:CompanionRole;count:number}
  |{type:'min_level';value:number;count?:number}
  |{type:'min_bond';value:number;count?:number}
  |{type:'min_rarity';rarity:CompanionRarity;count?:number}
  |{type:'max_rarity';rarity:CompanionRarity}
  |{type:'origin_count';originId:string;count:number}
  |{type:'min_team_power';value:number}
  |{type:'min_ascension';tier:0|1|2|3;count?:number}
  |{type:'tag_count';tag:string;count:number}
  |{type:'companion_id';companionId:string};
export interface CompanionMissionDefinition{
  id:string;name:string;originId?:string;durationMs:number;missionVersion:number;requiredRoles?:Partial<Record<CompanionRole,number>>;minCompanions:number;maxCompanions:number;minimumLevel?:number;recommendedPower:number;
  requiredRarities?:CompanionRarity[];requiredOriginId?:string;minimumBondLevel?:number;bonusOriginId?:string;
  requirements?:CompanionMissionRequirement[];bonusRequirements?:CompanionMissionRequirement[];minimumPenLevel?:number;
  costs:{gold:number;materials?:Record<string,number>};baseRewards:{companionEssence:number;gold:number;companionXp:number;bondXp:number;materials?:Record<string,number>};bondstoneEligible?:boolean;
  bonusRewards?:{companionEssence?:number;gold?:number;materials?:Record<string,number>};bonusRewardChanceByGrade?:Partial<Record<'C'|'B'|'A'|'S',number>>;
  specialtyBonus?:{label:string;companionXpMultiplier?:number;bondXpMultiplier?:number;materialMultiplier?:number;essenceMultiplier?:number};
}
export type CompanionAssignmentStatus='active'|'completed'|'claimed'|'cancelled';
export interface CompanionAssignment{
  assignmentId:string;missionId:string;companionIds:string[];startedAt:string;endsAt:string;missionVersion:number;seed:string;status:CompanionAssignmentStatus;claimedAt?:string;performanceGrade?:'C'|'B'|'A'|'S';rewardSnapshot?:CompanionAssignmentReward;
}
export interface CompanionAssignmentReward{companionEssence:number;gold:number;companionXp:number;bondXp:number;bondstones:number;materials:Record<string,number>;companionXpById?:Record<string,number>;bondXpById?:Record<string,number>;bonusRewardGranted?:boolean;}

export type CompanionProvingGroundEventType='battle_complete'|'boss_defeat'|'dungeon_complete'|'trial_floor_clear'|'trial_boss_clear';
export interface CompanionProvingGroundEvent{
  eventId:string;type:CompanionProvingGroundEventType;companionIds:string[];characterRole?:CompanionRole;trialFloor?:number;teamPower?:number;recommendedPower?:number;noDefeats?:boolean;
}
export interface CompanionProvingGroundCondition{
  maxRarity?:CompanionRarity;minBondLevel?:number;requiredCharacterRole?:CompanionRole;requiredCompanionRole?:CompanionRole;requiredRarity?:CompanionRarity;requiredOriginId?:string;requiredOriginCount?:number;
  trialBoss?:boolean;belowRecommendedPower?:boolean;rarityMix?:CompanionRarity[];
}
export interface CompanionProvingGroundChallengeDefinition{
  id:string;name:string;description:string;eventTypes:CompanionProvingGroundEventType[];targetCount:number;condition:CompanionProvingGroundCondition;
  rewards:{companionEssence:number;gold:number;bondstones:number;materials?:Record<string,number>;rewardIds?:string[]};
}
export interface CompanionProvingGroundState{weekKey:string;progress:Record<string,number>;completedIds:string[];claimedIds:string[];}

export type CompanionUnlockRequirementType='trial_floor'|'special_boss_clear'|'boss_clear_count'|'region_completion'|'event_completion'|'companion_owned'|'companion_role_owned'|'companion_bond_total'|'companion_level_total'|'achievement'|'currency_cost'|'mastery'|'reputation'|'event_challenge';
export interface CompanionAdvancedUnlockRequirement{type:CompanionUnlockRequirementType;target?:string;amount?:number;value?:string|number|boolean;originId?:string;description:string;}
export interface CompanionSpecialChallengeDefinition{id:string;name:string;bossId:string;rewardCompanionId:string;requirements:CompanionAdvancedUnlockRequirement[];recommendedTeamPower:number;}
export interface CompanionUnlockFacts{
  highestTrialFloor:number;specialBossClears:Set<string>;bossClearCounts:Record<string,number>;regionCompletion:Set<string>;eventCompletion:Set<string>;ownedCompanionIds:Set<string>;
  ownedByRole:Record<CompanionRole,number>;bondTotal:number;levelTotal:number;bondTotalByOrigin?:Record<string,number>;levelTotalByOrigin?:Record<string,number>;achievements:Set<string>;mastery:Record<string,number>;reputation:Record<string,number>;eventChallenges:Set<string>;companionEssence:number;
}

export type CompanionCodexEntryState='unknown'|'discovered'|'locked'|'owned'|'mastered';
export type CompanionCodexMilestoneRequirement=
  |{type:'owned_total';count:number}
  |{type:'owned_rarity';rarity:CompanionRarity;count:number}
  |{type:'bond_10';count:number}
  |{type:'mastered';count:number}
  |{type:'origins_owned';count:number}
  |{type:'max_level';count:number}
  |{type:'event_owned';count:number}
  |{type:'trial_boss_owned';count:number};
export interface CompanionCodexMilestoneDefinition{
  id:string;name:string;description:string;requirement:CompanionCodexMilestoneRequirement;
  reward:{companionEssence?:number;rewardIds?:string[];showcaseSlots?:number};
}
export interface CompanionCodexSummary{
  totalOwned:number;byRarity:Record<CompanionRarity,number>;byOrigin:Record<string,number>;maxLevelCount:number;bond10Count:number;masteredCount:number;eventCompanionCount:number;trialBossCompanionCount:number;originsOwned:number;
}
