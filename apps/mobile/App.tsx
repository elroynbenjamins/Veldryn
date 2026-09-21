import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ActivityIndicator,Alert,ScrollView,AppState,BackHandler,Image,PanResponder,Pressable,SafeAreaView,Share,StyleSheet,Text,TextInput,View} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AccountWelcomeScreen} from './src/components/AccountWelcomeScreen';
import {StartupScreen} from './src/components/StartupScreen';
import {pickStartupScene} from './src/theme/startup-art';
import {AsyncStorageGameRepository} from './src/storage/async-storage-repository';
import {ActiveActivity,CombatChallengeId,CombatTacticId,GameState,RewardBundle} from './src/core/types';
import type {HuntGoalId} from './src/core/hunt-goals';
import {challengeFallenKnight,claimActivity,claimOverflowToBank,claimQuest,claimSeasonalContract,craftRecipe,createCharacter,depositAllMaterials,depositToBank,eatFood,equipFood,equipGatheringTool,equipItem,newGame,previewActivityReward,salvageItem,sellItem,startHerbalism,travelToRegion,unequipItem,upgradeStorage,withdrawFromBank} from './src/core/game';
import {cancelEquipmentCraft,claimAllReadyEquipmentCrafts,claimEquipmentCraft,equipmentCraftQueueModel,moveWaitingEquipmentCraft,startEquipmentCraft,timedEquipmentRecipe} from './src/core/equipment-crafting-queue';
import {craftEquipmentPrerequisites} from './src/core/equipment-crafting-prerequisites';
import {acknowledgeAllInventoryItems,acknowledgeInventoryItem,toggleInventoryFavorite} from './src/core/inventory-view';
import {bulkSalvageSelected,bulkSellSelected,bulkTransferSelected} from './src/core/inventory-bulk';
import {ClassSelectScreen} from './src/screens/ClassSelectScreen';
import {HomeScreen} from './src/screens/HomeScreen';
import {WorldScreen} from './src/screens/WorldScreen';
import {InventoryScreen} from './src/screens/InventoryScreen';
import {CharacterScreen} from './src/screens/CharacterScreen';
import {CombatCompanionPanel} from './src/components/CombatCompanionPanel';
import {executeGameCommand} from './src/core/game-commands';
import {QuestScreen} from './src/screens/QuestScreen';
import {SkillsScreen} from './src/screens/SkillsScreen';
import {CompanionsScreen} from './src/screens/CompanionsScreen';
import {SettingsScreen} from './src/screens/SettingsScreen';
import {MoreScreen} from './src/screens/MoreScreen';
import {ChatPilotDevScreen} from './src/screens/ChatPilotDevScreen';
import {GuildScreen} from './src/screens/GuildScreen';
import {FriendsScreen} from './src/screens/FriendsScreen';
import {EventScreen} from './src/screens/EventScreen';
import {OnlineGuildBrowser} from './src/components/OnlineGuildBrowser';
import {OnlineGuildManagement} from './src/components/OnlineGuildManagement';
import {OnlineGuildPve} from './src/components/OnlineGuildPve';
import {OnlineGuildHallPanel} from './src/components/OnlineGuildHallPanel';
import {OnlineGuildCustomizationPanel} from './src/components/OnlineGuildCustomizationPanel';
import {OnlineGuildProjectsPanel} from './src/components/OnlineGuildProjectsPanel';
import {GuildChat} from './src/components/GuildChat';
import {OnlineGuildNoticeBoardPanel} from './src/components/OnlineGuildNoticeBoardPanel';
import {ProfileEditor} from './src/components/ProfileEditor';
import {RewardPopup} from './src/components/RewardPopup';
import {CustomizationUnlockPopup,type CustomizationUnlockEntry} from './src/components/CustomizationUnlockPopup';
import {C,resolveTheme} from './src/theme/theme';
import {GameThemeProvider} from './src/theme/ThemeContext';
import {rewardHasProgress,settleStartupActivity,transitionActivity} from './src/core/playability';
import {equipNoviceSet} from './src/core/game';
import {noviceSetProgress} from './src/core/character-appearance';
import {discoverCharacterSkins,newlyUnlockedCharacterSkins,selectCharacterSkin} from './src/core/character-skins';
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
import {ChatOverlay} from './src/components/ChatOverlay';
import type {QuickNavDestination} from './src/core/quick-navigation';
import {CombatScreen} from './src/screens/CombatScreen';
import type {SkillId} from './src/core/types';
import {PrimaryNavigation} from './src/components/PrimaryNavigation';
import {attemptEquipmentUpgrade,socketGem,unsocketGem} from './src/core/equipment-enhancement';
import {SocialScreen} from './src/screens/SocialScreen';
import {ArenaScreen} from './src/screens/ArenaScreen';
import {RankingsScreen} from './src/screens/RankingsScreen';
import {CollectionsScreen} from './src/screens/CollectionsScreen';
import {ProfileScreen} from './src/screens/ProfileScreen';
import {ProfileCustomizeScreen} from './src/screens/ProfileCustomizeScreen';
import {AchievementsScreen} from './src/screens/AchievementsScreen';
import {ActivityOverviewScreen} from './src/screens/ActivityOverviewScreen';
import {ProgressionPlannerScreen} from './src/screens/ProgressionPlannerScreen';
import {DailySuppliesScreen} from './src/screens/DailySuppliesScreen';
import {AccountBonusesScreen} from './src/screens/AccountBonusesScreen';
import {PartySocialProvider} from './src/online/PartySocialProvider';
import {AuthSessionProvider,useAuthSession} from './src/online/AuthSessionProvider';
import {useOnlineGame} from './src/online/useOnlineGame';
import {serverGameplayEnabled} from './src/online/gameplay';
import {OnlineAccountPanel} from './src/components/OnlineAccountPanel';
import {GameButton} from './src/components/GameButton';
import type {GameCommand} from './src/core/game-commands';
import {buildNavigationBadges,type NavigationNotification} from './src/core/navigation-notifications';
import {eventReadyClaimCount} from './src/core/live-events';
import {companionAttentionSummary} from './src/core/companion-attention';
import {workingTowardReadyCount,type WorkingTowardDestination} from './src/core/working-toward';
import {dailySuppliesStatus} from './src/core/daily-supplies';
import {contractBoardSummary} from './src/core/contract-board-summary';
import {weeklyOrderDestination,weeklyOrderGoal,weeklyOrderIdleRule,weeklyOrderIdleRuleId,weeklyOrderQueueActivity} from './src/core/weekly-order-integrations-v41';
import type {WeeklyOrder} from './src/core/weekly-orders-v41';
import {useSocialNotificationCounts} from './src/online/useSocialNotificationCounts';
import {fetchActiveEventRuntime} from './src/online/live-events';
import {onlineConfigured} from './src/online/supabase';
import {newlyUnlockedProfileRewards} from './src/core/profile-customization';
import {mergeProfileAttentionKeys} from './src/core/profile-attention';
import {addProfileAttentionKeys,clearProfileAttentionKeys,loadProfileAttentionKeys} from './src/storage/profile-attention';

type Tab=QuickNavDestination|'Activity'|'Progression'|'DailySupplies'|'AccountBonuses'|'Arena'|'Rankings'|'Collections'|'Profile'|'ProfileCustomize'|'Achievements'|'Combat'|'Coop';
type PrimaryTab='Skills'|'World'|'Character'|'Inventory'|'More';
const primaryTabs:PrimaryTab[]=['Character','Skills','World','Inventory','More'];
function tabLabel(language:Language,tab:Tab):string{
  switch(tab){
    case 'Home':return t(language,'nav.home');case 'World':return t(language,'nav.world');case 'Character':return t(language,'nav.character');case 'Inventory':return t(language,'nav.inventory');case 'More':return 'Account';case 'Activity':return 'Characters';case 'Progression':return 'Working Toward';case 'DailySupplies':return 'Daily Supplies';case 'AccountBonuses':return 'Account Bonuses';
    case 'Quests':return t(language,'more.quests');case 'Companions':return 'Companions';case 'Skills':return t(language,'more.skills');case 'Events':return t(language,'more.events');case 'Friends':return t(language,'more.friends');case 'Guild':return t(language,'more.guild');case 'Settings':return t(language,'more.settings');case 'Account':return 'Account';case 'Dungeon':return 'Dungeon';case 'Empty':return 'Empty';
    case 'Combat':return 'Combat';case 'Coop':return ct(language,'browse.title');
    case 'Social':return 'Social';case 'Party':return 'Party';
    case 'Arena':return 'Arena';
    case 'Rankings':return 'Rankings';
    case 'Collections':return 'Collections';
    case 'Profile':return 'Profile';
    case 'ProfileCustomize':return 'Customize Profile';
    case 'Achievements':return 'Achievements';
  }
}
const repo=new AsyncStorageGameRepository();

export default function App(){return <SafeAreaProvider><AuthSessionProvider><PartySocialProvider><VeldrynApp/></PartySocialProvider></AuthSessionProvider></SafeAreaProvider>;}
function VeldrynApp(){
  const auth=useAuthSession(),online=useOnlineGame();
  const {counts:notificationCounts,refresh:refreshSocialNotifications}=useSocialNotificationCounts();
  const [state,setState]=useState<GameState|null>(null);
  const [ready,setReady]=useState(false);
  const [startupScene]=useState(pickStartupScene);
  const [loadError,setLoadError]=useState('');
  const [recoveryLanguage,setRecoveryLanguage]=useState<Language>('en');
  const [tab,setCurrentTab]=useState<Tab>('Home');
  const [tabHistory,setTabHistory]=useState<Tab[]>([]);
  const [skillsMode,setSkillsMode]=useState<'gathering'|'crafting'|'novice'|'faith'>('gathering');
  const [selectedSkill,setSelectedSkill]=useState<SkillId|undefined>();
  const [goalActionId,setGoalActionId]=useState<string|undefined>();
  const [goalRecipeId,setGoalRecipeId]=useState<string|undefined>();
  const [goalMonsterId,setGoalMonsterId]=useState<string|undefined>();
  const [goalRegionId,setGoalRegionId]=useState<string|undefined>();
  const [pendingGoalDestination,setPendingGoalDestination]=useState<WorkingTowardDestination|undefined>();
  const [now,setNow]=useState(Date.now());
  const [collected,setCollected]=useState<{reward:RewardBundle;activity:ActiveActivity|null;welcomeBack?:boolean}|null>(null);
  const [customizationUnlocks,setCustomizationUnlocks]=useState<CustomizationUnlockEntry[]>([]);
  const [profileAttentionKeys,setProfileAttentionKeys]=useState<string[]>([]);
  const [profileCustomizeDirty,setProfileCustomizeDirty]=useState(false);
  const stateRef=useRef<GameState|null>(null);
  const appStateRef=useRef(AppState.currentState);
  const settlingRef=useRef(false);
  const [showChatPilot,setShowChatPilot]=useState(false);
  const [creatingRoster,setCreatingRoster]=useState(false);
  const [showChatOverlay,setShowChatOverlay]=useState(false);
  const [showCoopUiGallery,setShowCoopUiGallery]=useState(false);
  const [pendingEventLiveId,setPendingEventLiveId]=useState<string|undefined>();
  const [chatPilotInitialPanel,setChatPilotInitialPanel]=useState<'chat'|'emotes'>('chat');
  const profileAttentionScope=auth.session?.user.id?`account:${auth.session.user.id}`:state?`local:${state.createdAtMs}`:'local:pending';
  const confirmProfileCustomizeExit=useCallback((action:()=>void)=>{
    if(tab!=='ProfileCustomize'||!profileCustomizeDirty){action();return;}
    Alert.alert('Discard profile changes?','You have unapplied appearance previews or unsaved profile settings.',[
      {text:'Keep editing',style:'cancel'},
      {text:'Discard changes',style:'destructive',onPress:()=>{setProfileCustomizeDirty(false);action();}},
    ]);
  },[tab,profileCustomizeDirty]);
  const setTab=useCallback((destination:Tab)=>{
    if(destination===tab)return;
    confirmProfileCustomizeExit(()=>{
      setProfileCustomizeDirty(false);
      setTabHistory(history=>[...history,tab].slice(-24));
      setCurrentTab(destination);
    });
  },[tab,confirmProfileCustomizeExit]);
  const goBack=useCallback(()=>{
    if(showChatOverlay){setShowChatOverlay(false);return true;}
    if(showChatPilot){setShowChatPilot(false);return true;}
    if(showCoopUiGallery){setShowCoopUiGallery(false);return true;}
    confirmProfileCustomizeExit(()=>{
      setProfileCustomizeDirty(false);
      if(tabHistory.length){
        setCurrentTab(tabHistory[tabHistory.length-1]);
        setTabHistory(tabHistory.slice(0,-1));
        return;
      }
      if(tab!=='Home')setCurrentTab('Home');
    });
    return true;
  },[showChatOverlay,showChatPilot,showCoopUiGallery,tab,tabHistory,confirmProfileCustomizeExit]);
  const backSwipe=useMemo(()=>PanResponder.create({
    onMoveShouldSetPanResponder:(_event,gesture)=>gesture.x0<=32&&gesture.dx>12&&Math.abs(gesture.dx)>Math.abs(gesture.dy)*1.25,
    onPanResponderRelease:(_event,gesture)=>{if(gesture.dx>=72&&gesture.vx>=0)goBack();},
    onPanResponderTerminate:()=>{},
  }),[goBack]);
  const loadGame=useCallback(async()=>{setReady(false);setLoadError('');try{setRecoveryLanguage(await repo.loadLanguage());const saved=await repo.load();const restored=discoverCharacterSkins(saved??newGame(Date.now()));const startup=saved?settleStartupActivity(restored,Date.now()):{state:restored,reward:null,activity:null};const next=startup.state;stateRef.current=next;setState(next);setRecoveryLanguage(next.settings.language);if(startup.reward)setCollected({reward:startup.reward,activity:startup.activity,welcomeBack:true});if(saved){try{await repo.save(next)}catch{Alert.alert('Save upgrade pending','Your progress loaded, but the upgraded save could not be written yet. Keep the app open and try another saved action.')}}}catch(error){stateRef.current=null;setState(null);setLoadError(error instanceof Error?error.message:'The local save could not be read.')}finally{setReady(true)}},[]);
  useEffect(()=>{if(!serverGameplayEnabled)void loadGame()},[loadGame]);
  useEffect(()=>{if(!serverGameplayEnabled)return;const next=online.snapshot?.state??null;stateRef.current=next;setState(next);setReady(!online.loading);setLoadError('');},[online.snapshot,online.loading]);
  useEffect(()=>{stateRef.current=state},[state]);
  useEffect(()=>{if(!state)return;let active=true;void loadProfileAttentionKeys(profileAttentionScope).then(keys=>{if(active)setProfileAttentionKeys(keys)});return()=>{active=false};},[profileAttentionScope,!!state]);
  useEffect(()=>{if(tab!=='ProfileCustomize'||!profileAttentionKeys.length)return;setProfileAttentionKeys([]);void clearProfileAttentionKeys(profileAttentionScope);},[tab,profileAttentionScope,profileAttentionKeys.length]);
  const syncLiveEventRuntime=useCallback(async()=>{if(!onlineConfigured)return;try{const runtime=await fetchActiveEventRuntime();const current=stateRef.current;if(!current)return;const before=current.account.liveEvent??null,nextRuntime=runtime??null;if(JSON.stringify(before)===JSON.stringify(nextRuntime))return;const next={...current,account:{...current.account,liveEvent:runtime}};stateRef.current=next;setState(next);}catch{/* Event registry sync is best-effort; gameplay refresh remains authoritative. */}},[]);
  useEffect(()=>{if(!onlineConfigured)return;void syncLiveEventRuntime();const id=setInterval(()=>void syncLiveEventRuntime(),30000);const sub=AppState.addEventListener('change',status=>{if(status==='active')void syncLiveEventRuntime();});return()=>{clearInterval(id);sub.remove();}},[syncLiveEventRuntime]);
  useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(id)},[]);
  useEffect(()=>{if(tab!=='Skills'){setSelectedSkill(undefined);setGoalActionId(undefined);setGoalRecipeId(undefined)}},[tab]);
  useEffect(()=>{if(tab!=='Combat')setGoalMonsterId(undefined)},[tab]);
  useEffect(()=>{const subscription=BackHandler.addEventListener('hardwareBackPress',goBack);return()=>subscription.remove()},[goBack]);
  useEffect(()=>{const subscription=AppState.addEventListener('change',nextStatus=>{if(serverGameplayEnabled)return;const wasAway=appStateRef.current==='background'||appStateRef.current==='inactive';appStateRef.current=nextStatus;if(!wasAway||nextStatus!=='active'||settlingRef.current)return;const current=stateRef.current;if(!current?.activity)return;const settled=settleStartupActivity(current,Date.now());if(!settled.reward)return;settlingRef.current=true;stateRef.current=settled.state;setState(settled.state);setCollected({reward:settled.reward,activity:settled.activity,welcomeBack:true});void repo.save(settled.state).catch(()=>Alert.alert('Save pending','Your returned rewards are safe in memory, but could not be saved yet.')).finally(()=>{settlingRef.current=false})});return()=>subscription.remove()},[]);
  useEffect(()=>{const multiplier=state?.settings.textScale??1.5;for(const component of [Text,TextInput]){const scalable=component as typeof component&{defaultProps?:Record<string,unknown>};scalable.defaultProps={...(scalable.defaultProps??{}),allowFontScaling:true,maxFontSizeMultiplier:multiplier}}},[state?.settings.textScale]);
  const coopEntrySource=useMemo(()=>__DEV__&&!serverGameplayEnabled&&!coopOnlineConfigured?createCoopDungeonFixtureSource(state?.settings.language??recoveryLanguage,state?.character):realCoopEntrySource,[state?.settings.language,state?.character,recoveryLanguage]);
  function queueCustomizationUnlocks(before:GameState|null,next:GameState){
    if(!before)return;
    const profile=newlyUnlockedProfileRewards(before,next).map(row=>({key:row.kind+':'+row.id,kind:row.kind,name:row.name,detail:row.source?row.source.label+' · '+row.source.detail:undefined} satisfies CustomizationUnlockEntry));
    const skins=newlyUnlockedCharacterSkins(before,next).map(row=>({key:'skin:'+row.id,kind:'skin' as const,name:row.name,detail:'Character appearance'}));
    if(!profile.length&&!skins.length)return;
    setCustomizationUnlocks(current=>{
      const map=new Map(current.map(row=>[row.key,row]));
      for(const row of [...profile,...skins])map.set(row.key,row);
      return [...map.values()];
    });
    if(profile.length){
      const keys=profile.map(row=>row.key),scope=auth.session?.user.id?`account:${auth.session.user.id}`:`local:${next.createdAtMs}`;
      setProfileAttentionKeys(current=>mergeProfileAttentionKeys(current,keys));
      void addProfileAttentionKeys(scope,keys);
    }
  }
  async function perform(command?:GameCommand){try{const before=stateRef.current,result=await online.execute(command);stateRef.current=result.state;setState(result.state);queueCustomizationUnlocks(before,result.state);if(result.reward)presentCollected(result.reward,result.activity??null);return result;}catch(error){Alert.alert('Online action',error instanceof Error?error.message:'Please retry.');return null;}}
  async function runCompanionCommand(command:GameCommand){
    if(serverGameplayEnabled){if(!await perform(command))throw new Error('Companion action was not confirmed.');return;}
    const current=stateRef.current;if(!current)throw new Error('Load your character first.');
    const result=executeGameCommand(current,command,Date.now());
    await commit(result.state);if(result.reward)presentCollected(result.reward,result.activity??null);
  }
  async function commit(candidate:GameState){
    if(serverGameplayEnabled){
      const current=stateRef.current;if(!current)return;
      if(JSON.stringify(candidate)===JSON.stringify({...current,settings:candidate.settings})){await perform({type:'settings',args:{settings:candidate.settings}});return;}
      if(candidate.activity===null&&JSON.stringify(candidate)===JSON.stringify({...current,activity:null})){await perform({type:'stop'});return;}
      const profileKeys=['profileTitle','profileBackgroundId','profileBorderId','selectedCosmeticPetId'] as const;
      if(current.character&&candidate.character){const patch=Object.fromEntries(profileKeys.map(key=>[key,candidate.character![key]]));
        if(JSON.stringify(candidate)===JSON.stringify({...current,character:{...current.character,...patch}})){await perform({type:'profile',args:Object.fromEntries(Object.entries(patch).map(([key,value])=>[key,value??null]))});return;}}
      Alert.alert('Server-owned progress','This change requires an online gameplay action.');return;
    }
    const current=stateRef.current;
    if(current?.character&&candidate.character&&current.character.selectedCosmeticPetId!==candidate.character.selectedCosmeticPetId){
      const patch={selectedCosmeticPetId:candidate.character.selectedCosmeticPetId};
      if(JSON.stringify(candidate)===JSON.stringify({...current,character:{...current.character,...patch}})){
        const settled=claimActivity(current,Date.now());candidate={...settled.state,character:{...settled.state.character!,...patch}};presentCollected(settled.reward,current.activity);
      }
    }
const next=discoverCharacterSkins(candidate);stateRef.current=next;setState(next);queueCustomizationUnlocks(current,next);try{await repo.save(next)}catch{Alert.alert('Local save failed','Progress is still in memory. Keep the app open and try another action to save again.')}}
  async function exportSave(){if(!state){Alert.alert('Export unavailable','No save is loaded.');return;}try{await Share.share({title:'VELDRYN save backup',message:createSaveBackup(state)})}catch(error){Alert.alert('Export failed',error instanceof Error?error.message:'The share sheet could not be opened.')}}
  async function importSave(raw:string){if(serverGameplayEnabled)throw new Error("Local backups cannot replace server-owned progress.");const next=discoverCharacterSkins(parseSaveBackup(raw));await repo.save(next);setState(next);setCurrentTab('Home');setTabHistory([]);Alert.alert('Save imported','The validated backup is now stored on this device.');}
  function presentCollected(reward:RewardBundle,activity:ActiveActivity|null){if(rewardHasProgress(reward))setCollected({reward,activity})}
  function changeActivity(next?:{kind:'combat'|'gathering';id:string;challengeId?:CombatChallengeId;tacticId?:CombatTacticId;goalId?:HuntGoalId}){
    if(!state)return;
    if(serverGameplayEnabled){void perform(next?{type:'start',args:{kind:next.kind,id:next.id,...(next.challengeId?{challengeId:next.challengeId}: {}),...(next.tacticId?{tacticId:next.tacticId}: {}),...(next.goalId?{goalId:next.goalId}: {})}}:{type:'stop'}).then(result=>{if(result)setTab('Home')});return;}
    try{if(next?.kind==='gathering'&&next.id.startsWith('DEWLEAF_')||next?.id?.includes('_MINT_')||next?.id?.includes('HERB')){const settled=claimActivity(state,Date.now());commit(startHerbalism(settled.state,next.id,Date.now()));presentCollected(settled.reward,state.activity);setTab('Home');return;}const result=transitionActivity(state,Date.now(),next);commit(result.state);presentCollected(result.reward,state.activity);setTab('Home')}
    catch(error){Alert.alert('Cannot change activity',error instanceof Error?error.message:'Please try again.')}
  }
  function mutateActionQueue(command:GameCommand,openHome=false){
    if(!state)return;
    if(serverGameplayEnabled){void perform(command).then(result=>{if(result&&openHome)setTab('Home')});return;}
    try{const result=executeGameCommand(state,command,Date.now());void commit(result.state);if(openHome)setTab('Home')}
    catch(error){Alert.alert('Action queue',error instanceof Error?error.message:'Please try again.')}
  }
  function queueActivity(next:{kind:'combat'|'gathering';id:string;challengeId?:CombatChallengeId;tacticId?:CombatTacticId;goalId?:HuntGoalId}){
    mutateActionQueue({type:'queue_add',args:{kind:next.kind,id:next.id,...(next.challengeId?{challengeId:next.challengeId}:{}),...(next.tacticId?{tacticId:next.tacticId}:{}),...(next.goalId?{goalId:next.goalId}:{})}});
  }
  function openWeeklyOrder(order:WeeklyOrder){openWorkingTowardDestination(weeklyOrderDestination(order));}
  function pinWeeklyOrder(order:WeeklyOrder){
    if(!state?.character)return;
    const goals=state.character.progressionGoals??[];
    if(goals.some(goal=>goal.kind==='weekly_order'&&goal.orderId===order.id)){Alert.alert('Working Toward','This Contract Board job is already pinned.');return;}
    if(goals.length>=3){Alert.alert('Working Toward','Remove a pinned goal before adding another.');return;}
    const next=[...goals,weeklyOrderGoal(order,state.character.id,Date.now())],command:GameCommand={type:'goals_set',args:{goals:next}};
    if(serverGameplayEnabled){void perform(command);return;}
    try{const result=executeGameCommand(state,command,Date.now());void commit(result.state);}catch(error){Alert.alert('Working Toward',error instanceof Error?error.message:'Could not pin this job.');}
  }
  function queueWeeklyOrder(order:WeeklyOrder){
    const queued=weeklyOrderQueueActivity(order);
    if(!queued){Alert.alert('Action queue','This job needs manual actions and cannot be queued as one activity.');return;}
    queueActivity({kind:queued.kind,id:queued.targetId,...(queued.kind==='combat'&&queued.combatChallengeId?{challengeId:queued.combatChallengeId}: {})});
  }
  function stopAtWeeklyOrderCompletion(order:WeeklyOrder){
    if(!state?.character)return;
    const id=weeklyOrderIdleRuleId(order),rules=state.character.idleRulesV40??[],existing=rules.find(rule=>rule.id===id),active=state.character.activeIdleRuleIdV40===id;
    if(active){
      const command:GameCommand={type:'idle_rules_set',args:{rules,activeId:null}};
      if(serverGameplayEnabled){void perform(command);return;}
      try{const result=executeGameCommand(state,command,Date.now());void commit(result.state);}catch(error){Alert.alert('Idle Rules',error instanceof Error?error.message:'Could not disable this stop rule.');}
      return;
    }
    if(!existing&&rules.length>=5){Alert.alert('Idle Rules','You already have 5 saved rules. Delete one in Working Toward before adding this Contract stop.');return;}
    const rule=weeklyOrderIdleRule(order,state.character.id),next=existing?rules.map(row=>row.id===id?rule:row):[...rules,rule],command:GameCommand={type:'idle_rules_set',args:{rules:next,activeId:id}};
    if(serverGameplayEnabled){void perform(command);return;}
    try{const result=executeGameCommand(state,command,Date.now());void commit(result.state);}catch(error){Alert.alert('Idle Rules',error instanceof Error?error.message:'Could not activate this stop rule.');}
  }
  function openGoalAtCurrentRegion(destination:WorkingTowardDestination){
    setPendingGoalDestination(undefined);setGoalRegionId(undefined);
    if(destination.kind==='combat'){setGoalMonsterId(destination.monsterId);setTab('Combat');return;}
    if(destination.kind==='skills'){
      setGoalActionId(destination.actionId);setGoalRecipeId(destination.recipeId);
      if(destination.mode){setSelectedSkill(destination.skillId);setSkillsMode(destination.mode);setTab('Skills');return;}
      setSelectedSkill(undefined);setTab('Skills');return;
    }
    if(destination.kind==='contracts'){setTab('Quests');return;}
    if(destination.kind==='inventory'){setTab('Inventory');return;}
    if(destination.kind==='world'){setGoalRegionId(destination.regionId);setTab('World');}
  }
  function openWorkingTowardDestination(destination:WorkingTowardDestination){
    if((destination.kind==='combat'||destination.kind==='skills')&&destination.regionId&&destination.regionId!==state?.currentRegionId){
      setPendingGoalDestination(destination);setGoalRegionId(destination.regionId);setTab('World');return;
    }
    openGoalAtCurrentRegion(destination);
  }
  function continueGoalAfterTravel(regionId:string){
    const destination=pendingGoalDestination;setPendingGoalDestination(undefined);setGoalRegionId(undefined);
    if(!destination||!('regionId' in destination)||destination.regionId!==regionId)return;
    if(destination.kind==='combat'){setGoalMonsterId(destination.monsterId);setTab('Combat');return;}
    if(destination.kind==='skills'){setGoalActionId(destination.actionId);setGoalRecipeId(destination.recipeId);if(destination.mode){setSelectedSkill(destination.skillId);setSkillsMode(destination.mode);setTab('Skills');}else{setSelectedSkill(undefined);setTab('Skills');}}
  }
  function openActiveActivity(){
    const activity=state?.activity;
    if(!activity)return;
    if(activity.kind==='combat'){setTab('Combat');return;}
    setSelectedSkill(activity.kind as any);
    setSkillsMode(activity.kind==='faith'?'faith':'gathering');
    setTab('Skills');
  }
  if(serverGameplayEnabled&&(auth.loading||online.loading))return <StartupScreen scene={startupScene} language={recoveryLanguage}/>;
  if(serverGameplayEnabled&&(!auth.session||auth.recovering))return <AccountWelcomeScreen scene={startupScene}><OnlineAccountPanel state={state??newGame(Date.now())}/></AccountWelcomeScreen>;
  if(serverGameplayEnabled&&!online.snapshot)return <SafeAreaView style={s.center}><Text style={s.txt}>{online.error||'Connecting…'}</Text><GameButton title="Retry connection" onPress={()=>void online.refresh()}/><OnlineAccountPanel state={newGame(Date.now())}/></SafeAreaView>;
  if(!ready)return <StartupScreen scene={startupScene} language={recoveryLanguage}/>;
  if(loadError||!state)return <SafeAreaView style={s.safe}><StatusBar style="light"/><SaveRecoveryScreen language={recoveryLanguage} message={loadError||'No readable save state was returned.'} onRetry={()=>void loadGame()} onStartFresh={()=>Alert.alert('Delete unreadable local save?','This permanently removes the existing local data and starts a new game.',[{text:'Cancel'},{text:'Start fresh',style:'destructive',onPress:async()=>{await repo.reset();setState(newGame(Date.now()));setLoadError('');setCurrentTab('Home');setTabHistory([])}}])}/></SafeAreaView>;
  if(!state.character){const theme=resolveTheme(state.settings.uiTheme);return <GameThemeProvider themeId={state.settings.uiTheme}><SafeAreaView style={[s.safe,{backgroundColor:theme.bg}]}><StatusBar style={theme.dark?'light':'dark'}/><ClassSelectScreen language={state.settings.language} onLanguage={language=>commit({...state,settings:{...state.settings,language}})} onSelect={async(id,name,body)=>{if(serverGameplayEnabled){await perform({type:'create',args:{classId:id,name,body}});return;}const next=createCharacter(state,id,name,body);await repo.save(next);setState(next)}}/></SafeAreaView></GameThemeProvider>;}
  if(creatingRoster){const theme=resolveTheme(state.settings.uiTheme);return <GameThemeProvider themeId={state.settings.uiTheme}><SafeAreaView style={[s.safe,{backgroundColor:theme.bg}]}><StatusBar style={theme.dark?'light':'dark'}/><ClassSelectScreen language={state.settings.language} cancelLabel={t(state.settings.language,'roster.cancel')} onCancel={()=>setCreatingRoster(false)} onSelect={async(id,name,body)=>{if(serverGameplayEnabled){const result=await perform({type:'roster_create',args:{classId:id,name,body}});if(result)setCreatingRoster(false);return;}const result=executeGameCommand(state,{type:'roster_create',args:{classId:id,name,body}},Date.now());await commit(result.state);setCreatingRoster(false)}}/></SafeAreaView></GameThemeProvider>;}
  if(__DEV__&&showChatPilot)return <View style={s.safe} {...backSwipe.panHandlers}><ChatPilotDevScreen state={state} initialPanel={chatPilotInitialPanel} onClose={()=>setShowChatPilot(false)}/></View>;
  if(__DEV__&&showCoopUiGallery)return <SafeAreaView style={s.safe} {...backSwipe.panHandlers}><StatusBar style="light"/><CoopUiGalleryScreen language={state.settings.language} onClose={()=>setShowCoopUiGallery(false)}/></SafeAreaView>;
  const theme=resolveTheme(state.settings.uiTheme);
  const preview=previewActivityReward(state,now);
  const eventClaims=eventReadyClaimCount(state,now);
  const companionAttention=companionAttentionSummary(state,now);
  const workingTowardReady=workingTowardReadyCount(state);
  const dailySuppliesReady=dailySuppliesStatus(state,now).canClaim;
  const contractBoard=contractBoardSummary(state,now);
  const equipmentForge=equipmentCraftQueueModel(state,now);
  const navigationNotifications:NavigationNotification[]=[
    {key:'activity-reward-ready',kind:'reward_ready',unread:rewardHasProgress(preview)},
    {key:'companion-attention',kind:'companion_attention',unread:companionAttention.hasAttention},
    {key:'working-toward-ready',kind:'account_action',unread:workingTowardReady>0},
    {key:'daily-supplies-ready',kind:'account_action',unread:dailySuppliesReady},
    {key:'equipment-crafts-ready',kind:'equipment_craft_ready',count:equipmentForge.ready,unread:equipmentForge.ready>0},
    {key:'weekly-order-rewards',kind:'weekly_order_complete',unread:contractBoard.pendingRewards>0},
    {key:'event-rewards-ready',kind:'event_reward_ready',count:eventClaims,unread:eventClaims>0},
    {key:'incoming-friend-requests',kind:'friend_request',count:notificationCounts.friendRequests,unread:notificationCounts.friendRequests>0},
    {key:'profile-customization-review',kind:'profile_customization',unread:profileAttentionKeys.length>0},
    {key:'unread-social-chat',kind:'chat_unread',count:notificationCounts.chatUnread,unread:notificationCounts.chatUnread>0},
    {key:'pending-guild-applications',kind:'guild_application',count:notificationCounts.guildApplications,unread:notificationCounts.guildApplications>0},
    {key:'pending-guild-invites',kind:'guild_invite',count:notificationCounts.guildInvites,unread:notificationCounts.guildInvites>0},
    {key:'pending-party-invites',kind:'party_invite',count:notificationCounts.partyInvites,unread:notificationCounts.partyInvites>0},
    {key:'online-event-attention',kind:'event_reward_ready',count:notificationCounts.events,unread:notificationCounts.events>0},
  ];
  const navigationBadgeModel=buildNavigationBadges(navigationNotifications);
  const primaryBadges:Partial<Record<PrimaryTab,number|'dot'>>={
    Character:navigationBadgeModel.character.dot?'dot':0,
    Skills:navigationBadgeModel.skills.display?navigationBadgeModel.skills.count:navigationBadgeModel.skills.dot?'dot':0,
    World:navigationBadgeModel.world.display?navigationBadgeModel.world.count:navigationBadgeModel.world.dot?'dot':0,
    Inventory:navigationBadgeModel.inventory.dot?'dot':0,
    More:navigationBadgeModel.account.display?navigationBadgeModel.account.count:navigationBadgeModel.account.dot?'dot':0,
  };
  const activePrimary:PrimaryTab=tab==='Coop'||tab==='Combat'?'World':primaryTabs.includes(tab as PrimaryTab)?tab as PrimaryTab:'More';
  const secondary=!primaryTabs.includes(tab as PrimaryTab);
  return <GameThemeProvider themeId={state.settings.uiTheme}><SafeAreaView style={[s.safe,{backgroundColor:theme.bg}]}><StatusBar style={theme.dark?'light':'dark'}/><GameTopBar state={state} nowMs={now} labelForDestination={destination=>tabLabel(state.settings.language,destination)} onNavigate={setTab} onChangeDestinations={destinations=>commit({...state,settings:{...state.settings,quickNavDestinations:destinations}})} onOpenActivity={openActiveActivity}/>{secondary&&tab!=='Coop'&&<View style={[s.backBar,{backgroundColor:theme.panel,borderColor:theme.line}]}><Pressable accessibilityRole="button" accessibilityLabel={t(state.settings.language,'common.back')} onPress={goBack} hitSlop={8} style={({pressed})=>[s.backButton,pressed&&s.backPressed]}><Image source={require('./assets/ui-icons-v2/small/back.png')} resizeMode="contain" style={s.backIcon}/><Text style={[s.backText,{color:theme.accent}]}>{t(state.settings.language,'common.back')}</Text></Pressable><Text numberOfLines={1} style={[s.backTitle,{color:theme.text}]}>{tabLabel(state.settings.language,tab)}</Text><View style={s.backSpacer}/></View>}{serverGameplayEnabled&&<View style={{paddingHorizontal:12}}>{!!online.error&&<Text accessibilityRole="alert" style={s.txt}>{online.error}</Text>}{online.pending?<GameButton title="Retry pending action" disabled={online.busy} onPress={()=>void perform()}/>:<Text style={s.txt}>{online.busy?'Saving online…':'Online · progress saved on server'}</Text>}</View>}<View pointerEvents={serverGameplayEnabled&&online.busy?'none':'auto'} style={s.body} {...backSwipe.panHandlers}>
    {tab==='Home'&&<HomeScreen state={state} preview={preview} nowMs={now} onOpenPlanner={()=>setTab('Progression')} onNavigateGoal={openWorkingTowardDestination} onOpenCombat={()=>setTab('Combat')} onOpenSkill={skillId=>{setSelectedSkill(skillId);setSkillsMode(['mining','woodcutting','fishing'].includes(skillId)?'gathering':'crafting');setTab('Skills')}} onNavigate={destination=>{if(destination==='Skills')setSelectedSkill(undefined);setTab(destination)}} onQueueRemove={index=>mutateActionQueue({type:'queue_remove',args:{index}})} onQueueMove={(index,direction)=>mutateActionQueue({type:'queue_move',args:{index,direction}})} onQueueClear={()=>mutateActionQueue({type:'queue_clear'})} onQueueStart={()=>mutateActionQueue({type:'queue_start'},true)} onClaim={()=>{if(serverGameplayEnabled){void perform({type:'claim'});return;}const result=claimActivity(state,Date.now());commit(result.state);presentCollected(result.reward,state.activity)}} onStop={()=>changeActivity()}/>}
    {tab==='Combat'&&<CombatScreen state={state} initialMonsterId={goalMonsterId} onChangeRegion={()=>setTab('World')} onStart={(id,challengeId,tacticId,goalId)=>changeActivity({kind:'combat',id,...(challengeId?{challengeId}: {}),...(tacticId?{tacticId}: {}),...(goalId?{goalId}: {})})} onQueue={(id,challengeId,tacticId,goalId)=>queueActivity({kind:'combat',id,...(challengeId?{challengeId}:{}),...(tacticId?{tacticId}:{}),...(goalId?{goalId}:{})})} onQueueRemove={index=>mutateActionQueue({type:'queue_remove',args:{index}})} onQueueMove={(index,direction)=>mutateActionQueue({type:'queue_move',args:{index,direction}})} onQueueClear={()=>mutateActionQueue({type:'queue_clear'})} onQueueStart={()=>mutateActionQueue({type:'queue_start'},true)} onBoss={()=>{if(serverGameplayEnabled){void perform({type:'boss'}).then(result=>{if(result)Alert.alert(result.won?'Victory':'Not ready',result.message)});return;}const settled=claimActivity(state,Date.now());const result=challengeFallenKnight(settled.state);commit(result.state);Alert.alert(ot(state.settings.language,result.won?'combat.victory':'combat.notReady'),result.message)}}/>}
    {tab==='World'&&<WorldScreen state={state} goalRegionId={goalRegionId} onTravel={regionId=>{if(serverGameplayEnabled){void perform({type:'travel',args:{id:regionId}}).then(result=>{if(result)continueGoalAfterTravel(regionId)});return;}try{const result=travelToRegion(state,regionId,Date.now());void commit(result.state);presentCollected(result.reward,state.activity);continueGoalAfterTravel(regionId)}catch(error){Alert.alert('Cannot travel',error instanceof Error?error.message:'Please try again.')}}} onOpenCombat={()=>setTab('Combat')} onOpenSkills={()=>{setSelectedSkill(undefined);setSkillsMode('gathering');setTab('Skills')}} onCoop={coopOnlineConfigured||(__DEV__&&!serverGameplayEnabled)?()=>setTab('Coop'):undefined}/>}
    {tab==='Coop'&&<CoopExpeditionScreen state={state} language={state.settings.language} entrySource={coopEntrySource} initialEventLiveId={pendingEventLiveId} onInitialEventHandled={()=>setPendingEventLiveId(undefined)} onRewardsChanged={serverGameplayEnabled?()=>online.refresh():undefined} onClose={goBack}/>}
    {tab==='Quests'&&<QuestScreen state={state} onClaim={id=>serverGameplayEnabled?void perform({type:'quest',args:{id}}):void commit(claimQuest(state,id))} onClaimContract={(period,id)=>{if(serverGameplayEnabled){void perform({type:'seasonal',args:{period,id}});return;}try{commit(claimSeasonalContract(state,period,id))}catch(error){Alert.alert('Cannot claim contract',error instanceof Error?error.message:'Please try again.')}}} onNavigate={destination=>setTab(destination.tab)} onOpenWeeklyOrder={openWeeklyOrder} onPinWeeklyOrder={pinWeeklyOrder} onQueueWeeklyOrder={queueWeeklyOrder} onStopWeeklyOrder={stopAtWeeklyOrderCompletion}/>}
    {tab==='Skills'&&<SkillsScreen key={`${skillsMode}:${selectedSkill??'all'}:${goalActionId??goalRecipeId??'none'}`} state={state} initialMode={skillsMode} initialSkill={selectedSkill} initialActionId={goalActionId} initialRecipeId={goalRecipeId} onSelectSkill={id=>{if(id==='companion'||id.startsWith('class:')){setTab('Companions');return;}setSelectedSkill(id as any);setSkillsMode(id==='faith'?'faith':['mining','woodcutting','fishing','herbalism'].includes(id)?'gathering':'crafting')}} onCommand={runCompanionCommand} onCharacter={()=>setTab('Character')} onInventory={()=>setTab('Inventory')} onViewToolRecipes={()=>{setSelectedSkill('smithing');setSkillsMode('crafting')}} onNavigateCraftingSource={openWorkingTowardDestination} onMoveCraftWaiting={(jobId,direction)=>{if(serverGameplayEnabled){void perform({type:'craft_move',args:{id:jobId,direction}});return;}try{void commit(moveWaitingEquipmentCraft(state,jobId,direction,Date.now()))}catch(error){Alert.alert('Cannot reorder backlog',error instanceof Error?error.message:'Please try again.')}}} onCancelCraft={jobId=>{Alert.alert('Cancel equipment craft?','Waiting jobs refund all reserved materials and Gold. Once crafting has started, all materials and 90% of the Gold are returned.',[{text:'Keep crafting'},{text:'Cancel craft',style:'destructive',onPress:()=>{if(serverGameplayEnabled){void perform({type:'craft_cancel',args:{id:jobId}});return;}try{void commit(cancelEquipmentCraft(state,jobId,Date.now()).state)}catch(error){Alert.alert('Cannot cancel craft',error instanceof Error?error.message:'Please try again.')}}}])}} onCraftPrerequisites={recipeId=>{if(serverGameplayEnabled){void perform({type:'craft_prerequisites',args:{id:recipeId}}).then(result=>{if(result)Alert.alert('Prerequisites crafted',result.message??'Available processing steps were completed.');});return;}try{const result=craftEquipmentPrerequisites(state,recipeId,Date.now());void commit(result.state);Alert.alert('Prerequisites crafted',result.crafted.map(row=>row.batches+'× '+row.name).join('\n'));}catch(error){Alert.alert('Cannot craft prerequisites',error instanceof Error?error.message:'Please try again.')}}} onClaimCraft={jobId=>{if(serverGameplayEnabled){void perform({type:'craft_claim',args:{id:jobId}});return;}try{void commit(claimEquipmentCraft(state,jobId,Date.now()).state)}catch(error){Alert.alert('Cannot claim equipment',error instanceof Error?error.message:'Please try again.')}}} onClaimAllCrafts={()=>{if(serverGameplayEnabled){void perform({type:'craft_claim_all'});return;}try{void commit(claimAllReadyEquipmentCrafts(state,Date.now()).state)}catch(error){Alert.alert('Cannot claim equipment',error instanceof Error?error.message:'Please try again.')}}} onGather={id=>changeActivity({kind:'gathering',id})} onQueueGather={id=>queueActivity({kind:'gathering',id})} onQueueRemove={index=>mutateActionQueue({type:'queue_remove',args:{index}})} onQueueMove={(index,direction)=>mutateActionQueue({type:'queue_move',args:{index,direction}})} onQueueClear={()=>mutateActionQueue({type:'queue_clear'})} onQueueStart={()=>mutateActionQueue({type:'queue_start'},true)} onEquipTool={id=>{if(serverGameplayEnabled){void perform({type:'equip_tool',args:{id}});return;}try{const toolKind=itemDef(id).toolSkillId;const settled=state.activity?.kind===toolKind?claimActivity(state,Date.now()):{state,reward:null};commit(equipGatheringTool(settled.state,id));if(settled.reward)presentCollected(settled.reward,state.activity)}catch(error){Alert.alert('Cannot equip tool',error instanceof Error?error.message:'Please try again.')}}} onCraft={id=>{const timed=timedEquipmentRecipe(id);if(serverGameplayEnabled){void perform({type:'craft',args:{id}}).then(result=>{if(result)Alert.alert(timed?(result.message??'Forge updated'):'Craft complete',timed?'Materials and Gold were reserved. Backlog jobs start automatically when an active forge slot becomes free.':'Your crafted items have been saved online.');});return;}try{if(timed){const started=startEquipmentCraft(state,id,Date.now());commit(started.state);Alert.alert(started.waiting?'Added to forge backlog':'Crafting started',started.waiting?`The ${Math.ceil(started.seconds/60)} minute craft will start automatically when a forge slot opens.`:`This equipment will be ready in about ${Math.ceil(started.seconds/60)} minute${Math.ceil(started.seconds/60)===1?'':'s'}.`);return;}const next=craftRecipe(state,id);const completed=!noviceSetProgress(state).unlocked&&noviceSetProgress(next).unlocked;commit(next);Alert.alert(ot(state.settings.language,completed?'craft.setComplete':'craft.complete'),completed?`${noviceSetProgress(next).set.name} is fully crafted and ready to equip. Equipment changes stats; skins are chosen separately on Character.`:'Your crafted items were added to Inventory, or Bank if Inventory was full. Equip them from Inventory or use Equip owned novice set on Character.',[{text:'Continue'},{text:'View character',onPress:()=>setTab('Character')}])}catch(error){Alert.alert(ot(state.settings.language,'craft.cannot'),error instanceof Error?error.message:'Please try again.')}}}/>}
    {tab==='Inventory'&&<InventoryScreen state={state} onEquip={id=>serverGameplayEnabled?void perform({type:'equip',args:{id}}):void commit(equipItem(state,id))} onFood={id=>serverGameplayEnabled?void perform({type:'food',args:{id}}):void commit(equipFood(state,id))} onEat={id=>serverGameplayEnabled?void perform({type:'eat',args:{id}}):void commit(eatFood(state,id))} onSell={id=>serverGameplayEnabled?void perform({type:'sell',args:{id}}):void commit(sellItem(state,id))} onSalvage={id=>serverGameplayEnabled?void perform({type:'salvage',args:{id}}):void commit(salvageItem(state,id))} onDeposit={(id,quantity)=>serverGameplayEnabled?void perform({type:'deposit',args:{id,quantity}}):void commit(depositToBank(state,id,quantity))} onDepositMaterials={()=>serverGameplayEnabled?void perform({type:'deposit_materials'}):void commit(depositAllMaterials(state))} onUpgradeStorage={location=>serverGameplayEnabled?void perform({type:'storage',args:{location}}):void commit(upgradeStorage(state,location))} onWithdraw={(id,quantity)=>serverGameplayEnabled?void perform({type:'withdraw',args:{id,quantity}}):void commit(withdrawFromBank(state,id,quantity))} onOverflow={()=>serverGameplayEnabled?void perform({type:'overflow'}):void commit(claimOverflowToBank(state))} onToggleFavorite={id=>void commit(toggleInventoryFavorite(state,id))} onAcknowledgeItem={id=>void commit(acknowledgeInventoryItem(state,id))} onAcknowledgeAll={()=>void commit(acknowledgeAllInventoryItems(state))} onBulkAction={(kind,location,ids)=>{if(serverGameplayEnabled){const type=kind==='transfer'?'bulk_transfer':kind==='sell'?'bulk_sell':'bulk_salvage';void perform({type,args:kind==='transfer'?{location,ids}:{ids}});return;}const next=kind==='transfer'?bulkTransferSelected(state,ids,location):kind==='sell'?bulkSellSelected(state,ids):bulkSalvageSelected(state,ids);void commit(next)}} onNavigateInspect={openWorkingTowardDestination}/>}
    {tab==='Progression'&&<ProgressionPlannerScreen state={state} onChange={commit} onCommand={async command=>{if(serverGameplayEnabled){if(!await perform(command))throw new Error('Progression action was not confirmed.');return;}const current=stateRef.current;if(!current)throw new Error('Load your character first.');const result=executeGameCommand(current,command,Date.now());await commit(result.state)}} onNavigateGoal={openWorkingTowardDestination}/>}
    {tab==='DailySupplies'&&<DailySuppliesScreen state={state} nowMs={now} onCommand={runCompanionCommand}/>}\n    {tab==='AccountBonuses'&&<AccountBonusesScreen state={state}/>}\n    {tab==='Companions'&&<CompanionsScreen state={state} language={state.settings.language} now={now} onCommand={runCompanionCommand} onCreate={()=>setCreatingRoster(true)} onNavigateSource={source=>{
      if(source.kind==='combat'){const currentZone=WORLD_ZONES.find(zone=>zone.id===state.currentRegionId)?.name;setTab(currentZone===source.zoneName?'Combat':'World');return;}
      if(source.kind==='crafting'){setSelectedSkill(source.skillId as SkillId);setSkillsMode('crafting');setTab('Skills');return;}
      if(source.kind==='gathering'){setSelectedSkill(source.skillId as SkillId);setSkillsMode('gathering');setTab('Skills');return;}
      if(source.kind==='events')setTab('Events');
    }}/>} 
    {tab==='Activity'&&<ActivityOverviewScreen state={state} now={now} onSwitch={id=>{if(serverGameplayEnabled){void perform({type:'roster_switch',args:{id}});return;}void runCompanionCommand({type:'roster_switch',args:{id}})}} onCreate={()=>setCreatingRoster(true)} onDelete={async(id,confirmation)=>{if(serverGameplayEnabled){if(!await perform({type:'roster_delete',args:{id,confirmation}}))throw new Error('Character deletion was not confirmed.');return;}const current=stateRef.current;if(!current)throw new Error('Load your character first.');const result=executeGameCommand(current,{type:'roster_delete',args:{id,confirmation}},Date.now());await commit(result.state)}}/>}
    {tab==='Character'&&<CharacterScreen state={state} onUpgrade={async itemId=>{if(serverGameplayEnabled){await perform({type:'upgrade',args:{id:itemId}});return;}try{const attempt=attemptEquipmentUpgrade(state,itemId);await commit(attempt.state);}catch(error){Alert.alert('Cannot upgrade',error instanceof Error?error.message:'Please try again.')}}} onSocket={async (itemId,gemId)=>{if(serverGameplayEnabled){await perform({type:'socket',args:{id:itemId,gemId}});return;}try{await commit(socketGem(state,itemId,gemId))}catch(error){Alert.alert('Cannot socket gem',error instanceof Error?error.message:'Please try again.')}}} onUnsocket={async (itemId,index)=>{if(serverGameplayEnabled){await perform({type:'unsocket',args:{id:itemId,index}});return;}try{await commit(unsocketGem(state,itemId,index))}catch(error){Alert.alert('Cannot extract gem',error instanceof Error?error.message:'Please try again.')}}} onInventory={()=>setTab('Inventory')} onSave={()=>serverGameplayEnabled?online.refresh():repo.save(state)} onUnequip={async slot=>{if(serverGameplayEnabled){if(!await perform({type:'unequip',args:{slot}}))throw new Error('Equipment change was not confirmed.');}else await commit(unequipItem(state,slot));}} onCrafting={()=>{setSkillsMode('novice');setTab('Skills')}} onSelectSkin={skinId=>{if(serverGameplayEnabled){void perform({type:'skin',args:{id:skinId}});return;}try{commit(selectCharacterSkin(state,skinId))}catch(error){Alert.alert('Cannot use skin',error instanceof Error?error.message:'Please try again.')}}} onEquipSet={async()=>{if(serverGameplayEnabled){if(!await perform({type:'equip_set'}))throw new Error('Set equip was not confirmed.');return;}const settled=claimActivity(state,Date.now());const next=equipNoviceSet(settled.state);await commit(next);presentCollected(settled.reward,state.activity)}}><ProfileEditor state={state} onChange={commit}/></CharacterScreen>}
    {tab==='Friends'&&<FriendsScreen onNotificationsChanged={()=>void refreshSocialNotifications()}/>} 
    {(tab==='Social'||tab==='Party')&&<SocialScreen onGuild={()=>setTab('Guild')} onFriends={()=>setTab('Friends')} onAccount={()=>setTab('Settings')} onInvitationsChanged={()=>void refreshSocialNotifications()}/>} 
    {tab==='Events'&&<EventScreen state={state} onChange={commit} onCommand={serverGameplayEnabled?command=>perform(command).then(Boolean):undefined} onOpenSeasonalExpedition={coopOnlineConfigured?liveEventId=>{setPendingEventLiveId(liveEventId);setTab('Coop')}:undefined}/>}
    {tab==='Guild'&&<GuildScreen online={serverGameplayEnabled} state={state} onChange={commit} onlineDirectory={<OnlineGuildBrowser/>} onlineManagement={<OnlineGuildManagement onApplicationsChanged={()=>void refreshSocialNotifications()}/>} onlineBoard={<OnlineGuildNoticeBoardPanel/>} onlineProjects={<OnlineGuildProjectsPanel/>} onlinePve={<OnlineGuildPve authoritative={serverGameplayEnabled} numberMode={state.settings.numberMode}/>} onlineChat={<GuildChat language={state.settings.language} currentPlayerName={state.character?.name} unlockedEmoteIds={state.account.unlockedEmoteIds} trayIds={state.settings.chatEmoteTrayIds} bodyPresentation={state.character?.bodyPresentation} onTrayChange={ids=>commit({...state,settings:{...state.settings,chatEmoteTrayIds:ids}})} firstUnreadMessageId={notificationCounts.guildFirstUnreadMessageId} onRead={()=>void refreshSocialNotifications()}/>} onlineChatUnread={notificationCounts.guildChatUnread} onlineChatMentions={notificationCounts.guildChatMentions} onlineHall={<OnlineGuildHallPanel/>} onlineCustomize={<OnlineGuildCustomizationPanel/>}/>} 
    {tab==='Settings'&&<SettingsScreen online={serverGameplayEnabled} state={state} onChange={commit} onExport={exportSave} onImport={importSave} onOpenChatPilot={__DEV__?()=>{setChatPilotInitialPanel('chat');setShowChatPilot(true)}:undefined} onOpenChatEmotes={__DEV__?()=>{setChatPilotInitialPanel('emotes');setShowChatPilot(true)}:undefined} onOpenCoopUiGallery={__DEV__?()=>setShowCoopUiGallery(true):undefined} onLanguage={language=>commit({...state,settings:{...state.settings,language}})} onReset={()=>serverGameplayEnabled?Alert.alert('Online save','Your online character is saved on the server.'):Alert.alert('Reset local save?','This deletes prototype progress only.',[{text:'Cancel'},{text:'Reset',style:'destructive',onPress:async()=>{await repo.reset();setState(newGame(Date.now()));setCurrentTab('Home');setTabHistory([])}}])}/>}
    {tab==='More'&&<MoreScreen language={state.settings.language} onNavigate={setTab} companionAttention={companionAttention.hasAttention} workingTowardAttention={workingTowardReady>0} dailySuppliesAttention={dailySuppliesReady} eventAttention={eventClaims>0||notificationCounts.events>0} friendRequestCount={notificationCounts.friendRequests} guildAttentionCount={notificationCounts.guild} socialAttentionCount={notificationCounts.partyInvites+notificationCounts.chatUnread} profileAttention={profileAttentionKeys.length>0} onOpenChatPilot={__DEV__?()=>{setChatPilotInitialPanel('chat');setShowChatPilot(true)}:undefined}/>}
    {tab==='Arena'&&<ArenaScreen state={state} onChange={candidate=>void commit(candidate)}/>}
    {tab==='Rankings'&&<RankingsScreen/>}
    {tab==='Collections'&&<CollectionsScreen state={state} onChange={candidate=>void commit(candidate)}/>}
    {tab==='Profile'&&<ProfileScreen state={state} onNavigate={destination=>destination==='Customize'?setTab('ProfileCustomize'):setTab(destination)}/>}
    {tab==='ProfileCustomize'&&<ProfileCustomizeScreen state={state} onChange={commit} onNavigateSource={destination=>setTab(destination)} onDirtyChange={setProfileCustomizeDirty}/>} 
    {tab==='Achievements'&&<AchievementsScreen/>}
  </View>
  <ChatOverlay state={state} visible={showChatOverlay} onOpen={()=>setShowChatOverlay(true)} onClose={()=>setShowChatOverlay(false)} onEmoteTrayChange={ids=>commit({...state,settings:{...state.settings,chatEmoteTrayIds:ids}})} guildUnread={notificationCounts.guildChatUnread} guildMentions={notificationCounts.guildChatMentions} guildFirstUnreadMessageId={notificationCounts.guildFirstUnreadMessageId} partyUnread={notificationCounts.partyChatUnread} partyMentions={notificationCounts.partyChatMentions} partyFirstUnreadMessageId={notificationCounts.partyFirstUnreadMessageId} onChatRead={()=>void refreshSocialNotifications()}/>
  <PrimaryNavigation destinations={primaryTabs} active={activePrimary} labelFor={item=>tabLabel(state.settings.language,item)} onNavigate={setTab} badges={primaryBadges}/>
  <RewardPopup reward={collected?.reward??null} activity={collected?.activity??null} welcomeBack={!!collected?.welcomeBack} reduceMotion={state.settings.reduceMotion} numberMode={state.settings.numberMode} onClose={()=>setCollected(null)}/>
  <CustomizationUnlockPopup entries={collected?[]:customizationUnlocks} reduceMotion={state.settings.reduceMotion} onClose={()=>setCustomizationUnlocks([])} onProfile={()=>{setCustomizationUnlocks([]);setTab('ProfileCustomize')}} onCharacter={()=>{setCustomizationUnlocks([]);setTab('Character')}}/>
  </SafeAreaView></GameThemeProvider>;
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:C.bg},center:{flex:1,backgroundColor:C.bg,alignItems:'center',justifyContent:'center',gap:10},txt:{color:C.text},body:{flex:1},backBar:{minHeight:48,flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderColor:C.line,backgroundColor:C.panel,paddingHorizontal:8},backButton:{minWidth:80,minHeight:44,flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:6},backPressed:{opacity:.65},backIcon:{width:24,height:24},backText:{color:C.accent,fontSize:15,fontWeight:'800'},backTitle:{flex:1,color:C.text,fontSize:16,fontWeight:'900',textAlign:'center'},backSpacer:{width:80},nav:{minHeight:76,flexDirection:'row',borderTopWidth:1,borderTopColor:'rgba(198,154,61,.52)',backgroundColor:'#09131f',paddingHorizontal:5,paddingTop:3,paddingBottom:2},navItem:{position:'relative',flex:1,minHeight:70,alignItems:'center',justifyContent:'center',gap:2,paddingHorizontal:3},navPressed:{opacity:.62,transform:[{translateY:1}]},activeMark:{position:'absolute',top:-3,width:26,height:3,backgroundColor:'#efd895',borderBottomLeftRadius:3,borderBottomRightRadius:3},navIconShell:{width:46,height:38,alignItems:'center',justifyContent:'center',borderRadius:19},navIconShellActive:{backgroundColor:'rgba(212,173,88,.13)'},navText:{fontSize:10,color:'#8190a3',fontWeight:'800',letterSpacing:.15},activeText:{color:'#efd895'}});
