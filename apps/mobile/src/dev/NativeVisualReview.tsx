import {QuestScreen} from '../screens/QuestScreen';
import {SettingsScreen} from '../screens/SettingsScreen';
import {EventScreen} from '../screens/EventScreen';
import {setLocalEventEnabled} from '../core/live-events';
import {ProfileEditor} from '../components/ProfileEditor';
import {ItemCard} from '../components/ItemCard';
import {itemDef} from '../content/items';
import {IngredientList} from '../components/IngredientList';
import {ingredientIcons} from '../theme/ingredient-assets';
declare const process:{env:Record<string,string|undefined>};
/** Opt-in native visual QA. Fixtures live only in memory; never mounts auth or save providers. */
import React,{useState} from 'react';
import {SafeAreaView,ScrollView,StyleSheet,Text,View,Pressable,StatusBar,Platform} from 'react-native';
import {newGame,createCharacter,startCombat,previewActivityReward,craftRecipe,claimActivity,stopActivity} from '../core/game';
import type {GameState} from '../core/types';
import {HomeScreen} from '../screens/HomeScreen';
import {SkillsScreen} from '../screens/SkillsScreen';
import {SkillDashboard} from '../components/SkillDashboard';
import {BattleStage} from '../components/BattleStage';
import {BossEncounterIntro} from '../components/BossEncounterIntro';
import {PartyHubPanel} from '../components/PartyHubPanel';
import {RecruitmentListing} from '../components/RecruitmentListing';
import {PrimaryNavigation} from '../components/PrimaryNavigation';
import {GameTopBar} from '../components/GameTopBar';
import {OnlineAccountPanel} from '../components/OnlineAccountPanel';
import {AccountWelcomeScreen} from '../components/AccountWelcomeScreen';
import {STARTUP_SCENES} from '../theme/startup-art';
import {MONSTERS} from '../content/monsters';
import {ITEMS} from '../content/items';
import {RecruitmentCardView,PersistentPartySummary} from '../core/party-social';
import {C} from '../theme/theme';
const now=Date.now();
function fixture():GameState{
 const state=createCharacter(newGame(now),'IRONWARDEN','Aster Nightfall','female');
 state.character!.gold=4500;state.character!.level=25;
 state.inventory.stacks=ITEMS.filter(i=>i.type==='material').slice(0,100).map(i=>({itemId:i.id,quantity:100}));
 state.inventory.capacity=120;
 state.skills=state.skills.map(s=>({...s,level:25,xp:4000}));
 state.settings.reduceMotion=true;
 const review=startCombat(state,'MOSS_RAT',now-600000);
 if(process.env.EXPO_PUBLIC_VISUAL_QA_SCREEN==='topbar-idle')return {...review,activity:null};
 if(process.env.EXPO_PUBLIC_VISUAL_QA_SCREEN==='topbar-skill')return {...review,activity:{kind:'mining',targetId:'COPPER_VEIN',startedAtMs:now-147000,lastClaimAtMs:now-147000}};
 if(process.env.EXPO_PUBLIC_VISUAL_QA_SCREEN==='journal')review.quests=review.quests.map((q,index)=>index===0?{...q,status:'complete',progress:5}:q);
 if(process.env.EXPO_PUBLIC_VISUAL_QA_SCREEN==='events')return setLocalEventEnabled(review,true,now);
 if(process.env.EXPO_PUBLIC_VISUAL_QA_SCREEN==='profile')return {...review,character:{...review.character!,profileBackgroundId:'bg_harvestwake',profileBorderId:'frame_amber_vine',selectedCosmeticPetId:'pet_harvest_fox',profileTitle:'Warden of the First Light'},account:{...review.account,unlockedProfileBackgroundIds:['bg_harvestwake'],unlockedProfileBorderIds:['frame_amber_vine'],unlockedCosmeticPetIds:['pet_harvest_fox']}};
 return review;
}
const party:PersistentPartySummary={id:'qa-party',maxMembers:4,focus:'mixed',members:[
 {accountId:'qa',characterId:'qa1',characterName:'Aster Nightfall',className:'Ironwarden',role:'tank',isLeader:true},
 {accountId:'qa2',characterId:'qa2',characterName:'Longname Dawnkeeper',className:'Dawnkeeper',role:'support',isLeader:false},
 {accountId:'qa3',characterId:'qa3',characterName:'Wandering Wayfinder',className:'Wayfinder',role:'damage',isLeader:false}
]};
const post:RecruitmentCardView={id:'qa-post',postType:'party_recruiting',ownerName:'Aster Nightfall',title:'Preparing for the Fallen Knight',body:'A relaxed party for hunting, gathering, and the next Asterfall challenge.',roles:['damage','support'],focus:'mixed',activityTags:['Bosses'],playstyleTags:['Relaxed'],availabilityTags:[],guildInterestTags:[],currentObjective:'The Fallen Knight',openSpots:1,expiresAtMs:now+3600000};
const sections=['Home','Skills','Crafting','Combat','Social','Guild','Login','Ingredients','Settings','Journal','Events','Profile'] as const;
type Section=typeof sections[number];
const destinations=['Character','Skills','World','Inventory','More'] as const;
export default function NativeVisualReview(){
 const [section,setSection]=useState<Section>(sections.find(name=>name.toLowerCase()===process.env.EXPO_PUBLIC_VISUAL_QA_SCREEN)??'Home'),[state,setState]=useState(fixture),[active,setActive]=useState<typeof destinations[number]>('Character');
 const noop=()=>{};
 return <SafeAreaView style={s.root}><View style={s.qa}><Text style={s.qaLabel}>NATIVE QA · MEMORY FIXTURES</Text><ScrollView horizontal contentContainerStyle={s.selector}>{sections.map(name=><Pressable key={name} accessibilityRole="button" accessibilityLabel={'QA '+name} onPress={()=>setSection(name)} style={s.pick}><Text style={{color:section===name?C.accent:C.text}}>{name}</Text></Pressable>)}</ScrollView></View>
 <View style={s.flex}>
 {section==='Login'?<AccountWelcomeScreen scene={STARTUP_SCENES[0]}><OnlineAccountPanel state={newGame(now)}/></AccountWelcomeScreen>:<>
 <GameTopBar state={state} nowMs={now} labelForDestination={x=>x} onNavigate={noop} onChangeDestinations={noop} onOpenActivity={()=>setSection(state.activity?.kind==='combat'?'Combat':'Skills')}/>
 {section==='Home'&&<HomeScreen state={state} preview={previewActivityReward(state,now)} onClaim={()=>setState(s=>claimActivity(s,now).state)} onStop={()=>setState(stopActivity)} onQueueRemove={noop} onQueueClear={noop} onQueueStart={noop} onNavigate={noop} onOpenPlanner={noop} onNavigateGoal={noop} onOpenCombat={()=>setSection('Combat')} onOpenSkill={()=>setSection('Skills')}/>} 
 {section==='Journal'&&<QuestScreen state={state} onClaim={noop} onClaimContract={noop} onNavigate={noop} onOpenWeeklyOrder={noop} onPinWeeklyOrder={noop} onQueueWeeklyOrder={noop} onStopWeeklyOrder={noop}/>} 
 {section==='Events'&&<EventScreen state={state} onChange={setState}/>} 
 {section==='Profile'&&<ScrollView contentContainerStyle={s.content}><ProfileEditor state={state} onChange={setState}/></ScrollView>} 
 {section==='Settings'&&<SettingsScreen state={state} onLanguage={language=>setState(s=>({...s,settings:{...s.settings,language}}))} onReset={noop} onChange={setState} onExport={async()=>{}} onImport={async()=>{}}/>}
 {section==='Ingredients'&&<ScrollView contentContainerStyle={s.content}><Text style={{color:C.text,fontSize:22}}>Crafting ingredient artwork</Text><IngredientList inputs={Object.keys(ingredientIcons).map((itemId,index)=>({itemId,quantity:5,inventory:index%3===0?2:12,bank:1}))} showStorage/><Text style={{color:C.text,fontSize:22}}>Inventory card preview</Text><ItemCard item={itemDef('ASTRAL_SCRIPT')} quantity={12} onSell={noop}/></ScrollView>}
 {section==='Skills'&&<ScrollView contentContainerStyle={s.content}><SkillDashboard state={state} onCombat={()=>setSection('Combat')} onSkill={noop}/></ScrollView>}
 {section==='Crafting'&&<SkillsScreen state={state} initialMode="crafting" onCraft={id=>setState(s=>craftRecipe(s,id,now))} onGather={noop} onQueueGather={noop} onQueueRemove={noop} onQueueClear={noop} onQueueStart={noop} onEquipTool={noop} onCharacter={noop} onInventory={noop} onViewToolRecipes={noop}/>} 
 {section==='Combat'&&<ScrollView contentContainerStyle={s.content}><BattleStage state={state} monster={MONSTERS.find(m=>m.id==='MOSS_RAT')!} elapsedSeconds={7} cycleSeconds={12}/><BossEncounterIntro monster={MONSTERS.find(m=>m.id==='FALLEN_KNIGHT')!}/></ScrollView>}
 {section==='Social'&&<ScrollView contentContainerStyle={s.content}><PartyHubPanel accountId="qa" party={party} contracts={[]} recruitment={[post]} nowMs={now} onOpenPartyChat={noop} onLeaveParty={noop} onCreateRecruitmentPost={noop}/></ScrollView>}
 {section==='Guild'&&<ScrollView contentContainerStyle={s.content}><RecruitmentListing card={{...post,postType:'guild_recruiting',guildName:'The Lanterns of Asterfall',title:'A home for wandering adventurers',guildInterestTags:['Weekly contracts']}} nowMs={now} onPress={noop}/></ScrollView>}
 <PrimaryNavigation destinations={destinations} active={active} labelFor={x=>x} onNavigate={setActive}/>
 </>}
 </View></SafeAreaView>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:C.bg,paddingTop:Platform.OS==='android'?StatusBar.currentHeight??24:0},flex:{flex:1},qa:{backgroundColor:'#26334a'},qaLabel:{color:'#fff',fontSize:10,paddingHorizontal:10},selector:{gap:4,padding:4},pick:{minHeight:36,paddingHorizontal:12,justifyContent:'center'},content:{padding:16,gap:16}});
