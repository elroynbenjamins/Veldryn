import {ClassSkillScreen} from './src/screens/ClassSkillScreen';
import {classSkillsFor} from './src/content/class-skills';
import type {ClassSkillId,TrainingFocus} from './src/core/class-skill-types';
import {TRAINING_GROUND_TARGET} from './src/core/class-skills';
import {setAccountTrainingFocus,withSettledAccount,transitionAccountFaithPractice,setAccountFaithBlessing,setAccountFaithFavorite,setAccountFaithHideWeaker} from './src/core/account-actions';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ActivityIndicator,Alert,AppState,BackHandler,Image,PanResponder,Pressable,SafeAreaView,Share,StyleSheet,Text,TextInput,View} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import {AsyncStorageGameRepository} from './src/storage/async-storage-repository';
import {ActiveActivity,GameState,RewardBundle} from './src/core/types';
import {discardPreparation,usePotion,challengeFallenKnight,claimOverflowToBank,claimQuest,claimSeasonalContract,craftRecipe,depositAllMaterials,depositToBank,eatFood,equipFood,equipGatheringTool,equipItem,newGame,previewActivityReward,salvageItem,sellItem,travelToRegion,unequipItem,upgradeStorage,withdrawFromBank} from './src/core/game';
import {ClassSelectScreen} from './src/screens/ClassSelectScreen';
import {HomeScreen} from './src/screens/HomeScreen';
import {WorldScreen} from './src/screens/WorldScreen';
import {InventoryScreen} from './src/screens/InventoryScreen';
import {CharacterScreen} from './src/screens/CharacterScreen';
import {QuestScreen} from './src/screens/QuestScreen';
import {SkillsScreen} from './src/screens/SkillsScreen';
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
import {RewardPopup} from './src/components/RewardPopup';
import {C} from './src/theme/theme';
import {rewardHasProgress} from './src/core/playability';
import {settleAccountActivities as claimActivity,settleAccountStartup as settleStartupActivity,transitionAccountActivity as transitionActivity,createAccountCharacter,switchAccountCharacter} from './src/core/account-actions';
import {accountCharacters,recordAccountProgress} from './src/core/account-roster';
import {AccountCharactersScreen} from './src/screens/AccountCharactersScreen';
import {GameButton} from './src/components/GameButton';
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
import {FaithSkillScreen} from './src/screens/FaithSkillScreen';
import type {SkillId} from './src/core/types';
import {PrimaryNavigationIcon} from './src/components/PrimaryNavigationIcon';
import {attemptEquipmentUpgrade,socketGem,unsocketGem} from './src/core/equipment-enhancement';

type Tab=QuickNavDestination|'Combat'|'Coop'|'ClassSkills'|'Faith';
type PrimaryTab='Home'|'World'|'Character'|'Inventory'|'More';
const primaryTabs:PrimaryTab[]=['Home','Character','World','Inventory','More'];
function tabLabel(language:Language,tab:Tab):string{
  switch(tab){
    case 'Home':return t(language,'nav.home');case 'World':return t(language,'nav.world');case 'Character':return t(language,'nav.character');case 'Inventory':return t(language,'nav.inventory');case 'More':return t(language,'nav.more');
    case 'Quests':return t(language,'more.quests');case 'Skills':return t(language,'more.skills');case 'Events':return t(language,'more.events');case 'Friends':return t(language,'more.friends');case 'Guild':return t(language,'more.guild');case 'Settings':return t(language,'more.settings');
    case 'ClassSkills':return 'Class Skills';case 'Faith':return 'Faith';case 'Combat':return 'Combat';case 'Coop':return ct(language,'browse.title');
  }
}
const repo=new AsyncStorageGameRepository();

export default function App(){
  const [state,setState]=useState<GameState|null>(null);
  const [ready,setReady]=useState(false);
  const [showAccountCharacters,setShowAccountCharacters]=useState(false);
  const [loadError,setLoadError]=useState('');
  const [recoveryLanguage,setRecoveryLanguage]=useState<Language>('en');
  const [tab,setCurrentTab]=useState<Tab>('Home');
  const [tabHistory,setTabHistory]=useState<Tab[]>([]);
  const [skillsMode,setSkillsMode]=useState<'gathering'|'crafting'|'novice'>('gathering');
  const [selectedSkill,setSelectedSkill]=useState<SkillId|undefined>();
  const [selectedClassSkill,setSelectedClassSkill]=useState<ClassSkillId|undefined>();
  const [now,setNow]=useState(Date.now());
  const [collected,setCollected]=useState<{reward:RewardBundle;activity:ActiveActivity|null;welcomeBack?:boolean}|null>(null);
  const stateRef=useRef<GameState|null>(null);
  const appStateRef=useRef(AppState.currentState);
  const settlingRef=useRef(false);
  const [showChatPilot,setShowChatPilot]=useState(false);
  const [showChatOverlay,setShowChatOverlay]=useState(false);
  const [showCoopUiGallery,setShowCoopUiGallery]=useState(false);
  const [chatPilotInitialPanel,setChatPilotInitialPanel]=useState<'chat'|'emotes'>('chat');
  const setTab=useCallback((destination:Tab)=>{
    if(destination===tab)return;
    setTabHistory(history=>[...history,tab].slice(-24));
    setCurrentTab(destination);
  },[tab]);
  const goBack=useCallback(()=>{
    if(showAccountCharacters){setShowAccountCharacters(false);return true;}
    if(showChatOverlay){setShowChatOverlay(false);return true;}
    if(showChatPilot){setShowChatPilot(false);return true;}
    if(showCoopUiGallery){setShowCoopUiGallery(false);return true;}
    if(tabHistory.length){
      setCurrentTab(tabHistory[tabHistory.length-1]);
      setTabHistory(tabHistory.slice(0,-1));
      return true;
    }
    if(tab!=='Home')setCurrentTab('Home');
    return true;
  },[showAccountCharacters,showChatOverlay,showChatPilot,showCoopUiGallery,tab,tabHistory]);
  const backSwipe=useMemo(()=>PanResponder.create({
    onMoveShouldSetPanResponder:(_event,gesture)=>gesture.x0<=32&&gesture.dx>12&&Math.abs(gesture.dx)>Math.abs(gesture.dy)*1.25,
    onPanResponderRelease:(_event,gesture)=>{if(gesture.dx>=72&&gesture.vx>=0)goBack();},
    onPanResponderTerminate:()=>{},
  }),[goBack]);
  const loadGame=useCallback(async()=>{setReady(false);setLoadError('');try{setRecoveryLanguage(await repo.loadLanguage());const saved=await repo.load();const restored=discoverCharacterSkins(saved??newGame(Date.now()));const startup=saved?settleStartupActivity(restored,Date.now()):{state:restored,reward:null,activity:null};const next=startup.state;stateRef.current=next;setState(next);setRecoveryLanguage(next.settings.language);if(startup.reward)setCollected({reward:startup.reward,activity:startup.activity,welcomeBack:true});if(saved){try{await repo.save(next)}catch{Alert.alert('Save upgrade pending','Your progress loaded, but the upgraded save could not be written yet. Keep the app open and try another saved action.')}}}catch(error){stateRef.current=null;setState(null);setLoadError(error instanceof Error?error.message:'The local save could not be read.')}finally{setReady(true)}},[]);
  useEffect(()=>{void loadGame()},[loadGame]);
  useEffect(()=>{stateRef.current=state},[state]);
  useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(id)},[]);
  useEffect(()=>{if(tab!=='Skills')setSelectedSkill(undefined)},[tab]);
  useEffect(()=>{const subscription=BackHandler.addEventListener('hardwareBackPress',goBack);return()=>subscription.remove()},[goBack]);
  useEffect(()=>{
    const subscription=AppState.addEventListener('change',nextStatus=>{
      const wasAway=appStateRef.current==='background'||appStateRef.current==='inactive';
      appStateRef.current=nextStatus;
      if(!wasAway||nextStatus!=='active'||settlingRef.current)return;
      const current=stateRef.current;
      if(!current||!accountCharacters(current).some(entry=>entry.activity))return;
      settlingRef.current=true;
      try{
        const settled=settleStartupActivity(current,Date.now());
        stateRef.current=settled.state;setState(settled.state);
        if(settled.reward)setCollected({reward:settled.reward,activity:settled.activity,welcomeBack:true});
        void repo.save(settled.state).catch(()=>Alert.alert('Save pending','Your returned rewards remain in memory.')).finally(()=>{settlingRef.current=false});
      }catch(error){settlingRef.current=false;Alert.alert('Activities not settled',error instanceof Error?error.message:'Your saved progress was not changed.');}
    });
    return()=>subscription.remove();
  },[]);
  useEffect(()=>{const multiplier=state?.settings.textScale??1.5;for(const component of [Text,TextInput]){const scalable=component as typeof component&{defaultProps?:Record<string,unknown>};scalable.defaultProps={...(scalable.defaultProps??{}),allowFontScaling:true,maxFontSizeMultiplier:multiplier}}},[state?.settings.textScale]);
  const coopEntrySource=useMemo(()=>__DEV__&&!coopOnlineConfigured?createCoopDungeonFixtureSource(state?.settings.language??recoveryLanguage,state?.character):realCoopEntrySource,[state?.settings.language,state?.character,recoveryLanguage]);
  async function commit(candidate:GameState){const next=recordAccountProgress(discoverCharacterSkins(candidate)),newSkins=newlyUnlockedCharacterSkins(state,next);stateRef.current=next;setState(next);try{await repo.save(next)}catch{Alert.alert('Local save failed','Progress is still in memory. Keep the app open and try another action to save again.')}if(newSkins.length)Alert.alert(ot(next.settings.language,'skin.unlockTitle'),ot(next.settings.language,'skin.unlockBody',{names:newSkins.map(skin=>skin.name).join(', ')}))}
  async function exportSave(){if(!state){Alert.alert('Export unavailable','No save is loaded.');return;}try{await Share.share({title:'VELDRYN save backup',message:createSaveBackup(state)})}catch(error){Alert.alert('Export failed',error instanceof Error?error.message:'The share sheet could not be opened.')}}
  async function importSave(raw:string){const next=discoverCharacterSkins(parseSaveBackup(raw));await repo.save(next);stateRef.current=next;setState(next);setCurrentTab('Home');setTabHistory([]);Alert.alert('Save imported','The validated backup is now stored on this device.');}
  function presentCollected(reward:RewardBundle,activity:ActiveActivity|null){if(rewardHasProgress(reward))setCollected({reward,activity})}
  function changeActivity(next?:{kind:'combat'|'gathering'|'training'|'alchemy'|'hunting'|'exploration';id:string;batches?:number}){
    if(!state)return;
    try{const result=transitionActivity(stateRef.current??state,Date.now(),next);commit(result.state);presentCollected(result.reward,state.activity);setTab('Home')}
    catch(error){Alert.alert('Cannot change activity',error instanceof Error?error.message:'Please try again.')}
  }
  function openClassSkill(id:ClassSkillId){setSelectedClassSkill(id);setTab('ClassSkills');}
  function changeTrainingFocus(focus:TrainingFocus){
    const current=stateRef.current;if(!current)return;
    try{void commit(setAccountTrainingFocus(current,focus,Date.now()));}
    catch(error){Alert.alert('Cannot change focus',error instanceof Error?error.message:'Please try again.');}
  }
  async function commitSettled(change:(current:GameState)=>GameState){
    const current=stateRef.current;if(!current)return;
    try{await commit(withSettledAccount(current,Date.now(),change));}
    catch(error){Alert.alert('Cannot apply change',error instanceof Error?error.message:'Your progress was not changed.');}
  }
  if(!ready)return <SafeAreaView style={s.center}><ActivityIndicator/><Text style={s.txt}>Loading local save…</Text></SafeAreaView>;
  if(loadError||!state)return <SafeAreaView style={s.safe}><StatusBar style="light"/><SaveRecoveryScreen language={recoveryLanguage} message={loadError||'No readable save state was returned.'} onRetry={()=>void loadGame()} onStartFresh={()=>Alert.alert('Delete unreadable local save?','This permanently removes the existing local data and starts a new game.',[{text:'Cancel'},{text:'Start fresh',style:'destructive',onPress:async()=>{await repo.reset();setState(newGame(Date.now()));setLoadError('');setCurrentTab('Home');setTabHistory([])}}])}/></SafeAreaView>;
  if(!state.character)return <SafeAreaView style={s.safe}><StatusBar style="light"/><ClassSelectScreen language={state.settings.language} onLanguage={language=>commit({...state,settings:{...state.settings,language}})} onSelect={async(id,name,body)=>{const next=createAccountCharacter(stateRef.current??state,id,name,body,Date.now());await commit(next)}}/></SafeAreaView>;
  if(showAccountCharacters)return <SafeAreaView style={s.safe}><StatusBar style="light"/><AccountCharactersScreen state={state} onClose={()=>setShowAccountCharacters(false)} onSwitch={async id=>{await commit(switchAccountCharacter(stateRef.current??state,id,Date.now()));setCollected(null)}} onCreate={async(id,name,body)=>{await commit(createAccountCharacter(stateRef.current??state,id,name,body,Date.now()));setCollected(null)}}/></SafeAreaView>;
  if(__DEV__&&showChatPilot)return <View style={s.safe} {...backSwipe.panHandlers}><ChatPilotDevScreen state={state} initialPanel={chatPilotInitialPanel} onClose={()=>setShowChatPilot(false)}/></View>;
  if(__DEV__&&showCoopUiGallery)return <SafeAreaView style={s.safe} {...backSwipe.panHandlers}><StatusBar style="light"/><CoopUiGalleryScreen language={state.settings.language} onClose={()=>setShowCoopUiGallery(false)}/></SafeAreaView>;
  const preview=previewActivityReward(state,now);
  const activePrimary:PrimaryTab=tab==='Coop'?'World':tab==='Combat'||tab==='Skills'||tab==='ClassSkills'||tab==='Faith'?'Home':primaryTabs.includes(tab as PrimaryTab)?tab as PrimaryTab:'More';
  const secondary=!primaryTabs.includes(tab as PrimaryTab);
  return <SafeAreaView style={s.safe}><StatusBar style="light"/><GameTopBar state={state} nowMs={now} labelForDestination={destination=>tabLabel(state.settings.language,destination)} onNavigate={setTab} onChangeDestinations={destinations=>commit({...state,settings:{...state.settings,quickNavDestinations:destinations}})}/>{secondary&&tab!=='Coop'&&<View style={s.backBar}><Pressable accessibilityRole="button" accessibilityLabel={t(state.settings.language,'common.back')} onPress={goBack} hitSlop={8} style={({pressed})=>[s.backButton,pressed&&s.backPressed]}><Image source={require('./src/features/chat-pilot/assets/icons/back.png')} resizeMode="contain" style={s.backIcon}/><Text style={s.backText}>{t(state.settings.language,'common.back')}</Text></Pressable><Text numberOfLines={1} style={s.backTitle}>{tabLabel(state.settings.language,tab)}</Text><View style={s.backSpacer}/></View>}<View style={s.body} {...backSwipe.panHandlers}>
    {tab==='Home'&&<HomeScreen state={state} onOpenClassSkill={openClassSkill} preview={preview} onOpenCombat={()=>setTab('Combat')} onOpenSkill={skillId=>{if(skillId==='faith'){setTab('Faith');return;}setSelectedSkill(skillId);setSkillsMode(['mining','woodcutting','fishing','herbalism'].includes(skillId)?'gathering':'crafting');setTab('Skills')}} onNavigate={destination=>{if(destination==='Skills')setSelectedSkill(undefined);setTab(destination)}} onClaim={()=>{const current=stateRef.current??state;const result=claimActivity(current,Date.now());commit(result.state);presentCollected(result.reward,current.activity)}} onStop={()=>changeActivity()}/>}
    {tab==='ClassSkills'&&<ClassSkillScreen key={`${state.character.id}:${selectedClassSkill??'first'}`} state={state} skillId={classSkillsFor(state.character.classId).some(skill=>skill.id===selectedClassSkill)?selectedClassSkill!:classSkillsFor(state.character.classId)[0].id} onOpen={openClassSkill} onFocus={changeTrainingFocus} onTraining={()=>changeActivity({kind:'training',id:TRAINING_GROUND_TARGET})} onCombat={()=>setTab('Combat')} onStartHunt={id=>changeActivity({kind:'combat',id})} onClaim={()=>{const current=stateRef.current??state;const result=claimActivity(current,Date.now());void commit(result.state);presentCollected(result.reward,current.activity)}} onStop={()=>changeActivity()}/>}
    {tab==='Faith'&&<FaithSkillScreen state={state} onPractice={(tierId,count)=>{try{void commit(transitionAccountFaithPractice(stateRef.current??state,Date.now(),tierId,count))}catch(error){Alert.alert('Cannot practice Faith',error instanceof Error?error.message:'Please try again.')}}} onHunt={id=>changeActivity({kind:'combat',id})} onWorld={()=>setTab('World')} onInventory={()=>setTab('Inventory')} onClaim={()=>{const current=stateRef.current??state;const result=claimActivity(current,Date.now());void commit(result.state);presentCollected(result.reward,current.activity)}} onStop={()=>changeActivity()} onSelectBlessing={id=>{try{void commit(setAccountFaithBlessing(stateRef.current??state,id,Date.now()))}catch(error){Alert.alert('Cannot change blessing',error instanceof Error?error.message:'Please try again.')}}} onFavorite={(id,favorite)=>void commit(setAccountFaithFavorite(stateRef.current??state,id,favorite))} onHideWeaker={hide=>void commit(setAccountFaithHideWeaker(stateRef.current??state,hide))}/>}
    {tab==='Combat'&&<CombatScreen state={state} onClassSkill={openClassSkill} onChangeRegion={()=>setTab('World')} onStart={id=>changeActivity({kind:'combat',id})} onBoss={()=>{try{const current=stateRef.current??state;const settled=claimActivity(current,Date.now());const result=challengeFallenKnight(settled.state);commit(result.state);Alert.alert(ot(current.settings.language,result.won?'combat.victory':'combat.notReady'),result.message)}catch(error){Alert.alert('Cannot challenge yet',error instanceof Error?error.message:'Please finish or stop your current activity.')}}}/>}
    {tab==='World'&&<WorldScreen state={state} onTravel={regionId=>{try{const result=travelToRegion(state,regionId,Date.now());commit(result.state);presentCollected(result.reward,state.activity)}catch(error){Alert.alert('Cannot travel',error instanceof Error?error.message:'Please try again.')}}} onOpenCombat={()=>setTab('Combat')} onOpenSkills={()=>{setSelectedSkill(undefined);setSkillsMode('gathering');setTab('Skills')}} onCoop={coopOnlineConfigured||__DEV__?()=>setTab('Coop'):undefined}/>}
    {tab==='Coop'&&<CoopExpeditionScreen state={state} language={state.settings.language} entrySource={coopEntrySource} onClose={goBack}/>}
    {tab==='Quests'&&<QuestScreen state={state} onClaim={id=>void commitSettled(current=>claimQuest(current,id))} onClaimContract={(period,id)=>void commitSettled(current=>claimSeasonalContract(current,period,id))} onNavigate={destination=>setTab(destination.tab)}/>}
    {tab==='Skills'&&<SkillsScreen onFaith={()=>setTab('Faith')} onBrew={(id,batches)=>changeActivity({kind:'alchemy',id,batches})} onAdventure={(skillId,id)=>changeActivity({kind:skillId,id})} onOpenProfession={id=>{setSelectedSkill(id);setSkillsMode(id==='alchemy'?'crafting':'gathering');setTab('Skills')}} onWorld={()=>setTab('World')} onClaim={()=>{const current=stateRef.current??state;const result=claimActivity(current,Date.now());void commit(result.state);presentCollected(result.reward,current.activity)}} onStop={()=>changeActivity()} key={`${skillsMode}:${selectedSkill??'all'}`} state={state} onClassSkill={openClassSkill} initialMode={skillsMode} initialSkill={selectedSkill} onCharacter={()=>setTab('Character')} onInventory={()=>setTab('Inventory')} onViewToolRecipes={()=>{setSelectedSkill('smithing');setSkillsMode('crafting')}} onGather={id=>changeActivity({kind:'gathering',id})} onEquipTool={id=>{try{const toolKind=itemDef(id).toolSkillId;const settled=state.activity?.kind===toolKind?claimActivity(state,Date.now()):{state,reward:null};commit(equipGatheringTool(settled.state,id));if(settled.reward)presentCollected(settled.reward,state.activity)}catch(error){Alert.alert('Cannot equip tool',error instanceof Error?error.message:'Please try again.')}}} onCraft={id=>{try{const next=craftRecipe(state,id);const completed=!noviceSetProgress(state).unlocked&&noviceSetProgress(next).unlocked;commit(next);Alert.alert(ot(state.settings.language,completed?'craft.setComplete':'craft.complete'),completed?`${noviceSetProgress(next).set.name} is fully crafted and ready to equip. Equipment changes stats; skins are chosen separately on Character.`:'Your crafted items were added to Inventory, or Bank if Inventory was full. Equip them from Inventory or use Equip owned novice set on Character.',[{text:'Continue'},{text:'View character',onPress:()=>setTab('Character')}])}catch(error){Alert.alert(ot(state.settings.language,'craft.cannot'),error instanceof Error?error.message:'Please try again.')}}}/>}
    {tab==='Inventory'&&<InventoryScreen state={state} onUsePotion={id=>commitSettled(current=>usePotion(current,id))} onDiscardPreparation={()=>commitSettled(current=>discardPreparation(current))} onEquip={id=>commitSettled(current=>equipItem(current,id))} onFood={id=>commitSettled(current=>equipFood(current,id))} onEat={id=>commitSettled(current=>eatFood(current,id))} onSell={id=>commit(sellItem(state,id))} onSalvage={id=>commit(salvageItem(state,id))} onDeposit={(id,quantity)=>commit(depositToBank(state,id,quantity))} onDepositMaterials={()=>commit(depositAllMaterials(state))} onUpgradeStorage={location=>commit(upgradeStorage(state,location))} onWithdraw={(id,quantity)=>commit(withdrawFromBank(state,id,quantity))} onOverflow={()=>commit(claimOverflowToBank(state))}/>}
    {tab==='Character'&&<View style={{paddingHorizontal:12,paddingVertical:6}}><GameButton title={`Your characters (${accountCharacters(state).length}/5)`} tone="secondary" onPress={()=>setShowAccountCharacters(true)}/></View>}
    {tab==='Character'&&<CharacterScreen key={state.character.id} state={state} onClassSkill={openClassSkill} onCompanionChange={commit} onUpgrade={async itemId=>{try{const settled=claimActivity(stateRef.current??state,Date.now());const attempt=attemptEquipmentUpgrade(settled.state,itemId);await commit(attempt.state);Alert.alert(attempt.result.success?'Upgrade succeeded':attempt.result.downgraded?'Upgrade failed · rank lost':'Upgrade failed',attempt.result.success?`${itemDef(itemId).name} is now +${attempt.result.newRank}.`:`Resources were consumed.${attempt.result.downgraded?` The item fell to +${attempt.result.newRank}.`:''} Pity chance increased.`)}catch(error){Alert.alert('Cannot upgrade',error instanceof Error?error.message:'Please try again.')}}} onSocket={async (itemId,gemId)=>{try{await commitSettled(current=>socketGem(current,itemId,gemId))}catch(error){Alert.alert('Cannot socket gem',error instanceof Error?error.message:'Please try again.')}}} onUnsocket={async (itemId,index)=>{try{await commitSettled(current=>unsocketGem(current,itemId,index))}catch(error){Alert.alert('Cannot extract gem',error instanceof Error?error.message:'Please try again.')}}} onInventory={()=>setTab('Inventory')} onSave={()=>repo.save(state)} onUnequip={slot=>commitSettled(current=>unequipItem(current,slot))} onCrafting={()=>{setSkillsMode('novice');setTab('Skills')}} onSelectSkin={skinId=>{try{commit(selectCharacterSkin(state,skinId))}catch(error){Alert.alert('Cannot use skin',error instanceof Error?error.message:'Please try again.')}}} onEquipSet={()=>{const settled=claimActivity(state,Date.now());const next=equipNoviceSet(settled.state);commit(next);presentCollected(settled.reward,state.activity)}}><ProfileEditor key={state.character.id} state={state} onChange={commit}/></CharacterScreen>}
    {tab==='Friends'&&<FriendsScreen/>}
    {tab==='Events'&&<EventScreen state={state} onChange={commit}/>}
    {tab==='Guild'&&<GuildScreen state={state} onChange={commit} onlineDirectory={<OnlineGuildBrowser/>} onlineManagement={<OnlineGuildManagement/>} onlinePve={<OnlineGuildPve numberMode={state.settings.numberMode}/>}/>}
    {tab==='Settings'&&<SettingsScreen state={state} onChange={commit} onSettings={partial=>void commitSettled(current=>({...current,settings:{...current.settings,...partial}}))} onStopActivity={()=>changeActivity()} onExport={exportSave} onImport={importSave} onOpenChatPilot={__DEV__?()=>{setChatPilotInitialPanel('chat');setShowChatPilot(true)}:undefined} onOpenChatEmotes={__DEV__?()=>{setChatPilotInitialPanel('emotes');setShowChatPilot(true)}:undefined} onOpenCoopUiGallery={__DEV__?()=>setShowCoopUiGallery(true):undefined} onLanguage={language=>commit({...state,settings:{...state.settings,language}})} onReset={()=>Alert.alert('Reset local save?','This deletes prototype progress only.',[{text:'Cancel'},{text:'Reset',style:'destructive',onPress:async()=>{await repo.reset();const fresh=newGame(Date.now());stateRef.current=fresh;setState(fresh);setShowAccountCharacters(false);setCollected(null);setCurrentTab('Home');setTabHistory([])}}])}/>}
    {tab==='More'&&<MoreScreen language={state.settings.language} onNavigate={setTab} onOpenChatPilot={__DEV__?()=>{setChatPilotInitialPanel('chat');setShowChatPilot(true)}:undefined}/>}
  </View>
  <ChatOverlay state={state} visible={showChatOverlay} onOpen={()=>setShowChatOverlay(true)} onClose={()=>setShowChatOverlay(false)}/>
  <View accessibilityRole="tablist" style={s.nav}>
    {primaryTabs.map(item=>{
      const label=tabLabel(state.settings.language,item),selected=activePrimary===item;
      return <Pressable accessibilityRole="tab" accessibilityState={{selected}} accessibilityLabel={label} key={item} onPress={()=>setTab(item)} style={({pressed})=>[s.navItem,pressed&&s.navPressed]}>
        {selected&&<View style={s.activeMark}/>}
        <View style={[s.navIconShell,selected&&s.navIconShellActive]}><PrimaryNavigationIcon destination={item} active={selected}/></View>
        <Text numberOfLines={1} style={[s.navText,selected&&s.activeText]}>{label}</Text>
      </Pressable>;
    })}
  </View>
  <RewardPopup reward={collected?.reward??null} activity={collected?.activity??null} welcomeBack={!!collected?.welcomeBack} reduceMotion={state.settings.reduceMotion} numberMode={state.settings.numberMode} onClose={()=>setCollected(null)}/>
  </SafeAreaView>;
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:C.bg},center:{flex:1,backgroundColor:C.bg,alignItems:'center',justifyContent:'center',gap:10},txt:{color:C.text},body:{flex:1},backBar:{minHeight:48,flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderColor:C.line,backgroundColor:C.panel,paddingHorizontal:8},backButton:{minWidth:80,minHeight:44,flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:6},backPressed:{opacity:.65},backIcon:{width:22,height:22},backText:{color:C.accent,fontSize:15,fontWeight:'800'},backTitle:{flex:1,color:C.text,fontSize:16,fontWeight:'900',textAlign:'center'},backSpacer:{width:80},nav:{minHeight:76,flexDirection:'row',borderTopWidth:1,borderTopColor:'rgba(198,154,61,.52)',backgroundColor:'#09131f',paddingHorizontal:5,paddingTop:3,paddingBottom:2},navItem:{position:'relative',flex:1,minHeight:70,alignItems:'center',justifyContent:'center',gap:2,paddingHorizontal:3},navPressed:{opacity:.62,transform:[{translateY:1}]},activeMark:{position:'absolute',top:-3,width:26,height:3,backgroundColor:'#efd895',borderBottomLeftRadius:3,borderBottomRightRadius:3},navIconShell:{width:46,height:38,alignItems:'center',justifyContent:'center',borderRadius:19},navIconShellActive:{backgroundColor:'rgba(212,173,88,.13)'},navText:{fontSize:10,color:'#8190a3',fontWeight:'800',letterSpacing:.15},activeText:{color:'#efd895'}});
