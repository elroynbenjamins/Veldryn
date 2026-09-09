import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {ActivityIndicator,Alert,BackHandler,Image,ImageSourcePropType,PanResponder,Pressable,SafeAreaView,Share,StyleSheet,Text,TextInput,View} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import {AsyncStorageGameRepository} from './src/storage/async-storage-repository';
import {ActiveActivity,BodyPresentation,ClassId,GameState,RewardBundle} from './src/core/types';
import {challengeFallenKnight,claimActivity,claimOverflowToBank,claimQuest,claimSeasonalContract,craftRecipe,createCharacter,depositAllMaterials,depositToBank,eatFood,equipFood,equipItem,newGame,previewActivityReward,salvageItem,sellItem,startCombat,startGathering,stopActivity,unequipItem,upgradeStorage,withdrawFromBank} from './src/core/game';
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
import {GuildChat} from './src/components/GuildChat';
import {WorldChat} from './src/components/WorldChat';
import {OnlineWorldChat} from './src/components/OnlineWorldChat';
import {OnlineGuildBrowser} from './src/components/OnlineGuildBrowser';
import {OnlineGuildManagement} from './src/components/OnlineGuildManagement';
import {OnlineGuildPve} from './src/components/OnlineGuildPve';
import {onlineConfigured} from './src/online/supabase';
import {ProfileEditor} from './src/components/ProfileEditor';
import {RewardPopup} from './src/components/RewardPopup';
import {C} from './src/theme/theme';
import {transitionActivity} from './src/core/playability';
import {equipNoviceSet} from './src/core/game';
import {noviceSetProgress} from './src/core/character-appearance';
import {discoverCharacterSkins,newlyUnlockedCharacterSkins,selectCharacterSkin} from './src/core/character-skins';
import {createSaveBackup,parseSaveBackup} from './src/core/save-transfer';
import {SaveRecoveryScreen} from './src/components/SaveRecoveryScreen';
import {Language,ot,t} from './src/i18n';

type Tab='Home'|'World'|'Quests'|'Skills'|'Events'|'Inventory'|'Character'|'Friends'|'Guild'|'Settings'|'More';
type PrimaryTab='Home'|'World'|'Character'|'Inventory'|'More';
const primaryTabs:PrimaryTab[]=['Home','World','Character','Inventory','More'];
const navIcons:Record<PrimaryTab,ImageSourcePropType>={Home:require('./assets/navigation/home_24.png'),World:require('./assets/navigation/world_24.png'),Character:require('./assets/navigation/character_24.png'),Inventory:require('./assets/navigation/inventory_24.png'),More:require('./assets/navigation/settings_24.png')};
function tabLabel(language:Language,tab:Tab):string{
  switch(tab){
    case 'Home':return t(language,'nav.home');case 'World':return t(language,'nav.world');case 'Character':return t(language,'nav.character');case 'Inventory':return t(language,'nav.inventory');case 'More':return t(language,'nav.more');
    case 'Quests':return t(language,'more.quests');case 'Skills':return t(language,'more.skills');case 'Events':return t(language,'more.events');case 'Friends':return t(language,'more.friends');case 'Guild':return t(language,'more.guild');case 'Settings':return t(language,'more.settings');
  }
}
const repo=new AsyncStorageGameRepository();

export default function App(){
  const [state,setState]=useState<GameState|null>(null);
  const [ready,setReady]=useState(false);
  const [loadError,setLoadError]=useState('');
  const [recoveryLanguage,setRecoveryLanguage]=useState<Language>('en');
  const [tab,setCurrentTab]=useState<Tab>('Home');
  const [tabHistory,setTabHistory]=useState<Tab[]>([]);
  const [selectedZone,setSelectedZone]=useState<string|null>(null);
  const [skillsMode,setSkillsMode]=useState<'gathering'|'crafting'|'novice'>('gathering');
  const [now,setNow]=useState(Date.now());
  const [collected,setCollected]=useState<{reward:RewardBundle;activity:ActiveActivity|null}|null>(null);
  const [showChatPilot,setShowChatPilot]=useState(false);
  const [chatPilotInitialPanel,setChatPilotInitialPanel]=useState<'chat'|'emotes'>('chat');
  const setTab=useCallback((destination:Tab)=>{
    if(destination===tab)return;
    setTabHistory(history=>[...history,tab].slice(-24));
    setCurrentTab(destination);
  },[tab]);
  const goBack=useCallback(()=>{
    if(showChatPilot){setShowChatPilot(false);return true;}
    if(tabHistory.length){
      setCurrentTab(tabHistory[tabHistory.length-1]);
      setTabHistory(tabHistory.slice(0,-1));
      return true;
    }
    if(tab!=='Home')setCurrentTab('Home');
    return true;
  },[showChatPilot,tab,tabHistory]);
  const backSwipe=useMemo(()=>PanResponder.create({
    onMoveShouldSetPanResponder:(_event,gesture)=>gesture.x0<=32&&gesture.dx>12&&Math.abs(gesture.dx)>Math.abs(gesture.dy)*1.25,
    onPanResponderRelease:(_event,gesture)=>{if(gesture.dx>=72&&gesture.vx>=0)goBack();},
    onPanResponderTerminate:()=>{},
  }),[goBack]);
  const loadGame=useCallback(async()=>{setReady(false);setLoadError('');try{setRecoveryLanguage(await repo.loadLanguage());const saved=await repo.load();const next=discoverCharacterSkins(saved??newGame(Date.now()));setState(next);setRecoveryLanguage(next.settings.language);if(saved&&next!==saved){try{await repo.save(next)}catch{Alert.alert('Save upgrade pending','Your progress loaded, but the upgraded save could not be written yet. Keep the app open and try another saved action.')}}}catch(error){setState(null);setLoadError(error instanceof Error?error.message:'The local save could not be read.')}finally{setReady(true)}},[]);
  useEffect(()=>{void loadGame()},[loadGame]);
  useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(id)},[]);
  useEffect(()=>{const subscription=BackHandler.addEventListener('hardwareBackPress',goBack);return()=>subscription.remove()},[goBack]);
  useEffect(()=>{const multiplier=state?.settings.textScale??1.5;for(const component of [Text,TextInput]){const scalable=component as typeof component&{defaultProps?:Record<string,unknown>};scalable.defaultProps={...(scalable.defaultProps??{}),allowFontScaling:true,maxFontSizeMultiplier:multiplier}}},[state?.settings.textScale]);
  async function commit(candidate:GameState){const next=discoverCharacterSkins(candidate),newSkins=newlyUnlockedCharacterSkins(state,next);setState(next);try{await repo.save(next)}catch{Alert.alert('Local save failed','Progress is still in memory. Keep the app open and try another action to save again.')}if(newSkins.length)Alert.alert(ot(next.settings.language,'skin.unlockTitle'),ot(next.settings.language,'skin.unlockBody',{names:newSkins.map(skin=>skin.name).join(', ')}))}
  async function exportSave(){if(!state){Alert.alert('Export unavailable','No save is loaded.');return;}try{await Share.share({title:'VELDRYN save backup',message:createSaveBackup(state)})}catch(error){Alert.alert('Export failed',error instanceof Error?error.message:'The share sheet could not be opened.')}}
  async function importSave(raw:string){const next=discoverCharacterSkins(parseSaveBackup(raw));await repo.save(next);setState(next);setCurrentTab('Home');setTabHistory([]);Alert.alert('Save imported','The validated backup is now stored on this device.');}
  function presentCollected(reward:RewardBundle,activity:ActiveActivity|null){if(reward.kills>0||reward.stoppedReason)setCollected({reward,activity})}
  function changeActivity(next?:{kind:'combat'|'gathering';id:string}){
    if(!state)return;
    try{const result=transitionActivity(state,Date.now(),next);commit(result.state);presentCollected(result.reward,state.activity);setTab('Home')}
    catch(error){Alert.alert('Cannot change activity',error instanceof Error?error.message:'Please try again.')}
  }
  if(!ready)return <SafeAreaView style={s.center}><ActivityIndicator/><Text style={s.txt}>Loading local save…</Text></SafeAreaView>;
  if(loadError||!state)return <SafeAreaView style={s.safe}><StatusBar style="light"/><SaveRecoveryScreen language={recoveryLanguage} message={loadError||'No readable save state was returned.'} onRetry={()=>void loadGame()} onStartFresh={()=>Alert.alert('Delete unreadable local save?','This permanently removes the existing local data and starts a new game.',[{text:'Cancel'},{text:'Start fresh',style:'destructive',onPress:async()=>{await repo.reset();setState(newGame(Date.now()));setLoadError('');setCurrentTab('Home');setTabHistory([])}}])}/></SafeAreaView>;
  if(!state.character)return <SafeAreaView style={s.safe}><StatusBar style="light"/><ClassSelectScreen language={state.settings.language} onLanguage={language=>commit({...state,settings:{...state.settings,language}})} onSelect={async(id,name,body)=>{const next=createCharacter(state,id,name,body);await repo.save(next);setState(next)}}/></SafeAreaView>;
  if(__DEV__&&showChatPilot)return <View style={s.safe} {...backSwipe.panHandlers}><ChatPilotDevScreen state={state} initialPanel={chatPilotInitialPanel} onClose={()=>setShowChatPilot(false)}/></View>;
  const preview=previewActivityReward(state,now);
  const activePrimary:PrimaryTab=primaryTabs.includes(tab as PrimaryTab)?tab as PrimaryTab:'More';
  const secondary=!primaryTabs.includes(tab as PrimaryTab);
  return <SafeAreaView style={s.safe}><StatusBar style="light"/>{secondary&&<View style={s.backBar}><Pressable accessibilityRole="button" accessibilityLabel={t(state.settings.language,'common.back')} onPress={goBack} hitSlop={8} style={({pressed})=>[s.backButton,pressed&&s.backPressed]}><Image source={require('./src/features/chat-pilot/assets/icons/back.png')} resizeMode="contain" style={s.backIcon}/><Text style={s.backText}>{t(state.settings.language,'common.back')}</Text></Pressable><Text numberOfLines={1} style={s.backTitle}>{tabLabel(state.settings.language,tab)}</Text><View style={s.backSpacer}/></View>}<View style={s.body} {...backSwipe.panHandlers}>
    {tab==='Home'&&<HomeScreen state={state} preview={preview} onNavigate={(destination,zoneId)=>{if(destination==='World'&&zoneId)setSelectedZone(zoneId);setTab(destination)}} onClaim={()=>{const result=claimActivity(state,Date.now());commit(result.state);presentCollected(result.reward,state.activity)}} onStop={()=>changeActivity()}/>}
    {tab==='World'&&<><WorldScreen state={state} selectedId={selectedZone} onSelectZone={setSelectedZone} onStart={id=>changeActivity({kind:'combat',id})} onBoss={()=>{const settled=claimActivity(state,Date.now());const result=challengeFallenKnight(settled.state);commit(result.state);Alert.alert(ot(state.settings.language,result.won?'combat.victory':'combat.notReady'),`${result.message}${settled.reward.kills>0?' Your pending activity rewards were collected.':''}`)}}/>{onlineConfigured?<OnlineWorldChat language={state.settings.language} playerName={state.character.name}/>:<WorldChat language={state.settings.language}/>}</>}
    {tab==='Quests'&&<QuestScreen state={state} onClaim={id=>commit(claimQuest(state,id))} onClaimContract={(period,id)=>{try{commit(claimSeasonalContract(state,period,id))}catch(error){Alert.alert('Cannot claim contract',error instanceof Error?error.message:'Please try again.')}}} onNavigate={destination=>{if(destination.tab==='World')setSelectedZone(destination.zoneId??null);setTab(destination.tab)}}/>}
    {tab==='Skills'&&<SkillsScreen state={state} initialMode={skillsMode} onCharacter={()=>setTab('Character')} onGather={id=>changeActivity({kind:'gathering',id})} onCraft={id=>{try{const next=craftRecipe(state,id);const completed=!noviceSetProgress(state).unlocked&&noviceSetProgress(next).unlocked;commit(next);Alert.alert(ot(state.settings.language,completed?'craft.setComplete':'craft.complete'),completed?`${noviceSetProgress(next).set.name} is fully crafted and ready to equip. Equipment changes stats; skins are chosen separately on Character.`:'Your crafted items were added to Inventory, or Bank if Inventory was full. Equip them from Inventory or use Equip owned novice set on Character.',[{text:'Continue'},{text:'View character',onPress:()=>setTab('Character')}])}catch(error){Alert.alert(ot(state.settings.language,'craft.cannot'),error instanceof Error?error.message:'Please try again.')}}}/>}
    {tab==='Inventory'&&<InventoryScreen state={state} onEquip={id=>commit(equipItem(state,id))} onFood={id=>commit(equipFood(state,id))} onEat={id=>commit(eatFood(state,id))} onSell={id=>commit(sellItem(state,id))} onSalvage={id=>commit(salvageItem(state,id))} onDeposit={(id,quantity)=>commit(depositToBank(state,id,quantity))} onDepositMaterials={()=>commit(depositAllMaterials(state))} onUpgradeStorage={location=>commit(upgradeStorage(state,location))} onWithdraw={(id,quantity)=>commit(withdrawFromBank(state,id,quantity))} onOverflow={()=>commit(claimOverflowToBank(state))}/>}
    {tab==='Character'&&<><CharacterScreen state={state} onUnequip={slot=>commit(unequipItem(state,slot))} onCrafting={()=>{setSkillsMode('novice');setTab('Skills')}} onSelectSkin={skinId=>{try{commit(selectCharacterSkin(state,skinId))}catch(error){Alert.alert('Cannot use skin',error instanceof Error?error.message:'Please try again.')}}} onEquipSet={()=>{const settled=claimActivity(state,Date.now());const next=equipNoviceSet(settled.state);commit(next);presentCollected(settled.reward,state.activity)}}/><ProfileEditor state={state} onChange={commit}/></>}
    {tab==='Friends'&&<FriendsScreen/>}
    {tab==='Events'&&<EventScreen state={state} onChange={commit}/>}
    {tab==='Guild'&&<><OnlineGuildBrowser/><OnlineGuildManagement/><OnlineGuildPve numberMode={state.settings.numberMode}/><GuildScreen state={state} onChange={commit}/><GuildChat language={state.settings.language}/></>}
    {tab==='Settings'&&<SettingsScreen state={state} onChange={commit} onExport={exportSave} onImport={importSave} onOpenChatPilot={__DEV__?()=>{setChatPilotInitialPanel('chat');setShowChatPilot(true)}:undefined} onOpenChatEmotes={__DEV__?()=>{setChatPilotInitialPanel('emotes');setShowChatPilot(true)}:undefined} onLanguage={language=>commit({...state,settings:{...state.settings,language}})} onReset={()=>Alert.alert('Reset local save?','This deletes prototype progress only.',[{text:'Cancel'},{text:'Reset',style:'destructive',onPress:async()=>{await repo.reset();setState(newGame(Date.now()));setCurrentTab('Home');setTabHistory([])}}])}/>}
    {tab==='More'&&<MoreScreen language={state.settings.language} onNavigate={setTab} onOpenChatPilot={__DEV__?()=>{setChatPilotInitialPanel('chat');setShowChatPilot(true)}:undefined}/>}
  </View><View accessibilityRole="tablist" style={s.nav}>{primaryTabs.map(item=>{const label=tabLabel(state.settings.language,item);return <Pressable accessibilityRole="tab" accessibilityState={{selected:activePrimary===item}} accessibilityLabel={label} key={item} onPress={()=>setTab(item)} style={[s.navItem,activePrimary===item&&s.active]}><Image source={navIcons[item]} resizeMode="contain" style={[s.navIcon,activePrimary!==item&&s.inactiveIcon]}/><Text style={[s.navText,activePrimary===item&&s.activeText]}>{label}</Text></Pressable>})}</View><RewardPopup reward={collected?.reward??null} activity={collected?.activity??null} reduceMotion={state.settings.reduceMotion} numberMode={state.settings.numberMode} onClose={()=>setCollected(null)}/></SafeAreaView>;
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:C.bg},center:{flex:1,backgroundColor:C.bg,alignItems:'center',justifyContent:'center',gap:10},txt:{color:C.text},body:{flex:1},backBar:{minHeight:48,flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderColor:C.line,backgroundColor:C.panel,paddingHorizontal:8},backButton:{minWidth:80,minHeight:44,flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:6},backPressed:{opacity:.65},backIcon:{width:22,height:22},backText:{color:C.accent,fontSize:15,fontWeight:'800'},backTitle:{flex:1,color:C.text,fontSize:16,fontWeight:'900',textAlign:'center'},backSpacer:{width:80},nav:{minHeight:72,flexDirection:'row',borderTopWidth:1,borderColor:C.line,backgroundColor:'#0d141e'},navItem:{flex:1,minHeight:68,alignItems:'center',justifyContent:'center',gap:4,paddingHorizontal:6},active:{backgroundColor:C.panel,borderTopWidth:2,borderTopColor:C.accent},navIcon:{width:26,height:26},inactiveIcon:{opacity:.55},navText:{fontSize:11,color:C.muted,fontWeight:'800'},activeText:{color:C.accent}});
