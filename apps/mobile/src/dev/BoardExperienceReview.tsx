import {useRef,useState} from 'react';
import {ScrollView,Text,View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {EventScreen} from '../screens/EventScreen';
import {GuildQuestBoard} from '../components/GuildQuestPanel';
import {GuildActivityMeter} from '../components/GuildActivitySummaryPanel';
import {GuildSpecializationPaths} from '../components/GuildSpecializationPaths';
import {GuildHallView} from '../components/OnlineGuildHallPanel';
import {GuildProjectPosting} from '../components/OnlineGuildProjectsPanel';
import {GuildBoardHero} from '../components/GuildBoardHero';
import {GuildIdentitySummary} from '../components/GuildIdentitySummary';
import {GuildHomeActions} from '../components/GuildHomeActions';
import {GuildShopReview} from './GuildShopReview';
import {BoardTabs} from '../components/BoardTabs';
import {GameTopBar} from '../components/GameTopBar';
import {PrimaryNavigation} from '../components/PrimaryNavigation';
import {GameThemeProvider} from '../theme/ThemeContext';
import {GameLanguageProvider} from '../i18n/GameLanguageProvider';
import {isSupportedLanguage} from '../i18n/languages';
import {resolveTheme,type UiThemeId} from '../theme/theme';
import {createCharacter,newGame} from '../core/game';
import {executeGameCommand} from '../core/game-commands';
import {applyEventDrops} from '../core/live-events';
import {newGuildHallState,guildHallBenefits} from '../core/guild-hall-v44';
import type {OnlineGuildQuest} from '../online/guild-quests';
import type {OnlineGuildActivityState} from '../online/guild-muster';
import type {OnlineGuildProjectSummary} from '../online/guild-projects-v18';

/** Development-only, isolated memory fixture: no persistence or online actions. */
export default function BoardExperienceReview(){return <SafeAreaProvider><Review/></SafeAreaProvider>;}
function Review(){
 const query=typeof window==='undefined'?new URLSearchParams():new URLSearchParams(window.location.search),requested=query.get('theme'),language=query.get('language');
 const [scenario,setScenario]=useState(query.get('scenario'));
 const [hallView,setHallView]=useState<'Facilities'|'Skills'|'Trophies'>('Facilities');
 const [screen,setScreen]=useState(query.get('screen')??'event'),[theme,setTheme]=useState<UiThemeId>(requested==='ivory'||requested==='ember'?requested:'obsidian'),C=resolveTheme(theme);
 const [state,setState]=useState(()=>{const now=Date.now(),created=createCharacter(newGame(now),'IRONWARDEN','Board Review'),id='EVT_ANNUAL_010_2026';const next={...created,quests:created.quests.map(q=>({...q,status:'claimed' as const})),character:{...created.character!,level:28},account:{...created.account,liveEvent:{enabled:true,eventId:id,startsAtMs:now-86400000,endsAtMs:now+7*86400000,graceEndsAtMs:now+14*86400000},eventCurrencyBalanceById:{[id]:scenario==='poor'?0:3200},eventPrestigeBalanceById:{[id]:8}}};return applyEventDrops(next,[{eventId:id,currencyId:'VEIL_SHARD',name:'Veil Shards',quantity:0,source:'combat',units:1240,recordedAtMs:now},{eventId:id,currencyId:'VEIL_SHARD',name:'Veil Shards',quantity:0,source:'gathering',units:900,recordedAtMs:now}]);});
 const current=useRef(state);current.current=state;
 const [calls,setCalls]=useState(0),[expanded,setExpanded]=useState(false),[metrics,setMetrics]=useState<Record<string,number>>({guild_skill_professions_gathering:1,guild_bank_IRONWOOD_LOG:scenario==='poor'?280:420,guild_bank_ASTER_IRON_INGOT:70}),[points,setPoints]=useState(2),[activityView,setActivityView]=useState<'Quests'|'Projects'>(query.get('activity')==='Projects'?'Projects':'Quests');
 const change=(next:typeof state)=>{current.current=next;setState(next)};
 const quests:OnlineGuildQuest[]=[{guildId:'preview',weekKey:'preview',weekEndsAt:new Date(Date.now()+4*86400000).toISOString(),activeMembers:12,questKey:'provision',title:'Provision the Guild',category:'Skilling',description:'Gather resources together to stock the Guild.',theme:'Skilling',rarity:'rare',estimatedMinutes:45,progress:3600,target:5000,objectiveProgress:[{key:'gathering_actions',progress:3600,target:5000}],activityReward:100,completed:false,contributorCount:12,boardSlot:0,featured:true,personalProgress:[{key:'gathering_actions',progress:240,target:5000}],newlyCompleted:false,activityBeforePercent:null,activityAfterPercent:null}];
 quests.push({...quests[0],questKey:'patrol',title:'Patrol the Roads',category:'Combat',description:'Defeat ordinary enemies together.',progress:800,target:800,boardSlot:1,featured:false,completed:true,personalProgress:[{key:'combat_actions',progress:65,target:800}],objectiveProgress:[{key:'combat_actions',progress:800,target:800}],activityReward:80});
 const activity:OnlineGuildActivityState={guildId:'preview',activityPercent:72,activityTargetUnits:1000,activityTodayUnits:300,activeMemberCount:12,decayMode:'protected',partialDecayPercent:5,inactiveDecayPercent:10,gatheringSpeedBps:500,productionSpeedBps:500,skillXpBps:500,masteryXpBps:0,rareMaterialRelativeBps:0};
 const hall=newGuildHallState('preview',Date.now());hall.hallProgress=4200;hall.lifetimeProjectsCompleted=18;hall.facilities.workshop={facilityId:'workshop',progress:900,tier:1,updatedAtMs:Date.now()};
 const project:OnlineGuildProjectSummary={id:'preview-project',templateId:'guild_weekly_shared_effort',name:'Supply the Guild',description:'Hunt or gather to supply this week’s shared Project.',kind:'weekly_campaign',focus:'mixed',slotIndex:1,status:'active',targetPoints:10000,completionPoints:6400,combatPoints:3000,skillingPoints:3400,meaningfulContributors:8,minimumMeaningfulContributors:5,personalPoints:450,personalRewardThreshold:300,endsAt:new Date(Date.now()+4*86400000).toISOString(),startedAt:new Date().toISOString(),resourceGoals:[],activityTotals:{combat:3000,gathering:2500,crafting:900},launchWeekly:true};
 return <GameThemeProvider themeId={theme}><GameLanguageProvider language={isSupportedLanguage(language)?language:'en'}><View style={{flex:1,backgroundColor:C.bg}}>
  {!query.has('capture')?<View style={{padding:6,gap:6}}><Text style={{fontSize:11,color:C.muted}}>MEMORY ONLY · requests {calls}</Text><BoardTabs compact label="Preview screens" items={['event','guild','hall','skills','shop','guild-home'].map(id=>({id,label:id}))} value={screen} onChange={setScreen}/><BoardTabs compact label="Preview themes" items={(['obsidian','ember','ivory'] as const).map(id=>({id,label:id}))} value={theme} onChange={setTheme}/><BoardTabs compact label="Preview states" items={['ready','poor','member','unknown','failure'].map(id=>({id,label:id}))} value={scenario??'ready'} onChange={value=>{setScenario(value);setMetrics({guild_skill_professions_gathering:1,guild_bank_IRONWOOD_LOG:value==='poor'?280:420,guild_bank_ASTER_IRON_INGOT:70});setPoints(2);setCalls(0);change({...current.current,account:{...current.current.account,eventCurrencyBalanceById:{EVT_ANNUAL_010_2026:value==='poor'?0:3200},eventPrestigeBalanceById:{EVT_ANNUAL_010_2026:8}}})}}/></View>:null}
  {query.has('shell')?<><GameTopBar state={state} nowMs={Date.now()} labelForDestination={id=>id} onNavigate={()=>{}} onChangeDestinations={()=>{}} onOpenActivity={()=>{}} online={false}/><View style={{minHeight:44,paddingHorizontal:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:C.panel,borderBottomWidth:1,borderColor:C.line}}><Text style={{color:C.accent}}>‹ Back</Text><Text style={{color:C.text,fontWeight:'700'}}>{screen==='event'?'Events':'Guild'}</Text><View style={{width:44}}/></View></>:null}
  <View style={{flex:1,minHeight:0,width:'100%',maxWidth:520,alignSelf:'center'}}>
   {screen==='event'?<EventScreen state={state} onChange={change} onOpenEventActivity={()=>{}} onOpenGuildEventBoss={()=>{}} onCommand={async command=>{setCalls(n=>n+1);await new Promise(resolve=>setTimeout(resolve,400));if(query.get('fail')==='1'||scenario==='failure')return false;change(executeGameCommand(current.current,command,Date.now()).state as typeof state);return true}}/>:<ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={{padding:12,gap:12}}>
    {screen==='guild-home'?<GuildIdentitySummary name="Stormwatch" tag="STW" level={8} memberCount={12} memberCap={20} bannerId="swordwing_blue" frameId="classic" backgroundId="plain" motto="Together through the storm."/>:<GuildBoardHero compact title={screen==='guild'?'Guild Activity Board':screen==='hall'?'Guild Hall':screen==='shop'?'Guild Token Shop':'Guild Skills'} subtitle={screen==='guild'?'Shared objectives, daily participation and weekly Projects.':screen==='shop'?'Permanent rewards for your guild fellowship.':'Isolated preview · All progress is held in memory'}/>}
    {screen==='shop'?<GuildShopReview key={scenario} failure={scenario==='failure'} poor={scenario==='poor'}/>:screen==='guild-home'?<GuildHomeActions activity={<GuildActivityMeter state={activity} compact/>} board={<View style={{padding:12,borderWidth:1,borderColor:C.line,borderRadius:10}}><Text style={{color:C.text}}>Rally together this week.</Text></View>} onMuster={()=>{setScreen('guild');setActivityView('Quests')}} onQuests={()=>{setScreen('guild');setActivityView('Quests')}} onShop={()=>setScreen('shop')} onPve={()=>setCalls(n=>n+1)} onRoster={()=>setCalls(n=>n+1)} onHall={()=>setScreen('hall')} onChat={()=>setCalls(n=>n+1)} onManage={()=>setCalls(n=>n+1)}/>:null}
    {screen==='guild'?<><BoardTabs compact label="Preview Guild activities" items={(['Quests','Projects'] as const).map(id=>({id,label:id}))} value={activityView} onChange={setActivityView}/>{activityView==='Quests'?<><GuildActivityMeter state={activity} compact/><GuildQuestBoard quests={quests}/></>:<GuildProjectPosting project={project} expanded={expanded} onToggle={()=>setExpanded(!expanded)} onClaim={()=>{}} busy={false}/>}</>:screen==='hall'?<GuildHallView activeSection={hallView} onSectionChange={next=>next==='Shop'?setScreen('shop'):setHallView(next)} projection={{state:hall,level:5,stage:'Established Hall',benefits:guildHallBenefits(hall)}}/>:screen==='skills'?<GuildSpecializationPaths guildLevel={8} metrics={scenario==='unknown'?undefined:metrics} skillPoints={scenario==='unknown'?undefined:points} canUpgrade={scenario!=='member'} onSpend={id=>{const cost=id==='professions_gathering'?{IRONWOOD_LOG:350,ASTER_IRON_INGOT:40}:{};setMetrics(old=>({...old,[`guild_skill_${id}`]:(old[`guild_skill_${id}`]??0)+1,...Object.fromEntries(Object.entries(cost).map(([key,n])=>[`guild_bank_${key}`,(old[`guild_bank_${key}`]??0)-n]))}));setPoints(n=>n-1);setCalls(n=>n+1)}}/>:null}
   </ScrollView>}
  </View>
  {query.has('shell')?<PrimaryNavigation destinations={['Character','Skills','World','Inventory','More'] as const} active="More" labelFor={id=>id} onNavigate={()=>{}}/>:null}
 </View></GameLanguageProvider></GameThemeProvider>;
}
