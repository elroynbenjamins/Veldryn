/** Explicit development entry: real companion screens and local commands, memory only. */
import {useRef,useState} from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {Pressable,ScrollView,Text,View} from 'react-native';
import {ThemedNavigationIcon} from '../components/ThemedNavigationIcon';
import {QUICK_NAV_DESTINATIONS} from '../core/quick-navigation';
import {createCharacter,newGame,claimQuest,claimSeasonalContract} from '../core/game';
import {unlockCombatCompanion,equipCombatCompanion} from '../core/combat-companions';
import {COMBAT_COMPANIONS} from '../content/combat-companions';
import {ITEMS} from '../content/items';
import {executeGameCommand,type GameCommand} from '../core/game-commands';
import {GameThemeProvider} from '../theme/ThemeContext';
import {UI_THEMES,type UiThemeId} from '../theme/theme';
import {GameLanguageProvider} from '../i18n/GameLanguageProvider';
import {isSupportedLanguage} from '../i18n/languages';
import {CompanionsScreen} from '../screens/CompanionsScreen';
import {WorldScreen} from '../screens/WorldScreen';
import {QuestScreen,type QuestMode} from '../screens/QuestScreen';

function fixture(empty:boolean){
 const now=Date.now();let state=createCharacter(newGame(now),'IRONWARDEN','Companion Review','female');
 state={...state,quests:state.quests.map(q=>({...q,status:'claimed' as const})),character:{...state.character!,level:25,gold:100000},inventory:{...state.inventory,capacity:2000,stacks:ITEMS.filter(i=>i.type==='material'||i.type==='food').map(i=>({itemId:i.id,quantity:300}))}};
 if(!empty){
  const ids=[...new Set(['UNIT_001','UNIT_002','UNIT_003','UNIT_004','UNIT_005','UNIT_008',...['rare','elite','prestige'].map(r=>COMBAT_COMPANIONS.find(d=>d.rarity===r)!.id)])];
  for(const id of ids)state=unlockCombatCompanion(state,id,now-14*86400000);
  state.account.combatCompanionProgress=Object.fromEntries(Object.entries(state.account.combatCompanionProgress??{}).map(([id,p])=>[id,{...p,level:8,bondLevel:4}]));
  state=equipCombatCompanion(state,'UNIT_001');
 }
 state.account={...state.account,companionEssence:10000,bondstones:100,companionMaterials:{...state.account.companionMaterials,SUPPLIES:100},companionSanctuary:{trainingGroundLevel:1,essenceBasinLevel:1,bondHallLevel:1,expeditionPensLevel:1,masteryChamberLevel:0,lastTrainingClaimAtMs:now-2*86400000,lastEssenceClaimAtMs:now-8*86400000}};
 return state;
}
export default function CompanionScreenReview(){return <SafeAreaProvider><CompanionScreenReviewContent/></SafeAreaProvider>;}
function CompanionScreenReviewContent(){
 const query=typeof window==='undefined'?new URLSearchParams():new URLSearchParams(window.location.search),requestedTheme=query.get('theme'),requestedLanguage=query.get('language');
 const [questMode,setQuestMode]=useState<QuestMode>('story');
 const [theme,setTheme]=useState<UiThemeId>(requestedTheme&&requestedTheme in UI_THEMES?requestedTheme as UiThemeId:'obsidian'),[state,setState]=useState(()=>{const next=fixture(query.get('empty')==='1');if(query.get('screen')==='quests')next.quests=newGame(Date.now()).quests;return next;});
 const current=useRef(state);current.current=state;const colors=UI_THEMES[theme],language=isSupportedLanguage(requestedLanguage)?requestedLanguage:'en';
 const command=async(value:GameCommand)=>{const next=executeGameCommand(current.current,value,Date.now()).state;current.current=next;setState(next);};
 if(query.get('screen')==='icons')return <GameThemeProvider themeId={theme}><ScrollView style={{backgroundColor:colors.bg}} contentContainerStyle={{padding:20,gap:12}} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>{QUICK_NAV_DESTINATIONS.map(destination=><View key={destination} style={{flexDirection:'row',gap:20,alignItems:'center',padding:12,borderWidth:1,borderColor:colors.line,borderRadius:12}}><ThemedNavigationIcon destination={destination} size={32}/><ThemedNavigationIcon destination={destination} size={20}/><Text style={{color:colors.text}}>{destination}</Text></View>)}</ScrollView></GameThemeProvider>;
 if(query.get('screen')==='world')return <GameThemeProvider themeId={theme}><GameLanguageProvider language={language}><View style={{flex:1,backgroundColor:colors.bg}}><WorldScreen state={state} onTravel={regionId=>setState({...state,currentRegionId:regionId})} onOpenCombat={()=>{}} onOpenSkills={()=>{}}/></View></GameLanguageProvider></GameThemeProvider>;
 if(query.get('screen')==='quests')return <GameThemeProvider themeId={theme}><GameLanguageProvider language={language}><View style={{flex:1,backgroundColor:colors.bg}}><QuestScreen state={state} mode={questMode} onModeChange={setQuestMode} onClaim={id=>setState(claimQuest(state,id))} onClaimContract={(period,id)=>setState(claimSeasonalContract(state,period,id))} onNavigate={()=>{}} onOpenWeeklyBoss={()=>{}} onOpenWeeklyOrder={()=>{}} onPinWeeklyOrder={()=>{}} onQueueWeeklyOrder={()=>{}} onStopWeeklyOrder={()=>{}}/></View></GameLanguageProvider></GameThemeProvider>;
 return <GameThemeProvider themeId={theme}><GameLanguageProvider language={language}><View style={{flex:1,backgroundColor:colors.bg,alignItems:'center'}}><View style={{width:'100%',maxWidth:480,flex:1}}><View style={{padding:10,gap:8,borderBottomWidth:1,borderBottomColor:colors.line}}><Text style={{color:colors.muted,fontSize:11}}>COMPANION REVIEW · MEMORY ONLY</Text><View style={{flexDirection:'row',gap:6}}>{Object.values(UI_THEMES).map(item=><Pressable key={item.id} accessibilityRole="button" accessibilityState={{selected:theme===item.id}} onPress={()=>setTheme(item.id)} style={{flex:1,minHeight:44,justifyContent:'center',alignItems:'center',backgroundColor:theme===item.id?colors.selection:colors.panel,borderRadius:8}}><Text style={{color:colors.text,fontSize:12}}>{item.name}</Text></Pressable>)}</View></View><CompanionsScreen state={state} language={language} now={Date.now()} onCommand={command} onCreate={()=>{const next=fixture(false);current.current=next;setState(next)}} onNavigateSource={()=>{}}/></View></View></GameLanguageProvider></GameThemeProvider>;
}
