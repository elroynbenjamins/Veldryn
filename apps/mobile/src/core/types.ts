import type {QuickNavDestination} from './quick-navigation';
import type {UiThemeId} from '../theme/theme';
import type {CompanionAccountState} from './companion-runtime';
import type {ClassSkillState,ClassDrills,TrainingFocus} from './class-skills';

export type ClassId = 'IRONWARDEN' | 'BASTION' | 'DREADGUARD' | 'DAWNKEEPER' | 'WAYFINDER' | 'RAVAGER' | 'HEXWEAVER' | 'KNIFE_DANCER' | 'STONECALLER';
export type BodyPresentation = 'male' | 'female';
export type GearSlot = 'weapon' | 'offhand' | 'helmet' | 'chest' | 'legs' | 'boots' | 'gloves' | 'cape' | 'amulet' | 'ring';
export interface CharacterLoadoutPreset{id:string;slotIndex:number;name:string;classId:ClassId;equipment:Partial<Record<GearSlot,string>>;foodId?:string;companionId?:string;createdAtMs:number;updatedAtMs:number;}
export type GemStat = 'attack'|'defense'|'hp';
export type GemSocketKind='stat'|'effect';
export type GemEffectId='combat_speed'|'boss_power'|'damage_reduction'|'recovery';
export interface GearEnhancementState { rank:number; failures:number; statGemId?:string; effectGemId?:string; /** Legacy/read-model compatibility; normalized from named slots. */ gemIds:string[]; }
export type ActivityKind = 'combat' | 'mining' | 'woodcutting' | 'fishing' | 'herbalism' | 'alchemy' | 'faith' | 'training' | 'hunting' | 'exploration';
export type CombatChallengeId='ferocious'|'hardened'|'nemesis'|'apex';
export type CombatAffixId='bloodthirsty'|'ironhide'|'colossal'|'cursed';
export type CombatTacticId='assault'|'balanced'|'guarded';
export interface QueuedActivity {kind:'combat'|'gathering';targetId:string;combatChallengeId?:CombatChallengeId;combatTacticId?:CombatTacticId;huntGoalId?:import('./hunt-goals').HuntGoalId;}
export type GatheringSkillId='mining'|'woodcutting'|'fishing'|'herbalism';
export type SeasonId='spring'|'summer'|'autumn'|'winter';
export type WeatherId='clear'|'rain'|'mist'|'storm'|'bloomwind'|'heatwave'|'harvest_wind'|'snow'|'frost';
export type SkillId=GatheringSkillId|'smithing'|'cooking'|'alchemy'|'hunting'|'exploration'|'tailoring'|'enchanting'|'faith';
export interface SkillState{skillId:SkillId;xp:number;level:number;}
export interface CharacterState {
  classSkillRemainders?:Record<string,number>;
  classTraining?:ClassDrills;
  monsterMasteryPoints?:Record<string,number>;
  masteryMaterialRemainders?:Record<string,number>;
  classSkills?:ClassSkillState[];
  trainingFocus?:TrainingFocus;
  faith?: import('./faith-types').CharacterFaithState;
  preparation?:import('./alchemy-types').ActivePreparation;
  unlockedEventSkinIds?:string[];
  equippedCombatCompanionId?:string;
  id:string; name:string; classId:ClassId; level:number; xp:number; gold:number;
  hp:number; currentHp:number; attack:number; defense:number;
  equipment:Partial<Record<GearSlot,string>>;
  /** Local prototype key is the gear definition ID. Online persistence maps this shape to owned item instances. */
  gearEnhancements?:Record<string,GearEnhancementState>;
  /** One character-bound gathering tool per skill. Equipped tools are removed from Inventory. */
  equippedToolIds?:Partial<Record<GatheringSkillId,string>>;
  equippedFoodId?:string;
  bodyPresentation?:BodyPresentation;
  craftedNoviceItemIds?:string[]; profileTitle?:string; profileBackgroundId?:string; profileBorderId?:string; selectedCosmeticPetId?:string;
  /** Character-bound collection rewards. Once added, a skin ID is never removed by item loss. */
  unlockedSkinIds?:string[];
  /** Permanently collected pets that provide permanent boosts. */
  ownedPetIds?: string[];
  /** Permanently bought boosts that provide permanent boosts. */
  ownedBoostIds?: string[];
  /** Character-bound one-time clears for monster Challenge Hunt tiers. */
  challengeHuntClearIds?:string[];
  /** Cosmetic choice only. Equipment changes stats and never changes this value. */
  selectedSkinId?:string;
  savedLoadouts?:CharacterLoadoutPreset[];
  progressionGoals?:import('./progression-goals-v40').ProgressionGoal[];
  idleRulesV40?:import('./idle-rules-v40').IdleRuleSet[];
  activeIdleRuleIdV40?:string;
  /** Character-bound action queue. It never auto-travels and pauses on safety failures. */
  activityQueue?:QueuedActivity[];
  activityQueuePausedReason?:string;
  /** Character-bound banked Daily Supplies charges and one active +10% boost. */
  dailySupplyBoostBank?:Partial<Record<import('./daily-supplies').DailySupplyBoostType,number>>;
  activeDailySupplyBoost?:import('./daily-supplies').ActiveDailySupplyBoost;
}
export interface ItemStack { itemId:string; quantity:number; }
export interface InventoryState { stacks:ItemStack[]; capacity:number; }
export interface BankState { stacks:ItemStack[]; capacity:number; }
export interface OverflowState { stacks:ItemStack[]; expiresAtMs:number|null; }
export interface ActivityEnvironmentSnapshot{seasonId:SeasonId;weatherId:WeatherId;zoneId:string;capturedAtMs:number;}
export interface ActiveActivity { kind:ActivityKind; targetId:string; startedAtMs:number; lastClaimAtMs:number; combatChallengeId?:CombatChallengeId; combatAffixId?:CombatAffixId; combatTacticId?:CombatTacticId; huntGoal?:import('./hunt-goals').HuntGoalSnapshot; sessionKills?:number; sessionChampions?:number; environment?:ActivityEnvironmentSnapshot; classFocus?:TrainingFocus; classTrainingSnapshot?:{faithBlessingId?:string}; bonusSnapshot?:import('./permanent-boosts').PermanentMultipliers; progressFraction?:number; brew?:import('./alchemy-types').AlchemyBatchState; faithPractice?:import('./faith-types').FaithPracticeReservation; }
export interface QuestState { questId:string; status:'locked'|'active'|'complete'|'claimed'; progress:number; }
export interface RegionalProgressState { storyCompleted?:number; sideQuestsCompleted?:number; echoesCompleted?:number; dungeonsCompleted?:number; collectionEntries?:number; bossMasteryTier?:number; }
export interface LiveEventRuntime{eventId:string;enabled:boolean;startsAtMs:number;endsAtMs:number;graceEndsAtMs?:number;priority?:number;modules?:string[];}
export interface GameState {
  version:6|11; createdAtMs:number; character:CharacterState|null; inventory:InventoryState; bank:BankState; overflow:OverflowState; activity:ActiveActivity|null;
  otherCharacters?:Array<{character:CharacterState;inventory:InventoryState;overflow:OverflowState;activity:ActiveActivity|null;skills:SkillState[];quests:QuestState[];currentRegionId:string}>;
  rewardRemainders?:Record<string,number>;
  /** Persisted player location. Region-scoped activities may only start here. */
  currentRegionId:string;
  /** Optional server/read-model projection for versioned regional journals. */
  regionalProgressById?:Record<string,RegionalProgressState>;
  quests:QuestState[]; unlockedMonsterIds:string[]; defeatedBossIds:string[]; skills:SkillState[];
  account:CompanionAccountState & {longTermAccountScopeId?:string;entitlements?:Record<string,boolean>;unlockedCharacterSlots?:number;premiumCurrencyBalance?:number;ownedBoostIds?:string[];eventCommunityProgressById?:Record<string,number>;createdCharacterCount:number;guildMember:boolean;patronTier:'none'|'bloom'|'crown';guildBannerId?:import('./guild-customization').GuildBannerId;guildProfileFrameId?:import('./guild-customization').GuildFrameId;guildNameplateId?:import('./guild-customization').GuildNameplateId;guildMotto?:string;
  professionMasteryByAction?:Record<string,import('./profession-mastery-v40').ProfessionMasteryRecord>;
  weeklyOrders?:import('./weekly-orders-v41').WeeklyOrdersState;
  weeklyOrderPendingRewards?:Array<{claimKey:string;rewardRef:string;label:string;weekKey:string;orderId?:string}>;
  crossSkillState?:import('./cross-skill-discoveries-v45').CrossSkillState;
  collectionSetState?:import('./collection-sets-v45').CollectionSetState;
  rareDiscoveryState?:import('./rare-idle-discoveries-v46').RareDiscoveryState;
  journalState?:import('./adventurers-journal-v42').JournalState;
  longTermMetrics?:Record<string,number>;
  dailySupplies?:import('./daily-supplies').DailySuppliesTrack;
  unlockedKnowledgeIds?:string[];
  unlockedCollectionRewardIds?:string[];
  guildContribution?:number;guildProjectProgress?:number;guildBossHp?:number;guildProjectClaimed?:boolean;guildJoinPolicy?:'open'|'apply'|'invite';guildMinimumLevel?:number;guildApplicationStatus?:'none'|'pending'|'accepted'|'declined';seasonalContractClaimIds?:string[];liveEvent?:LiveEventRuntime;eventProgressById?:Record<string,number>;eventCurrencyBalanceById?:Record<string,number>;eventPrestigeBalanceById?:Record<string,number>;eventRepeatCacheClaimsById?:Record<string,number>;eventActivityById?:Record<string,Partial<Record<'combat'|'gathering'|'crafting'|'boss',number>>>;eventPeriodActivityById?:Record<string,Partial<Record<'combat'|'gathering'|'crafting'|'boss',number>>>;eventAcceptedContractIds?:string[];eventContractBaselines?:Record<string,number>;eventObjectiveClaimIds?:string[];eventWeeklyClaimIds?:string[];eventDailyGiftClaimIds?:string[];eventCommunityClaimIds?:string[];eventDiscoveryCounts?:Record<string,number>;eventDiscoveryClaimIds?:string[];eventShopPurchaseCounts?:Record<string,number>;eventChoiceById?:Record<string,string>;eventContributionById?:Record<string,number>;eventRewardClaimIds?:string[];unlockedEventSkinIds?:string[];unlockedCosmeticPetIds?:string[];unlockedProfileBackgroundIds?:string[];unlockedProfileBorderIds?:string[];unlockedEmoteIds?:string[];unlockedTitleIds?:string[]};
  settings:{language:Language;uiTheme?:UiThemeId;numberMode:'abbreviated'|'exact';reduceMotion:boolean;textScale:1|1.15|1.3|1.5;autoEatThresholdPct:number;stopCombatWhenOutOfFood:boolean;autoJoinWorldChat?:boolean;defaultWorldChat?:1|2|3|4;chatDockLines?:1|2|3;chatEmoteTrayIds?:string[];quickNavDestinations?:QuickNavDestination[];favoriteItemIds?:string[];seenItemIds?:string[];};
}
export interface RewardBundle {
  explorationDiscoveries?:string[];
  craftingActions?:number; nextBrewRemaining?:number; craftingCompletedAtMs?:number[]; faithActions?:number; faithXp?:number; holyWaterConsumed?:number; faithWaterRefund?:number; nextFaithRemaining?:number; nextProgressFraction?:number; nextRewardRemainders?:Record<string,number>;
  masteryMaterialRemainders?:Record<string,number>;
  classSkillXp?:Array<{skillId:string;xp:number}>;
  trainingActions?:number;
  xp:number; gold:number; items:ItemStack[]; kills:number; elapsedSeconds:number; qualifyingActivitySeconds?:number;
  foodConsumed?:number; endHp?:number; stoppedReason?:string;
  eventDrops?:{eventId:string;currencyId:string;name:string;quantity:number;source?:'combat'|'gathering'|'crafting'|'boss';units?:number;recordedAtMs?:number}[];
  eventDiscoveries?:{eventId:string;discoveryId:string;name:string;quantity:number}[];
  petDrops?:{petId:string;name:string;sourceId:string}[];
  companionUnlocks?:{companionId:string;name:string;role:string;rarity:string}[];
  challengeHuntFirstClear?:{key:string;monsterId:string;challengeId:CombatChallengeId;label:string};
  championEncounters?:{count:number;bonusXp:number;bonusGold:number};
}
import type {Language} from '../i18n/languages';
