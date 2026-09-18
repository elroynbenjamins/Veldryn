import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ActivityIndicator,Alert,ScrollView,AppState,BackHandler,Image,PanResponder,Pressable,SafeAreaView,Share,StyleSheet,Text,TextInput,View} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import {AccountWelcomeScreen} from './src/components/AccountWelcomeScreen';
import {StartupScreen} from './src/components/StartupScreen';
import {pickStartupScene} from './src/theme/startup-art';
import {AsyncStorageGameRepository} from './src/storage/async-storage-repository';
import {ActiveActivity,GameState,RewardBundle} from './src/core/types';
import {challengeFallenKnight,claimActivity,claimOverflowToBank,claimQuest,claimSeasonalContract,craftRecipe,createCharacter,depositAllMaterials,depositToBank,eatFood,equipFood,equipGatheringTool,equipItem,newGame,previewActivityReward,salvageItem,sellItem,startHerbalism,travelToRegion,unequipItem,upgradeStorage,withdrawFromBank} from './src/core/game';
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
import {ProfileEditor} from './src/components/ProfileEditor';
import {SavedLoadoutsPanel} from './src/components/SavedLoadoutsPanel';
import {RewardPopup} from './src/components/RewardPopup';
import {C} from './src/theme/theme';
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
import {AchievementsScreen} from './src/screens/AchievementsScreen';
import {WorldMilestoneFeedScreen} from './src/screens/WorldMilestoneFeedScreen';
import {ProgressionPlannerScreen} from './src/screens/ProgressionPlannerScreen';
import {AdventurersJournalScreen} from './src/screens/AdventurersJournalScreen';
import {BestiaryScreen} from './src/screens/BestiaryScreen';
import {PetBonusOverviewScreen} from './src/screens/PetBonusOverviewScreen';
import {PartySocialProvider} from './src/online/PartySocialProvider';
import {AuthSessionProvider,useAuthSession} from './src/online/AuthSessionProvider';
import {useOnlineGame} from './src/online/useOnlineGame';
import {serverGameplayEnabled} from './src/online/gameplay';
import {OnlineAccountPanel} from './src/components/OnlineAccountPanel';
import {GameButton} from './src/components/GameButton';
import type {GameCommand} from './src/core/game-commands';
import {buildWelcomeBackFromStates,type WelcomeBackProgressReport} from './src/core/welcome-back-v46';
import {eventReadyClaimCount} from './src/core/live-events';
import {useSocialNotificationCounts} from './src/online/useSocialNotificationCounts';

type Tab=QuickNavDestination|'Planner'|'Arena'|'Rankings'|'Collections'|'Profile'|'Achievements'|'Journal'|'Bestiary'|'Pets'|'WorldFeed'|'Combat'|'Coop';
type PrimaryTab='Skills'|'World'|'Character'|'Inventory'|'Account';
const primaryTabs:PrimaryTab[]=['Character','Skills','World','Inventory','Account'];
function tabLabel(language:Language,tab:Tab):string{
  switch(tab){
    case 'Home':return t(language,'nav.home');case 'World':return t(language,'nav.world');case 'Character':return t(language,'nav.character');case 'Inventory':return t(language,'nav.inventory');case 'Account':case 'More':return 'Account';
    case 'Quests':return t(language,'more.quests');case 'Companions':return 'Companions';case 'Skills':return t(language,'more.skills');case 'Events':return t(language,'more.events');case 'Friends':return t(language,'more.friends');case 'Guild':return t(language,'more.guild');case 'Settings':return t(language,'more.settings');
    case 'Combat':return 'Combat';case 'Coop':return ct(language,'browse.title');
    case 'Social':return 'Social';case 'Party':return 'Party';
    case 'Planner':return 'Working Toward';case 'Arena':return 'Arena';
    case 'Rankings':return 'Rankings';
    case 'Collections':return 'Collections';
    case 'Profile':return 'Profile';
    case 'Achievements':return 'Achievements';
    case 'Journal':return "Adventurer's Journal";case 'Bestiary':return 'Bestiary';case 'Pets':return 'Pets';case 'WorldFeed':return 'World Milestones';
  }
}
const repo=new AsyncStorageGameRepository();

export default function App(){return <AuthSessionProvider><PartySocialProvider><VeldrynApp/></PartySocialProvider></AuthSessionProvider>;}
function VeldrynApp(){
  const auth=useAuthSession(),online=useOnlineGame();
  const {counts:notificationCounts}=useSocialNotificationCounts();
  const [state,setState]=useState<GameState|null>(null);
  const [ready,setReady]=useState(false);
  const [startupScene]=useState(pickStartupScene);
  const [loadError,setLoadError]=useState('');
  const [recoveryLanguage,setRecoveryLanguage]=useState<Language>('en');
  const [tab,setCurrentTab]=useState<Tab>('Character');
  const [tabHistory,setTabHistory]=useState<Tab[]>([]);
  const [skillsMode,setSkillsMode]=useState<'gathering'|'crafting'|'novice'|'faith'>('gathering');
  const [selectedSkill,setSelectedSkill]=useState<SkillId|undefined>();
  const [now,setNow]=useState(Date.now());
  const [collected,setCollected]=useState<{reward:RewardBundle;activity:ActiveActivity|null;welcomeBack?:boolean;welcomeReport?:WelcomeBackProgressReport}|null>(null);
  const stateRef=useRef<GameState|null>(null);
  const appStateRef=useRef(AppState.currentState);
  const settlingRef=useRef(false);
  const [showChatPilot,setShowChatPilot]=useState(false);
  const [creatingRoster,setCreatingRoster]=useState(false);
  const [showChatOverlay,setShowChatOverlay]=useState(false);
  const [showCoopUiGallery,setShowCoopUiGallery]=useState(false);
  const [chatPilotInitialPanel,setChatPilotInitialPanel]=useState<'chat'|'emotes'>('chat');
  const setTab=useCallback((destination:Tab)=>{
    const normalized:Tab=destination==='More'?'Account':destination;
    if(normalized===tab)return;
    setTabHistory(history=>[...history,tab].slice(-24));
    setCurrentTab(normalized);
  },[tab]);
  const goBack=useCallback(()=>{
    if(showChatOverlay){setShowChatOverlay(false);return true;}
    if(showChatPilot){setShowChatPilot(false);return true;}
    if(showCoopUiGallery){setShowCoopUiGallery(false);return true;}
    if(tabHistory.length){
      setCurrentTab(tabHistory[tabHistory.length-1]);
      setTabHistory(tabHistory.slice(0,-1));
      return true;
    }
    if(tab!=='Character')setCurrentTab('Character');
    return true;
  },[showChatOverlay,showChatPilot,showCoopUiGallery,tab,tabHistory]);
  const backSwipe=useMemo(()=>PanResponder.create({
    onMoveShouldSetPanResponder:(_event,gesture)=>gesture.x0<=32&&gesture.dx>12&&Math.abs(gesture.dx)>Math.abs(gesture.dy)*1.25,
    onPanResponderRelease:(_event,gesture)=>{if(gesture.dx>=72&&gesture.vx>=0)goBack();},
    onPanResponderTerminate:()=>{},
  }),[goBack]);
  const loadGame=useCallback(async()=>{setReady(false);setLoadError('');try{setRecoveryLanguage(await repo.loadLanguage());const saved=await repo.load();const restored=discoverCharacterSkins(saved??newGame(Date.now()));const startup=saved?settleStartupActivity(restored,Date.now()):{state:restored,reward:null,activity:null};const next=startup.state;stateRef.current=next;setState(next);setRecoveryLanguage(next.settings.language);if(startup.reward)setCollected({reward:startup.reward,activity:startup.activity,welcomeBack:true,welcomeReport:buildWelcomeBackFromStates(restored,next,startup.reward,startup.activity)});if(saved){try{await repo.save(next)}catch{Alert.alert('Save upgrade pending','Your progress loaded, but the upgraded save could not be written yet. Keep the app open and try another saved action.')}}}catch(error){stateRef.current=null;setState(null);setLoadError(error instanceof Error?error.message:'The local save could not be read.')}finally{setReady(true)}},[]);
  useEffect(()=>{if(!serverGameplayEnabled)void loadGame()},[loadGame]);
  useEffect(()=>{if(!serverGameplayEnabled)return;const next=online.snapshot?.state??null;stateRef.current=next;setState(next);setReady(!online.loading);setLoadError('');},[online.snapshot,online.loading]);
  useEffect(()=>{stateRef.current=state},[state]);
  useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(id)},[]);
  useEffect(()=>{if(tab!=='Skills')setSelectedSkill(undefined)},[tab]);
  useEffect(()=>{const subscription=BackHandler.addEventListener('hardwareBackPress',goBack);return()=>subscription.remove()},[goBack]);
  useEffect(()=>{const subscription=AppState.addEventListener('change',nextStatus=>{if(serverGameplayEnabled)return;const wasAway=appStateRef.current==='background'||appStateRef.current==='inactive';appStateRef.current=nextStatus;if(!wasAway||nextStatus!=='active'||settlingRef.current)return;const current=stateRef.current;if(!current?.activity)return;const settled=settleStartupActivity(current,Date.now());if(!settled.reward)return;settlingRef.current=true;stateRef.current=settled.state;setState(settled.state);setCollected({reward:settled.reward,activity:settled.activity,welcomeBack:true,welcomeReport:buildWelcomeBackFromStates(current,settled.state,settled.reward,settled.activity)});void repo.save(settled.state).catch(()=>Alert.alert('Save pending','Your returned rewards are safe in memory, but could not be saved yet.')).finally(()=>{settlingRef.current=false})});return()=>subscription.remove()},[]);
  useEffect(()=>{const multiplier=state?.settings.textScale??1.5;for(const component of [Text,TextInput]){const scalable=component as typeof component&{defaultProps?:Record<string,unknown>};scalable.defaultProps={...(scalable.defaultProps??{}),allowFontScaling:true,maxFontSizeMultiplier:multiplier}}},[state?.settings.textScale]);
  const coopEntrySource=useMemo(()=>__DEV__&&!serverGameplayEnabled&&!coopOnlineConfigured?createCoopDungeonFixtureSource(state?.settings.language??recoveryLanguage,state?.character):realCoopEntrySource,[state?.settings.language,state?.character,recoveryLanguage]);
  async function perform(command?:GameCommand){try{const result=await online.execute(command);stateRef.current=result.state;setState(result.state);if(result.reward)presentCollected(result.reward,result.activity??null);return result;}catch(error){Alert.alert('Online action',error instanceof Error?error.message:'Please retry.');return null;}}
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
const next=discoverCharacterSkins(candidate),newSkins=newlyUnlockedCharacterSkins(state,next);stateRef.current=next;setState(next);try{await repo.save(next)}catch{Alert.alert('Local save failed','Progress is still in memory. Keep the app open and try another action to save again.')}if(newSkins.length)Alert.alert(ot(next.settings.language,'skin.unlockTitle'),ot(next.settings.language,'skin.unlockBody',{names:newSkins.map(skin=>skin.name).join(', ')}))}
  async function exportSave(){if(!state){Alert.alert('Export unavailable','No save is loaded.');return;}try{await Share.share({title:'VELDRYN save backup',message:createSaveBackup(state)})}catch(error){Alert.alert('Export failed',error instanceof Error?error.message:'The share sheet could not be opened.')}}
  async function importSave(raw:string){if(serverGameplayEnabled)throw new Error("Local backups cannot replace server-owned progress.");const next=discoverCharacterSkins(parseSaveBackup(raw));await repo.save(next);setState(next);setCurrentTab('Character');setTabHistory([]);Alert.alert('Save imported','The validated backup is now stored on this device.');}
  function presentCollected(reward:RewardBundle,activity:ActiveActivity|null){if(rewardHasProgress(reward))setCollected({reward,activity})}
  function changeActivity(next?:{kind:'combat'|'gathering';id:string}){
    if(!state)return;
    if(serverGameplayEnabled){void perform(next?{type:'start',args:{kind:next.kind,id:next.id}}:{type:'stop'}).then(result=>{if(result)setTab('Home')});return;}
    try{if(next?.kind==='gathering'&&next.id.startsWith('DEWLEAF_')||next?.id?.includes('_MINT_')||next?.id?.includes('HERB')){const settled=claimActivity(state,Date.now());commit(startHerbalism(settled.state,next.id,Date.now()));presentCollected(settled.reward,state.activity);setTab('Home');return;}const result=transitionActivity(state,Date.now(),next);commit(result.state);presentCollected(result.reward,state.activity);setTab('Home')}
    catch(error){Alert.alert('Cannot change activity',error instanceof Error?error.message:'Please try again.')}
  }
  function craftFromUi(id:string){
    if(!state)return;
    if(serverGameplayEnabled){void perform({type:'craft',args:{id}}).then(result=>{if(result)Alert.alert('Craft complete','Your crafted items have been saved online.');});return;}
    try{
      const next=craftRecipe(state,id),completed=!noviceSetProgress(state).unlocked&&noviceSetProgress(next).unlocked;
      commit(next);
      Alert.alert(ot(state.settings.language,completed?'craft.setComplete':'craft.complete'),completed?`${noviceSetProgress(next).set.name} is fully crafted and ready to equip. Equipment changes stats; skins are chosen separately on Character.`:'Your crafted items were added to Inventory, or Bank if Inventory was full. Equip them from Inventory or use Equip owned novice set on Character.',[{text:'Continue'},{text:'View character',onPress:()=>setTab('Character')}]);
    }catch(error){Alert.alert(ot(state.settings.language,'craft.cannot'),error instanceof Error?error.message:'Please try again.')}
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
  if(loadError||!state)return <SafeAreaView style={s.safe}><StatusBar style="light"/><SaveRecoveryScreen language={recoveryLanguage} message={loadError||'No readable save state was returned.'} onRetry={()=>void loadGame()} onStartFresh={()=>Alert.alert('Delete unreadable local save?','This permanently removes the existing local data and starts a new game.',[{text:'Cancel'},{text:'Start fresh',style:'destructive',onPress:async()=>{await repo.reset();setState(newGame(Date.now()));setLoadError('');setCurrentTab('Character');setTabHistory([])}}])}/></SafeAreaView>;
  if(!state.character)return <SafeAreaView style={s.safe}><StatusBar style="light"/><ClassSelectScreen language={state.settings.language} onLanguage={language=>commit({...state,settings:{...state.settings,language}})} onSelect={async(id,name,body)=>{if(serverGameplayEnabled){await perform({type:'create',args:{classId:id,name,body}});return;}const next=createCharacter(state,id,name,body);await repo.save(next);setState(next)}}/></SafeAreaView>;
  if(creatingRoster)return <SafeAreaView style={s.safe}><StatusBar style="light"/><ClassSelectScreen language={state.settings.language} cancelLabel={t(state.settings.language,'roster.cancel')} onCancel={()=>setCreatingRoster(false)} onSelect={async(id,name,body)=>{if(serverGameplayEnabled){const result=await perform({type:'roster_create',args:{classId:id,name,body}});if(result)setCreatingRoster(false);return;}const result=executeGameCommand(state,{type:'roster_create',args:{classId:id,name,body}},Date.now());await commit(result.state);setCreatingRoster(false)}}/></SafeAreaView>;
  if(__DEV__&&showChatPilot)return <View style={s.safe} {...backSwipe.panHandlers}><ChatPilotDevScreen state={state} initialPanel={chatPilotInitialPanel} onClose={()=>setShowChatPilot(false)}/></View>;
  if(__DEV__&&showCoopUiGallery)return <SafeAreaView style={s.safe} {...backSwipe.panHandlers}><StatusBar style="light"/><CoopUiGalleryScreen language={state.settings.language} onClose={()=>setShowCoopUiGallery(false)}/></SafeAreaView>;
  const preview=previewActivityReward(state,now);
  const eventRewardCount=eventReadyClaimCount(state,now),accountBadgeCount=notificationCounts.account+eventRewardCount;
  const activePrimary:PrimaryTab=tab==='Coop'||tab==='Combat'?'World':primaryTabs.includes(tab as PrimaryTab)?tab as PrimaryTab:'Account';
  const secondary=!primaryTabs.includes(tab as PrimaryTab);
  return <SafeAreaView style={s.safe}><StatusBar style="light"/><GameTopBar state={state} nowMs={now} labelForDestination={destination=>tabLabel(state.settings.language,destination)} onNavigate={setTab} onChangeDestinations={destinations=>commit({...state,settings:{...state.settings,quickNavDestinations:destinations}})} onOpenActivity={openActiveActivity}/>{secondary&&tab!=='Coop'&&<View style={s.backBar}><Pressable accessibilityRole="button" accessibilityLabel={t(state.settings.language,'common.back')} onPress={goBack} hitSlop={8} style={({pressed})=>[s.backButton,pressed&&s.backPressed]}><Image source={require('./assets/ui-icons-v2/small/back.png')} resizeMode="contain" style={s.backIcon}/><Text style={s.backText}>{t(state.settings.language,'common.back')}</Text></Pressable><Text numberOfLines={1} style={s.backTitle}>{tabLabel(state.settings.language,tab)}</Text><View style={s.backSpacer}/></View>}{serverGameplayEnabled&&<View style={{paddingHorizontal:12}}>{!!online.error&&<Text accessibilityRole="alert" style={s.txt}>{online.error}</Text>}{online.pending?<GameButton title="Retry pending action" disabled={online.busy} onPress={()=>void perform()}/>:<Text style={s.txt}>{online.busy?'Saving online…':'Online · progress saved on server'}</Text>}</View>}<View pointerEvents={serverGameplayEnabled&&online.busy?'none':'auto'} style={s.body} {...backSwipe.panHandlers}>
    {tab==='Home'&&<HomeScreen state={state} preview={preview} onOpenCombat={()=>setTab('Combat')} onOpenSkill={skillId=>{setSelectedSkill(skillId);setSkillsMode(['mining','woodcutting','fishing'].includes(skillId)?'gathering':'crafting');setTab('Skills')}} onNavigate={destination=>{if(destination==='Skills')setSelectedSkill(undefined);setTab(destination)}} onClaim={()=>{if(serverGameplayEnabled){void perform({type:'claim'});return;}const result=claimActivity(state,Date.now());commit(result.state);presentCollected(result.reward,state.activity)}} onStop={()=>changeActivity()}/>}
    {tab==='Combat'&&<CombatScreen state={state} onChangeRegion={()=>setTab('World')} onStart={id=>changeActivity({kind:'combat',id})} onBoss={()=>{if(serverGameplayEnabled){void perform({type:'boss'}).then(result=>{if(result)Alert.alert(result.won?'Victory':'Not ready',result.message)});return;}const settled=claimActivity(state,Date.now());const result=challengeFallenKnight(settled.state);commit(result.state);Alert.alert(ot(state.settings.language,result.won?'combat.victory':'combat.notReady'),result.message)}}/>}
    {tab==='World'&&<WorldScreen state={state} onTravel={regionId=>{if(serverGameplayEnabled){void perform({type:'travel',args:{id:regionId}});return;}try{const result=travelToRegion(state,regionId,Date.now());commit(result.state);presentCollected(result.reward,state.activity)}catch(error){Alert.alert('Cannot travel',error instanceof Error?error.message:'Please try again.')}}} onOpenCombat={()=>setTab('Combat')} onOpenSkills={()=>{setSelectedSkill(undefined);setSkillsMode('gathering');setTab('Skills')}} onCoop={coopOnlineConfigured||(__DEV__&&!serverGameplayEnabled)?()=>setTab('Coop'):undefined}/>}
    {tab==='Coop'&&<CoopExpeditionScreen state={state} language={state.settings.language} entrySource={coopEntrySource} onClose={goBack}/>}
    {tab==='Quests'&&<QuestScreen state={state} onClaim={id=>serverGameplayEnabled?void perform({type:'quest',args:{id}}):void commit(claimQuest(state,id))} onClaimContract={(period,id)=>{if(serverGameplayEnabled){void perform({type:'seasonal',args:{period,id}});return;}try{commit(claimSeasonalContract(state,period,id))}catch(error){Alert.alert('Cannot claim contract',error instanceof Error?error.message:'Please try again.')}}} onNavigate={destination=>setTab(destination.tab)}/>}
    {tab==='Skills'&&<SkillsScreen key={`${skillsMode}:${selectedSkill??'all'}`} state={state} initialMode={skillsMode} initialSkill={selectedSkill} onSelectSkill={id=>{if(id==='companion'||id.startsWith('class:')){setTab('Companions');return;}setSelectedSkill(id as any);setSkillsMode(id==='faith'?'faith':['mining','woodcutting','fishing','herbalism'].includes(id)?'gathering':'crafting')}} onCommand={runCompanionCommand} onCharacter={()=>setTab('Character')} onInventory={()=>setTab('Inventory')} onViewToolRecipes={()=>{setSelectedSkill('smithing');setSkillsMode('crafting')}} onGather={id=>changeActivity({kind:'gathering',id})} onEquipTool={id=>{if(serverGameplayEnabled){void perform({type:'equip_tool',args:{id}});return;}try{const toolKind=itemDef(id).toolSkillId;const settled=state.activity?.kind===toolKind?claimActivity(state,Date.now()):{state,reward:null};commit(equipGatheringTool(settled.state,id));if(settled.reward)presentCollected(settled.reward,state.activity)}catch(error){Alert.alert('Cannot equip tool',error instanceof Error?error.message:'Please try again.')}}} onCraft={craftFromUi}/>}
    {tab==='Inventory'&&<InventoryScreen state={state} onEquip={id=>serverGameplayEnabled?void perform({type:'equip',args:{id}}):void commit(equipItem(state,id))} onFood={id=>serverGameplayEnabled?void perform({type:'food',args:{id}}):void commit(equipFood(state,id))} onEat={id=>serverGameplayEnabled?void perform({type:'eat',args:{id}}):void commit(eatFood(state,id))} onSell={id=>serverGameplayEnabled?void perform({type:'sell',args:{id}}):void commit(sellItem(state,id))} onSalvage={id=>serverGameplayEnabled?void perform({type:'salvage',args:{id}}):void commit(salvageItem(state,id))} onDeposit={(id,quantity)=>serverGameplayEnabled?void perform({type:'deposit',args:{id,quantity}}):void commit(depositToBank(state,id,quantity))} onDepositMaterials={()=>serverGameplayEnabled?void perform({type:'deposit_materials'}):void commit(depositAllMaterials(state))} onUpgradeStorage={location=>serverGameplayEnabled?void perform({type:'storage',args:{location}}):void commit(upgradeStorage(state,location))} onWithdraw={(id,quantity)=>serverGameplayEnabled?void perform({type:'withdraw',args:{id,quantity}}):void commit(withdrawFromBank(state,id,quantity))} onOverflow={()=>serverGameplayEnabled?void perform({type:'overflow'}):void commit(claimOverflowToBank(state))} onCraft={craftFromUi}/>}
    {tab==='Companions'&&<CompanionsScreen state={state} language={state.settings.language} now={now} onCommand={runCompanionCommand} onCreate={()=>setCreatingRoster(true)}/>}
    {tab==='Character'&&<CharacterScreen state={state} onUpgrade={async itemId=>{if(serverGameplayEnabled){await perform({type:'upgrade',args:{id:itemId}});return;}try{const attempt=attemptEquipmentUpgrade(state,itemId);await commit(attempt.state);}catch(error){Alert.alert('Cannot upgrade',error instanceof Error?error.message:'Please try again.')}}} onSocket={async (itemId,gemId)=>{if(serverGameplayEnabled){await perform({type:'socket',args:{id:itemId,gemId}});return;}try{await commit(socketGem(state,itemId,gemId))}catch(error){Alert.alert('Cannot socket gem',error instanceof Error?error.message:'Please try again.')}}} onUnsocket={async (itemId,index)=>{if(serverGameplayEnabled){await perform({type:'unsocket',args:{id:itemId,index}});return;}try{await commit(unsocketGem(state,itemId,index))}catch(error){Alert.alert('Cannot extract gem',error instanceof Error?error.message:'Please try again.')}}} onInventory={()=>setTab('Inventory')} onSave={()=>serverGameplayEnabled?online.refresh():repo.save(state)} onUnequip={async slot=>{if(serverGameplayEnabled){if(!await perform({type:'unequip',args:{slot}}))throw new Error('Equipment change was not confirmed.');}else await commit(unequipItem(state,slot));}} onCrafting={()=>{setSkillsMode('novice');setTab('Skills')}} onSelectSkin={skinId=>{if(serverGameplayEnabled){void perform({type:'skin',args:{id:skinId}});return;}try{commit(selectCharacterSkin(state,skinId))}catch(error){Alert.alert('Cannot use skin',error instanceof Error?error.message:'Please try again.')}}} onEquipSet={async()=>{if(serverGameplayEnabled){if(!await perform({type:'equip_set'}))throw new Error('Set equip was not confirmed.');return;}const settled=claimActivity(state,Date.now());const next=equipNoviceSet(settled.state);await commit(next);presentCollected(settled.reward,state.activity)}} loadouts={<SavedLoadoutsPanel state={state} onChange={commit} onCommand={serverGameplayEnabled?async command=>{if(!await perform(command))throw new Error('Loadout action was not confirmed.');}:undefined}/>}><ProfileEditor state={state} onChange={commit}/></CharacterScreen>}
    {tab==='Friends'&&<FriendsScreen/>}
    {(tab==='Social'||tab==='Party')&&<SocialScreen onGuild={()=>setTab('Guild')} onFriends={()=>setTab('Friends')} onAccount={()=>setTab('Settings')}/>}
    {tab==='Events'&&<EventScreen state={state} onChange={commit} onCommand={serverGameplayEnabled?command=>perform(command).then(Boolean):undefined}/>}
    {tab==='Guild'&&<GuildScreen online={serverGameplayEnabled} state={state} onChange={commit} onlineDirectory={<OnlineGuildBrowser/>} onlineManagement={<OnlineGuildManagement/>} onlinePve={<OnlineGuildPve authoritative={serverGameplayEnabled} numberMode={state.settings.numberMode}/>}/>}
    {tab==='Settings'&&<SettingsScreen online={serverGameplayEnabled} state={state} onChange={commit} onExport={exportSave} onImport={importSave} onOpenChatPilot={__DEV__?()=>{setChatPilotInitialPanel('chat');setShowChatPilot(true)}:undefined} onOpenChatEmotes={__DEV__?()=>{setChatPilotInitialPanel('emotes');setShowChatPilot(true)}:undefined} onOpenCoopUiGallery={__DEV__?()=>setShowCoopUiGallery(true):undefined} onLanguage={language=>commit({...state,settings:{...state.settings,language}})} onReset={()=>serverGameplayEnabled?Alert.alert('Online save','Your online character is saved on the server.'):Alert.alert('Reset local save?','This deletes prototype progress only.',[{text:'Cancel'},{text:'Reset',style:'destructive',onPress:async()=>{await repo.reset();setState(newGame(Date.now()));setCurrentTab('Character');setTabHistory([])}}])}/>}
    {(tab==='Account'||tab==='More')&&<MoreScreen language={state.settings.language} onNavigate={setTab} friendRequestCount={notificationCounts.friendRequests} eventRewardCount={eventRewardCount} onOpenChatPilot={__DEV__?()=>{setChatPilotInitialPanel('chat');setShowChatPilot(true)}:undefined}/>}
    {tab==='Arena'&&<ArenaScreen state={state} onChange={candidate=>void commit(candidate)}/>}
    {tab==='Rankings'&&<RankingsScreen/>}
    {tab==='Collections'&&<CollectionsScreen state={state} onChange={candidate=>void commit(candidate)}/>}
    {tab==='Profile'&&<ProfileScreen state={state}/>} 
    {tab==='Achievements'&&<AchievementsScreen/>}
    {tab==='Journal'&&<AdventurersJournalScreen state={state} onNavigate={setTab}/>} 
    {tab==='Bestiary'&&<BestiaryScreen state={state}/>} 
    {tab==='Pets'&&<PetBonusOverviewScreen state={state} onChange={commit}/>} 
    {tab==='WorldFeed'&&<WorldMilestoneFeedScreen/>} 
    {tab==='Planner'&&<ProgressionPlannerScreen state={state} onChange={commit} onCommand={serverGameplayEnabled?async command=>{if(!await perform(command))throw new Error('Progression preference was not confirmed.');}:undefined}/>} 
  </View>
  <ChatOverlay state={state} visible={showChatOverlay} onOpen={()=>setShowChatOverlay(true)} onClose={()=>setShowChatOverlay(false)}/>
  <PrimaryNavigation destinations={primaryTabs} active={activePrimary} labelFor={item=>tabLabel(state.settings.language,item)} onNavigate={setTab} badges={accountBadgeCount?{Account:accountBadgeCount}:undefined}/>
  <RewardPopup reward={collected?.reward??null} activity={collected?.activity??null} welcomeBack={!!collected?.welcomeBack} welcomeReport={collected?.welcomeReport} reduceMotion={state.settings.reduceMotion} numberMode={state.settings.numberMode} onClose={()=>setCollected(null)}/>
  </SafeAreaView>;
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:C.bg},center:{flex:1,backgroundColor:C.bg,alignItems:'center',justifyContent:'center',gap:10},txt:{color:C.text},body:{flex:1},backBar:{minHeight:48,flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderColor:C.line,backgroundColor:C.panel,paddingHorizontal:8},backButton:{minWidth:80,minHeight:44,flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:6},backPressed:{opacity:.65},backIcon:{width:24,height:24},backText:{color:C.accent,fontSize:15,fontWeight:'800'},backTitle:{flex:1,color:C.text,fontSize:16,fontWeight:'900',textAlign:'center'},backSpacer:{width:80},nav:{minHeight:76,flexDirection:'row',borderTopWidth:1,borderTopColor:'rgba(198,154,61,.52)',backgroundColor:'#09131f',paddingHorizontal:5,paddingTop:3,paddingBottom:2},navItem:{position:'relative',flex:1,minHeight:70,alignItems:'center',justifyContent:'center',gap:2,paddingHorizontal:3},navPressed:{opacity:.62,transform:[{translateY:1}]},activeMark:{position:'absolute',top:-3,width:26,height:3,backgroundColor:'#efd895',borderBottomLeftRadius:3,borderBottomRightRadius:3},navIconShell:{width:46,height:38,alignItems:'center',justifyContent:'center',borderRadius:19},navIconShellActive:{backgroundColor:'rgba(212,173,88,.13)'},navText:{fontSize:10,color:'#8190a3',fontWeight:'800',letterSpacing:.15},activeText:{color:'#efd895'}});
