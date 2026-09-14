import type {ActivePreparation,AlchemyBatchState} from './alchemy-types';
import type {QuickNavDestination} from './quick-navigation';
import type {PermanentMultipliers} from './bonus-types';
import type {ClassSkillState,ClassSkillXpAward,TrainingFocus,ClassTrainingSnapshot} from './class-skill-types';
import type {CharacterFaithState,FaithPracticeReservation} from './faith-types';
import type {CharacterProgressLedger} from './quest-progress';
import type {CompanionAssignmentClientProjection,CompanionCodexClientProjection,CompanionOverflowConversionState,CompanionPhase2ProfileState,CompanionProvingGroundClientProjection,CompanionSanctuaryState,CompanionTrialClientProjection,OwnedCompanionProgress} from './combat-companion-types';

export type ClassId = 'IRONWARDEN' | 'BASTION' | 'DREADGUARD' | 'DAWNKEEPER' | 'WAYFINDER' | 'RAVAGER' | 'HEXWEAVER' | 'KNIFE_DANCER' | 'STONECALLER';
export type BodyPresentation = 'male' | 'female';
export type GearSlot = 'weapon' | 'offhand' | 'helmet' | 'chest' | 'legs' | 'boots' | 'gloves' | 'cape' | 'amulet' | 'ring';
export type GemStat = 'attack'|'defense'|'hp';
export interface GearEnhancementState { rank:number; failures:number; gemIds:string[]; }
export type ActivityKind = 'combat' | 'mining' | 'woodcutting' | 'fishing' | 'herbalism' | 'alchemy' | 'training' | 'hunting' | 'exploration' | 'faith';
export type GatheringSkillId='mining'|'woodcutting'|'fishing'|'herbalism';
export type SeasonId='spring'|'summer'|'autumn'|'winter';
export type WeatherId='clear'|'rain'|'mist'|'storm'|'bloomwind'|'heatwave'|'harvest_wind'|'snow'|'frost';
export type SkillId=GatheringSkillId|'smithing'|'cooking'|'alchemy'|'hunting'|'exploration'|'tailoring'|'enchanting'|'faith';
export interface SkillState{skillId:SkillId;xp:number;level:number;}
export interface CharacterState {
  id:string; name:string; classId:ClassId; level:number; xp:number; gold:number;
  hp:number; currentHp:number; attack:number; defense:number;
  equipment:Partial<Record<GearSlot,string>>;
  /** Two real XP-based skills belonging to this class and character. */
  classSkills?:ClassSkillState[];
  trainingFocus?:TrainingFocus;
  /** Character-owned Faith choice/favorites. Holy Water is inventory/bank material. */
  faith?:CharacterFaithState;
  /** Local prototype key is the gear definition ID. Online persistence maps this shape to owned item instances. */
  gearEnhancements?:Record<string,GearEnhancementState>;
  /** One character-bound gathering tool per skill. Equipped tools are removed from Inventory. */
  equippedToolIds?:Partial<Record<GatheringSkillId,string>>;
  equippedFoodId?:string;
  /** One manually prepared tonic on this character; ordinary encounter charges, not wall time. */
  activePreparation?:ActivePreparation;
  bodyPresentation?:BodyPresentation;
  craftedNoviceItemIds?:string[]; profileTitle?:string; profileBackgroundId?:string; profileBorderId?:string; selectedCosmeticPetId?:string;
  /** Active combat unit selection is character-specific; ownership/progression are account-wide. */
  equippedCombatCompanionId?:string;
  /** Character-bound collection rewards. Once added, a skin ID is never removed by item loss. */
  unlockedSkinIds?:string[];
  /** Legacy input only; normalized into account.unlockedCosmeticPetIds. */
  ownedPetIds?: string[];
  /** Legacy input only; normalized into account.ownedBoostIds. */
  ownedBoostIds?: string[];
  /** Cosmetic choice only. Equipment changes stats and never changes this value. */
  selectedSkinId?:string;
  /** Event appearances delivered to THIS character, never copied on character creation. */
  unlockedEventSkinIds?:string[];
  /** Character-specific permanent landmarks discovered through Exploration. */
  explorationDiscoveryIds?:string[];
  /** Durable character-specific quest counters. Bank moves, refunds and transfers do not count as earning. */
  progressLedger?:CharacterProgressLedger;
}
export interface ItemStack { itemId:string; quantity:number; }
export interface InventoryState { stacks:ItemStack[]; capacity:number; }
export interface BankState { stacks:ItemStack[]; capacity:number; }
export interface OverflowState { stacks:ItemStack[]; expiresAtMs:number|null; }
export interface ActivityEnvironmentSnapshot{seasonId:SeasonId;weatherId:WeatherId;zoneId:string;capturedAtMs:number;}
export interface ActiveActivity {
  kind:ActivityKind; targetId:string; startedAtMs:number; lastClaimAtMs:number;
  environment?:ActivityEnvironmentSnapshot;
  /** Frozen until the next settlement boundary; acquisitions never rewrite past work. */
  bonusSnapshot?:PermanentMultipliers;
  /** Fraction of one completed action retained across claims/switches. */
  progressFraction?:number;
  /** Frozen only for a started encounter/drill. Cleared after completion. */
  classTrainingSnapshot?:ClassTrainingSnapshot;
  completedActions?:number;
  brew?:AlchemyBatchState;
  faithPractice?:FaithPracticeReservation;
}
/** Character-owned save data. Account/bank/settings are deliberately NOT copied here. */
export interface CharacterProgress {
  character:CharacterState;
  inventory:InventoryState;
  overflow:OverflowState;
  activity:ActiveActivity|null;
  currentRegionId:string;
  quests:QuestState[];
  unlockedMonsterIds:string[];
  defeatedBossIds:string[];
  skills:SkillState[];
  rewardRemainders?:Record<string,number>;
}
export interface QuestState { questId:string; status:'locked'|'active'|'complete'|'claimed'; progress:number; }
export interface LiveEventRuntime{eventId:string;enabled:boolean;startsAtMs:number;endsAtMs:number;}
export interface GameState {
  version:13;
  /** Inactive contexts only. The active context remains the existing root projection. */
  otherCharacters?:CharacterProgress[];
  rewardRemainders?:Record<string,number>;
  createdAtMs:number; character:CharacterState|null; inventory:InventoryState; bank:BankState; overflow:OverflowState; activity:ActiveActivity|null;
  /** Persisted player location. Region-scoped activities may only start here. */
  currentRegionId:string;
  quests:QuestState[]; unlockedMonsterIds:string[]; defeatedBossIds:string[]; skills:SkillState[];
  account:{
    /** Permanent milestone watermark, not a currency or purchased slot count. */
    unlockedCharacterSlots?:number;
    nextCharacterOrdinal?:number;
    /** Active Combat Companions are separate from passive collectible Pets. */
    unlockedCombatCompanionIds?:string[];
    combatCompanionProgress?:Record<string,OwnedCompanionProgress>;
    companionUnlockProgress?:Record<string,number>;
    companionEssence?:number;
    bondstones?:number;
    companionSanctuary?:CompanionSanctuaryState;
    /** Server-projected Phase 2/3 state; client cache only, never reward authority. */
    companionTrialProjection?:CompanionTrialClientProjection;
    companionProvingGroundProjection?:CompanionProvingGroundClientProjection;
    companionCodexProjection?:CompanionCodexClientProjection;
    companionAssignments?:CompanionAssignmentClientProjection[];
    companionPhase2Profile?:CompanionPhase2ProfileState;
    companionOverflow?:CompanionOverflowConversionState;
    ownedBoostIds?:string[];
    entitlements?:{vip:boolean;vipPlus:boolean};
    premiumCurrencyBalance?:number;
    activeProfileBackgroundId?:string;
    activeProfileBorderId?:string;
    createdCharacterCount:number;guildMember:boolean;patronTier:'none'|'bloom'|'crown';guildContribution?:number;guildProjectContribution?:number;guildPveWeekKey?:string;guildProjectProgress?:number;guildBossHp?:number;guildProjectClaimed?:boolean;guildJoinPolicy?:'open'|'apply'|'invite';guildMinimumLevel?:number;guildApplicationStatus?:'none'|'pending'|'accepted'|'declined';seasonalContractClaimIds?:string[];liveEvent?:LiveEventRuntime;eventProgressById?:Record<string,number>;eventCurrencyBalanceById?:Record<string,number>;eventPrestigeBalanceById?:Record<string,number>;eventWalletExpiresAtById?:Record<string,number>;eventRecipeSlotsBySetId?:Record<string,GearSlot[]>;eventRepeatCacheClaimsById?:Record<string,number>;eventActivityById?:Record<string,Partial<Record<'combat'|'gathering'|'crafting'|'boss',number>>>;eventPeriodActivityById?:Record<string,Partial<Record<'combat'|'gathering'|'crafting'|'boss',number>>>;eventAcceptedContractIds?:string[];eventContractBaselines?:Record<string,number>;eventObjectiveClaimIds?:string[];eventWeeklyClaimIds?:string[];eventDailyGiftClaimIds?:string[];eventCommunityClaimIds?:string[];eventDiscoveryCounts?:Record<string,number>;eventDiscoveryClaimIds?:string[];eventShopPurchaseCounts?:Record<string,number>;eventChoiceById?:Record<string,string>;eventContributionById?:Record<string,number>;eventRewardClaimIds?:string[];unlockedEventSkinIds?:string[];unlockedCosmeticPetIds?:string[];unlockedProfileBackgroundIds?:string[];unlockedProfileBorderIds?:string[];unlockedEmoteIds?:string[];unlockedTitleIds?:string[]};
  settings:{language:Language;numberMode:'abbreviated'|'exact';reduceMotion:boolean;textScale:1|1.15|1.3|1.5;autoEatThresholdPct:number;stopCombatWhenOutOfFood:boolean;autoJoinWorldChat?:boolean;defaultWorldChat?:1|2|3|4;quickNavDestinations?:QuickNavDestination[];};
}
export interface RewardBundle {
  xp:number; gold:number; items:ItemStack[]; kills:number; elapsedSeconds:number;
  classSkillXp?:ClassSkillXpAward[];
  trainingActions?:number;
  craftingActions?:number;
  nextBrewRemaining?:number;
  craftingCompletedAtMs?:number[];
  nextPreparation?:ActivePreparation|null;
  nextClassTrainingSnapshot?:ClassTrainingSnapshot;
  nextCompletedActions?:number;
  explorationDiscoveries?:string[];
  faithActions?:number;
  holyWaterConsumed?:number;
  faithWaterRefund?:number;
  nextFaithRemaining?:number;
  nextRewardRemainders?:Record<string,number>;
  nextProgressFraction?:number;
  eventGatheringMinutes?:number;
  foodConsumed?:number; endHp?:number; stoppedReason?:string;
  eventDrops?:{eventId:string;currencyId:string;name:string;quantity:number;source?:'combat'|'gathering'|'crafting'|'boss';units?:number;recordedAtMs?:number}[];
  eventDiscoveries?:{eventId:string;discoveryId:string;name:string;quantity:number}[];
}
import type {Language} from '../i18n/languages';
