import {newInventoryScreenState,type InventoryScreenState} from './src/core/inventory-screen-state';
import {GameAlertHost} from './src/components/GameAlertHost';
import {gameAlert,gameAlerts} from './src/core/game-alerts';
import {SavedLoadoutsPanel} from './src/components/SavedLoadoutsPanel';
import {useCallback,useEffect,useMemo,useRef,useState,useSyncExternalStore} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {APP_BUILD_INFO} from './src/app-build';
import {runWhileForeground} from './src/online/foreground-tasks';
import {fetchReleaseNotes} from './src/online/release-notes';
import {firstInstalledReleaseVersion,shouldAutoAnnounceReleaseNotes,shouldAutoShowReleaseNotes,type ReleaseNote} from './src/core/release-notes';
import {WhatsNewModal} from './src/components/WhatsNewModal';
import {selectGlobalPopup} from './src/core/global-popup-priority';
import {buildWelcomeBackFromStates,type WelcomeBackProgressReport} from './src/core/welcome-back-v46';
import {ActivityIndicator,Animated,ScrollView,AppState,BackHandler,Image,Keyboard,PanResponder,Pressable,Share,StyleSheet,Text,TextInput,View,useWindowDimensions} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import {SafeAreaProvider,SafeAreaView} from 'react-native-safe-area-context';
import {AccountWelcomeScreen} from './src/components/AccountWelcomeScreen';
import {AsterfallWelcomeModal} from './src/components/AsterfallWelcomeModal';
import {StartupScreen} from './src/components/StartupScreen';
import {pickStartupScene} from './src/theme/startup-art';
import {AsyncStorageGameRepository} from './src/storage/async-storage-repository';
import {setBaseMusic} from './src/storage/audio';
import {backgroundMusicFor} from './src/core/music-context';
import {ActiveActivity,ClassId,CombatTacticId,GameState,QueuedActivity,RewardBundle} from './src/core/types';
import type {HuntGoalId} from './src/core/hunt-goals';
import {challengeFallenKnight,claimActivity,claimOverflowToBank,claimQuest,claimSeasonalContract,craftRecipe,createCharacter,depositAllMaterials,depositToBank,sellBankItem,depositGoldToBank,withdrawGoldFromBank,eatFood,equipFood,equipGatheringTool,newGame,previewActivityReward,salvageItem,sellItem,travelToRegion,unequipItem,upgradeStorage,withdrawFromBank} from './src/core/game';
import {cancelEquipmentCraft,claimAllReadyEquipmentCrafts,claimForgeJob,equipmentCraftQueueModel,moveWaitingEquipmentCraft,projectedEquipmentCraftingQueue,startEquipmentCraft,startGemCombine,startGemRefinement,timedEquipmentRecipe} from './src/core/equipment-crafting-queue';
import {verifyCraftCommandOutcome} from './src/core/craft-command-outcome';
import {craftEquipmentPrerequisites} from './src/core/equipment-crafting-prerequisites';
import {migrateGemPouch} from './src/core/gem-pouch';
import {migrateRetiredStoryRewards} from './src/core/retired-story-rewards';
import {acknowledgeAllInventoryItems,acknowledgeInventoryItem,shouldAcknowledgeInventoryOnExit,toggleInventoryFavorite,toggleInventoryLock} from './src/core/inventory-view';
import {bulkSalvageSelected,bulkSellSelected,bulkTransferSelected} from './src/core/inventory-bulk';
import {applyBulkInventoryProtection} from './src/core/inventory-protection-bulk';
import {ClassSelectScreen} from './src/screens/ClassSelectScreen';
import {occupiedCharacterRoles} from './src/core/account-roster';
import {HomeScreen} from './src/screens/HomeScreen';
import {WorldScreen} from './src/screens/WorldScreen';
import {InventoryScreen} from './src/screens/InventoryScreen';
import {CharacterScreen} from './src/screens/CharacterScreen';
import {CombatCompanionPanel,type CompanionNavigationState} from './src/components/CombatCompanionPanel';
import {executeGameCommand,settingsForOnlineCommand,type ForgeCraftResult} from './src/core/game-commands';
import {QuestRefinedScreen as QuestScreen,type QuestMode} from './src/screens/QuestRefinedScreen';
import {claimMonthlyQuestMilestone} from './src/core/monthly-quest-milestones';
import {SkillsScreen} from './src/screens/SkillsScreen';
import {CompanionsScreen} from './src/screens/CompanionsScreen';
import {SectionGuide} from './src/components/SectionGuide';
import {SettingsScreen,type SettingsSection} from './src/screens/SettingsScreen';
import {StoreScreen} from './src/screens/StoreScreen';
import type {SocialHubTab} from './src/components/SocialHubPanel';
import {rememberScreen,returnToPreviousScreen,type ScreenHistoryEntry} from './src/core/screen-navigation-history';
import {redeemCode} from './src/online/redeem-code';
import {MoreScreen,type MoreDestination} from './src/screens/MoreScreen';
import {CommunityRoadmapScreen} from './src/screens/CommunityRoadmapScreen';
import {AdminQaScreen} from './src/screens/AdminQaScreen';
import {GuildScreen,type GuildNavigationState} from './src/screens/GuildScreen';
import {FriendsScreen} from './src/screens/FriendsScreen';
import {EventScreen} from './src/screens/EventScreen';
import {EventStartPopup} from './src/components/EventStartPopup';
import {OnlineGuildManagement} from './src/components/OnlineGuildManagement';
import {OnlineGuildPve} from './src/components/OnlineGuildPve';
import {OnlineGuildHallPanel} from './src/components/OnlineGuildHallPanel';
import {OnlineGuildCustomizationPanel} from './src/components/OnlineGuildCustomizationPanel';
import {OnlineGuildProjectsPanel} from './src/components/OnlineGuildProjectsPanel';
import {GuildChat} from './src/components/GuildChat';
import {OnlineGuildNoticeBoardPanel} from './src/components/OnlineGuildNoticeBoardPanel';
import {ProfileEditor} from './src/components/ProfileEditor';
import {RewardPopup} from './src/components/RewardPopup';
import {NewUnlocksScreen} from './src/screens/NewUnlocksScreen';
import {legacyUnreadUnlockEntries,markUnlockInboxSeen,mergeUnlockInbox,newUnlockInboxEntries,newlyUnlockedOtherCosmetics,unreadUnlockCount,type CosmeticUnlockNotice,type UnlockInboxEntry} from './src/core/unlock-inbox';
import {addUnlockInboxEntries,loadUnlockInbox,markUnlockInboxRead} from './src/storage/unlock-inbox';
import {FeatureUnlockPopup} from './src/components/FeatureUnlockPopup';
import {FirstSessionTutorialPopup} from './src/components/FirstSessionTutorialPopup';
import {MainScreenTourPopup} from './src/components/MainScreenTourPopup';
import {ForgeRarityRevealModal,isExceptionalForgeResult} from './src/components/ForgeResultFeedback';
import {ForgeClaimAllSummaryModal} from './src/components/ForgeClaimAllSummaryModal';
import {StoryBossBattleModal} from './src/components/StoryBossBattleModal';
import type {FallenKnightBattleResult} from './src/core/story-boss';
import {C,resolveTheme,type UiThemeId} from './src/theme/theme';
import {GameThemeProvider} from './src/theme/ThemeContext';
import {GameLanguageProvider} from './src/i18n/GameLanguageProvider';
import {appText} from './src/i18n/app-shell';
import {rewardHasProgress,settleStartupActivity,transitionActivity} from './src/core/playability';
import {masteryRankNoticeMessage,masteryRankProgressionMoments,rewardProgressionMoments,type RewardProgressionMoment} from './src/core/reward-game-feel';
import {commandProgressFeedback} from './src/core/command-progress-feedback';
import {ActionFeedback} from './src/components/ActionFeedback';
import {LoadingState} from './src/components/LoadingState';
import {equipNoviceSet} from './src/core/game';
import {noviceSetProgress} from './src/core/character-appearance';
import {normalizeProfileIcon,newlyUnlockedProfileIcons,selectProfileIcon,accountProfileIconId} from './src/core/profile-icons';
import {publishOwnProfileIcon} from './src/online/player-identity-cache';
import {normalizePlayerNameStyle,savePlayerNameStyle,type PlayerNameStylePreference} from './src/core/player-name-style';
import {createSaveBackup,parseSaveBackup} from './src/core/save-transfer';
import {SaveRecoveryScreen} from './src/components/SaveRecoveryScreen';
import {Language,ct,ot,t} from './src/i18n';
import {CoopExpeditionScreen} from './src/screens/CoopExpeditionScreen';
import {CoopUiGalleryScreen} from './src/screens/CoopUiGalleryScreen';
import {coopOnlineConfigured} from './src/online/coop-client';
import {realCoopEntrySource} from './src/online/coop-entry-source';
import {createCoopDungeonFixtureSource} from './src/dev/coop-dungeon-fixtures';
import {itemDef} from './src/content/items';
import {WORLD_ZONES} from './src/content/world-map';
import {GameTopBar} from './src/components/GameTopBar';
import {activityRewardPreviewClock} from './src/components/activity-preview-clock';
import {ChatOverlay} from './src/components/ChatOverlay';
import {ActiveProfileCharacterContext} from './src/components/ActiveProfileCharacterContext';
import type {QuickNavDestination} from './src/core/quick-navigation';
import {CombatScreen} from './src/screens/CombatScreen';
import type {SkillId} from './src/core/types';
import {PrimaryNavigation} from './src/components/PrimaryNavigation';
import {ScreenTransition,useSystemReduceMotion} from './src/components/ScreenTransition';
import {screenTransitionFor,type ScreenTransitionKind} from './src/core/screen-transitions';
import {primaryNavForRoute} from './src/core/primary-tab-routing';
import {setNetworkMetricsRoute} from './src/core/network-request-metrics';
import {attemptEquipmentUpgrade,replaceGem,socketGem} from './src/core/equipment-enhancement';
import {claimResonanceCacheV1,dismantleGemV1,gemCombineRecipeIdV1,gemRefineRecipeIdV1} from './src/core/gem-progression-v1';
import {PartyScreen} from './src/screens/PartyScreen';
import {FeaturePreviewScreen} from './src/screens/FeaturePreviewScreen';
import {FEATURE_HUB_QA_ENABLED,featureHubShellPolicy,isFeatureHubPreviewRoute,type FeatureHubPreviewRoute} from './src/core/feature-hub-routes';
import {RecruitmentScreen} from './src/screens/RecruitmentScreen';
import {ArenaScreen} from './src/screens/ArenaScreen';
import {RankingsScreen} from './src/screens/RankingsScreen';
import {CollectionsScreen} from './src/screens/CollectionsScreen';
import {ResourceCodexScreen} from './src/screens/ResourceCodexScreen';
import {SkillGuideScreen} from './src/screens/SkillGuideScreen';
import {skillGuideUi} from './src/i18n/skill-guide-ui';
import {ProfileScreen} from './src/screens/ProfileScreen';
import {ProfileCustomizeScreen} from './src/screens/ProfileCustomizeScreen';
import {ProfileDiscardChangesModal} from './src/components/ProfileDiscardChangesModal';
import {ActivityOverviewScreen} from './src/screens/ActivityOverviewScreen';
import {DailySuppliesScreen} from './src/screens/DailySuppliesScreen';
import {RewardsInboxScreen} from './src/screens/RewardsInboxScreen';
import {AccountBonusesScreen} from './src/screens/AccountBonusesScreen';
import {MasteryHallScreen} from './src/screens/MasteryHallScreen';
import {AdventurersJournalScreen} from './src/screens/AdventurersJournalScreen';
import {BestiaryScreen} from './src/screens/BestiaryScreen';
import {WorldMilestoneFeedScreen} from './src/screens/WorldMilestoneFeedScreen';
import {PartySocialProvider,usePartySocial} from './src/online/PartySocialProvider';
import {AuthSessionProvider,useAuthSession} from './src/online/AuthSessionProvider';
import {PlayerBadgeProvider} from './src/online/PlayerBadgeProvider';
import {useOnlineGame} from './src/online/useOnlineGame';
import {serverGameplayEnabled} from './src/online/gameplay';
import {OnlineAccountPanel} from './src/components/OnlineAccountPanel';
import {UpdateRequiredScreen} from './src/components/UpdateRequiredScreen';
import {signOut} from './src/online/account';
import {accountLinkStep} from './src/core/auth-account-link';
import {fetchAppVersionGate,openStoreListing,type VersionGateResult} from './src/online/app-version-gate';
import {GameButton} from './src/components/GameButton';
import type {GameCommand} from './src/core/game-commands';
import {actionableClaimNotifications,buildNavigationBadges,buildQuickNavigationBadges,type NavigationNotification} from './src/core/navigation-notifications';
import {questClaimAttention} from './src/core/quest-claim-attention';
import {partyContractClaimableRewardIds} from './src/core/party-social';
import {canAnnounceLiveEventStart} from './src/core/live-events';
import {companionAttentionSummary} from './src/core/companion-attention';
import {earlyFeatureLockReason,earlyFeatureUnlocked,newlyUnlockedEarlyFeatures,playerFacingGameplayError,type EarlyFeatureUnlockMoment} from './src/core/feature-unlocks';
import type {WorkingTowardDestination} from './src/core/working-toward';
import {retireGoalPlanner} from './src/core/retired-goal-planner';
import {recipePreparationTransitionNotices,type RecipePreparationTransitionNotice} from './src/core/recipe-preparation-tracking';
import {dailySuppliesStatus} from './src/core/daily-supplies';
import {weeklyOrderDestination,weeklyOrderIdleRule,weeklyOrderIdleRuleId,weeklyOrderQueueActivity} from './src/core/weekly-order-integrations-v41';
import {weeklyOrderQuickStartPlan} from './src/core/weekly-order-quick-start';
import type {WeeklyOrder} from './src/core/weekly-orders-v41';
import {useSocialNotificationCounts} from './src/online/useSocialNotificationCounts';
import {useDungeonWeeklyReminder} from './src/online/dungeon-weekly-reminder';
import {fetchActiveEventRuntime} from './src/online/live-events';
import {EVENTS_RELEASED,RANKINGS_RELEASED} from './src/core/release-flags';
import {onlineConfigured} from './src/online/supabase';
import {newlyUnlockedProfileRewards} from './src/core/profile-customization';
import {clearProfileAttentionKeys,loadProfileAttentionKeys} from './src/storage/profile-attention';
import {firstSessionTutorialStep,type FirstSessionTutorialId} from './src/core/first-session-tutorial';
import {MAIN_SCREEN_TOUR,mainScreenTourStep} from './src/core/main-screen-tour';
import {TutorialHighlightProvider} from './src/components/TutorialBeacon';
import {completeFirstSessionTutorialStep,loadFirstSessionTutorialCompleted} from './src/storage/first-session-tutorial';
import {eventAnnouncementStore} from './src/storage/event-announcement';

type Tab=QuickNavDestination|'Recruitment'|'NewUnlocks'|'Activity'|'DailySupplies'|'AccountBonuses'|'RewardsInbox'|'MasteryHall'|'AdventurersJournal'|'Bestiary'|'WorldMilestones'|'Arena'|'Rankings'|'Collections'|'ResourceCodex'|'SkillGuide'|'Profile'|'ProfileCustomize'|'Combat'|'Coop'|'Store'|'Roadmap'|FeatureHubPreviewRoute;
type PrimaryTab='Home'|'Skills'|'World'|'Character'|'Inventory'|'More';
type NavigationContext={skillsMode:'gathering'|'crafting'|'novice'|'faith';selectedSkill?:string;goalActionId?:string;goalRecipeId?:string;questMode:QuestMode;questFocusOrderId?:string;settingsSection?:SettingsSection;socialInitialTab:SocialHubTab;profileCustomizeSection:'Look'|'Identity'|'Showcase';goalMonsterId?:string;goalRegionId?:string;goalDungeonId?:string};
const primaryTabs:PrimaryTab[]=['Home','Character','Skills','World','Inventory','More'];
function tabLabel(language:Language,tab:Tab):string{
  switch(tab){
    case 'Home':return t(language,'nav.home');case 'World':return t(language,'nav.world');case 'Character':return t(language,'nav.character');case 'Inventory':return t(language,'nav.inventory');case 'More':return appText(language,'Account');case 'Activity':return appText(language,'Characters');case 'DailySupplies':return appText(language,'Supply Journey');case 'AccountBonuses':return appText(language,'Account Bonuses');case 'RewardsInbox':return appText(language,'Rewards Inbox');case 'MasteryHall':return appText(language,'Mastery Hall');case 'AdventurersJournal':return appText(language,"Adventurer's Journal");case 'Bestiary':return appText(language,'Monster Codex');case 'WorldMilestones':return appText(language,'World Milestones');
    case 'Quests':return t(language,'more.quests');case 'Companions':return appText(language,'Companions');case 'Skills':return t(language,'more.skills');case 'Events':return t(language,'more.events');case 'Friends':return t(language,'more.friends');case 'Guild':return t(language,'more.guild');case 'Settings':return t(language,'more.settings');case 'Store':return appText(language,'Store');case 'Account':return appText(language,'Account');case 'Dungeon':return appText(language,'Dungeon');case 'Empty':return appText(language,'Empty');
    case 'WorldBossPreview':return 'World Bosses';case 'PartyEventPreview':return 'Party Events';case 'PlayerMarketPreview':return 'Player Market';
    case 'Combat':return appText(language,'Combat');case 'Coop':return appText(language,'Dungeons');
    case 'Social':return appText(language,'Recruitment');case 'Party':return appText(language,'Party');case 'Recruitment':return appText(language,'Recruitment');
    case 'Roadmap':return appText(language,'Community Roadmap');
    case 'Arena':return appText(language,'Arena');
    case 'Rankings':return appText(language,'Rankings');
    case 'Collections':return appText(language,'Collections');
     case 'ResourceCodex':return appText(language,'Codex');
     case 'Forge':return appText(language,'Forge');case 'Pets':return appText(language,'Pets');
     case 'SkillGuide':return skillGuideUi(language,'Skill Guide');
    case 'Profile':return appText(language,'Profile');
    case 'ProfileCustomize':return appText(language,'Customize Profile');case 'NewUnlocks':return appText(language,'New Unlocks');
  }
}
const repo=new AsyncStorageGameRepository();

const MAIN_TAB_GUIDANCE:Record<string,{title:string;body:string;detail:string}>={
 Character:{title:'Your Character',body:'Open equipment slots to review and equip gear. Your stats update with your equipment.',detail:'Enhancing gear and adding gems are optional upgrades; open an equipment slot when ready.'},
 Skills:{title:'Your Skills',body:'Choose an activity, start it and collect the rewards to level up.',detail:'Gather resources first, then use crafting skills to turn them into equipment, food or materials.'},
 World:{title:'Explore the World',body:'Choose a region to see its activities, enemies and resources.',detail:'New regions unlock as you progress. Travel is instant when a region is available.'},
 Inventory:{title:'Manage your items',body:'Tap an item to use, equip or manage it. Star favorites and lock items you want to keep.',detail:'Use filters for large collections. Locked or favorite gear should stay protected during bulk actions.'},
 More:{title:'Your Account',body:'Find character slots, preferences, your Game Guide and account-wide systems here.',detail:'The Help & Game Guide lets you revisit any unlocked topic whenever you want.'},
};

export default function App(){return <SafeAreaProvider><AuthSessionProvider><PlayerBadgeProvider><PartySocialProvider><VeldrynApp/></PartySocialProvider></PlayerBadgeProvider></AuthSessionProvider><GameAlertHost/></SafeAreaProvider>;}
function VeldrynApp(){
  const auth=useAuthSession(),online=useOnlineGame(),partySocial=usePartySocial();
  const hasBlockingAlert=useSyncExternalStore(gameAlerts.subscribe,gameAlerts.getSnapshot,gameAlerts.getSnapshot).queue.length>0;
  const {width:viewportWidth}=useWindowDimensions();
  const adminQa=auth.session?.user.app_metadata?.admin_qa===true||(Array.isArray(auth.session?.user.app_metadata?.roles)&&auth.session!.user.app_metadata.roles.includes('admin_qa'));
  const [state,setState]=useState<GameState|null>(null);
  // A visual-only preview must not wait for server settings or full-save serialization.
  const [themePreviewId,setThemePreviewId]=useState<UiThemeId|undefined>();
  const requestedThemeRef=useRef<UiThemeId|undefined>(undefined);
  const themeSaveTimerRef=useRef<ReturnType<typeof setTimeout>|null>(null);
  const themeSavingRef=useRef(false);
  const displayedThemeId=themePreviewId??state?.settings.uiTheme;
  const [ready,setReady]=useState(false);
  const [startupScene]=useState(pickStartupScene);
  const [loadError,setLoadError]=useState('');
  const [recoveryLanguage,setRecoveryLanguage]=useState<Language>('en');
  useEffect(()=>{gameAlerts.configure({themeId:displayedThemeId,language:state?.settings.language??recoveryLanguage,reduceMotion:state?.settings.reduceMotion??false});},[displayedThemeId,state?.settings.language,state?.settings.reduceMotion,recoveryLanguage]);
  const [tab,setCurrentTab]=useState<Tab>('Home');
  const [transitionKind,setTransitionKind]=useState<ScreenTransitionKind>('none');
  const systemReduceMotion=useSystemReduceMotion();
  const tabRef=useRef(tab);tabRef.current=tab;
  useEffect(()=>setNetworkMetricsRoute(tab),[tab]);
  // Background music follows the current screen and region; dungeons and bosses override it.
  const musicTrack=backgroundMusicFor({screen:tab,regionId:state?.currentRegionId,hasCharacter:Boolean(state?.character)});
  useEffect(()=>setBaseMusic(musicTrack),[musicTrack]);
  const [settingsSection,setSettingsSection]=useState<SettingsSection|undefined>();
   const [focusChatEmotes,setFocusChatEmotes]=useState(false);
  const [tabHistory,setTabHistory]=useState<ScreenHistoryEntry<Tab,NavigationContext>[]>([]);
  const [skillsOpenedAsLink,setSkillsOpenedAsLink]=useState(false);
  const [questMode,setQuestMode]=useState<QuestMode>('story');
  const [questFocusOrderId,setQuestFocusOrderId]=useState<string|undefined>();
  const [skillsMode,setSkillsMode]=useState<'gathering'|'crafting'|'novice'|'faith'>('gathering');
  const [selectedSkill,setSelectedSkill]=useState<string|undefined>();
  const [goalActionId,setGoalActionId]=useState<string|undefined>();
  const [goalRecipeId,setGoalRecipeId]=useState<string|undefined>();
  // Back from a tool's focused Smithing recipe restores its originating gathering skill.
  const toolRecipeReturnRef=useRef<{skillId:string;mode:'gathering'|'crafting'|'novice'|'faith';actionId?:string;recipeId?:string}|null>(null);
  const [goalMonsterId,setGoalMonsterId]=useState<string|undefined>();
  /** Transient region-local selection, not persisted in player or backend save data. */
  const [selectedRegionalAreaId,setSelectedRegionalAreaId]=useState<string|undefined>();
  const [goalRegionId,setGoalRegionId]=useState<string|undefined>();
  const [goalDungeonId,setGoalDungeonId]=useState<string|undefined>();
  const [pendingGoalDestination,setPendingGoalDestination]=useState<WorkingTowardDestination|undefined>();
  const inventoryViews=useRef<Record<string,InventoryScreenState>>({});
  const companionNavigationMemory=useRef<{characterId:string;context:CompanionNavigationState}|null>(null);
  const guildNavigationMemory=useRef<{scope:string;context:GuildNavigationState}|null>(null);
  const [guildEventPageOpen,setGuildEventPageOpen]=useState(false);
  const [guildRaidScope,setGuildRaidScope]=useState<string|null>(null);
  // Back history is session-only; never carry another character's routes and
  // selections into a switched character or a newly signed-in account.
  useEffect(()=>{setTabHistory([]);},[auth.session?.user.id,state?.character?.id]);
  const [inventoryFoodRequest,setInventoryFoodRequest]=useState(0);
  const [inventoryFoodScope,setInventoryFoodScope]=useState('');
  const [now,setNow]=useState(Date.now());
  const [offlineSettling,setOfflineSettling]=useState(false);
  const [onlineActionError,setOnlineActionError]=useState('');
  const [collected,setCollected]=useState<{reward:RewardBundle;activity:ActiveActivity|null;welcomeBack?:boolean;welcomeReport?:WelcomeBackProgressReport;progressionMoments?:RewardProgressionMoment[]}|null>(null);
  const [unlockInbox,setUnlockInbox]=useState<UnlockInboxEntry[]>([]);
  const [unlockInboxLoaded,setUnlockInboxLoaded]=useState(false);
  const [featureUnlockMoments,setFeatureUnlockMoments]=useState<EarlyFeatureUnlockMoment[]>([]);
  const [forgeResults,setForgeResults]=useState<ForgeCraftResult[]|null>(null);
  const [quietCraftSaving,setQuietCraftSaving]=useState(false);
  const [forgeClaimAllResults,setForgeClaimAllResults]=useState<ForgeCraftResult[]|null>(null);
  const [forgeClaimAllPendingCount,setForgeClaimAllPendingCount]=useState(0);
  const [forgeClaimFeedback,setForgeClaimFeedback]=useState<{message:string;tone:'success'|'warning'}|null>(null);
  const forgeClaimAllInFlight=useRef(false);
  const contractQuickStartInFlight=useRef(false);
  const [storyBossBattle,setStoryBossBattle]=useState<{battle:FallenKnightBattleResult;message:string}|null>(null);
  const [masteryNotices,setMasteryNotices]=useState<RewardProgressionMoment[]>([]);
  const [preparationNotices,setPreparationNotices]=useState<RecipePreparationTransitionNotice[]>([]);
  const [profileCustomizeDirty,setProfileCustomizeDirty]=useState(false);
  const [profileDiscardAction,setProfileDiscardAction]=useState<(()=>void)|null>(null);
  const [profileCustomizeSection,setProfileCustomizeSection]=useState<'Look'|'Identity'|'Showcase'>('Look');
  const [tutorialCompleted,setTutorialCompleted]=useState<FirstSessionTutorialId[]>([]);
  const [tutorialDismissedId,setTutorialDismissedId]=useState<FirstSessionTutorialId|undefined>();
  const [mainScreenTourIndex,setMainScreenTourIndex]=useState<number|undefined>();
  const stateRef=useRef<GameState|null>(null);
  const activeProfileCharacterId=state?.character?.id;
  const activeProfileCharacter=useMemo(()=>({id:activeProfileCharacterId,stateRef}),[activeProfileCharacterId]);
  const previousInventoryTab=useRef<Tab>(tab);
  const inventorySeenAfterExit=useRef<string|null>(null);
  useEffect(()=>{
    const previous=previousInventoryTab.current;
    previousInventoryTab.current=tab;
    const current=stateRef.current;
    const scope=current?.character?`${current.createdAtMs}:${current.character.id}`:null;
    // Wait for an in-flight online action before acknowledging this Inventory visit.
    // Never let an acknowledgement spill into another character's inventory.
    if(previous==='Inventory'&&tab!=='Inventory')inventorySeenAfterExit.current=scope;
    if(!scope||inventorySeenAfterExit.current!==scope){inventorySeenAfterExit.current=null;return;}
    if(tab==='Inventory'||serverGameplayEnabled&&(online.busy||online.pending))return;
    inventorySeenAfterExit.current=null;
    if(!current||!shouldAcknowledgeInventoryOnExit('Inventory',tab,current))return;
    if(serverGameplayEnabled){void perform({type:'inventory_seen_all'},false);return;}
    void commit(acknowledgeAllInventoryItems(current));
  },[tab,online.busy,online.pending,state?.character?.id]);
  const languageRef=useRef<Language>(recoveryLanguage);
  languageRef.current=state?.settings.language??recoveryLanguage;
  function showAlert(...[title,message,buttons,options]:Parameters<typeof gameAlert.alert>){
    const language=languageRef.current;
    gameAlert.alert(appText(language,title),message===undefined?undefined:appText(language,message),buttons?.map(button=>({...button,text:button.text===undefined?undefined:appText(language,button.text)})),options);
  }
  const appStateRef=useRef(AppState.currentState);
  const settlingRef=useRef(false);
  const onlineStartupSettlementAccountRef=useRef<string|undefined>(undefined);
  const onlinePendingRecoveryArrivalRef=useRef<string|undefined>(undefined);
  const initialCharacterAtLaunchRef=useRef<boolean|undefined>(undefined);
  const [onlineStartupRewardsReadyKey,setOnlineStartupRewardsReadyKey]=useState<string|undefined>();
  const [showAdminQa,setShowAdminQa]=useState(false);
  const [creatingRoster,setCreatingRoster]=useState(false);
  const [creationWelcome,setCreationWelcome]=useState<{name:string;classId:ClassId}|null>(null);
  const [versionGate,setVersionGate]=useState<VersionGateResult|null>(null);
  const [versionGateChecked,setVersionGateChecked]=useState(!serverGameplayEnabled);
  const [releaseNotes,setReleaseNotes]=useState<ReleaseNote[]>([]);
  const [releaseSeen,setReleaseSeen]=useState(false);
  const [releaseSeenLoaded,setReleaseSeenLoaded]=useState(false);
  const [firstInstalledRelease,setFirstInstalledRelease]=useState<string|null>(null);
  const [firstInstalledReleaseLoaded,setFirstInstalledReleaseLoaded]=useState(false);
  const [optionalUpdateSeen,setOptionalUpdateSeen]=useState(false);
  const [optionalUpdateSeenLoaded,setOptionalUpdateSeenLoaded]=useState(false);
  const [showWhatsNew,setShowWhatsNew]=useState(false);
  const releaseSeenKey='veldryn.release.seen.'+APP_BUILD_INFO.version;
  const firstInstalledReleaseKey='veldryn.release.first-installed-version';
  const availableUpdateVersion=versionGate?.updateAvailable?versionGate.policy?.latestVersion:undefined;
  const optionalUpdateSeenKey=availableUpdateVersion?'veldryn.optional-update.seen.'+availableUpdateVersion:undefined;
  const hasUnseenUpdate=!!availableUpdateVersion&&!optionalUpdateSeen||(releaseSeenLoaded&&!releaseSeen&&shouldAutoShowReleaseNotes(releaseNotes,APP_BUILD_INFO.version,false));
  const closeWhatsNew=()=>{
    setShowWhatsNew(false);
    if(releaseNotes.some(note=>note.version===APP_BUILD_INFO.version)){
      setReleaseSeen(true);
      void AsyncStorage.setItem(releaseSeenKey,'1').catch(()=>{});
    }
    if(optionalUpdateSeenKey){
      setOptionalUpdateSeen(true);
      void AsyncStorage.setItem(optionalUpdateSeenKey,'1').catch(()=>{});
    }
  };
  const [showChatOverlay,setShowChatOverlay]=useState(false);
  const [chatInitialChannel,setChatInitialChannel]=useState<'world'|'guild'|'party'>('world');
  const [socialInitialTab,setSocialInitialTab]=useState<SocialHubTab>('party');
  const [showCoopUiGallery,setShowCoopUiGallery]=useState(false);
  const [dungeonFlowActive,setDungeonFlowActive]=useState(false);
  const [pendingEventLiveId,setPendingEventLiveId]=useState<string|undefined>();
  const [guildInitialPve,setGuildInitialPve]=useState(false);
  const [guildMembershipRevision,setGuildMembershipRevision]=useState(0);
  const [eventStartPopup,setEventStartPopup]=useState<import('./src/core/types').LiveEventRuntime|null>(null);
  const startupOpacity=useRef(new Animated.Value(1)).current;
  const appEntranceOpacity=useRef(new Animated.Value(1)).current;
  const appEntranceY=useRef(new Animated.Value(0)).current;
  const [startupOverlayVisible,setStartupOverlayVisible]=useState(true);
  const versionGateOwnsScreen=!!(versionGate?.maintenanceMode&&versionGate.policy)||!!(versionGate?.updateRequired&&versionGate.policy);
  const startupBlocking=!versionGateChecked||(!versionGateOwnsScreen&&(serverGameplayEnabled
    ?auth.loading||online.loading||!!(auth.session&&!auth.recovering&&online.snapshot&&!ready)
    :!ready));
  useEffect(()=>{
    startupOpacity.stopAnimation();appEntranceOpacity.stopAnimation();appEntranceY.stopAnimation();
    if(startupBlocking){
      startupOpacity.setValue(1);appEntranceOpacity.setValue(1);appEntranceY.setValue(0);setStartupOverlayVisible(true);return;
    }
    const reduced=state?.settings.reduceMotion===true;
    setStartupOverlayVisible(true);
    startupOpacity.setValue(1);appEntranceOpacity.setValue(reduced?1:.94);appEntranceY.setValue(reduced?0:4);
    if(reduced){startupOpacity.setValue(0);setStartupOverlayVisible(false);return;}
    Animated.parallel([
        Animated.timing(startupOpacity,{toValue:0,duration:240,useNativeDriver:true}),
        Animated.timing(appEntranceOpacity,{toValue:1,duration:260,useNativeDriver:true}),
        Animated.timing(appEntranceY,{toValue:0,duration:260,useNativeDriver:true}),
      ]).start(({finished})=>{if(finished)setStartupOverlayVisible(false);});
    return()=>{startupOpacity.stopAnimation();appEntranceOpacity.stopAnimation();appEntranceY.stopAnimation();};
  },[startupBlocking,state?.settings.reduceMotion,startupOpacity,appEntranceOpacity,appEntranceY]);
  useEffect(()=>{let alive=true;
    const check=async()=>{try{const result=await Promise.race([fetchAppVersionGate(),new Promise<null>(resolve=>setTimeout(()=>resolve(null),2500))]);if(alive&&result)setVersionGate(result);}finally{if(alive)setVersionGateChecked(true);}};
    void check();
    const listener=AppState.addEventListener('change',next=>{if(next==='active')void check();});
    return()=>{alive=false;listener.remove();};
  },[]);
  useEffect(()=>{
    let active=true;
    void AsyncStorage.getItem(releaseSeenKey).then(value=>{if(active)setReleaseSeen(value==='1')}).catch(()=>{}).finally(()=>{if(active)setReleaseSeenLoaded(true)});
    return()=>{active=false};
  },[releaseSeenKey]);
  useEffect(()=>{
    let active=true;
    if(!optionalUpdateSeenKey){setOptionalUpdateSeen(false);setOptionalUpdateSeenLoaded(true);return()=>{active=false};}
    setOptionalUpdateSeenLoaded(false);
    void AsyncStorage.getItem(optionalUpdateSeenKey).then(value=>{if(active)setOptionalUpdateSeen(value==='1')}).catch(()=>{}).finally(()=>{if(active)setOptionalUpdateSeenLoaded(true)});
    return()=>{active=false};
  },[optionalUpdateSeenKey]);
  const loadOptionalContent=!startupBlocking&&!startupOverlayVisible&&!versionGateOwnsScreen;
  const socialPollingReady=loadOptionalContent&&ready&&!auth.recovering&&!!state?.character&&(!serverGameplayEnabled||online.snapshot?.accountId===auth.session?.user.id);
  const {counts:notificationCounts,refresh:refreshSocialNotifications}=useSocialNotificationCounts(socialPollingReady);
  // Optional reminder registration must not compete with startup gameplay/auth reads.
  useDungeonWeeklyReminder(loadOptionalContent&&ready&&!auth.recovering?auth.session?.user.id:undefined,()=>setCurrentTab('Coop'));
  useEffect(()=>{
    if(!loadOptionalContent&&!showWhatsNew)return;
    return runWhileForeground(isCurrent=>{
      void fetchReleaseNotes().then(notes=>{if(isCurrent())setReleaseNotes(notes);});
    });
  },[loadOptionalContent,showWhatsNew]);
  useEffect(()=>{
    // New installs are quiet, even after the first character is created.
    // Legacy saves from earlier builds retain their returning-player eligibility.
    if(!ready||!state||initialCharacterAtLaunchRef.current===undefined||firstInstalledReleaseLoaded)return;
    let active=true;
    void (async()=>{
      let baseline=APP_BUILD_INFO.version;
      try{
        const stored=await AsyncStorage.getItem(firstInstalledReleaseKey);
        baseline=firstInstalledReleaseVersion(stored,initialCharacterAtLaunchRef.current===true,APP_BUILD_INFO.version);
        if(stored!==baseline)await AsyncStorage.setItem(firstInstalledReleaseKey,baseline);
      }catch{
        // Failed storage reads must not classify a fresh install as returning.
        baseline=APP_BUILD_INFO.version;
      }
      if(active){setFirstInstalledRelease(baseline);setFirstInstalledReleaseLoaded(true);}
    })();
    return()=>{active=false};
  },[ready,!!state,firstInstalledReleaseLoaded]);
  // Signed-out startup shows the account entry screen. Only explicit Continue as guest creates an anonymous account.
  const profileAttentionScope=auth.session?.user.id?`account:${auth.session.user.id}`:state?`local:${state.createdAtMs}`:'local:pending';
  const confirmProfileCustomizeExit=useCallback((action:()=>void)=>{
    if(tab!=='ProfileCustomize'||!profileCustomizeDirty){action();return;}
    setProfileDiscardAction(()=>action);
  },[tab,profileCustomizeDirty]);
  // History remembers the subpage and selection that produced a navigation.
  const navigationContext=useMemo<NavigationContext>(()=>({
    skillsMode,selectedSkill,goalActionId,goalRecipeId,questMode,questFocusOrderId,
    settingsSection,socialInitialTab,profileCustomizeSection,goalMonsterId,goalRegionId,goalDungeonId,
  }),[skillsMode,selectedSkill,goalActionId,goalRecipeId,questMode,questFocusOrderId,settingsSection,socialInitialTab,profileCustomizeSection,goalMonsterId,goalRegionId,goalDungeonId]);
  const setTab=useCallback((destination:Tab)=>{
    // Old saved Social links now open the dedicated Recruitment board.
    if(destination==='Social')destination='Recruitment';
    // Re-selecting Skills opens its hub now that detail pages have no redundant back button.
    if(destination===tab){
      if(destination==='Skills'&&selectedSkill){toolRecipeReturnRef.current=null;setSelectedSkill(undefined);setGoalActionId(undefined);setGoalRecipeId(undefined);}
      if(destination==='Settings'&&settingsSection)setSettingsSection(undefined);
      return;
    }
    if(isFeatureHubPreviewRoute(destination)&&!FEATURE_HUB_QA_ENABLED)return;
    if(destination==='Rankings'&&!RANKINGS_RELEASED)return;
    const current=stateRef.current,lockReason=current?earlyFeatureLockReason(current,destination):'';
    if(lockReason){showAlert('Locked for now',lockReason);return;}
    confirmProfileCustomizeExit(()=>{
      setProfileCustomizeDirty(false);
      setTabHistory(history=>rememberScreen(history,{route:tab,context:navigationContext},destination));
      setSettingsSection(undefined);
      setTransitionKind(screenTransitionFor(tab,destination));
      setCurrentTab(destination);
    });
  },[tab,selectedSkill,settingsSection,navigationContext,confirmProfileCustomizeExit]);
  const openChatEmoteSettings=useCallback(()=>{
    // Dismiss the composer keyboard and leave the constrained chat modal.
    Keyboard.dismiss();
    setShowChatOverlay(false);
    setTab('Settings');
    setSettingsSection('chat');
    setFocusChatEmotes(true);
  },[setTab]);
  const goBack=useCallback(()=>{
    if(showChatOverlay){setShowChatOverlay(false);return true;}
    if(showAdminQa){setShowAdminQa(false);return true;}
    if(showCoopUiGallery){setShowCoopUiGallery(false);return true;}
    if(tab==='Skills'&&toolRecipeReturnRef.current){
      const source=toolRecipeReturnRef.current;toolRecipeReturnRef.current=null;
      setSkillsMode(source.mode);setSelectedSkill(source.skillId);setGoalActionId(source.actionId);setGoalRecipeId(source.recipeId);
      return true;
    }
    if(tab==='Skills'&&selectedSkill&&!skillsOpenedAsLink){setSelectedSkill(undefined);setGoalActionId(undefined);setGoalRecipeId(undefined);return true;}
    confirmProfileCustomizeExit(()=>{
      setProfileCustomizeDirty(false);
      const {previous,remaining}=returnToPreviousScreen(tabHistory,tab,destination=>{
        const current=stateRef.current;
        return !(destination==='Rankings'&&!RANKINGS_RELEASED)&&(!current||!earlyFeatureLockReason(current,destination));
      });
      setTabHistory(remaining);
      if(!previous){
        setSettingsSection(undefined);
        if(tab!=='Home'){setTransitionKind(screenTransitionFor(tab,'Home',true));setCurrentTab('Home');}
        return;
      }
      const {context}=previous;
      setSettingsSection(previous.route==='Settings'?context.settingsSection:undefined);
      if(previous.route==='Skills'){
        setSkillsMode(context.skillsMode);
        setSelectedSkill(context.selectedSkill);
        setGoalActionId(context.goalActionId);
        setGoalRecipeId(context.goalRecipeId);
      }
      if(previous.route==='Quests'){setQuestMode(context.questMode);setQuestFocusOrderId(context.questFocusOrderId);}
      if(previous.route==='Social'||previous.route==='Recruitment')setSocialInitialTab(context.socialInitialTab);
      if(previous.route==='ProfileCustomize')setProfileCustomizeSection(context.profileCustomizeSection);
      if(previous.route==='Combat')setGoalMonsterId(context.goalMonsterId);
      if(previous.route==='World')setGoalRegionId(context.goalRegionId);
      if(previous.route==='Coop')setGoalDungeonId(context.goalDungeonId);
      setTransitionKind(screenTransitionFor(tab,previous.route,true));
      setCurrentTab(previous.route==='Social'?'Recruitment':previous.route);
    });
    return true;
  },[showChatOverlay,showAdminQa,showCoopUiGallery,tab,tabHistory,selectedSkill,skillsOpenedAsLink,settingsSection,viewportWidth,confirmProfileCustomizeExit]);
  const backSwipe=useMemo(()=>PanResponder.create({
    onMoveShouldSetPanResponder:(_event,gesture)=>gesture.x0<=32&&gesture.dx>12&&Math.abs(gesture.dx)>Math.abs(gesture.dy)*1.25,
    onPanResponderRelease:(_event,gesture)=>{if(gesture.dx>=72&&gesture.vx>=0)goBack();},
    onPanResponderTerminate:()=>{},
  }),[goBack]);
  const loadGame=useCallback(async()=>{setReady(false);setLoadError('');try{setRecoveryLanguage(await repo.loadLanguage());const saved=await repo.load();if(initialCharacterAtLaunchRef.current===undefined)initialCharacterAtLaunchRef.current=!!saved?.character;const restored=retireGoalPlanner(normalizeProfileIcon(migrateRetiredStoryRewards(saved??newGame(Date.now()),Date.now())));const startup=saved?settleStartupActivity(restored,Date.now()):{state:restored,reward:null,activity:null};const next=startup.state;if(saved)queueCustomizationUnlocks(restored,next);stateRef.current=next;setState(next);setRecoveryLanguage(next.settings.language);if(startup.reward)setCollected({reward:startup.reward,activity:startup.activity,welcomeBack:true,welcomeReport:buildWelcomeBackFromStates(restored,next,startup.reward,startup.activity),progressionMoments:rewardProgressionMoments(restored,next)});if(saved){try{await repo.save(next)}catch{showAlert('Save upgrade pending','Your progress loaded, but the upgraded save could not be written yet. Keep the app open and try another saved action.')}}}catch(error){stateRef.current=null;setState(null);setLoadError(error instanceof Error?error.message:'The local save could not be read.')}finally{setReady(true)}},[]);
  useEffect(()=>{if(!serverGameplayEnabled)void loadGame()},[loadGame]);
  useEffect(()=>{if(!serverGameplayEnabled)return;const snapshot=online.snapshot,next=snapshot?.state?retireGoalPlanner(migrateRetiredStoryRewards(snapshot.state,Date.now())):null,before=stateRef.current;queuePreparationNotices(before,next);if(before&&next&&before.createdAtMs===next.createdAtMs)queueCustomizationUnlocks(before,next);if(!before&&next&&initialCharacterAtLaunchRef.current===undefined)initialCharacterAtLaunchRef.current=!!next.character;if(!before&&next&&snapshot?.reward&&rewardHasProgress(snapshot.reward)){setCollected({reward:snapshot.reward,activity:snapshot.activity??null,welcomeBack:true,progressionMoments:[]});}stateRef.current=next;setState(next);setLoadError('');},[online.snapshot]);
  // Loading-only changes must not rerun save migrations or reward/unlock projections.
  useEffect(()=>{if(serverGameplayEnabled){setReady(!online.loading);setLoadError('');}},[online.loading]);
  useEffect(()=>{
    const snapshot=online.snapshot;
    if(!auth.session?.user.id){onlineStartupSettlementAccountRef.current=undefined;onlinePendingRecoveryArrivalRef.current=undefined;return;}
    const arrivalKey=snapshot?`${snapshot.accountId}:${online.foregroundRevision}`:undefined;
    if(!serverGameplayEnabled||!snapshot?.state||online.loading||online.busy)return;
    if(online.pending){
      // Replay the original durable request once per arrival, even if the
      // global retry control cannot receive touches. Never discard its ID.
      if(onlinePendingRecoveryArrivalRef.current!==arrivalKey){
        onlinePendingRecoveryArrivalRef.current=arrivalKey;
        void perform();
      }
      return;
    }
    if(onlineStartupSettlementAccountRef.current===arrivalKey)return;
    // The initial snapshot may have unclaimed offline rewards; complete settlement
    // before scheduling a release announcement. Pending commands are recovered
    // separately; waiting for them must never block navigation or touch input.
    onlineStartupSettlementAccountRef.current=arrivalKey;
    if(snapshot.state.character&&(snapshot.state.activity||snapshot.state.character.classTraining)){
      void perform({type:'claim'},true,true).finally(()=>{
        setOnlineStartupRewardsReadyKey(arrivalKey);
      });
    }else{
      setOnlineStartupRewardsReadyKey(arrivalKey);
    }
  },[online.snapshot,online.foregroundRevision,online.loading,online.busy,online.pending,auth.session?.user.id]);
  useEffect(()=>{stateRef.current=state},[state]);
  useEffect(()=>{const characterId=state?.character?.id;if(!characterId){setTutorialCompleted([]);setTutorialDismissedId(undefined);return;}let active=true;void loadFirstSessionTutorialCompleted(characterId).then(ids=>{if(active)setTutorialCompleted(ids)});return()=>{active=false};},[state?.character?.id]);
  const tutorialStep=useMemo(()=>state?.character?firstSessionTutorialStep(state,tutorialCompleted):undefined,[state,tutorialCompleted]);
  const visibleTutorialStep=tutorialStep?.id===tutorialDismissedId?undefined:tutorialStep;
  const mainScreenTour=mainScreenTourIndex===undefined?undefined:mainScreenTourStep(mainScreenTourIndex);
  useEffect(()=>{if(!state)return;let active=true;setUnlockInboxLoaded(false);setUnlockInbox([]);
    void (async()=>{
      const [keys,stored]=await Promise.all([loadProfileAttentionKeys(profileAttentionScope),loadUnlockInbox(profileAttentionScope)]);
      const legacy=legacyUnreadUnlockEntries(keys,state,Date.now());
      // Migrate older local unread markers only after the inbox write succeeds.
      if(legacy.length){try{await addUnlockInboxEntries(profileAttentionScope,legacy);await clearProfileAttentionKeys(profileAttentionScope)}catch{/* Retain old markers for a future migration attempt. */}}
      if(active)setUnlockInbox(current=>mergeUnlockInbox(mergeUnlockInbox(stored,legacy),current));
    })().catch(()=>{}).finally(()=>{if(active)setUnlockInboxLoaded(true)});
    return()=>{active=false};
  },[profileAttentionScope,!!state]);
  useEffect(()=>{if(tab!=='NewUnlocks'||!unlockInboxLoaded)return;
    setUnlockInbox(current=>markUnlockInboxSeen(current));
    void markUnlockInboxRead(profileAttentionScope).catch(()=>{});
  },[tab,profileAttentionScope,unlockInboxLoaded]);
  const syncLiveEventRuntime=useCallback(async(isCurrent:()=>boolean)=>{if(!EVENTS_RELEASED||!onlineConfigured)return;try{const runtime=await fetchActiveEventRuntime();if(!isCurrent())return;const current=stateRef.current;if(!current)return;const before=current.account.liveEvent??null,nextRuntime=runtime??null;if(JSON.stringify(before)!==JSON.stringify(nextRuntime)){const next={...current,account:{...current.account,liveEvent:runtime}};stateRef.current=next;setState(next);}
    const announcedAt=Date.now(),announcementScope=auth.session?.user.id??current.character?.id??'device';
    if(runtime&&tabRef.current==='Events'){void eventAnnouncementStore.markSeen(announcementScope,runtime,announcedAt);setEventStartPopup(null);}
     else if(runtime&&canAnnounceLiveEventStart(current.character?.level)&&await eventAnnouncementStore.claim(announcementScope,runtime,announcedAt)&&isCurrent()&&tabRef.current!=='Events')setEventStartPopup(runtime);
  }catch{/* Event registry sync is best-effort; gameplay refresh remains authoritative. */}},[auth.session?.user.id]);
  useEffect(()=>{
    if(!loadOptionalContent||!ready||!EVENTS_RELEASED||!onlineConfigured)return;
    let inFlight:(()=>boolean)|undefined;
    return runWhileForeground(isCurrent=>{
      if(inFlight?.())return;
      inFlight=isCurrent;
      void syncLiveEventRuntime(isCurrent).finally(()=>{if(inFlight===isCurrent)inFlight=undefined;});
    },60_000);
  },[loadOptionalContent,ready,syncLiveEventRuntime]);
   useEffect(()=>{if(tab!=='Events')return;setEventStartPopup(null);const runtime=state?.account.liveEvent;if(!runtime)return;void eventAnnouncementStore.markSeen(auth.session?.user.id??state?.character?.id??'device',runtime);},[tab,auth.session?.user.id,state?.account.liveEvent?.eventId,state?.account.liveEvent?.startsAtMs,state?.character?.id]);
  const needsLiveClock=!!state?.activity||!!state?.character?.classTraining;
  const needsFastClock=needsLiveClock&&(tab==='Home'||tab==='Combat');
  // This is presentation-only. Server authority and reward settlement do not poll on this clock.
  useEffect(()=>runWhileForeground(()=>setNow(Date.now()),needsFastClock?2_000:needsLiveClock?15_000:60_000),[needsFastClock,needsLiveClock]);
  useEffect(()=>{if(!preparationNotices.length||collected||forgeResults)return;const timer=setTimeout(()=>setPreparationNotices(current=>current.slice(1)),4500);return()=>clearTimeout(timer)},[preparationNotices,collected,forgeResults]);
  useEffect(()=>{if(!masteryNotices.length||preparationNotices.length||collected||forgeResults)return;const timer=setTimeout(()=>setMasteryNotices([]),4500);return()=>clearTimeout(timer)},[masteryNotices,preparationNotices.length,collected,forgeResults]);
  useEffect(()=>{if(!forgeClaimFeedback)return;const timer=setTimeout(()=>setForgeClaimFeedback(null),4500);return()=>clearTimeout(timer)},[forgeClaimFeedback]);
  useEffect(()=>{if(tab!=='Skills'){toolRecipeReturnRef.current=null;setSelectedSkill(undefined);setGoalActionId(undefined);setGoalRecipeId(undefined)}},[tab]);
  // Global announcements share one presentation slot; foreground user dialogs win.
  const popupBlocked=!!profileDiscardAction||creatingRoster||showChatOverlay||showAdminQa||showCoopUiGallery
    ||startupBlocking||startupOverlayVisible||offlineSettling||hasBlockingAlert;
  const popupCandidates={
    characterWelcome:!!creationWelcome,activityReward:!!collected,storyBoss:!!storyBossBattle,
    exceptionalForge:!!forgeClaimAllResults?.length||!!forgeResults?.some(isExceptionalForgeResult),mainTour:mainScreenTourIndex!==undefined,
    featureUnlock:featureUnlockMoments.length>0,
    firstSession:!!visibleTutorialStep,eventStart:!!eventStartPopup&&canAnnounceLiveEventStart(state?.character?.level),
    whatsNew:showWhatsNew,
  };
  const activeGlobalPopup=selectGlobalPopup({...popupCandidates,blocked:popupBlocked});
  const popupBeforeWhatsNew=popupBlocked||!!forgeResults?.length||!!forgeClaimAllResults?.length||selectGlobalPopup({...popupCandidates,whatsNew:false})!==null;
  const onlineStartupArrivalKey=online.snapshot?`${online.snapshot.accountId}:${online.foregroundRevision}`:undefined;
  const readyForWhatsNew=ready&&!!state?.character&&versionGateChecked&&!versionGate?.updateRequired&&!versionGate?.maintenanceMode
    &&!startupBlocking&&!startupOverlayVisible&&!offlineSettling&&!popupBeforeWhatsNew
    &&(!serverGameplayEnabled||(!!onlineStartupArrivalKey&&onlineStartupRewardsReadyKey===onlineStartupArrivalKey&&!online.loading&&!online.busy&&!online.pending));
  const autoWhatsNewDue=firstInstalledReleaseLoaded&&releaseSeenLoaded&&optionalUpdateSeenLoaded
    &&shouldAutoAnnounceReleaseNotes({
      firstInstalledVersion:firstInstalledRelease,installedVersion:APP_BUILD_INFO.version,notes:releaseNotes,seen:releaseSeen,
      optionalUpdateAvailable:!!availableUpdateVersion,optionalUpdateSeen,startupReady:readyForWhatsNew,
    });
  useEffect(()=>{
    if(!autoWhatsNewDue||showWhatsNew)return;
    // Allow asynchronous reward and startup announcements to enter their queues first.
    const timer=setTimeout(()=>setShowWhatsNew(true),850);
    return()=>clearTimeout(timer);
  },[autoWhatsNewDue,showWhatsNew]);
  // If a source link opened a specific skill, Back returns to that source; if the player
  // chose a skill within Skills, Back first returns to the skill hub.
  useEffect(()=>{setSkillsOpenedAsLink(tab==='Skills'&&Boolean(selectedSkill));},[tab]);
  // The Party provider already loads its initial snapshot. Refresh only when
  // the same signed-in account actually switches fighters, avoiding an extra
  // RPC during startup and never mixing different accounts' social state.
  const lastPartyCharacterRef=useRef<{accountId:string;characterId:string}|null>(null);
  const refreshPartySocial=partySocial.refresh;
  useEffect(()=>{
    const accountId=auth.session?.user.id,characterId=state?.character?.id;
    if(!serverGameplayEnabled||!accountId||!characterId){
      lastPartyCharacterRef.current=null;
      return;
    }
    const previous=lastPartyCharacterRef.current;
    lastPartyCharacterRef.current={accountId,characterId};
    if(previous?.accountId===accountId&&previous.characterId!==characterId){
      void refreshPartySocial();
    }
  },[auth.session?.user.id,state?.character?.id,refreshPartySocial]);
  // Do not return into another character's detail history after a roster switch.
  useEffect(()=>{setTabHistory([]);},[state?.character?.id]);
  useEffect(()=>{if(tab!=='Combat')setGoalMonsterId(undefined)},[tab]);
  useEffect(()=>{const subscription=BackHandler.addEventListener('hardwareBackPress',goBack);return()=>subscription.remove()},[goBack]);
  // Online foreground refresh is owned by useOnlineGame. Only the local
  // prototype needs a separate foreground settlement listener and overlay.
  useEffect(()=>{if(serverGameplayEnabled)return;
    const subscription=AppState.addEventListener('change',nextStatus=>{const wasAway=appStateRef.current==='background'||appStateRef.current==='inactive';appStateRef.current=nextStatus;if(!wasAway||nextStatus!=='active'||settlingRef.current)return;const current=stateRef.current;if(!current?.character)return;settlingRef.current=true;setOfflineSettling(true);setTimeout(()=>{const settled=settleStartupActivity(current,Date.now());const changed=settled.state!==current;if(changed){stateRef.current=settled.state;setState(settled.state);void repo.save(settled.state).catch(()=>showAlert('Save pending','Your returned progress is safe in memory, but could not be saved yet.'));}if(settled.reward){queuePreparationNotices(current,settled.state);setCollected({reward:settled.reward,activity:settled.activity,welcomeBack:true,progressionMoments:rewardProgressionMoments(current,settled.state),welcomeReport:buildWelcomeBackFromStates(current,settled.state,settled.reward,settled.activity)});}setOfflineSettling(false);settlingRef.current=false},0)});return()=>subscription.remove()},[]);
  useEffect(()=>{const multiplier=state?.settings.textScale??1.5;for(const component of [Text,TextInput]){const scalable=component as typeof component&{defaultProps?:Record<string,unknown>};scalable.defaultProps={...(scalable.defaultProps??{}),allowFontScaling:true,maxFontSizeMultiplier:multiplier}}},[state?.settings.textScale]);
  const coopEntrySource=useMemo(()=>__DEV__&&!serverGameplayEnabled&&!coopOnlineConfigured?createCoopDungeonFixtureSource(state?.settings.language??recoveryLanguage,state?.character):realCoopEntrySource,[state?.settings.language,state?.character,recoveryLanguage]);
  function queueMasteryNotice(before:GameState|null|undefined,after:GameState|null|undefined){const moments=masteryRankProgressionMoments(before,after);if(moments.length)setMasteryNotices(moments);}
  function queuePreparationNotices(before:GameState|null|undefined,after:GameState|null|undefined){const notices=recipePreparationTransitionNotices(before,after);if(!notices.length)return;setPreparationNotices(current=>{const seen=new Set(current.map(row=>row.goalId+':'+row.kind+':'+row.message)),next=[...current];for(const notice of notices){const key=notice.goalId+':'+notice.kind+':'+notice.message;if(!seen.has(key)){seen.add(key);next.push(notice);}}return next.slice(-6);});}
  function queueFeatureUnlockMoments(before:GameState|null|undefined,next:GameState|null|undefined){
    const moments=newlyUnlockedEarlyFeatures(before,next);if(!moments.length)return;
    setFeatureUnlockMoments(current=>{const seen=new Set(current.map(row=>row.id)),out=[...current];for(const moment of moments)if(!seen.has(moment.id)){seen.add(moment.id);out.push(moment);}return out;});
  }
  function queueCustomizationUnlocks(before:GameState|null,next:GameState){
    if(!before)return;
    const profile=newlyUnlockedProfileRewards(before,next).map(row=>({key:row.kind+':'+row.id,kind:row.kind,name:row.name,detail:row.source?row.source.label+' · '+row.source.detail:undefined} satisfies CosmeticUnlockNotice));
    const icons=newlyUnlockedProfileIcons(before,next).map(row=>({key:'profile-icon:'+row.id,kind:'profile_icon' as const,name:row.name,detail:'Profile icon'}));
    const other=newlyUnlockedOtherCosmetics(before,next);
    if(!profile.length&&!icons.length&&!other.length)return;
    const scope=auth.session?.user.id?`account:${auth.session.user.id}`:`local:${next.createdAtMs}`;
    const viewing=tabRef.current==='NewUnlocks';
    const entries=newUnlockInboxEntries([...profile,...icons,...other],Date.now()).map(row=>viewing?{...row,seen:true}:row);
    setUnlockInbox(current=>mergeUnlockInbox(current,entries));
    void addUnlockInboxEntries(scope,entries).catch(()=>{});

  }
  async function perform(command?:GameCommand,presentRewards=true,welcomeBack=false,silentFailure=false,throwOnFailure=false){if(welcomeBack)setOfflineSettling(true);try{
    const before=stateRef.current,result=await online.execute(command,welcomeBack);
    setOnlineActionError('');
    queuePreparationNotices(before,result.state);stateRef.current=result.state;setState(result.state);queueCustomizationUnlocks(before,result.state);
    if(result.executedCommand.type==='quest')queueFeatureUnlockMoments(before,result.state);
    const feedback=commandProgressFeedback(result.executedCommand,before,result);
    const recoveredFeedback=result.recovered?commandProgressFeedback(result.recovered.executedCommand,before,result.recovered):null;
    // A previous claim may have been committed while its response was lost.
    // Prefer its recovered reward receipt over an incidental later settlement.
    if(recoveredFeedback?.collected)setCollected({...recoveredFeedback.collected,welcomeBack:false});
    else if(presentRewards){if(feedback.collected)setCollected({...feedback.collected,welcomeBack,...(welcomeBack&&before?{welcomeReport:buildWelcomeBackFromStates(before,result.state,feedback.collected.reward,feedback.collected.activity)}:{})});else if(feedback.masteryNotices.length)setMasteryNotices(feedback.masteryNotices);}
    return result;
  }catch(error){
    const message=error instanceof Error?error.message:'Please retry.';
    if(command&&['withdraw','deposit','sell','bulk_transfer','bulk_sell'].includes(command.type)&&/gameplay action is already being saved/i.test(message))return null;
    if(command?.type==='craft_claim_all' && message==='invalid_command' && !forgeClaimAllInFlight.current){
      forgeClaimAllInFlight.current=true;
      try{
        const current=stateRef.current;
        if(!current)return null;
        const finished=equipmentCraftQueueModel(current,Date.now()).jobs.filter(job=>job.ready);
        let count=0;
        const results:ForgeCraftResult[]=[];
        // The bulk entry is equivalent to perform({type:'craft_claim_all'},true,false,true);
        // If an older deployed backend rejects it, retry signed claims one job at a time.
        for(const job of finished){
          const claim=await perform({type:'craft_claim',args:{id:job.id}},false,false,true);
          if(!claim)break;
          count++;
          if(claim.forgeResults?.length)results.push(...claim.forgeResults);
        }
        if(results.length){setForgeResults(null);setForgeClaimAllPendingCount(Math.max(0,finished.length-count));setForgeClaimAllResults(results);}
        if(!count)setOnlineActionError('The bulk Forge claim failed and individual claims could not complete. Your finished jobs remain safe in the queue.');
        else if(count<finished.length)setOnlineActionError(`${count} of ${finished.length} finished Forge jobs were claimed. The remaining jobs are safe in the queue.`);
        else if(!results.length)setForgeClaimFeedback({message:count+' finished Forge jobs claimed.',tone:'success'});
        return null;
      }finally{forgeClaimAllInFlight.current=false;}
    }
    const playerMessage=playerFacingGameplayError(message);
    if(!silentFailure)setOnlineActionError(message==='pending_action'?appText(languageRef.current,playerMessage):playerMessage);
    // Send Ascension failures to the action sheet, not just the global banner.
    if(command?.type==='companion_ascend'||throwOnFailure)throw new Error(playerFacingGameplayError(message));
    return null;
  }finally{if(welcomeBack)setOfflineSettling(false);}}
  async function inventoryCommand(command:GameCommand,local:()=>GameState){
    if(serverGameplayEnabled){const result=await perform(command);if(!result)throw new Error('Inventory action was not confirmed. Please retry.');return;}
    await commit(local());
  }
  async function applyOnlineAdminQa(classId:ClassId){const result=await perform({type:'qa_prepare',args:{classId}});if(!result)throw new Error('Admin QA profile was not confirmed by the server.');}
  async function refillOnlineAdminQa(){const result=await perform({type:'qa_refill'});if(!result)throw new Error('Admin QA refill was not confirmed by the server.');}
  async function saveNameStyle(style:PlayerNameStylePreference){
    if(serverGameplayEnabled)return online.saveNameStyle(style);
    const current=stateRef.current;if(!current)throw new Error('Load your character first.');
    const next=savePlayerNameStyle(current,style);await repo.save(next);
    stateRef.current=next;setState(next);return normalizePlayerNameStyle(next.account.playerNameStyle);
  }
  async function runCompanionCommand(command:GameCommand){
    const startsActivity=['start','explore','class_training','faith_practice','alchemy_start','processing_start','queue_start'].includes(command.type);
    if(serverGameplayEnabled){
      const result=await perform(command,!startsActivity);if(!result)throw new Error('Companion action was not confirmed.');
      if(command.type==='companion_boss_rematch'&&result.won===false)throw new Error(result.message??'Fallen Knight rematch lost.');
      return;
    }
    const current=stateRef.current;if(!current)throw new Error('Load your character first.');
    const result=executeGameCommand(current,command,Date.now());
    await commit(result.state);
    const feedback=commandProgressFeedback(command,current,result);
    if(!startsActivity){if(feedback.collected)setCollected(feedback.collected);else if(feedback.masteryNotices.length)setMasteryNotices(feedback.masteryNotices);}
    if(command.type==='companion_boss_rematch'&&result.won===false)throw new Error(result.message??'Fallen Knight rematch lost.');
  }
  // Coalesce rapid palette taps and save only the latest choice. Gameplay stays
  // server-owned, while the selected colors are visible immediately.
  function scheduleThemeSave(delay=140){
    if(themeSaveTimerRef.current!==null)clearTimeout(themeSaveTimerRef.current);
    themeSaveTimerRef.current=setTimeout(()=>{themeSaveTimerRef.current=null;void flushThemeSave();},delay);
  }
  async function flushThemeSave(){
    const requested=requestedThemeRef.current;
    if(!requested||themeSavingRef.current||(serverGameplayEnabled&&(online.busy||online.pending)))return;
    const current=stateRef.current;
    if(!current)return;
    themeSavingRef.current=true;
    try{
      if(current.settings.uiTheme!==requested){
        if(serverGameplayEnabled){
          // Only settings are sent, never a full gameplay-state save.
          await perform({type:'settings',args:{settings:settingsForOnlineCommand({...current.settings,uiTheme:requested})}},false);
        }else{
          // Skip gameplay migrations, reward checks and unlock scans for a palette preference.
          const next={...current,settings:{...current.settings,uiTheme:requested}};
          stateRef.current=next;setState(next);
          try{await repo.save(next);}
          catch{
            const latest=stateRef.current;
            if(latest?.settings.uiTheme===requested){
              const rollback={...latest,settings:{...latest.settings,uiTheme:current.settings.uiTheme}};
              stateRef.current=rollback;setState(rollback);
            }
            showAlert('Local save failed','Theme was not saved. Please try again.');
          }
        }
      }
    }finally{
      themeSavingRef.current=false;
      if(requestedThemeRef.current!==requested)scheduleThemeSave(0);
      else{requestedThemeRef.current=undefined;setThemePreviewId(undefined);}
    }
  }
  function selectUiTheme(id:UiThemeId){
    if((requestedThemeRef.current??stateRef.current?.settings.uiTheme)===id)return;
    requestedThemeRef.current=id;
    setThemePreviewId(id);
    scheduleThemeSave();
  }
  // An online gameplay action can already be saving when the player requests a
  // palette. Retry once that action clears rather than issuing a competing command.
  useEffect(()=>{if(!online.busy&&!online.pending&&requestedThemeRef.current&&!themeSavingRef.current)scheduleThemeSave(0);},[online.busy,online.pending]);
  useEffect(()=>()=>{if(themeSaveTimerRef.current!==null)clearTimeout(themeSaveTimerRef.current);},[]);
  async function commit(candidate:GameState,options?:{confirmSaved?:boolean}){
    const current=stateRef.current;
    if(serverGameplayEnabled){
      if(!current)return;
      // Ignore already-applied appearances before classifying settings or profile commands.
      if(candidate===current)return;
      // Serialize the candidate once. Retain exact existing JSON equality semantics
      // so this optimization cannot admit additional server-owned changes.
      const serializedCandidate=JSON.stringify(candidate);
      if(serializedCandidate===JSON.stringify(current))return;
      if(serializedCandidate===JSON.stringify({...current,settings:candidate.settings})){await perform({type:'settings',args:{settings:settingsForOnlineCommand(candidate.settings)}});return;}
      if(candidate.activity===null&&serializedCandidate===JSON.stringify({...current,activity:null})){await perform({type:'stop'});return;}
      const profileKeys=['profileIconId','profileTitle','profileBackgroundId','profileBorderId','profileEffectId','selectedCosmeticPetId'] as const;
      if(current.character&&candidate.character){const patch=Object.fromEntries(profileKeys.map(key=>[key,candidate.character![key]]));
        if(serializedCandidate===JSON.stringify({...current,character:{...current.character,...patch}})){const changed=profileKeys.filter(key=>current.character![key]!==candidate.character![key]);if(!changed.length)return;const result=await perform({type:'profile',args:Object.fromEntries(changed.map(key=>[key,patch[key]??null]))});if(result&&changed.includes('profileIconId')&&auth.session?.user.id&&result.state.character)publishOwnProfileIcon(result.accountId,accountProfileIconId(result.state),result.state.character.classId);return;}}
      showAlert('Server-owned progress','This change requires an online gameplay action.');return;
    }
    if(current?.character&&candidate.character&&current.character.selectedCosmeticPetId!==candidate.character.selectedCosmeticPetId){
      const patch={selectedCosmeticPetId:candidate.character.selectedCosmeticPetId};
      if(JSON.stringify(candidate)===JSON.stringify({...current,character:{...current.character,...patch}})){
        // Settle the previous Pet's activity bonus without interrupting appearance editing.
        const settled=claimActivity(current,Date.now());candidate={...settled.state,character:{...settled.state.character!,...patch}};
      }
    }
const explicitLocalIcon=current?.character&&candidate.character&&current.character.id===candidate.character.id&&candidate.character.profileIconId&&candidate.character.profileIconId!==current.character.profileIconId;
const next=normalizeProfileIcon(migrateGemPouch(migrateRetiredStoryRewards(explicitLocalIcon?selectProfileIcon(candidate,candidate.character!.profileIconId!):candidate,Date.now())));
 // For crafting, save before claiming success or updating the visible queue; a failed
 // local save must not look like a completed transaction.
 if(options?.confirmSaved)await repo.save(next);
 queuePreparationNotices(current,next);stateRef.current=next;setState(next);queueCustomizationUnlocks(current,next);queueFeatureUnlockMoments(current,next);
 if(!options?.confirmSaved){try{await repo.save(next)}catch{showAlert('Local save failed','Progress is still in memory. Keep the app open and try another action to save again.')}}}
  async function exportSave(){if(!state){showAlert('Export unavailable','No save is loaded.');return;}try{await Share.share({title:'VELDRYN save backup',message:createSaveBackup(state)})}catch(error){showAlert('Export failed',error instanceof Error?error.message:'The share sheet could not be opened.')}}
  async function importSave(raw:string){if(serverGameplayEnabled)throw new Error("Local backups cannot replace server-owned progress.");const next=normalizeProfileIcon(migrateRetiredStoryRewards(parseSaveBackup(raw),Date.now()));await repo.save(next);setState(next);setCurrentTab('Home');setTabHistory([]);showAlert('Save imported','The validated backup is now stored on this device.');}
  function presentCollected(reward:RewardBundle,activity:ActiveActivity|null,before?:GameState|null,after?:GameState|null){const progressionMoments=rewardProgressionMoments(before,after);if(rewardHasProgress(reward)||progressionMoments.length)setCollected({reward,activity,progressionMoments})}
  async function changeActivity(next?:{kind:'combat'|'gathering';id:string;tacticId?:CombatTacticId;goalId?:HuntGoalId}){
    if(!state)return;
    if(serverGameplayEnabled){await perform(next?{type:'start',args:{kind:next.kind,id:next.id,...(next.tacticId?{tacticId:next.tacticId}: {}),...(next.goalId?{goalId:next.goalId}: {})}}:{type:'stop'},!next);return;}
    try{const result=transitionActivity(state,Date.now(),next);await commit(result.state)}
    catch(error){showAlert('Cannot change activity',error instanceof Error?error.message:'Please try again.')}
  }
  function mutateActionQueue(command:GameCommand,openHome=false){
    if(!state)return;
    if(serverGameplayEnabled){void perform(command,command.type!=='queue_start').then(result=>{if(result&&openHome)setTab('Home')});return;}
    try{const result=executeGameCommand(state,command,Date.now());void commit(result.state);if(openHome)setTab('Home')}
    catch(error){showAlert('Action queue',error instanceof Error?error.message:'Please try again.')}
  }
  function queueActivity(next:QueuedActivity|{kind:'combat'|'gathering';id:string;tacticId?:CombatTacticId;goalId?:HuntGoalId}){
    const queued='targetId'in next?next:{kind:next.kind,targetId:next.id,...(next.tacticId?{combatTacticId:next.tacticId}:{}),...(next.goalId?{huntGoalId:next.goalId}:{})};
    mutateActionQueue({type:'queue_add',args:{kind:queued.kind,id:queued.targetId,...(queued.combatTacticId?{tacticId:queued.combatTacticId}:{}),...(queued.huntGoalId?{goalId:queued.huntGoalId}:{}),...(queued.faithPracticeCount?{count:queued.faithPracticeCount}:{}),...(queued.goal?{goal:queued.goal}:{})}});
  }
  async function submitHomeQueueCommand(command:GameCommand):Promise<boolean>{
    if(serverGameplayEnabled)return !!(await perform(command,false));
    const current=stateRef.current;
    if(!current)return false;
    try{const result=executeGameCommand(current,command,Date.now());await commit(result.state);return true;}
    catch(error){showAlert('Action queue',error instanceof Error?error.message:'Please try again.');return false;}
  }
  function openQuestMode(mode:QuestMode,focusedOrderId?:string){const current=stateRef.current;if(mode==='contracts'&&current&&!earlyFeatureUnlocked(current,'contracts')){showAlert('Contract Board locked','Complete Into Ironwood to unlock regional and weekly Contracts.');return;}setQuestMode(mode);setQuestFocusOrderId(mode==='contracts'?focusedOrderId:undefined);setTab('Quests');}
  async function openWeeklyOrder(order:WeeklyOrder){
    const current=stateRef.current;
    if(!current||contractQuickStartInFlight.current)return;
    const plan=weeklyOrderQuickStartPlan(current,order);
    // Boss fights, regional problems and crafted work keep their existing manual route.
    if(plan.status==='manual'){openWorkingTowardDestination(weeklyOrderDestination(order));return;}
    if(plan.status==='blocked'){showAlert('Contract unavailable',plan.reason);return;}
    contractQuickStartInFlight.current=true;
    try{
      if(plan.needsTravel){
        // Complete travel first; never submit an activity start to an unconfirmed region.
        if(serverGameplayEnabled){
          if(!await perform({type:'travel',args:{id:plan.regionId}}))return;
        }else{
          const travelled=travelToRegion(current,plan.regionId,Date.now());
          await commit(travelled.state);
        }
      }
      const arrived=stateRef.current;
      if(!arrived)return;
      const start=weeklyOrderQuickStartPlan(arrived,order);
      if(start.status!=='ready'||start.needsTravel){
        showAlert('Contract unavailable',start.status==='blocked'?start.reason:'Unable to reach the contract activity.');
        return;
      }
      const running=arrived.activity?.targetId===start.targetId
        &&(start.kind==='combat'?arrived.activity.kind==='combat':['mining','woodcutting','fishing','herbalism'].includes(arrived.activity.kind));
      if(!running){
        if(serverGameplayEnabled){
          if(!await perform({type:'start',args:{kind:start.kind,id:start.targetId}},false))return;
        }else{
          const launched=transitionActivity(arrived,Date.now(),{kind:start.kind,id:start.targetId});
          await commit(launched.state);
        }
      }
      // Land on the exact enemy or gathering node, with its activity already running.
      openGoalAtCurrentRegion(weeklyOrderDestination(order));
    }catch(error){
      showAlert('Cannot start contract',error instanceof Error?error.message:'Please try again.');
    }finally{contractQuickStartInFlight.current=false;}
  }
  function queueWeeklyOrder(order:WeeklyOrder){
    const queued=weeklyOrderQueueActivity(order);
    if(!queued){showAlert('Action queue','This job needs manual actions and cannot be queued as one activity.');return;}
    queueActivity(queued);
  }
  function stopAtWeeklyOrderCompletion(order:WeeklyOrder){
    if(!state?.character)return;
    const id=weeklyOrderIdleRuleId(order),rules=state.character.idleRulesV40??[],existing=rules.find(rule=>rule.id===id),active=state.character.activeIdleRuleIdV40===id;
    if(active){
      const command:GameCommand={type:'idle_rules_set',args:{rules,activeId:null}};
      if(serverGameplayEnabled){void perform(command);return;}
      try{const result=executeGameCommand(state,command,Date.now());void commit(result.state);}catch(error){showAlert('Idle Rules',error instanceof Error?error.message:'Could not disable this stop rule.');}
      return;
    }
    if(!existing&&rules.length>=5){showAlert('Idle Rules','You already have 5 saved rules. Disable a Contract Board stop before adding another.');return;}
    const rule=weeklyOrderIdleRule(order,state.character.id),next=existing?rules.map(row=>row.id===id?rule:row):[...rules,rule],command:GameCommand={type:'idle_rules_set',args:{rules:next,activeId:id}};
    if(serverGameplayEnabled){void perform(command);return;}
    try{const result=executeGameCommand(state,command,Date.now());void commit(result.state);}catch(error){showAlert('Idle Rules',error instanceof Error?error.message:'Could not activate this stop rule.');}
  }
  function openGoalAtCurrentRegion(destination:WorkingTowardDestination){
    setPendingGoalDestination(undefined);setGoalRegionId(undefined);
    if(destination.kind==='combat'){setGoalMonsterId(destination.monsterId);setTab('Combat');return;}
    if(destination.kind==='skills'){
      setGoalActionId(destination.actionId);setGoalRecipeId(destination.recipeId);
      // An in-Skills recipe deep link must not re-select the bottom tab:
      // setTab('Skills') intentionally resets a detail page to the Skills hub.
      if(destination.mode){
        if(tab==='Skills'&&selectedSkill&&['mining','woodcutting','fishing'].includes(selectedSkill)&&destination.skillId==='smithing'&&destination.recipeId?.startsWith('CRAFT_')){
          toolRecipeReturnRef.current={skillId:selectedSkill,mode:skillsMode,actionId:goalActionId,recipeId:goalRecipeId};
        }
        setSelectedSkill(destination.skillId);setSkillsMode(destination.mode);if(tab!=='Skills')setTab('Skills');return;
      }
      setSelectedSkill(undefined);if(tab!=='Skills')setTab('Skills');return;
    }
    if(destination.kind==='contracts'){openQuestMode('contracts');return;}
    if(destination.kind==='inventory'){setTab('Inventory');return;}
    if(destination.kind==='dungeon'){setGoalDungeonId(destination.dungeonId);setTab('Coop');return;}
    if(destination.kind==='world'){setGoalRegionId(destination.regionId);setTab('World');}
  }
  function openWorkingTowardDestination(destination:WorkingTowardDestination){
    if((destination.kind==='combat'||destination.kind==='skills')&&destination.regionId&&destination.regionId!==state?.currentRegionId){
      setPendingGoalDestination(destination);setGoalRegionId(destination.regionId);setTab('World');return;
    }
    openGoalAtCurrentRegion(destination);
  }
  function openPreparationNotice(notice:RecipePreparationTransitionNotice){
    setPreparationNotices(current=>current.slice(1));
    if(notice.kind==='complete'||!notice.destination||notice.destination.kind==='info'){setTab('Skills');return;}
    openWorkingTowardDestination(notice.destination);
  }
  function continueGoalAfterTravel(regionId:string){
    const destination=pendingGoalDestination;setPendingGoalDestination(undefined);setGoalRegionId(undefined);
    if(!destination||!('regionId' in destination)||destination.regionId!==regionId)return;
    if(destination.kind==='combat'){setGoalMonsterId(destination.monsterId);setTab('Combat');return;}
    if(destination.kind==='skills'){setGoalActionId(destination.actionId);setGoalRecipeId(destination.recipeId);if(destination.mode){setSelectedSkill(destination.skillId);setSkillsMode(destination.mode);setTab('Skills');}else{setSelectedSkill(undefined);setTab('Skills');}}
  }
  async function quickFoodCommand(command:GameCommand){
    if(serverGameplayEnabled){if(!await perform(command,false))throw new Error('Action failed. Please try again.');return;}
    const current=stateRef.current;if(!current)throw new Error('Load your character first.');
    const result=executeGameCommand(current,command,Date.now());await commit(result.state);
  }
  function recoverStoppedCombat(){const current=stateRef.current;if(!current?.character)return;setInventoryFoodScope(current.createdAtMs+':'+current.character.id);setInventoryFoodRequest(value=>value+1);setTab('Inventory');}
  function openActiveActivity(){
    const activity=state?.activity;
    if(!activity)return;
    if(activity.kind==='combat'){setTab('Combat');return;}
    if(activity.kind==='processing'){setSelectedSkill(activity.processing?.skillId);setSkillsMode('crafting');setTab('Skills');return;}
    setSelectedSkill(activity.kind as any);
    setSkillsMode(activity.kind==='faith'?'faith':activity.kind==='alchemy'?'crafting':'gathering');
    setTab('Skills');
  }
  // The reward preview replays the settlement simulation over the whole unclaimed window
  // (up to a full AFK reserve). It is a pure function of the authoritative state and the
  // presentation clock, so unrelated root re-renders (tab changes, popups, chat, alerts)
  // reuse the last result instead of re-simulating.
  const activityPreviewMs=activityRewardPreviewClock(now,state?.activity??undefined,!!state?.character?.classTraining);
  const activityPreview=useMemo(()=>state?.character?previewActivityReward(state,activityPreviewMs):undefined,[state,activityPreviewMs]);
  // Shell projections depend on the save and presentation clock, not tab, chat,
  // modal or cosmetic-preview changes. Keep the existing time-sensitive cadence.
  const shellAttentionReady=versionGateChecked&&!versionGateOwnsScreen&&ready&&(!serverGameplayEnabled||(!auth.loading&&!online.loading&&!!auth.session&&!auth.recovering&&!!online.snapshot));
  const shellAttention=useMemo(()=>{
    if(!shellAttentionReady||!state?.character)return null;
    const companionsUnlocked=earlyFeatureUnlocked(state,'companions'),dailySuppliesUnlocked=earlyFeatureUnlocked(state,'dailySupplies'),contractsUnlocked=earlyFeatureUnlocked(state,'contracts'),friendsUnlocked=earlyFeatureUnlocked(state,'friends'),socialUnlocked=earlyFeatureUnlocked(state,'social'),guildUnlocked=earlyFeatureUnlocked(state,'guild');
    const companionAttention=companionsUnlocked?companionAttentionSummary(state,now):{total:0,hasAttention:false,expeditionClaims:0,bondRewards:0,ascensions:0,sanctuaryClaims:0,codexClaims:0,monthlyTrialClaims:0,recentUnlocks:0};
    const dailySuppliesReady=dailySuppliesUnlocked&&dailySuppliesStatus(state,now).canClaim;
    const forgeReadyCount=state.account.equipmentCraftingQueue?.length
      ? projectedEquipmentCraftingQueue(state,now).filter(job=>job.completesAtMs<=now).length
      : 0;
    const questClaims=questClaimAttention(state,now);
    const overflowStackCount=state.overflow.stacks.filter(stack=>stack.quantity>0).length;
    const lockedAccountDestinations=Object.fromEntries((['DailySupplies','AccountBonuses','Companions','Friends','Recruitment','MasteryHall','Guild','Rankings'] as MoreDestination[]).flatMap(destination=>{const reason=earlyFeatureLockReason(state,destination);return reason?[[destination,reason]]:[]})) as Partial<Record<MoreDestination,string>>;
    return {companionsUnlocked,dailySuppliesUnlocked,contractsUnlocked,friendsUnlocked,socialUnlocked,guildUnlocked,companionAttention,dailySuppliesReady,forgeReadyCount,questClaims,overflowStackCount,lockedAccountDestinations};
  },[state,now,shellAttentionReady]);
  const renderApp=()=>{
  if(!versionGateChecked)return <View style={s.startupUnderlay}/>;
  if(versionGate?.maintenanceMode&&versionGate.policy)return <UpdateRequiredScreen maintenance title={appText(languageRef.current,"VELDRYN maintenance")} message={versionGate.policy.maintenanceMessage} currentVersion={versionGate.currentVersion} onUpdate={()=>{}}/>;
  if(versionGate?.updateRequired&&versionGate.policy)return <UpdateRequiredScreen title={versionGate.policy.title} message={versionGate.policy.message} currentVersion={versionGate.currentVersion} minimumVersion={versionGate.policy.minimumVersion} onUpdate={()=>void openStoreListing()}/>;
  if(serverGameplayEnabled&&(auth.loading||online.loading))return <View style={s.startupUnderlay}/>;
  if(serverGameplayEnabled&&(!auth.session||auth.recovering))return <AccountWelcomeScreen scene={startupScene}><OnlineAccountPanel state={state??newGame(Date.now())}/></AccountWelcomeScreen>;
  if(serverGameplayEnabled&&!online.snapshot)return <SafeAreaView style={s.center}><Text style={s.txt}>{online.error||appText(languageRef.current,'Connecting…')}</Text><GameButton title={appText(languageRef.current,"Retry connection")} onPress={()=>online.refresh()}/><OnlineAccountPanel state={newGame(Date.now())}/></SafeAreaView>;
  if(!ready)return <View style={s.startupUnderlay}/>;
  if(loadError||!state)return <SafeAreaView style={s.safe}><StatusBar style="light"/><SaveRecoveryScreen language={recoveryLanguage} message={loadError||'No readable save state was returned.'} onRetry={()=>void loadGame()} onStartFresh={()=>showAlert('Delete unreadable local save?','This permanently removes the existing local data and starts a new game.',[{text:'Cancel'},{text:'Start fresh',style:'destructive',onPress:async()=>{await repo.reset();setState(newGame(Date.now()));setLoadError('');setCurrentTab('Home');setTabHistory([])}}])}/></SafeAreaView>;
  if(!state.character){const theme=resolveTheme(displayedThemeId);if(serverGameplayEnabled&&adminQa)return <GameThemeProvider themeId={displayedThemeId}><SafeAreaView style={[s.safe,{backgroundColor:theme.bg}]}><StatusBar style={theme.dark?'light':'dark'}/><AdminQaScreen state={state} onApplyQa={applyOnlineAdminQa} onRefillQa={refillOnlineAdminQa} onClose={()=>{}} onOpenDungeon={()=>{}}/></SafeAreaView></GameThemeProvider>;return <GameThemeProvider themeId={displayedThemeId}><SafeAreaView style={[s.safe,{backgroundColor:theme.bg}]}><StatusBar style={theme.dark?'light':'dark'}/><ClassSelectScreen language={state.settings.language} themeId={displayedThemeId} onTheme={selectUiTheme} onLanguage={language=>commit({...state,settings:{...state.settings,language}})} onSignInExisting={serverGameplayEnabled&&auth.session?.user.is_anonymous?()=>{void signOut()}:undefined} onSelect={async(id,name,body)=>{await flushThemeSave();if(serverGameplayEnabled){const result=await perform({type:'create',args:{classId:id,name,body}});if(result)setCreationWelcome({name,classId:id});return;}const next=createCharacter(stateRef.current??state,id,name,body);await repo.save(next);stateRef.current=next;setState(next);setCreationWelcome({name,classId:id})}}/></SafeAreaView></GameThemeProvider>;}
  if(creatingRoster){const theme=resolveTheme(displayedThemeId);return <GameThemeProvider themeId={displayedThemeId}><SafeAreaView style={[s.safe,{backgroundColor:theme.bg}]}><StatusBar style={theme.dark?'light':'dark'}/><ClassSelectScreen language={state.settings.language} lockedRoles={occupiedCharacterRoles(state)} cancelLabel={t(state.settings.language,'roster.cancel')} onCancel={()=>setCreatingRoster(false)} onSelect={async(id,name,body)=>{if(serverGameplayEnabled){const result=await perform({type:'roster_create',args:{classId:id,name,body}});if(result)setCreatingRoster(false);return;}const result=executeGameCommand(state,{type:'roster_create',args:{classId:id,name,body}},Date.now());await commit(result.state);setCreatingRoster(false)}}/></SafeAreaView></GameThemeProvider>;}
  if(showAdminQa&&(adminQa||(__DEV__&&!serverGameplayEnabled)))return <SafeAreaView style={s.safe} {...backSwipe.panHandlers}><StatusBar style="light"/><AdminQaScreen state={state} onChange={!serverGameplayEnabled?commit:undefined} onApplyQa={serverGameplayEnabled&&adminQa?applyOnlineAdminQa:undefined} onRefillQa={serverGameplayEnabled&&adminQa?refillOnlineAdminQa:undefined} onClose={()=>setShowAdminQa(false)} onOpenDungeon={()=>{setShowAdminQa(false);setTab('Coop')}}/></SafeAreaView>;
  if(__DEV__&&showCoopUiGallery)return <SafeAreaView style={s.safe} {...backSwipe.panHandlers}><StatusBar style="light"/><CoopUiGalleryScreen language={state.settings.language} onClose={()=>setShowCoopUiGallery(false)}/></SafeAreaView>;
  const theme=resolveTheme(displayedThemeId);
  const preview=activityPreview??previewActivityReward(state,now);
  const {companionsUnlocked,dailySuppliesUnlocked,contractsUnlocked,friendsUnlocked,socialUnlocked,guildUnlocked,companionAttention,dailySuppliesReady,forgeReadyCount,questClaims,overflowStackCount,lockedAccountDestinations}=shellAttention!;
  const storyClaimCount=questClaims.story;
  const partyContractClaims=partySocial.accountId===auth.session?.user.id&&partySocial.party?partyContractClaimableRewardIds(partySocial.contracts).length:0;
  const navigationNotifications:NavigationNotification[]=[
    ...actionableClaimNotifications({storyRewards:storyClaimCount,challengeRewards:questClaims.challenges,milestoneRewards:questClaims.milestones,overflowStacks:overflowStackCount}),
    {key:'activity-reward-ready',kind:'reward_ready',unread:rewardHasProgress(preview)},
    {key:'companion-attention',kind:'companion_attention',unread:companionAttention.hasAttention},
    {key:'daily-supplies-ready',kind:'account_action',unread:dailySuppliesReady},
    {key:'equipment-crafts-ready',kind:'equipment_craft_ready',count:forgeReadyCount,unread:forgeReadyCount>0},
    {key:'incoming-friend-requests',kind:'friend_request',count:friendsUnlocked?notificationCounts.friendRequests:0,unread:friendsUnlocked&&notificationCounts.friendRequests>0},
    {key:'profile-customization-review',kind:'profile_customization',unread:unreadUnlockCount(unlockInbox)>0},
    {key:'unread-social-chat',kind:'chat_unread',count:socialUnlocked?notificationCounts.partyChatUnread:0,unread:socialUnlocked&&notificationCounts.partyChatUnread>0},
    {key:'pending-guild-applications',kind:'guild_application',count:guildUnlocked?notificationCounts.guildApplications:0,unread:guildUnlocked&&notificationCounts.guildApplications>0},
    {key:'pending-guild-invites',kind:'guild_invite',count:guildUnlocked?notificationCounts.guildInvites:0,unread:guildUnlocked&&notificationCounts.guildInvites>0},
    {key:'pending-party-invites',kind:'party_invite',count:socialUnlocked?notificationCounts.partyInvites:0,unread:socialUnlocked&&notificationCounts.partyInvites>0},
    {key:'party-contract-claims',kind:'party_contract_reward_ready',count:partyContractClaims,unread:socialUnlocked&&partyContractClaims>0},
    {key:'guild-project-reward-claims',kind:'guild_project_reward_ready',count:notificationCounts.guildProjectRewards,unread:guildUnlocked&&notificationCounts.guildProjectRewards>0},
  ];
  const primaryNavigationNotifications=navigationNotifications.filter(row=>row.kind!=='reward_ready'&&row.kind!=='weekly_order_complete');
  const navigationBadgeModel=buildNavigationBadges(primaryNavigationNotifications);
  const quickNavigationBadges=buildQuickNavigationBadges(navigationNotifications);
  const primaryBadges:Partial<Record<PrimaryTab,number|'dot'>>={
    Home:navigationBadgeModel.home.display?navigationBadgeModel.home.count:navigationBadgeModel.home.dot?'dot':0,
    Character:navigationBadgeModel.character.dot?'dot':0,
    Skills:navigationBadgeModel.skills.display?navigationBadgeModel.skills.count:navigationBadgeModel.skills.dot?'dot':0,
    World:navigationBadgeModel.world.display?navigationBadgeModel.world.count:navigationBadgeModel.world.dot?'dot':0,
    Inventory:navigationBadgeModel.inventory.dot?'dot':0,
    More:navigationBadgeModel.account.display?navigationBadgeModel.account.count:navigationBadgeModel.account.dot?'dot':0,
  };
  const activePrimary:PrimaryTab=primaryNavForRoute(tab);
  const openClaimableGuildProjects=()=>{
    const scope=(auth.session?.user.id??state.character?.id??'')+':'+guildMembershipRevision;
    const previous=guildNavigationMemory.current?.scope===scope?guildNavigationMemory.current.context:undefined;
    guildNavigationMemory.current={scope,context:{section:'Progress',progressTab:'Projects',activityView:previous?.activityView??'Quests',hallSection:previous?.hallSection??'Overview'}};
    setGuildInitialPve(false);
    setTab('Guild');
  };
  // Keep the normal app navigation available, but let an active dungeon run
  // begin immediately with its Q-Mode / Live status and room decisions.
  const immersiveDungeonFlow=dungeonFlowActive&&tab==='Coop';
  // A crafting quantity drag must never trigger the app's edge-swipe history gesture.
  // The explicit back button and Android hardware back still work normally.
  const disableHistorySwipe=immersiveDungeonFlow||(tab==='Skills'&&skillsMode==='crafting'&&!!selectedSkill);
  const featureHubShell=featureHubShellPolicy(tab);
  const mainTabGuide=MAIN_TAB_GUIDANCE[tab];
  return <GameThemeProvider themeId={displayedThemeId}><TutorialHighlightProvider active={(mainScreenTour?.highlightBeacon??visibleTutorialStep?.highlightBeacon)??null}><SafeAreaView edges={['top','left','right']} style={[s.safe,{backgroundColor:theme.bg}]}><StatusBar style={theme.dark?'light':'dark'}/>{!immersiveDungeonFlow&&<GameTopBar key={`${state.createdAtMs}:${state.character.id}`} state={state} nowMs={now} reward={preview} online={serverGameplayEnabled&&!online.error} attention={quickNavigationBadges} labelForDestination={destination=>tabLabel(state.settings.language,destination)} onNavigate={destination=>{if(destination==='Dungeon'){setTab('Coop');return;}if(destination==='Quests'){openQuestMode(storyClaimCount>0?'story':questClaims.challenges>0||questClaims.milestones>0?'challenges':'story');return;}if(destination==='Forge'){setTab('Skills');toolRecipeReturnRef.current=null;setGoalActionId(undefined);setGoalRecipeId(undefined);setSkillsOpenedAsLink(true);setSkillsMode('crafting');setSelectedSkill('smithing');return;}if(destination==='Settings')setSettingsSection(undefined);setTab(destination)}} onChangeDestinations={destinations=>commit({...state,settings:{...state.settings,quickNavDestinations:destinations}})} showActivityBar={tab!=='ProfileCustomize'&&tab!=='Coop'&&tab!=='Events'&&!(tab==='Guild'&&(guildEventPageOpen||guildInitialPve||guildRaidScope===((auth.session?.user.id??state.character.id)+':'+guildMembershipRevision)))&&!featureHubShell.hideActivityBar} onOpenActivity={()=>{if(preview.stoppedReason){setTab('Home');return;}openActiveActivity()}} onRecoverCombat={recoverStoppedCombat} onFoodCommand={quickFoodCommand}/>}{serverGameplayEnabled&&(offlineSettling||(online.busy&&!quietCraftSaving))?<View pointerEvents="none" accessible accessibilityRole="progressbar" accessibilityLabel={appText(state.settings.language,offlineSettling?'Calculating offline rewards…':'Saving…')} style={{position:'absolute',top:52,right:12,zIndex:30,flexDirection:'row',alignItems:'center',gap:6,paddingVertical:6,paddingHorizontal:10,borderWidth:1,borderColor:theme.info,borderRadius:12,backgroundColor:theme.panelRaised}}><ActivityIndicator color={theme.info} size="small"/><Text style={{color:theme.text,fontSize:11,fontWeight:'800'}}>{appText(state.settings.language,offlineSettling?'Calculating offline rewards…':'Saving…')}</Text></View>:null}{serverGameplayEnabled&&online.pending?<View style={{flexShrink:0,zIndex:31,elevation:2,paddingHorizontal:12,paddingVertical:4,backgroundColor:theme.bg}}><GameButton title={appText(languageRef.current,"Retry pending action")} loading={online.busy} onPress={()=>perform()}/></View>:null}{onlineActionError?<View style={{paddingHorizontal:12,paddingVertical:6}}><ActionFeedback tone="error" message={onlineActionError} compact actionLabel={appText(state.settings.language,'Close')} onAction={()=>setOnlineActionError('')}/></View>:null}<View style={s.body} {...(disableHistorySwipe?{}:backSwipe.panHandlers)}>
    <ScreenTransition key={tab} kind={transitionKind} reduceMotion={state.settings.reduceMotion||systemReduceMotion||immersiveDungeonFlow}>
    {!immersiveDungeonFlow&&mainTabGuide&&!mainScreenTour&&!visibleTutorialStep?<SectionGuide scope={auth.session?.user.id??state.character.id} area="main" section={tab} guide={mainTabGuide} showReplay={false}/>:null}
    {tab==='Home'&&<HomeScreen onQuickCommand={runCompanionCommand} onOpenGuide={()=>{setTab('Settings');setSettingsSection('guide')}} state={state} forgeReadyCount={forgeReadyCount} preview={preview} nowMs={now} onOpenContracts={()=>openQuestMode('contracts')} onNavigateGoal={openWorkingTowardDestination} onOpenCombat={()=>setTab('Combat')} onOpenSkill={skillId=>{setSelectedSkill(skillId);setSkillsMode(skillId==='faith'?'faith':['mining','woodcutting','fishing','herbalism','exploration'].includes(skillId)?'gathering':'crafting');setTab('Skills')}} onNavigate={destination=>{if(destination==='Skills')setSelectedSkill(undefined);if(destination==='Quests'){openQuestMode('story');return;}setTab(destination)}} onQueueRemove={index=>mutateActionQueue({type:'queue_remove',args:{index}})} onQueueMove={(index,direction)=>mutateActionQueue({type:'queue_move',args:{index,direction}})} onQueueClear={()=>mutateActionQueue({type:'queue_clear'})} onQueueStart={()=>mutateActionQueue({type:'queue_start'},true)} onSetCurrentHandoff={()=>{const id=stateRef.current?.activity?.targetId;if(id)void submitHomeQueueCommand({type:'queue_set_goal',args:{id,goal:{kind:'duration_seconds',value:14400}}});}} onQueueAdd={(entry,handoff)=>submitHomeQueueCommand({type:'queue_add',args:{kind:entry.kind,id:entry.targetId,...(entry.combatTacticId?{tacticId:entry.combatTacticId}:{}),...(entry.huntGoalId?{goalId:entry.huntGoalId}:{}),...(entry.faithPracticeCount?{count:entry.faithPracticeCount}:{}),...(entry.goal?{goal:entry.goal}:{}),...(handoff?.goal?{handoffGoal:handoff.goal,handoffTargetId:handoff.targetId}:{}),...(handoff?.keepCurrentRunning?{keepCurrentRunning:true}:{})}})} onClaim={()=>{if(serverGameplayEnabled){void perform({type:'claim'});return;}const result=claimActivity(state,Date.now());commit(result.state);presentCollected(result.reward,state.activity,state,result.state)}} onStop={()=>changeActivity()}/>}
    {tab==='Combat'&&<CombatScreen onOpenCodex={()=>setTab('Bestiary')} state={state} onCommand={runCompanionCommand} initialMonsterId={goalMonsterId} initialAreaId={selectedRegionalAreaId} onChangeRegion={()=>setTab('World')} onStart={(id,tacticId,goalId)=>changeActivity({kind:'combat',id,...(tacticId?{tacticId}: {}),...(goalId?{goalId}: {})})} onQueue={(id,tacticId,goalId)=>queueActivity({kind:'combat',targetId:id,...(tacticId?{combatTacticId:tacticId}:{}),...(goalId?{huntGoalId:goalId}:{})})} onQueueRemove={index=>mutateActionQueue({type:'queue_remove',args:{index}})} onQueueMove={(index,direction)=>mutateActionQueue({type:'queue_move',args:{index,direction}})} onQueueClear={()=>mutateActionQueue({type:'queue_clear'})} onQueueStart={()=>mutateActionQueue({type:'queue_start'},true)} onBoss={()=>{const now=Date.now();if(serverGameplayEnabled){void perform({type:'boss'}).then(result=>{if(!result)return;if(result.storyBossBattle){setStoryBossBattle({battle:result.storyBossBattle,message:result.message??(result.won?'Victory':'Defeat')});return;}showAlert(result.won?'Victory':'Not ready',result.message)});return;}const settled=claimActivity(state,now);const result=challengeFallenKnight(settled.state,now);void commit(result.state);if(result.battle){setStoryBossBattle({battle:result.battle,message:result.message});return;}showAlert(ot(state.settings.language,result.won?'combat.victory':'combat.notReady'),result.message)}}/>}
    {tab==='World'&&<WorldScreen state={state} goalRegionId={goalRegionId} onTravel={regionId=>{if(serverGameplayEnabled){void perform({type:'travel',args:{id:regionId}}).then(result=>{if(result)continueGoalAfterTravel(regionId)});return;}try{const result=travelToRegion(state,regionId,Date.now());void commit(result.state);continueGoalAfterTravel(regionId)}catch(error){showAlert('Cannot travel',error instanceof Error?error.message:'Please try again.')}}} onOpenCombat={areaId=>{setSelectedRegionalAreaId(areaId);setTab('Combat')}} onOpenSkills={areaId=>{setSelectedRegionalAreaId(areaId);setSelectedSkill('regional-gathering');setSkillsMode('gathering');setTab('Skills')}} onRegionalRewardsChanged={serverGameplayEnabled?()=>online.refresh():undefined}/>}
    {tab==='Coop'&&<CoopExpeditionScreen state={state} language={state.settings.language} entrySource={coopEntrySource} initialDungeonId={goalDungeonId} onInitialDungeonHandled={()=>setGoalDungeonId(undefined)} initialEventLiveId={pendingEventLiveId} onInitialEventHandled={()=>setPendingEventLiveId(undefined)} onRewardsChanged={serverGameplayEnabled?()=>online.refresh():undefined} onRunActiveChange={setDungeonFlowActive} onCommand={runCompanionCommand} onOpenChat={()=>{setChatInitialChannel('world');setShowChatOverlay(true)}} onClose={goBack}/>}
    {tab==='Quests'&&<QuestScreen state={state} nowMs={now} mode={questMode} focusedWeeklyOrderId={questFocusOrderId} onModeChange={mode=>{setQuestMode(mode);if(mode!=='contracts')setQuestFocusOrderId(undefined)}} onClaim={id=>serverGameplayEnabled?perform({type:'quest',args:{id}},false,false,true).then(Boolean):commit(claimQuest(state,id)).then(()=>true)} onClaimContract={(period,id,choiceId)=>serverGameplayEnabled?perform({type:'seasonal',args:{period,id,...(choiceId?{choiceId}:{})}},false,false,true,true).then(Boolean):commit(claimSeasonalContract(state,period,id,Date.now(),choiceId)).then(()=>true)} onClaimMilestone={(month,threshold,characterId,skillId)=>serverGameplayEnabled?perform({type:'monthly_quest_milestone',args:{month,threshold,characterId,skillId}},false,false,false).then(Boolean):commit(claimMonthlyQuestMilestone(state,month,threshold,characterId,skillId,Date.now())).then(()=>true)} onNavigate={destination=>{if(destination.tab==='World'&&destination.zoneId){setGoalRegionId(destination.zoneId);setTab('World');return;}if(destination.tab==='Skills'){setSelectedSkill(destination.skillId);setGoalActionId(undefined);setGoalRecipeId(undefined);setSkillsMode(destination.mode??(destination.skillId==='faith'?'faith':destination.skillId&&['mining','woodcutting','fishing','herbalism','exploration'].includes(destination.skillId)?'gathering':'crafting'));}setTab(destination.tab)}} onOpenWeeklyBoss={()=>openWorkingTowardDestination({kind:'combat',monsterId:'FALLEN_KNIGHT',zoneName:"King's Road",regionId:'KINGS_ROAD',button:'Open Fallen Knight',detail:'Open the Fallen Knight weekly rematch.'})} onOpenWeeklyOrder={openWeeklyOrder} onQueueWeeklyOrder={queueWeeklyOrder} onStopWeeklyOrder={stopAtWeeklyOrderCompletion}/>}
  {tab==='Skills'&&<SkillsScreen key={`${skillsMode}:${selectedSkill??'all'}:${goalActionId??goalRecipeId??'none'}`} state={state} now={now} initialMode={skillsMode} initialSkill={selectedSkill} initialAreaId={selectedRegionalAreaId} initialActionId={goalActionId} initialRecipeId={goalRecipeId} forgeResults={forgeResults} onDismissForgeResults={()=>setForgeResults(null)} onBackToHub={()=>{toolRecipeReturnRef.current=null;setSelectedSkill(undefined);setGoalActionId(undefined);setGoalRecipeId(undefined)}} onOpenCombat={()=>setTab('Combat')} onSelectSkill={id=>{toolRecipeReturnRef.current=null;if(id==='companion'){setTab('Companions');return;}setSelectedSkill(id);setSkillsMode(id==='faith'?'faith':['mining','woodcutting','fishing','herbalism'].includes(id)?'gathering':'crafting')}} onCommand={runCompanionCommand} onCharacter={()=>setTab('Character')} onInventory={()=>setTab('Inventory')} onWithdrawTool={id=>inventoryCommand({type:'withdraw',args:{id,quantity:1}},()=>withdrawFromBank(state,id,1)).catch(error=>showAlert('Cannot withdraw',error instanceof Error?error.message:'Please try again.'))} onViewToolRecipes={()=>{setSelectedSkill('smithing');setSkillsMode('crafting')}} onNavigateCraftingSource={openWorkingTowardDestination} onMoveCraftWaiting={(jobId,direction)=>{if(serverGameplayEnabled){void perform({type:'craft_move',args:{id:jobId,direction}});return;}try{void commit(moveWaitingEquipmentCraft(state,jobId,direction,Date.now()))}catch(error){showAlert('Cannot reorder backlog',error instanceof Error?error.message:'Please try again.')}}} onCancelCraft={jobId=>{showAlert('Cancel forge job?','All reserved materials will be returned. Gold spent on this craft will not be refunded.',[{text:'Keep crafting'},{text:'Cancel craft',style:'destructive',onPress:()=>{if(serverGameplayEnabled){void perform({type:'craft_cancel',args:{id:jobId}}).then(result=>{if(result?.message)showAlert('Craft cancelled',result.message)});return;}try{const cancelled=cancelEquipmentCraft(state,jobId,Date.now());void commit(cancelled.state);showAlert('Craft cancelled',`Materials returned: ${cancelled.refundedInputs.map(row=>`${row.quantity}× ${itemDef(row.itemId).name}`).join(', ') || 'none'} · 0 Gold returned`)}catch(error){showAlert('Cannot cancel craft',error instanceof Error?error.message:'Please try again.')}}}])}} onCraftPrerequisites={recipeId=>{if(serverGameplayEnabled){void perform({type:'craft_prerequisites',args:{id:recipeId}}).then(result=>{if(result)showAlert('Prerequisites crafted',result.message??'Available processing steps were completed.');});return;}try{const result=craftEquipmentPrerequisites(state,recipeId,Date.now());void commit(result.state);queueMasteryNotice(state,result.state);showAlert('Prerequisites crafted',result.crafted.map(row=>row.batches+'× '+row.name).join('\n'));}catch(error){showAlert('Cannot craft prerequisites',error instanceof Error?error.message:'Please try again.')}}} onClaimCraft={jobId=>{if(serverGameplayEnabled){void perform({type:'craft_claim',args:{id:jobId}}).then(result=>{if(result?.forgeResults?.length)setForgeResults(result.forgeResults);else if(result?.message)setForgeClaimFeedback({message:result.message,tone:'success'});});return;}try{const claimed=claimForgeJob(state,jobId,Date.now(),Math.random());void commit(claimed.state);queueMasteryNotice(state,claimed.state);if(claimed.kind==='equipment')setForgeResults([claimed.result]);else if(claimed.kind==='tool')setForgeClaimFeedback({message:`${claimed.recipe.name} · ${claimed.tool.rarity} · Q${claimed.tool.quality} · +${(claimed.tool.bonus.basisPoints/100).toFixed(1)}% ${claimed.tool.bonus.stat==='speed'?'Gathering Speed':'Gathering Rarity Chance'}`,tone:'success'});else setForgeClaimFeedback({message:appText(languageRef.current,'{name} is ready in the Gem Pouch.',{name:claimed.recipe.name}),tone:'success'})}catch(error){showAlert('Cannot claim forge job',error instanceof Error?error.message:'Please try again.')}}} onClaimAllCrafts={()=>{if(serverGameplayEnabled){void perform({type:'craft_claim_all'}).then(result=>{if(result?.forgeResults?.length){setForgeResults(null);setForgeClaimAllPendingCount(equipmentCraftQueueModel(result.state,Date.now()).ready);setForgeClaimAllResults(result.forgeResults);}if(result?.message&&!result?.forgeResults?.length)setForgeClaimFeedback({message:result.message,tone:/still waiting|No finished|Free .*space/i.test(result.message)?'warning':'success'});});return;}try{const claimed=claimAllReadyEquipmentCrafts(state,Date.now(),Math.random());void commit(claimed.state);queueMasteryNotice(state,claimed.state);if(claimed.results.length){setForgeResults(null);setForgeClaimAllPendingCount(claimed.blocked.length);setForgeClaimAllResults(claimed.results);}if((claimed.gemClaims>0||claimed.toolClaims>0)&&!claimed.results.length)setForgeClaimFeedback({message:`${claimed.toolClaims} tools · ${claimed.gemClaims} gem claims`,tone:'success'})}catch(error){showAlert('Cannot claim forge jobs',error instanceof Error?error.message:'Please try again.')}}} onGather={id=>changeActivity({kind:'gathering',id})} onQueueGather={id=>queueActivity({kind:'gathering',id})} onQueueRemove={index=>mutateActionQueue({type:'queue_remove',args:{index}})} onQueueMove={(index,direction)=>mutateActionQueue({type:'queue_move',args:{index,direction}})} onQueueClear={()=>mutateActionQueue({type:'queue_clear'})} onQueueStart={()=>mutateActionQueue({type:'queue_start'},true)} onEquipTool={id=>{if(serverGameplayEnabled){void perform({type:'equip_tool',args:{id}});return;}try{const toolKind=itemDef(id).toolSkillId;const settled=state.activity?.kind===toolKind?claimActivity(state,Date.now()):{state,reward:null};commit(equipGatheringTool(settled.state,id));}catch(error){showAlert('Cannot equip tool',error instanceof Error?error.message:'Please try again.')}}} onCraft={async(id,quantity=1)=>{
  const timed=timedEquipmentRecipe(id);
  const count=Math.max(1,Math.min(999,Math.floor(quantity)));
  if(serverGameplayEnabled){
    const previous=stateRef.current??state;
    // Keep the global Saving spinner hidden for routine crafts: their button is the
    // status indicator. Do not hide genuine errors or pending-action recovery UI.
    setQuietCraftSaving(true);
    try{
      const result=await perform({type:'craft',args:{id,quantity:count}},false,false,true,true);
      if(!result)throw new Error('Crafting was not confirmed. Please retry.');
      queueMasteryNotice(state,result.state);
      return verifyCraftCommandOutcome(previous,result.state,{
        recipeId:id,outputItemId:timed?.output.itemId,requestedCount:count,
        timed:!!timed,tool:!!timed&&itemDef(timed.output.itemId).type==='tool',
      });
    }finally{
      setQuietCraftSaving(false);
    }
  }
  let next=state;
  const craftNow=Date.now();
  for(let batch=0;batch<count;batch++){
    next=timed?startEquipmentCraft(next,id,craftNow).state:craftRecipe(next,id,craftNow,batch);
  }
  // Confirm only after saving locally; errors are rendered in the recipe's status area.
  await commit(next,{confirmSaved:true});
  if(!timed)queueMasteryNotice(state,next);
  return timed?'queued':'completed';
}}/>}
    {tab==='Inventory'&&<InventoryScreen key={`${state.createdAtMs}:${state.character.id}`} state={state} viewMemory={inventoryViews.current[`${state.createdAtMs}:${state.character.id}`]??(inventoryViews.current[`${state.createdAtMs}:${state.character.id}`]=newInventoryScreenState())} foodRequest={inventoryFoodScope===`${state.createdAtMs}:${state.character.id}`?inventoryFoodRequest:0} onEquip={id=>runCompanionCommand({type:'equip',args:{id}})} onFood={id=>void quickFoodCommand({type:'food',args:{id}}).catch(error=>showAlert('Food',error.message))} onEat={id=>void quickFoodCommand({type:'eat',args:{id}}).catch(error=>showAlert('Food',error.message))} onSell={(id,quantity)=>inventoryCommand({type:'sell',args:{id,quantity}},()=>sellItem(state,id,quantity))} onSalvage={id=>inventoryCommand({type:'salvage',args:{id}},()=>salvageItem(state,id))} onDeposit={(id,quantity)=>inventoryCommand({type:'deposit',args:{id,quantity}},()=>depositToBank(state,id,quantity))} onDepositMaterials={()=>inventoryCommand({type:'deposit_materials'},()=>depositAllMaterials(state))} onUpgradeStorage={location=>inventoryCommand({type:'storage',args:{location}},()=>upgradeStorage(state,location))} onBankSell={(id,quantity)=>inventoryCommand({type:'bank_sell',args:{id,quantity}},()=>sellBankItem(state,id,quantity))} onBankGoldTransfer={(direction,amount)=>inventoryCommand({type:direction==='deposit'?'bank_gold_deposit':'bank_gold_withdraw',args:{amount}},()=>direction==='deposit'?depositGoldToBank(state,amount):withdrawGoldFromBank(state,amount))} onWithdraw={(id,quantity)=>inventoryCommand({type:'withdraw',args:{id,quantity}},()=>withdrawFromBank(state,id,quantity))} onOverflow={()=>inventoryCommand({type:'overflow'},()=>claimOverflowToBank(state))} onToggleFavorite={id=>serverGameplayEnabled?void perform({type:'inventory_preference',args:{id,kind:'favorite',enabled:!state.settings.favoriteItemIds?.includes(id)}}):void commit(toggleInventoryFavorite(state,id))} onToggleLock={id=>serverGameplayEnabled?void perform({type:'inventory_preference',args:{id,kind:'lock',enabled:!state.settings.lockedItemIds?.includes(id)}}):void commit(toggleInventoryLock(state,id))} onAcknowledgeItem={id=>serverGameplayEnabled?void perform({type:'inventory_preference',args:{id,kind:'seen',enabled:true}}):void commit(acknowledgeInventoryItem(state,id))} onAcknowledgeAll={()=>serverGameplayEnabled?void perform({type:'inventory_seen_all'}):void commit(acknowledgeAllInventoryItems(state))} onBulkPreference={(kind,enabled,ids)=>inventoryCommand({type:'inventory_preference_bulk',args:{kind,enabled,ids}},()=>applyBulkInventoryProtection(state,ids,kind,enabled))} onBulkAction={(kind,location,ids)=>inventoryCommand({type:kind==='transfer'?'bulk_transfer':kind==='sell'?'bulk_sell':'bulk_salvage',args:{location,ids}},()=>kind==='transfer'?bulkTransferSelected(state,ids,location):kind==='sell'?bulkSellSelected(state,ids,location):bulkSalvageSelected(state,ids,location))} onNavigateInspect={openWorkingTowardDestination} onCommand={runCompanionCommand}/>}
    {tab==='DailySupplies'&&<DailySuppliesScreen state={state} nowMs={now} onCommand={runCompanionCommand}/>}
    {tab==='RewardsInbox'&&<RewardsInboxScreen state={state} online={serverGameplayEnabled} onRefresh={async()=>online.refresh()} onEventClaim={async id=>{if(serverGameplayEnabled){if(!await perform({type:'event_reward',args:{id}},false))throw new Error('Event reward was not confirmed.');return;}const result=executeGameCommand(state,{type:'event_reward',args:{id}},Date.now());await commit(result.state)}}/>}
    {tab==='AccountBonuses'&&<AccountBonusesScreen state={state}/>}
    {tab==='AdventurersJournal'&&<AdventurersJournalScreen state={state} onNavigate={destination=>setTab(destination)}/>}
    {tab==='Bestiary'&&<BestiaryScreen state={state}/>}
    {tab==='WorldMilestones'&&<WorldMilestoneFeedScreen/>}
    {tab==='MasteryHall'&&<MasteryHallScreen state={state} onOpenSkill={skillId=>{setSelectedSkill(skillId);setSkillsMode(['mining','woodcutting','fishing','herbalism'].includes(skillId)?'gathering':'crafting');setTab('Skills')}} onNavigate={openWorkingTowardDestination} onProfile={()=>{setProfileCustomizeSection('Showcase');setTab('ProfileCustomize')}}/>}
    {tab==='Companions'&&<CompanionsScreen state={state} language={state.settings.language} now={now} onCommand={runCompanionCommand} onCreate={()=>setCreatingRoster(true)} initialNavigation={companionNavigationMemory.current?.characterId===state.character.id?companionNavigationMemory.current.context:undefined} onNavigationChange={context=>{companionNavigationMemory.current={characterId:state.character?.id??'',context};}} onNavigateSource={source=>{
      if(source.kind==='combat'){const currentZone=WORLD_ZONES.find(zone=>zone.id===state.currentRegionId)?.name;setTab(currentZone===source.zoneName?'Combat':'World');return;}
      if(source.kind==='crafting'){setSelectedSkill(source.skillId as SkillId);setSkillsMode('crafting');setTab('Skills');return;}
      if(source.kind==='gathering'){setSelectedSkill(source.skillId as SkillId);setSkillsMode('gathering');setTab('Skills');return;}
      if(source.kind==='events')setTab('Events');
    }}/>}
    {tab==='Activity'&&<ActivityOverviewScreen state={state} now={now} accountId={auth.session?.user.id} gameplayBusy={serverGameplayEnabled&&online.busy} onSwitch={async id=>{if(serverGameplayEnabled){await perform({type:'roster_switch',args:{id}},true,false,false,true);return;}await runCompanionCommand({type:'roster_switch',args:{id}})}} onCreate={()=>setCreatingRoster(true)} onDelete={async(id,confirmation)=>{if(serverGameplayEnabled){if(!await perform({type:'roster_delete',args:{id,confirmation}}))throw new Error('Character deletion was not confirmed.');return;}const current=stateRef.current;if(!current)throw new Error('Load your character first.');const result=executeGameCommand(current,{type:'roster_delete',args:{id,confirmation}},Date.now());await commit(result.state)}}/>}
    {tab==='Character'&&<CharacterScreen state={state} onEquip={itemId=>runCompanionCommand({type:'equip',args:{id:itemId}})} onEquipInstance={instanceId=>runCompanionCommand({type:'gear_equip',args:{instanceId}})} onEquipPouch={itemId=>runCompanionCommand({type:'equipment_pouch_equip',args:{itemId}})} onProfile={()=>{setProfileCustomizeSection('Look');setTab('ProfileCustomize')}} onCompanions={()=>setTab('Companions')} loadouts={<SavedLoadoutsPanel state={state} onChange={commit} onCommand={runCompanionCommand}/>} onUpgrade={async itemId=>{if(serverGameplayEnabled){await perform({type:'upgrade',args:{id:itemId}});return;}try{const attempt=attemptEquipmentUpgrade(state,itemId);await commit(attempt.state);}catch(error){showAlert('Cannot upgrade',error instanceof Error?error.message:'Please try again.')}}} onSocket={async (itemId,gemId)=>{if(serverGameplayEnabled){if(!await perform({type:'socket',args:{id:itemId,gemId}}))throw new Error('Gem socket was not confirmed by the server.');return;}try{await commit(socketGem(state,itemId,gemId))}catch(error){showAlert('Cannot socket gem',error instanceof Error?error.message:'Please try again.')}}} onReplaceGem={async (itemId,gemId)=>{if(serverGameplayEnabled){if(!await perform({type:'replace_socket',args:{id:itemId,gemId}}))throw new Error('Gem replacement or reroll was not confirmed by the server.');return;}try{await commit(replaceGem(state,itemId,gemId))}catch(error){showAlert('Cannot replace gem',error instanceof Error?error.message:'Please try again.')}}} onGemRefine={async (familyId,grade)=>{if(serverGameplayEnabled){await perform({type:'gem_refine',args:{familyId,grade}});return;}try{await commit(startGemRefinement(state,gemRefineRecipeIdV1(familyId,grade),Date.now()).state)}catch(error){showAlert('Cannot refine gem',error instanceof Error?error.message:'Please try again.')}}} onGemCombine={async (familyId,grade)=>{if(serverGameplayEnabled){await perform({type:'gem_combine',args:{familyId,grade}});return;}try{await commit(startGemCombine(state,gemCombineRecipeIdV1(familyId,grade),Date.now()).state)}catch(error){showAlert('Cannot combine gems',error instanceof Error?error.message:'Please try again.')}}} onGemDismantle={async (gemId,quantity)=>{if(serverGameplayEnabled){await perform({type:'gem_dismantle',args:{gemId,quantity}});return;}try{await commit(dismantleGemV1(state,gemId,quantity))}catch(error){showAlert('Cannot dismantle gem',error instanceof Error?error.message:'Please try again.')}}} onGemCacheClaim={async familyId=>{if(serverGameplayEnabled){await perform({type:'resonance_cache_claim',args:{familyId}});return;}try{await commit(claimResonanceCacheV1(state,familyId,Date.now()))}catch(error){showAlert('Cannot claim Resonance Cache',error instanceof Error?error.message:'Please try again.')}}} onInventory={()=>setTab('Inventory')} onSave={()=>serverGameplayEnabled?online.refresh():repo.save(state)} onUnequip={async slot=>{const instanceId=state.character?.equipmentInstanceIds?.[slot];if(instanceId){await runCompanionCommand({type:'gear_unequip',args:{instanceId}});return;}if(serverGameplayEnabled){if(!await perform({type:'unequip',args:{slot}}))throw new Error('Equipment change was not confirmed.');}else await commit(unequipItem(state,slot));}} onCrafting={()=>{setSkillsMode('novice');setTab('Skills')}} onEquipSet={async()=>{if(serverGameplayEnabled){if(!await perform({type:'equip_set'}))throw new Error('Set equip was not confirmed.');return;}const settled=claimActivity(state,Date.now());const next=equipNoviceSet(settled.state);await commit(next);}}><ProfileEditor key={profileAttentionScope} state={state} onChange={commit} onCommand={runCompanionCommand} onSaveNameStyle={saveNameStyle}/></CharacterScreen>}
    {tab==='Friends'&&<FriendsScreen onNotificationsChanged={()=>void refreshSocialNotifications()}/>}
    {FEATURE_HUB_QA_ENABLED&&isFeatureHubPreviewRoute(tab)&&<FeaturePreviewScreen key={tab} route={tab} onClose={()=>setTab('More')} onOpenParty={()=>setTab('Party')} onOpenPartyChat={()=>{setChatInitialChannel('party');setShowChatOverlay(true)}} partyUnread={notificationCounts.partyChatUnread} reduceMotion={state.settings.reduceMotion}/>}
     {tab==='Party'&&<PartyScreen characterLevel={state.character?.level??0} partyUnlocked={earlyFeatureUnlocked(state,'party')} onAccount={()=>setTab('Settings')} onRecruitment={area=>{setSocialInitialTab(area);setTab('Recruitment')}} onInvitationsChanged={()=>void refreshSocialNotifications()}/>}
     {(tab==='Recruitment'||tab==='Social')&&<RecruitmentScreen characterLevel={state.character?.level??0} partyUnlocked={earlyFeatureUnlocked(state,'party')} initialArea={socialInitialTab==='guild'?'guild':'party'} onAreaChange={setSocialInitialTab} onParty={()=>setTab('Party')} onGuild={()=>setTab('Guild')} onAccount={()=>setTab('Settings')} onInvitationsChanged={()=>void refreshSocialNotifications()}/>}
    {tab==='Events'&&<EventScreen state={state} onChange={commit} onCommand={serverGameplayEnabled?command=>perform(command,false).then(Boolean):undefined} authoritativeGuildPve={serverGameplayEnabled} onOpenEventActivity={source=>{if(source==='combat'){setTab('Combat');return;}setSelectedSkill(undefined);setSkillsMode(source==='gathering'?'gathering':'crafting');setTab('Skills')}} onOpenGuildEventBoss={()=>{setGuildInitialPve(true);setTab('Guild')}} onOpenSeasonalExpedition={coopOnlineConfigured?liveEventId=>{setPendingEventLiveId(liveEventId);setTab('Coop')}:undefined}/>}
    {tab==='Guild'&&<GuildScreen
      onEventPageChange={setGuildEventPageOpen}
      eventGameplayBusy={online.busy||online.pending} onRefreshEventInventory={online.refreshAfterExternalWrite}
      onOpenEventCrafting={skill=>{setSelectedSkill(skill);setSkillsMode('crafting');setTab('Skills')}}
      initialNavigation={!guildInitialPve&&guildNavigationMemory.current?.scope===(auth.session?.user.id??state.character.id)+':'+guildMembershipRevision?guildNavigationMemory.current.context:undefined}
      onNavigationChange={context=>{const scope=(auth.session?.user.id??state.character?.id??'')+':'+guildMembershipRevision;guildNavigationMemory.current={scope,context};setGuildRaidScope(context.section==='PvE'?scope:null);}}
      onOpenChat={()=>{setChatInitialChannel('guild');setShowChatOverlay(true)}} onRecruitment={()=>{setSocialInitialTab('guild');setTab('Recruitment')}} online={serverGameplayEnabled} membershipRevision={guildMembershipRevision} state={state} onChange={commit} initialPve={guildInitialPve} onInitialPveHandled={()=>setGuildInitialPve(false)} onlineManagement={<OnlineGuildManagement onApplicationsChanged={()=>{void refreshSocialNotifications();setGuildMembershipRevision(value=>value+1)}}/>} onlineBoard={<OnlineGuildNoticeBoardPanel/>} onlineProjects={<OnlineGuildProjectsPanel onRewardsChanged={async()=>{await Promise.allSettled([online.refresh(),refreshSocialNotifications()])}} onNavigateActivity={activity=>{
  if(activity==='combat'){setTab('Combat');return;}
  setSelectedSkill(activity==='gathering'?'regional-gathering':undefined);
  setSkillsMode(activity==='gathering'?'gathering':'crafting');
  setTab('Skills');
 }}/>}  onTokenRewardsChanged={()=>online.refresh()} onlinePve={<OnlineGuildPve initialEncounterKind={guildInitialPve?'event':'weekly'} state={state} onCombat={()=>setTab('Combat')} onRewardsChanged={()=>online.refresh()} authoritative={serverGameplayEnabled} numberMode={state.settings.numberMode}/>} onlineChat={<GuildChat language={state.settings.language} currentPlayerName={state.character?.name} unlockedEmoteIds={state.account.unlockedEmoteIds} trayIds={state.settings.chatEmoteTrayIds} bodyPresentation={state.character?.bodyPresentation} onTrayChange={ids=>commit({...state,settings:{...state.settings,chatEmoteTrayIds:ids}})} onManageEmotes={openChatEmoteSettings} firstUnreadMessageId={notificationCounts.guildFirstUnreadMessageId} onRead={()=>void refreshSocialNotifications()}/>} onlineChatUnread={notificationCounts.guildChatUnread} onlineChatMentions={notificationCounts.guildChatMentions} onlineHall={<OnlineGuildHallPanel/>} onlineCustomize={<OnlineGuildCustomizationPanel/>}/>}
    {tab==='Settings'&&<SettingsScreen onOpenUpdates={()=>setShowWhatsNew(true)} initialSection={settingsSection} focusChatEmotes={focusChatEmotes} onChatEmotesFocusHandled={()=>setFocusChatEmotes(false)} onSectionChange={setSettingsSection} onStartMainScreenTour={()=>{setSettingsSection(undefined);setMainScreenTourIndex(0);setTab('Home')}} onNavigateGuide={destination=>{if(destination==='Skills')setSelectedSkill(undefined);setTab(destination)}} online={serverGameplayEnabled} state={state} onChange={commit} onUiThemeChange={selectUiTheme} uiThemeId={displayedThemeId} onExport={exportSave} onImport={importSave} onOpenCoopUiGallery={__DEV__?()=>setShowCoopUiGallery(true):undefined} onLanguage={language=>commit({...state,settings:{...state.settings,language}})} onReset={()=>serverGameplayEnabled?showAlert('Online save','Your online character is saved on the server.'):showAlert('Reset local save?','This deletes prototype progress only.',[{text:'Cancel'},{text:'Reset',style:'destructive',onPress:async()=>{await repo.reset();setState(newGame(Date.now()));setCurrentTab('Home');setTabHistory([])}}])}/>}
    {tab==='Store'&&<StoreScreen state={state} onChange={commit} online={serverGameplayEnabled} onRefreshCommerce={serverGameplayEnabled?online.refreshCommerce:undefined} onRedeemCode={serverGameplayEnabled?async code=>{const message=await redeemCode(code);await online.refresh();return message}:undefined}/>}
    {tab==='NewUnlocks'&&<NewUnlocksScreen language={state.settings.language} entries={unlockInbox} onBack={()=>setTab('More')} onCustomize={()=>{setProfileCustomizeSection('Look');setTab('ProfileCustomize')}}/>}
    {tab==='More'&&<MoreScreen character={state.character} accountStatus={serverGameplayEnabled?(auth.session?(accountLinkStep(auth.session.user)==='linked'?'linked':accountLinkStep(auth.session.user)==='guest'?'guest':'pending'):'guest'):'local'} onOpenUpdates={()=>setShowWhatsNew(true)} onOpenRoadmap={()=>setTab('Roadmap')} onOpenFeaturePreview={FEATURE_HUB_QA_ENABLED?route=>setTab(route):undefined} newReleaseAvailable={hasUnseenUpdate} language={state.settings.language} onNavigate={destination=>{if(destination==='Dungeon'){setTab('Coop');return;}if(destination==='Quests'){openQuestMode('story');return;}if(destination==='Settings'){setSettingsSection(undefined);}setTab(destination)}} lockedDestinations={lockedAccountDestinations} companionUnlocked={companionsUnlocked} companionAttention={earlyFeatureUnlocked(state,'companions')&&companionAttention.hasAttention} dailySuppliesAttention={dailySuppliesReady} questRewardCount={questClaims.total} friendRequestCount={notificationCounts.friendRequests} guildAttentionCount={notificationCounts.guild+notificationCounts.guildChatUnread+notificationCounts.guildProjectRewards} guildProjectRewardCount={guildUnlocked?notificationCounts.guildProjectRewards:0} onOpenGuildProjects={openClaimableGuildProjects} socialAttentionCount={notificationCounts.partyInvites+notificationCounts.partyChatUnread} newUnlockCount={unreadUnlockCount(unlockInbox)} onOpenAdminQa={adminQa||(__DEV__&&!serverGameplayEnabled)?()=>setShowAdminQa(true):undefined}/>}
    {tab==='Roadmap'&&<CommunityRoadmapScreen language={state.settings.language}/>}
    {tab==='Arena'&&<ArenaScreen state={state} onChange={candidate=>void commit(candidate)} onCommand={serverGameplayEnabled?command=>void perform(command):undefined}/>}
    {RANKINGS_RELEASED&&tab==='Rankings'&&<RankingsScreen/>}
    {(tab==='Collections'||tab==='Pets')&&<CollectionsScreen key={tab} initialCategory={tab==='Pets'?'pet':'profile_icon'} state={state} onChange={candidate=>void commit(candidate)}/>}
     {tab==='ResourceCodex'&&<ResourceCodexScreen state={state} onNavigateSource={openWorkingTowardDestination} onOpenCompanions={()=>setTab('Companions')}/>}
     {tab==='SkillGuide'&&<SkillGuideScreen state={state} onClose={()=>setTab('More')} onOpenSkill={id=>{if(id==='companion'){setTab('Companions');return;}setSelectedSkill(id);setSkillsMode(id==='faith'?'faith':['mining','woodcutting','fishing','herbalism','exploration'].includes(id)?'gathering':'crafting');setTab('Skills');}} onOpenCombat={()=>setTab('Combat')} onOpenMastery={()=>{setSelectedSkill('companion-mastery');setSkillsMode('gathering');setTab('Skills');}}/>}
    {tab==='Profile'&&<ProfileScreen state={state} onNavigate={destination=>{if(destination==='Customize'){setProfileCustomizeSection('Look');setTab('ProfileCustomize');return;}setTab(destination)}}/>}
    {tab==='ProfileCustomize'&&<ProfileCustomizeScreen onEquipUltraLuxe={online.equipUltraLuxeFullSet} key={profileAttentionScope} state={state} initialSection={profileCustomizeSection} onChange={commit} onSaveNameStyle={saveNameStyle} onNavigateSource={destination=>setTab(destination)} onDirtyChange={setProfileCustomizeDirty}/>}
    </ScreenTransition>
  </View>
  <EventStartPopup runtime={activeGlobalPopup==='event-start'?eventStartPopup:null} reduceMotion={state.settings.reduceMotion} onOpen={()=>{setEventStartPopup(null);setTab('Events')}} onClose={()=>setEventStartPopup(null)}/>
  <ChatOverlay initialChannel={chatInitialChannel} state={state} visible={showChatOverlay} hideDock={tab==='ProfileCustomize'||tab==='Coop'||featureHubShell.hideGlobalChatDock} allowPartyChatWhenWorldDisabled={featureHubShell.showLocalPartyChatDock} partyOnly={featureHubShell.showLocalPartyChatDock} onOpen={()=>{setChatInitialChannel('world');setShowChatOverlay(true)}} onClose={()=>setShowChatOverlay(false)} onManageEmotes={openChatEmoteSettings} onEmoteTrayChange={ids=>commit({...state,settings:{...state.settings,chatEmoteTrayIds:ids}})} guildUnread={notificationCounts.guildChatUnread} guildMentions={notificationCounts.guildChatMentions} guildFirstUnreadMessageId={notificationCounts.guildFirstUnreadMessageId} partyUnread={notificationCounts.partyChatUnread} partyMentions={notificationCounts.partyChatMentions} partyFirstUnreadMessageId={notificationCounts.partyFirstUnreadMessageId} onChatRead={()=>void refreshSocialNotifications()}/>
  {!collected&&!forgeResults?.some(isExceptionalForgeResult)&&forgeClaimFeedback?<View style={s.masteryNotice}><ActionFeedback message={forgeClaimFeedback.message} tone={forgeClaimFeedback.tone} reduceMotion={state.settings.reduceMotion} compact/></View>:!collected&&!forgeResults?.some(isExceptionalForgeResult)&&preparationNotices.length?<View style={s.masteryNotice}><ActionFeedback message={preparationNotices[0].message} tone={preparationNotices[0].tone} reduceMotion={state.settings.reduceMotion} compact actionLabel={preparationNotices[0].actionLabel} onAction={()=>openPreparationNotice(preparationNotices[0])}/></View>:!collected&&!forgeResults?.some(isExceptionalForgeResult)&&masteryNotices.length?<View style={s.masteryNotice}><ActionFeedback message={masteryRankNoticeMessage(masteryNotices)} tone={masteryNotices.some(moment=>moment.mastered)?'success':'info'} reduceMotion={state.settings.reduceMotion} compact/></View>:null}
    <PrimaryNavigation destinations={primaryTabs} active={activePrimary} labelFor={item=>tabLabel(state.settings.language,item)} onNavigate={setTab} badges={primaryBadges} guidedDestination={(mainScreenTour?.highlightPrimary??visibleTutorialStep?.highlightPrimary) as PrimaryTab|undefined} reduceMotion={state.settings.reduceMotion}/>
  {activeGlobalPopup==='character-welcome'&&creationWelcome&&<AsterfallWelcomeModal visible name={creationWelcome.name} classId={creationWelcome.classId} onContinue={()=>{const characterId=state.character?.id;if(characterId)void completeFirstSessionTutorialStep(characterId,'first_hunt').then(ids=>setTutorialCompleted(ids));setGoalMonsterId('MOSS_RAT');setCreationWelcome(null);setCurrentTab('Combat')}}/>}
  <WhatsNewModal visible={activeGlobalPopup==='whats-new'}
    currentVersion={APP_BUILD_INFO.version} notes={releaseNotes} latestVersion={versionGate?.policy?.latestVersion}
    updateAvailable={!!versionGate?.updateAvailable} reduceMotion={state.settings.reduceMotion}
    onUpdate={openStoreListing} onClose={closeWhatsNew}/>
  <RewardPopup reward={activeGlobalPopup==='activity-reward'?collected?.reward??null:null} activity={collected?.activity??null} classId={state.character?.classId} welcomeBack={!!collected?.welcomeBack} welcomeReport={collected?.welcomeReport} progressionMoments={collected?.progressionMoments??[]} reduceMotion={state.settings.reduceMotion} numberMode={state.settings.numberMode} onClose={()=>setCollected(null)} onInventory={()=>setTab('Inventory')} onCollections={()=>setTab('Collections')} onCompanions={()=>setTab('Companions')} onSkill={id=>{const skillId=id as SkillId;setSelectedSkill(skillId);setSkillsMode(id==='faith'?'faith':['mining','woodcutting','fishing','herbalism'].includes(id)?'gathering':'crafting');setTab('Skills')}}/>
  <FirstSessionTutorialPopup step={activeGlobalPopup==='first-session'?visibleTutorialStep:undefined} onLater={()=>{if(visibleTutorialStep)setTutorialDismissedId(visibleTutorialStep.id)}} onOpen={()=>{const step=visibleTutorialStep;if(!step||!state.character)return;if(step.id==='first_hunt')setGoalMonsterId('MOSS_RAT');void completeFirstSessionTutorialStep(state.character.id,step.id).then(ids=>setTutorialCompleted(ids));setTutorialDismissedId(undefined);if(step.destination==='Skills')setSelectedSkill(undefined);if(step.destination==='Quests'){openQuestMode('story');return;}setTab(step.destination)}}/>
  <MainScreenTourPopup step={activeGlobalPopup==='main-tour'?mainScreenTour:undefined} index={mainScreenTourIndex??0} total={MAIN_SCREEN_TOUR.length} onSkip={()=>{setMainScreenTourIndex(undefined);setSettingsSection('guide');setTab('Settings')}} onBack={()=>{if(mainScreenTourIndex===undefined)return;const next=Math.max(0,mainScreenTourIndex-1);setMainScreenTourIndex(next);const target=mainScreenTourStep(next);if(target)setTab(target.destination)}} onNext={()=>{if(mainScreenTourIndex===undefined)return;const next=mainScreenTourIndex+1;if(next>=MAIN_SCREEN_TOUR.length){setMainScreenTourIndex(undefined);setSettingsSection('guide');setTab('Settings');return;}setMainScreenTourIndex(next);const target=mainScreenTourStep(next);if(target)setTab(target.destination)}}/>
  <FeatureUnlockPopup moment={activeGlobalPopup==='feature-unlock'?featureUnlockMoments[0]:undefined} reduceMotion={state.settings.reduceMotion} onLater={()=>setFeatureUnlockMoments(current=>current.slice(1))} onOpen={()=>{const moment=featureUnlockMoments[0];setFeatureUnlockMoments(current=>current.slice(1));if(moment)setTab(moment.destination);}}/>
  <ProfileDiscardChangesModal visible={!!profileDiscardAction} reduceMotion={state.settings.reduceMotion} onKeepEditing={()=>setProfileDiscardAction(null)} onDiscard={()=>{const action=profileDiscardAction;setProfileDiscardAction(null);setProfileCustomizeDirty(false);action?.();}}/>
  {!serverGameplayEnabled&&offlineSettling&&<View style={s.offlineLoadingOverlay}><LoadingState label={appText(state.settings.language,'Calculating offline rewards…')} detail={appText(state.settings.language,'Calculating rewards from your time away.')}/></View>}
  <ForgeClaimAllSummaryModal results={activeGlobalPopup==='exceptional-forge'?forgeClaimAllResults??[]:[]} remainingCount={forgeClaimAllPendingCount} reduceMotion={state.settings.reduceMotion} onClose={()=>setForgeClaimAllResults(null)} onInventory={()=>{setForgeClaimAllResults(null);setTab('Inventory')}}/>
   <ForgeRarityRevealModal results={activeGlobalPopup==='exceptional-forge'&&!forgeClaimAllResults?.length?forgeResults??[]:[]} reduceMotion={state.settings.reduceMotion} onClose={()=>setForgeResults(null)} onInventory={()=>{setForgeResults(null);setTab('Inventory')}}/>
  {activeGlobalPopup==='story-boss'&&storyBossBattle&&<StoryBossBattleModal state={state} battle={storyBossBattle.battle} message={storyBossBattle.message} onClose={()=>setStoryBossBattle(null)}/>}
  </SafeAreaView></TutorialHighlightProvider></GameThemeProvider>;
  };
  const renderedApp=renderApp();
  return <GameLanguageProvider language={state?.settings.language??recoveryLanguage}><View style={s.appRoot}>
    <Animated.View style={[s.appRoot,{opacity:appEntranceOpacity,transform:[{translateY:appEntranceY}]}]}><ActiveProfileCharacterContext.Provider value={activeProfileCharacter}>{renderedApp}</ActiveProfileCharacterContext.Provider></Animated.View>
    {(startupOverlayVisible||startupBlocking)&&<Animated.View pointerEvents={startupBlocking?'auto':'none'} style={[s.startupOverlay,{opacity:startupBlocking?1:startupOpacity}]}>
      <StartupScreen scene={startupScene} language={state?.settings.language??recoveryLanguage} themeId={displayedThemeId}/>
    </Animated.View>}
  </View></GameLanguageProvider>;
}
const s=StyleSheet.create({appRoot:{flex:1},startupOverlay:{...StyleSheet.absoluteFill,zIndex:100},startupUnderlay:{flex:1,backgroundColor:C.bg},safe:{flex:1,backgroundColor:C.bg},offlineLoadingOverlay:{...StyleSheet.absoluteFill,zIndex:20,justifyContent:'center',padding:16,backgroundColor:'rgba(5,9,15,.86)'},masteryNotice:{paddingHorizontal:10,paddingVertical:4,backgroundColor:C.bg},center:{flex:1,backgroundColor:C.bg,alignItems:'center',justifyContent:'center',gap:10},txt:{color:C.text},body:{flex:1}});
