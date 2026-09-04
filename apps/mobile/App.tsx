import React,{useEffect,useState} from 'react';
import {ActivityIndicator,Alert,Image,ImageSourcePropType,Pressable,SafeAreaView,StyleSheet,Text,View} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import {AsyncStorageGameRepository} from './src/storage/async-storage-repository';
import {BodyPresentation,ClassId,GameState,RewardBundle} from './src/core/types';
import {challengeFallenKnight,claimActivity,claimOverflowToBank,claimQuest,craftRecipe,createCharacter,depositToBank,eatFood,equipFood,equipItem,newGame,previewActivityReward,salvageItem,sellItem,startCombat,startGathering,stopActivity,unequipItem,updateCharacterCustomization,withdrawFromBank} from './src/core/game';
import {ClassSelectScreen} from './src/screens/ClassSelectScreen';
import {HomeScreen} from './src/screens/HomeScreen';
import {WorldScreen} from './src/screens/WorldScreen';
import {InventoryScreen} from './src/screens/InventoryScreen';
import {CharacterScreen} from './src/screens/CharacterScreen';
import {QuestScreen} from './src/screens/QuestScreen';
import {SkillsScreen} from './src/screens/SkillsScreen';
import {SettingsScreen} from './src/screens/SettingsScreen';
import {RewardPopup} from './src/components/RewardPopup';
import {C} from './src/theme/theme';
import {transitionActivity} from './src/core/playability';
import {equipNoviceSet} from './src/core/game';
import {noviceSetProgress} from './src/core/character-appearance';

type Tab='Home'|'World'|'Quests'|'Skills'|'Inventory'|'Character'|'Settings';
const tabs:Tab[]=['Home','World','Quests','Skills','Inventory','Character','Settings'];
const navIcons:Record<Tab,ImageSourcePropType>={Home:require('./assets/navigation/home_24.png'),World:require('./assets/navigation/world_24.png'),Quests:require('./assets/navigation/quests_24.png'),Skills:require('./assets/navigation/skills_24.png'),Inventory:require('./assets/navigation/inventory_24.png'),Character:require('./assets/navigation/character_24.png'),Settings:require('./assets/navigation/settings_24.png')};
const repo=new AsyncStorageGameRepository();

export default function App(){
  const [state,setState]=useState<GameState|null>(null);
  const [ready,setReady]=useState(false);
  const [tab,setTab]=useState<Tab>('Home');
  const [selectedZone,setSelectedZone]=useState<string|null>(null);
  const [skillsMode,setSkillsMode]=useState<'gathering'|'crafting'|'novice'>('gathering');
  const [now,setNow]=useState(Date.now());
  const [collected,setCollected]=useState<RewardBundle|null>(null);
  useEffect(()=>{repo.load().then(saved=>{setState(saved??newGame(Date.now()));setReady(true)})},[]);
  useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(id)},[]);
  async function commit(next:GameState){setState(next);try{await repo.save(next)}catch{Alert.alert('Local save failed','Progress is still in memory. Keep the app open and try another action to save again.')}}
  function changeActivity(next?:{kind:'combat'|'gathering';id:string}){
    if(!state)return;
    try{const result=transitionActivity(state,Date.now(),next);commit(result.state);if(result.reward.kills>0||result.reward.stoppedReason)setCollected(result.reward);setTab('Home')}
    catch(error){Alert.alert('Cannot change activity',error instanceof Error?error.message:'Please try again.')}
  }
  if(!ready||!state)return <SafeAreaView style={s.center}><ActivityIndicator/><Text style={s.txt}>Loading local save…</Text></SafeAreaView>;
  if(!state.character)return <SafeAreaView style={s.safe}><StatusBar style="light"/><ClassSelectScreen onSelect={async(id,name,body,customization)=>{const next=createCharacter(state,id,name,body,customization);await repo.save(next);setState(next)}}/></SafeAreaView>;
  const preview=previewActivityReward(state,now);
  return <SafeAreaView style={s.safe}><StatusBar style="light"/><View style={s.body}>
    {tab==='Home'&&<HomeScreen state={state} preview={preview} onNavigate={setTab} onClaim={()=>{const result=claimActivity(state,Date.now());commit(result.state);setCollected(result.reward)}} onStop={()=>changeActivity()}/>}
    {tab==='World'&&<WorldScreen state={state} selectedId={selectedZone} onSelectZone={setSelectedZone} onStart={id=>changeActivity({kind:'combat',id})} onBoss={()=>{const settled=claimActivity(state,Date.now());const result=challengeFallenKnight(settled.state);commit(result.state);Alert.alert(result.won?'Victory':'Not ready',`${result.message}${settled.reward.kills>0?' Your pending activity rewards were collected.':''}`)}}/>}
    {tab==='Quests'&&<QuestScreen state={state} onClaim={id=>commit(claimQuest(state,id))} onNavigate={destination=>{if(destination.tab==='World')setSelectedZone(destination.zoneId??null);setTab(destination.tab)}}/>}
    {tab==='Skills'&&<SkillsScreen state={state} initialMode={skillsMode} onCharacter={()=>setTab('Character')} onGather={id=>changeActivity({kind:'gathering',id})} onCraft={id=>{try{const next=craftRecipe(state,id);const completed=!noviceSetProgress(state).unlocked&&noviceSetProgress(next).unlocked;commit(next);Alert.alert(completed?'Novice set complete!':'Craft complete',completed?`${noviceSetProgress(next).set.name} is fully crafted. Open Character and equip the set to see your new outfit.`:'Your crafted items were added to Inventory, or Bank if Inventory was full. Equip them from Inventory or use Equip owned novice set on Character.',[{text:'Continue'},{text:'View character',onPress:()=>setTab('Character')}])}catch(error){Alert.alert('Cannot craft',error instanceof Error?error.message:'Please try again.')}}}/>}
    {tab==='Inventory'&&<InventoryScreen state={state} onEquip={id=>commit(equipItem(state,id))} onFood={id=>commit(equipFood(state,id))} onEat={id=>commit(eatFood(state,id))} onSell={id=>commit(sellItem(state,id))} onSalvage={id=>commit(salvageItem(state,id))} onDeposit={(id,quantity)=>commit(depositToBank(state,id,quantity))} onWithdraw={(id,quantity)=>commit(withdrawFromBank(state,id,quantity))} onOverflow={()=>commit(claimOverflowToBank(state))}/>}
    {tab==='Character'&&<CharacterScreen state={state} onCustomize={value=>commit(updateCharacterCustomization(state,value))} onUnequip={slot=>commit(unequipItem(state,slot))} onCrafting={()=>{setSkillsMode('novice');setTab('Skills')}} onEquipSet={()=>{const settled=claimActivity(state,Date.now());const next=equipNoviceSet(settled.state);commit(next);if(settled.reward.kills>0)setCollected(settled.reward)}}/>}
    {tab==='Settings'&&<SettingsScreen onReset={()=>Alert.alert('Reset local save?','This deletes prototype progress only.',[{text:'Cancel'},{text:'Reset',style:'destructive',onPress:async()=>{await repo.reset();setState(newGame(Date.now()));setTab('Home')}}])}/>}
  </View><View style={s.nav}>{tabs.map(item=><Pressable accessibilityRole="tab" accessibilityState={{selected:tab===item}} key={item} onPress={()=>setTab(item)} style={[s.navItem,tab===item&&s.active]}><Image source={navIcons[item]} resizeMode="contain" style={[s.navIcon,tab!==item&&s.inactiveIcon]}/><Text style={[s.navText,tab===item&&s.activeText]}>{item}</Text></Pressable>)}</View><RewardPopup reward={collected} onClose={()=>setCollected(null)}/></SafeAreaView>;
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:C.bg},center:{flex:1,backgroundColor:C.bg,alignItems:'center',justifyContent:'center',gap:10},txt:{color:C.text},body:{flex:1},nav:{minHeight:68,flexDirection:'row',borderTopWidth:1,borderColor:C.line,backgroundColor:'#0d141e'},navItem:{flex:1,minHeight:64,alignItems:'center',justifyContent:'center',gap:2,paddingHorizontal:3},active:{backgroundColor:C.panel,borderTopWidth:2,borderTopColor:C.accent},navIcon:{width:24,height:24},inactiveIcon:{opacity:.55},navText:{fontSize:10,color:C.muted,fontWeight:'700'},activeText:{color:C.accent}});
