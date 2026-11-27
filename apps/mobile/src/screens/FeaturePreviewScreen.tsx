import {useEffect,useMemo,useRef,useState,type ComponentRef,type ReactNode} from 'react';
import {ImageBackground,Modal,Pressable,ScrollView,StyleSheet,Text,TextInput,View,useWindowDimensions} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {usePartySocial} from '../online/PartySocialProvider';
import type {FeatureHubPreviewRoute} from '../core/feature-hub-routes';
import {regionScenes} from '../theme/upgraded-artwork';
import {estimateMarketPreviewQuote} from '../core/market-preview-quote';
import {decodePartyEventReadOnlySnapshot,decodePartyEventReadTransportV39,partyEventSupplyProgress,type PartyEventScreenSnapshot} from '../core/party-event-readonly-snapshot';
import {decodePartyEventRewardReadOnlyV62,type PartyRewardMobileV62} from '../core/party-event-reward-readonly-v62';
import {decodeWorldBossReadOnlyStatusV46,type WorldBossScreenSnapshotV46} from '../core/world-boss-readonly-snapshot';
import {WORLD_BOSS_PRESENTATION} from '../core/world-boss-presentation';
import {WorldBossChestOpeningPreview} from '../components/WorldBossChestOpeningPreview';
import {WorldBossBattleStage} from '../components/WorldBossBattleStage';
import {WORLD_BOSS_REPLAY_FIXTURE} from '../dev/world-boss-replay-fixture';
import {filterMarketPreviewItems,type MarketPreviewItem,type MarketPreviewSort} from '../core/market-preview-filter';
import {UiIcon} from '../components/UiIcon';

type Feature='boss'|'party'|'market';
type TabItem={id:string;label:string};
type Props={route:FeatureHubPreviewRoute;onClose:()=>void;onOpenParty:()=>void;onOpenPartyChat:()=>void;partyUnread?:number;reduceMotion?:boolean;partyEventStatus?:unknown;partyEventAccountId?:string;partyEventReadCurrent?:()=>Promise<unknown>;partyEventRewardStatus?:unknown;worldBossStatus?:unknown;worldBossAccountId?:string;worldBossReadCurrent?:()=>Promise<unknown>};

const bossTabs:TabItem[]=[
 {id:'overview',label:'Overview'},{id:'camp',label:'War Camp'},{id:'battle',label:'Battle'},
 {id:'rewards',label:'Rewards'},{id:'rankings',label:'Rankings'},
];
const partyTabs:TabItem[]=[
 {id:'adventure',label:'Adventure'},{id:'stages',label:'Stages'},{id:'supplies',label:'Supplies'},
 {id:'vote',label:'Voting'},{id:'finale',label:'Finale'},{id:'results',label:'Results'},
];
/** Static, deliberately NONENTITLED design catalog. Collection and balances
 * must come from a future authenticated, short-leased server reward snapshot. */
const partyTreasureSets:Readonly<Record<'caravan'|'hunt'|'wards'|'reliquary',readonly {name:string;pieces:number}[]>>={
 caravan:[{name:"Wayfarer's Pact",pieces:3},{name:"Smuggler's Guile",pieces:2}],
 hunt:[{name:'Moonfang Pursuit',pieces:3},{name:"Predator's Mark",pieces:2}],
 wards:[{name:'Runebound Vigil',pieces:3},{name:"Warden's Seal",pieces:2}],
 reliquary:[{name:'Echoheart Vestment',pieces:3},{name:"Curator's Oath",pieces:2}],
};
/** World Boss V61/V62 chest design is NOT an authenticated entitlement feed. */
const bossChestDesign:readonly {name:string;condition:string;guaranteed:string}[]=[
 {name:'War Camp Chest',condition:'Two War Camp tracks at Tier I and your committed donation',guaranteed:'450 Gold · 6 Essence · 2 Gem Dust · 2 Tempering Dust'},
 {name:'Warrior Chest',condition:'All 3 account attacks committed and replay-verified',guaranteed:'650 Gold · 8 Essence · 3 Gem Dust · 3 Tempering Dust'},
 {name:'Realm Victory Chest',condition:'70% of shared boss HP defeated and your proven attack',guaranteed:'900 Gold · 10 Essence · 4 Gem Dust · 4 Tempering Dust'},
];
const bossGatheringSetLabel:Readonly<Record<'hollowroot'|'sunscar'|'frostmarch',string>>={
 hollowroot:'Rootbound Harvester · Woodcutting',
 sunscar:'Sunforged Prospector · Mining',
 frostmarch:'Rimebound Angler · Fishing',
};
const partyChestDesign:readonly {name:string;chance:string;condition:string}[]=[
 {name:'Adventure Chest',chance:'12%',condition:'15 verified personal Event Points'},
 {name:'Preparation Chest',chance:'16%',condition:'Personal preparation + optional goal'},
 {name:'Victory Chest',chance:'24%',condition:'Verified finale victory'},
];
const marketTabs:TabItem[]=[
 {id:'browse',label:'Browse'},{id:'sell',label:'Sell'},{id:'listings',label:'My Listings'},{id:'inbox',label:'Inbox'},{id:'history',label:'History'},
];
const marketArtwork=require('../../assets/card-backgrounds/guild_plaza_wide_v2.webp');
const meta={
 boss:{eyebrow:'ROTATING WORLD EVENT',title:'World Boss',subtitle:'One shared boss every 14 days.',accent:'#E8B66B'},
 party:{eyebrow:'CO-OP ADVENTURES',title:'Party Events',subtitle:'Shape the expedition together.',accent:'#91CFC4'},
 market:{eyebrow:'REALM ECONOMY',title:'Player Market',subtitle:'Trade with purpose and clarity.',accent:'#D5C196'},
};

export function FeaturePreviewScreen({route,onClose,onOpenParty,onOpenPartyChat,partyUnread=0,reduceMotion=false,partyEventStatus=null,partyEventAccountId='',partyEventReadCurrent,partyEventRewardStatus=null,worldBossStatus=null,worldBossAccountId='',worldBossReadCurrent}:Props){
 const feature:Feature=route==='WorldBossPreview'?'boss':route==='PartyEventPreview'?'party':'market';
 const tabs=feature==='boss'?bossTabs:feature==='party'?partyTabs:marketTabs;
 const defaultTab=tabs[0].id;
 const [tab,setTab]=useState(defaultTab),[guide,setGuide]=useState(false),[guideIndex,setGuideIndex]=useState(0);
 const scrollRef=useRef<ComponentRef<typeof ScrollView>>(null);
 // The host may reuse this component when switching between QA routes.
 // Never render a previous feature's tab inside another feature's screen.
 const activeTab=tabs.some(item=>item.id===tab)?tab:defaultTab;
 useEffect(()=>{
  setTab(defaultTab);
  setGuide(false);
  setGuideIndex(0);
  scrollRef.current?.scrollTo({y:0,animated:false});
 },[route,defaultTab]);
 const changeTab=(next:string)=>{if(!tabs.some(item=>item.id===next))return;setTab(next);scrollRef.current?.scrollTo({y:0,animated:false});};
 // A private status is a short lease, not persistent presence. Expire it
 // while the QA screen stays open; no network request or action is mounted.
 const [statusNowMs,setStatusNowMs]=useState(()=>Date.now());
 const [bossRetry,setBossRetry]=useState(0);
 const [fightPreview,setFightPreview]=useState(false);
 const [loadedBoss,setLoadedBoss]=useState<{accountId:string;raw:unknown}|null>(null);
 const [bossReadState,setBossReadState]=useState<'idle'|'loading'|'ready'|'empty'|'error'>('idle');
 // A host-approved, authenticated READ endpoint may be injected in QA.
 // No endpoint, service-role key, account selector or token is constructed here.
 useEffect(()=>{
  if(feature!=='boss'||!worldBossAccountId||!worldBossReadCurrent){
   setLoadedBoss(null);setBossReadState('idle');return;
  }
  let alive=true;
  setBossReadState('loading');setLoadedBoss(null);
  // A slow response from another account/route must never overwrite this view.
  Promise.resolve().then(()=>worldBossReadCurrent()).then(raw=>{
   if(!alive)return;
   setLoadedBoss(raw==null?null:{accountId:worldBossAccountId,raw});
   setBossReadState(raw==null?'empty':'ready');
   setStatusNowMs(Date.now());
  }).catch(()=>{
   if(!alive)return;
   setLoadedBoss(null);setBossReadState('error');
  });
  const refreshTimer=setInterval(()=>setBossRetry(v=>v+1),60000);
  return ()=>{alive=false;clearInterval(refreshTimer)};
 },[feature,worldBossAccountId,worldBossReadCurrent,bossRetry]);
 // Developer-only bridge for a future approved authenticated V39 GET route.
 // It cannot issue any votes, donations, fights or claims. No endpoint is
 // instantiated here; account identity is supplied by the trusted host.
 const [partyRetry,setPartyRetry]=useState(0);
 const [loadedParty,setLoadedParty]=useState<{accountId:string;raw:unknown}|null>(null);
 const [partyReadState,setPartyReadState]=useState<'idle'|'loading'|'ready'|'empty'|'error'>('idle');
 useEffect(()=>{
  if(feature!=='party'||!partyEventAccountId||!partyEventReadCurrent){
   setLoadedParty(null);setPartyReadState('idle');return;
  }
  let alive=true;
  setLoadedParty(null);setPartyReadState('loading');
  Promise.resolve().then(()=>partyEventReadCurrent()).then(raw=>{
   if(!alive)return;
   const result=decodePartyEventReadTransportV39(raw,Date.now());
   if(result.kind==='invalid'){
    setLoadedParty(null);setPartyReadState('error');return;
   }
   setLoadedParty(result.kind==='ready'?{accountId:partyEventAccountId,raw:(raw as {event:unknown}).event}:null);
   setPartyReadState(result.kind==='ready'?'ready':'empty');
   setStatusNowMs(Date.now());
  }).catch(()=>{
   if(!alive)return;
   setLoadedParty(null);setPartyReadState('error');
  });
  const refreshTimer=setInterval(()=>setPartyRetry(v=>v+1),60000);
  return ()=>{alive=false;clearInterval(refreshTimer)};
 },[feature,partyEventAccountId,partyEventReadCurrent,partyRetry]);
 const partyProviderReady=feature==='party'&&Boolean(partyEventAccountId)&&Boolean(partyEventReadCurrent);
 const displayPartyStatus=partyProviderReady?
  (loadedParty?.accountId===partyEventAccountId?loadedParty.raw:null):partyEventStatus;
 useEffect(()=>{
  if(feature!=='party'||!partyProviderReady||displayPartyStatus==null)return;
  setStatusNowMs(Date.now());
  const leaseTimer=setInterval(()=>setStatusNowMs(Date.now()),15000);
  return ()=>clearInterval(leaseTimer);
 },[feature,partyProviderReady,displayPartyStatus]);
 const bossProviderReady=feature==='boss'&&Boolean(worldBossAccountId)&&Boolean(worldBossReadCurrent);
 const displayBossStatus=bossProviderReady?
  (loadedBoss?.accountId===worldBossAccountId?loadedBoss.raw:null):worldBossStatus;
 useEffect(()=>{
  if(feature!=='boss'||!worldBossAccountId||displayBossStatus==null)return;
  setStatusNowMs(Date.now());
  const leaseTimer=setInterval(()=>setStatusNowMs(Date.now()),15000);
  return ()=>clearInterval(leaseTimer);
 },[feature,worldBossAccountId,displayBossStatus]);
 const [storyId,setStoryId]=useState<(typeof stories)[number]['id']>('caravan');
 // With a valid owner-scoped event, open the enrolled story rather than
 // defaulting to Caravan or mistaking a preview codex selection for progress.
 useEffect(()=>{
  if(feature!=='party'||!partyProviderReady)return;
  const enrolled=decodePartyEventReadOnlySnapshot(displayPartyStatus,Date.now());
  if(enrolled)setStoryId(enrolled.family);
 },[feature,partyProviderReady,displayPartyStatus]);

 const C=useGameTheme(),{width,fontScale}=useWindowDimensions();
 const compact=width<360||fontScale>=1.25;
 const s=useMemo(()=>makeStyles(C,compact),[C,compact]);
 const title=meta[feature];
 const selectedStory=stories.find(item=>item.id===storyId)??stories[0];
 // A future authenticated host may inject the private V41 result. No RPC
 // is mounted here and no account selector is accepted from player input.
 const bossStatus=feature==='boss'&&worldBossAccountId?
  decodeWorldBossReadOnlyStatusV46(displayBossStatus,worldBossAccountId,statusNowMs):null;
 // One realm-wide event: boss identity comes from the validated server status.
 // There is no client-selected boss, and an absent status uses neutral art.
 const cycleBoss=bosses.find(entry=>entry.serverId===bossStatus?.bossId)??unverifiedBoss;
 const accent=feature==='boss'?cycleBoss.color:feature==='party'?selectedStory.accent:title.accent;
 const heroSceneId=feature==='boss'?cycleBoss.scene:feature==='party'?selectedStory.scene:null;
 const heroTitle=feature==='boss'&&bossStatus?cycleBoss.name:title.title;
 const heroSubtitle=feature==='boss'&&bossStatus?cycleBoss.region+' · One realm-wide encounter':title.subtitle;
 const guideTopics=feature==='boss'?[
  ['Rotation','One global World Boss every 14 days. '+bosses.map(entry=>entry.name).join(' → ')+'. The game selects the boss for everyone; no manual switching.'],
  ['War Camp','Prepare during the five-day Monday–Friday window. Each account can donate at most twice.'],
  ['Battle','The boss is available for the full Saturday–Sunday battle window. Three attacks are shared across your account, not granted per character.'],
  ['Squad','Your eligible owned characters fight together in one account attempt. Extra characters do not grant extra attacks or payouts.'],
  ['Rewards','Contribution and claims will be validated on the server before World Sigils enter your wallet.'],
 ]:feature==='party'?[
  ['Your Party','Adventures use a real Party of two to four members, with any legitimate combination of roles.'],
  ['Seven-day adventure','The story has three stages, with route voting, preparation and a finale. Settlement occurs on Day 8.'],
  ['Chat','Party chat stays within reach throughout the adventure, unlike the global chat bar.'],
  ['Rewards','Only server-verified contributions and completed claims can earn rewards.'],
 ]:[
  ['Browse','Search for exact items, inspect eligibility, compare listings and review verified sale history.'],
  ['Sell','The eventual quote will validate minimum lots, price limits, ownership and trade protection.'],
  ['Fees','A 5% seller fee is deducted from a successful sale; the preview calculator uses example inputs only.'],
  ['Safety','Purchases, equipment custody and return claims are unavailable until the authenticated trading service is released.'],
 ];
 return <View style={s.root}>
   <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={s.page} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to Account" onPress={onClose} style={s.smallButton}><UiIcon name="back" size={17}/><Text style={s.smallButtonText}>Back</Text></Pressable>
      <View style={s.headerRight}><Text style={s.privateLabel}>DESIGN QA</Text><Pressable accessibilityRole="button" accessibilityLabel={title.title+' guide'} onPress={()=>{setGuideIndex(0);setGuide(true)}} style={s.help}><Text style={s.helpText}>?</Text></Pressable></View>
    </View>
    <ImageBackground source={heroSceneId?regionScenes[heroSceneId]:marketArtwork} resizeMode="cover" imageStyle={s.heroImage} style={[s.hero,{borderColor:accent}]}>
      <View style={s.heroShade}/>
      <View style={s.heroCopy}>
        <Text style={[s.eyebrow,{color:accent}]}>{title.eyebrow}</Text>
        <Text accessibilityRole="header" style={s.heroTitle}>{heroTitle}</Text>
        <Text style={s.heroSub}>{heroSubtitle}</Text>
      </View>
    </ImageBackground>
    <View style={s.qaNote}><Text style={[s.qaSymbol,{color:accent}]}>◇</Text><Text style={s.qaText}>Developer-only UI preview. All example data is illustrative. No game resources, attempts, votes, listings or rewards are changed.</Text></View>
    {feature==='boss'&&bossProviderReady?<View style={s.warning} accessibilityLiveRegion="polite">
      <Text style={s.warningTitle}>{bossReadState==='loading'?'Reading the realm event…':bossReadState==='error'?'World Boss read failed':bossReadState==='empty'?'No announced boss in this cycle':bossReadState==='ready'&&!bossStatus?'World Boss status expired or rejected':'Private account status · Read only'}</Text>
      <Text style={s.bodyText}>{bossReadState==='loading'?'Checking the server-owned current cycle and this account.':bossReadState==='error'?'No previous data is displayed. You can try the authenticated read again.':bossReadState==='empty'?'The server has not supplied an event row for the current cycle.':'No raid, donation, claim or reward permission is available from this QA screen.'}</Text>
      {bossReadState!=='loading'?<Action label="Refresh read-only status" s={s} secondary onPress={()=>setBossRetry(v=>v+1)}/>:null}
     </View>:null}
    {feature==='party'&&partyProviderReady?<View style={s.warning} accessibilityLiveRegion="polite">
      <Text style={s.warningTitle}>{partyReadState==='loading'?'Reading the Party Event…':partyReadState==='error'?'Party Event read failed':partyReadState==='empty'?'No enrolled Party Event':partyReadState==='ready'&&!decodePartyEventReadOnlySnapshot(displayPartyStatus,statusNowMs)?'Party Event status expired or rejected':'Private Party Event · Read only'}</Text>
      <Text style={s.bodyText}>{partyReadState==='loading'?'Verifying this account’s current adventure.':partyReadState==='error'?'The response was unavailable or invalid; previous progress has been cleared.':partyReadState==='empty'?'There is no verified adventure for this account.':'This preview cannot contribute, vote, fight or claim rewards.'}</Text>
      {partyReadState!=='loading'?<Action label="Refresh read-only Party Event" s={s} secondary onPress={()=>setPartyRetry(v=>v+1)}/>:null}
     </View>:null}
    <ScrollView horizontal showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs} accessibilityRole="tablist">
      {tabs.map(item=><Pressable key={item.id} accessibilityRole="tab" accessibilityState={{selected:activeTab===item.id}} onPress={()=>changeTab(item.id)} style={[s.tab,activeTab===item.id&&{backgroundColor:C.panelRaised,borderColor:accent}]}><Text style={[s.tabText,activeTab===item.id&&{color:C.text}]}>{item.label}</Text></Pressable>)}
    </ScrollView>
    {feature==='boss'?<Action label="Watch a recorded World Boss fight" s={s} onPress={()=>setFightPreview(true)}/>:null}
    {feature==='boss'&&fightPreview?<WorldBossBattleStage input={WORLD_BOSS_REPLAY_FIXTURE} language="en" reduceMotion={reduceMotion} onClose={()=>setFightPreview(false)}/>:null}
    {feature==='boss'?<BossContents s={s} C={C} accent={accent} tab={activeTab} onTab={changeTab} status={bossStatus} reduceMotion={reduceMotion}/>:null}
    {feature==='party'?<PartyPreviewPanel s={s} C={C} accent={accent} tab={activeTab} onTab={changeTab} storyId={storyId} onStoryChange={setStoryId} onOpenParty={onOpenParty} partyEventStatus={displayPartyStatus} partyEventRewardStatus={partyEventRewardStatus} trustedAccountId={partyEventAccountId} nowMs={statusNowMs}/>:null}
    {feature==='market'?<MarketContents s={s} C={C} accent={accent} tab={activeTab}/>:null}
    <View style={s.footer}><Text style={s.footerText}>VELDRYN  •  FEATURE DESIGN REVIEW</Text></View>
   </ScrollView>
   {feature==='party'?<PartyPreviewDock s={s} accent={accent} partyUnread={partyUnread} onOpenParty={onOpenParty} onOpenPartyChat={onOpenPartyChat}/>:null}
   <Modal transparent animationType={reduceMotion?'none':'fade'} visible={guide} onRequestClose={()=>setGuide(false)}>
     <View style={s.modalShade} onAccessibilityEscape={()=>setGuide(false)}><Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Close guide" onPress={()=>setGuide(false)}/><View style={s.modal}>
       <View style={s.modalHeading}><View style={s.flex}><Text style={[s.eyebrow,{color:accent}]}>FIELD GUIDE</Text><Text accessibilityRole="header" style={s.cardTitle}>{title.title}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Close guide" onPress={()=>setGuide(false)} style={s.help}><Text style={s.helpText}>×</Text></Pressable></View>
       <View style={s.resultCount}><Text accessibilityLiveRegion="polite" style={s.finePrint}>Step {guideIndex+1} of {guideTopics.length}</Text><Text style={s.finePrint}>Tap Next to learn more</Text></View>
       <Progress s={s} value={(guideIndex+1)/guideTopics.length*100} accent={accent}/>
       <ScrollView style={s.guideScroll} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
         <View style={s.guideTopic}>
           <Text accessibilityRole="header" style={s.guideHeading}>{guideTopics[guideIndex]?.[0]??'Guide'}</Text>
           <Text style={s.bodyText}>{guideTopics[guideIndex]?.[1]??''}</Text>
         </View>
       </ScrollView>
       <View style={s.modalActions}>
        <View style={s.modalActionSlot}><Action label="Previous" secondary disabled={guideIndex===0} onPress={()=>setGuideIndex(i=>Math.max(0,i-1))} s={s}/></View>
        <View style={s.modalActionSlot}><Action label={guideIndex===guideTopics.length-1?'Got it':'Next'} onPress={()=>{if(guideIndex>=guideTopics.length-1)setGuide(false);else setGuideIndex(i=>i+1)}} s={s}/></View>
       </View>
     </View></View>
   </Modal>
 </View>;
}

type Shared={s:ReturnType<typeof makeStyles>;C:ThemeColors;accent:string};
function Card({s,children}:{s:Shared['s'];children:ReactNode}){return <View style={s.card}>{children}</View>;}
function SectionHeading({s,kicker,title,sub}:{s:Shared['s'];kicker:string;title:string;sub?:string}){return <View style={s.sectionHead}><Text style={s.kicker}>{kicker}</Text><Text accessibilityRole="header" style={s.cardTitle}>{title}</Text>{sub?<Text style={s.bodyText}>{sub}</Text>:null}</View>;}
function Action({label,onPress,s,disabled=false,secondary=false}:{label:string;onPress?:()=>void;s:Shared['s'];disabled?:boolean;secondary?:boolean}){
 return <Pressable accessibilityRole="button" accessibilityState={{disabled:disabled||!onPress}} disabled={disabled||!onPress} onPress={onPress} style={[s.action,secondary&&s.secondaryAction,(disabled||!onPress)&&s.disabledAction]}>
  <Text style={[s.actionText,secondary&&s.secondaryActionText,(disabled||!onPress)&&s.disabledText]}>{label}</Text>
 </Pressable>;
}
function Stat({s,label,value,hint}:{s:Shared['s'];label:string;value:string;hint?:string}){return <View style={s.stat}><Text style={s.statLabel}>{label}</Text><Text style={s.statValue}>{value}</Text>{hint?<Text style={s.statHint}>{hint}</Text>:null}</View>;}
function Progress({s,value,accent,label='Progress'}:{s:Shared['s'];value:number;accent:string;label?:string}){
 const percent=Math.round(Math.max(0,Math.min(100,Number.isFinite(value)?value:0)));
 return <View style={s.track} accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{min:0,max:100,now:percent}}>
  <View style={[s.progress,{width:(percent+'%') as import('react-native').DimensionValue,backgroundColor:accent}]}/>
 </View>;
}
function Tag({s,label,accent}:{s:Shared['s'];label:string;accent?:string}){return <View style={[s.tag,accent&&{borderColor:accent}]}><Text style={[s.tagText,accent&&{color:accent}]}>{label}</Text></View>;}

const bosses=[
 {id:'hollow',serverId:'hollowroot',...WORLD_BOSS_PRESENTATION.hollowroot,scene:'IRONWOOD',color:'#A4C387',
  supplies:['Cut timber for root barricades','Gather iron for reinforced shields','Prepare recovery supplies for the line'],
  mechanics:['Watch for the sweeping root warning','Protect allies through the heavy slam','Strike when the ancient exposes its heart'],
  threat:'Roots control the battlefield; watch the warning before committing damage.'},
 {id:'sunscar',serverId:'sunscar',...WORLD_BOSS_PRESENTATION.sunscar,scene:'SUNSCAR',color:'#E2AE73',
  supplies:['Stockpile ore for heatproof armor','Bring timber for shaded war shelters','Prepare cooling supplies for the camp'],
  mechanics:['Read the blazing ground markers','Guard against the titan’s heated strike','Exploit the cooling window between casts'],
  threat:'Heat builds between strikes; timing your defenses matters.'},
 {id:'frost',serverId:'frostmarch',...WORLD_BOSS_PRESENTATION.frostmarch,scene:'FROSTMARCH',color:'#98C8E9',
  supplies:['Reinforce the camp against the blizzard','Gather timber for warming fires','Prepare frost recovery provisions'],
  mechanics:['Identify the coming whiteout cast','Protect the squad through the freezing wave','Counterattack as the storm recedes'],
  threat:'Visibility and freezing attacks test the whole account squad.'},
] as const;
/** Neutral scene until the authoritative event identifies the cycle's boss. */
const unverifiedBoss={
 name:'World Boss',region:'Realm',scene:'KINGS_ROAD',
 motif:'ONE GLOBAL BOSS PER CYCLE',color:'#E8B66B',
 supplies:['Prepare the War Camp when an event is announced','Gather resources for the server-published donation recipes','Coordinate the realm-wide preparation effort'],
 mechanics:['Read the boss warning before committing damage','Use each owned character’s verified abilities','Counter the active boss mechanics once announced'],
 threat:'The event service has not announced a verified regional boss for this cycle.',
} as const;
const phaseTitles={upcoming:'Upcoming',preparation:'War Camp',raid:'Battle',cooldown:'Recovery',expired:'Ended'} as const;
const bossTracks=['fortifications','fieldProvisions','siegecraft'] as const;
function BossContents({s,accent,tab,onTab,status,reduceMotion}:Shared&{tab:string;onTab:(value:string)=>void;status:WorldBossScreenSnapshotV46|null;reduceMotion:boolean}){
 const boss=bosses.find(item=>item.serverId===status?.bossId)??unverifiedBoss;
 const active=status;
 const phaseEnd=active?(active.phase==='upcoming'?active.startsAtUtcMs:active.phase==='preparation'?active.startsAtUtcMs+5*86400000:active.phase==='raid'?active.endsAtUtcMs:active.phase==='cooldown'?active.startsAtUtcMs+14*86400000:null):null;
 const phaseNext=active?(active.phase==='upcoming'?'Preparation opens':active.phase==='preparation'?'Weekend battle opens':active.phase==='raid'?'Battle closes':active.phase==='cooldown'?'Cycle completes':'Event ended'):null;
 const phaseDate=phaseEnd==null?null:new Date(phaseEnd).toISOString().slice(0,16).replace('T',' ')+' UTC';
 const phaseBrief=active?.phase==='upcoming'?
  {title:'The next War Camp is approaching',text:'The event has not begun. Preparation starts at the verified event opening.',target:'camp',action:'Preview preparation'}:
  active?.phase==='preparation'?
  {title:'War Camp is the current event phase',text:'The realm can prepare for this boss. Actual resource donations require the authenticated game service.',target:'camp',action:'Review War Camp'}:
  active?.phase==='raid'?
  {title:'Weekend battle phase',text:'The shared 48-hour battle window is underway in this private event snapshot. Attempts and damage remain disabled in QA.',target:'battle',action:'Review battle mechanics'}:
  active?.phase==='cooldown'?
  {title:'Recovery and results',text:'The battle window has ended. Reward claims and official placements need authenticated settlement.',target:'rewards',action:'Review rewards'}:
  {title:'Awaiting the next realm event',text:'A future cycle must be announced by the server before a new World Boss can be shown.',target:'overview',action:'View cycle rules'};
 if(tab==='overview')return <>
  <Card s={s}><SectionHeading s={s} kicker="14-DAY REALM CYCLE" title="Prepare together. Fight on the weekend." sub="Five days of War Camp preparation, one continuous 48-hour battle, then seven days of recovery."/>
   <View style={s.statRow}><Stat s={s} label="PREPARATION" value="Mon–Fri"/><Stat s={s} label="BATTLE" value="Sat–Sun"/><Stat s={s} label="ATTEMPTS" value="3 / account"/></View>
   <View style={s.stepRow}><Tag s={s} label="01 War Camp" accent={active?.phase==='preparation'?accent:undefined}/><Tag s={s} label="02 Battle" accent={active?.phase==='raid'?accent:undefined}/><Tag s={s} label="03 Recovery" accent={active?.phase==='cooldown'?accent:undefined}/></View>
   <Text style={s.finePrint}>One boss for the whole realm per cycle. Rotation: {bosses.map(entry=>entry.name).join(' → ')} → repeat. Players cannot choose another boss.</Text>
  </Card>
  {active?<Card s={s}><SectionHeading s={s} kicker="PRIVATE READ-ONLY SNAPSHOT" title={boss.name+' · '+phaseTitles[active.phase]} sub="This validated-format snapshot is for QA only. It does not enable gameplay or verify that the event is released."/>
   <View style={s.detailRow}><Tag s={s} label={active.status.toUpperCase()+' · '+phaseTitles[active.phase]} accent={accent}/><Text style={s.finePrint}>Read {new Date(active.readAtUtcMs).toISOString().slice(0,16).replace('T',' ')} UTC</Text></View>
   <View style={s.statRow}><Stat s={s} label="BOSS HP REMAINING" value={active.remainingHp.toLocaleString('en-US')+' / '+active.maxHp.toLocaleString('en-US')}/><Stat s={s} label="ATTEMPTS LEFT" value={String(active.attemptsRemaining)+' / 3'}/><Stat s={s} label="DONATIONS LEFT" value={String(active.donationsRemaining)+' / 2'}/></View>
   <Progress s={s} value={active.remainingHp/active.maxHp*100} accent={accent} label="Verified-format boss health remaining"/>
   {phaseDate?<View style={s.nextStep}><Text style={s.detailLabel}>NEXT CALENDAR BOUNDARY</Text><Text style={s.choiceTitle}>{phaseNext} · {phaseDate}</Text></View>:<Text style={s.finePrint}>This event's cycle has ended; a new event requires another verified snapshot.</Text>}
   <Text style={s.finePrint}>Snapshot expires after two minutes. Combat, spending and rewards remain unavailable in Design QA.</Text>
  </Card>:<Card s={s}><SectionHeading s={s} kicker="ACCOUNT STATUS" title="No verified World Boss loaded" sub="The event service is not connected. No real boss HP, event date, donation count, attempts or rewards can be shown."/>
   <View style={s.empty}><UiIcon name="world" size={30}/><Text style={s.choiceTitle}>Encounter preview only</Text><Text style={s.bodyText}>The current boss and next event date are unknown until the server announces the global cycle. No boss can be manually selected.</Text></View>
  </Card>}
  <Card s={s}><SectionHeading s={s} kicker="WHAT HAPPENS NEXT" title={phaseBrief.title} sub={phaseBrief.text}/>
   {phaseBrief.target!=='overview'?<Action label={phaseBrief.action} s={s} secondary onPress={()=>onTab(phaseBrief.target)}/>:null}
   <Text style={s.finePrint}>Guidance only · This developer preview cannot open an actual event, spend resources, reserve attacks or claim rewards.</Text>
  </Card>
  <Card s={s}><SectionHeading s={s} kicker={'ENCOUNTER BRIEFING · '+boss.region.toUpperCase()} title={active?boss.name:'Boss details pending'} sub={boss.motif}/>
   <Text style={s.bodyText}>{boss.threat}</Text>
   <View style={s.twoActions}><View style={s.flex}><Action label="Inspect War Camp" s={s} onPress={()=>onTab('camp')} secondary/></View><View style={s.flex}><Action label="Battle briefing" s={s} onPress={()=>onTab('battle')}/></View></View>
  </Card>
 </>;
 if(tab==='camp')return <>
  <Card s={s}><SectionHeading s={s} kicker={'WAR CAMP · '+boss.region.toUpperCase()} title={'Prepare for '+boss.name} sub="Account-wide donations require verified active-character inventory and a server transaction. The camp closes before battle."/>
   <View style={s.statRow}><Stat s={s} label="DONATION LIMIT" value={active?active.donationsRemaining+' / 2 left':'2 per event'}/><Stat s={s} label="FREEZE" value="Sat 00:00 UTC"/><Stat s={s} label="TRACKS" value="3 communal"/></View>
   {active?<><Text style={s.detailLabel}>PRIVATE VERIFIED-FORMAT SUPPLY TOTALS · READ ONLY</Text>
    {bossTracks.map(track=>{
     const count=active.warCamp.contributions[track],goal=active.warCamp.goals[track];
     const level=active.warCamp.frozen?(active.warCamp.levels?.[track]??0):(count>=goal.tier2At?2:count>=goal.tier1At?1:0);
     const label=track==='fieldProvisions'?'Field Provisions':track==='fortifications'?'Fortifications':'Siegecraft';
     return <View key={track} style={s.campTrack}>
      <View style={s.detailRow}><Text style={s.choiceTitle}>{label}</Text><Tag s={s} label={(active.warCamp.frozen?'Frozen':'Projected')+' tier '+level+' / 2'} accent={level>0?accent:undefined}/></View>
      <View style={s.detailRow}><Text style={s.finePrint}>Tier 1 · {goal.tier1At.toLocaleString('en-US')}     Tier 2 · {goal.tier2At.toLocaleString('en-US')}</Text><Text style={s.choiceSub}>{count.toLocaleString('en-US')} / {goal.tier2At.toLocaleString('en-US')}</Text></View>
      <Progress s={s} value={count/goal.tier2At*100} accent={boss.color} label={label+' War Camp progress'}/>
     </View>;
    })}
    <Text style={s.finePrint}>{active.warCamp.frozen?'Saturday bonuses are frozen in this record.':'Projected tiers can change until Saturday freeze.'} {active.donationsRemaining} account donations remaining; this QA screen cannot consume resources.</Text>
   </>:<View style={s.empty}><UiIcon name="world" size={30}/><Text style={s.choiceTitle}>No verified War Camp progress</Text><Text style={s.bodyText}>No current donation total is available in this preview. Progress bars appear only with a valid private status.</Text></View>}
  </Card>
  <Card s={s}><SectionHeading s={s} kicker="ILLUSTRATIVE PREPARATION TASKS" title="Support the war effort" sub="Scouting notes, not real recipes or checked inventory quantities."/>
   {boss.supplies.map((name,i)=><View key={name} style={s.detailRow}><Text style={s.index}>{'0'+(i+1)}</Text><View style={s.flex}><Text style={s.choiceTitle}>{name}</Text><Text style={s.choiceSub}>Material cost and eligibility unavailable</Text></View><Tag s={s} label="Locked"/></View>)}
   <Action label="Donate supplies · Awaiting server" s={s} disabled/>
  </Card>
 </>;
 if(tab==='battle')return <>
  <Card s={s}><SectionHeading s={s} kicker="CONTINUOUS WEEKEND BATTLE" title={'Face '+boss.name} sub="Your eligible owned characters fight as one account squad. More characters never grant extra attempts or separate payouts."/>
   <View style={s.statRow}><Stat s={s} label="ATTEMPTS LEFT" value={active?active.attemptsRemaining+' / 3':'Not verified'}/><Stat s={s} label="COMBAT" value="14 rounds"/><Stat s={s} label="WINDOW" value={active?phaseTitles[active.phase]:'Sat–Sun'}/></View>
   {active&&phaseDate?<View style={s.nextStep}><Text style={s.detailLabel}>{phaseNext?.toUpperCase()}</Text><Text style={s.choiceTitle}>{phaseDate}</Text></View>:null}
   <View style={s.warning}><Text style={s.warningTitle}>Battle not connected</Text><Text style={s.bodyText}>The server must reserve one shared attempt, verify your roster, record the 14 rounds and settle global boss HP exactly once. This preview cannot start a fight.</Text></View>
   <Action label="Begin account raid · Not available" s={s} disabled/>
  </Card>
  <Card s={s}><SectionHeading s={s} kicker="ACCOUNT RAID ROSTER" title="Bring your owned heroes" sub="One to five eligible characters can enter together. This screen never invents fighter slots or equipment."/>
   <View style={s.empty}><UiIcon name="character" size={30}/><Text style={s.choiceTitle}>Squad not verified</Text><Text style={s.bodyText}>Character eligibility, roles, equipment and combat power must come from the authenticated game state.</Text></View>
  </Card>
  <Card s={s}><SectionHeading s={s} kicker="ENCOUNTER MECHANICS" title="Read the warning. Make the counterplay."/>
   <Text style={s.bodyText}>{boss.threat} Encounter descriptions are illustrative; the battle engine remains disconnected.</Text>
   {boss.mechanics.map((label,i)=><View key={label} style={s.timelineRow}><View style={[s.timelineDot,{borderColor:boss.color}]}><Text style={[s.timelineNumber,{color:boss.color}]}>{i+1}</Text></View><Text style={[s.choiceTitle,s.flex]}>{label}</Text></View>)}
  </Card>
 </>;
 if(tab==='rewards')return <>
  <Card s={s}><SectionHeading s={s} kicker="ACCOUNT-WIDE REWARDS" title="World Sigils" sub="Battles, War Camp contributions and milestones use server-verified receipts. Extra characters do not multiply rewards."/>
   <View style={s.rewardPanel}><UiIcon name="rewards" size={28}/><View style={s.flex}><Text style={s.choiceTitle}>World Sigils</Text><Text style={s.choiceSub}>Future account-wide boss reward currency · shop not released</Text></View></View>
   <View style={s.detailRow}><Text style={s.choiceSub}>Already claimed this event</Text><Text style={s.choiceTitle}>{active?active.rewards.claimedThisEvent.toLocaleString('en-US')+' Sigils':'No verified record'}</Text></View>
   <View style={s.detailRow}><Text style={s.choiceSub}>Current spendable wallet</Text><Text style={s.choiceTitle}>{active?active.rewards.balance.toLocaleString('en-US')+' Sigils':'No verified record'}</Text></View>
   <Text style={s.finePrint}>A claimed-event total is not an unclaimed reward balance. Pending eligibility and claimable amounts are not exposed by this private snapshot.</Text>
   <Action label="Claim rewards · Not available" s={s} disabled/>
  </Card>
  <Card s={s}>
   <SectionHeading s={s} kicker="FUTURE WORLD BOSS CHESTS" title="Up to six chests per account" sub="Design preview only. Three milestones and up to three personal damage chests."/>
   {bossChestDesign.map(chest=><View key={chest.name} style={s.detailRow}>
    <View style={s.flex}>
     <Text style={s.choiceTitle}>{chest.name}</Text>
     <Text style={s.choiceSub}>{chest.condition}</Text>
     <Text style={s.finePrint}>{chest.guaranteed} · 10% gathering gear chance</Text>
    </View>
    <Tag s={s} label="PREVIEW"/>
   </View>)}
   <View style={s.rewardPanel}>
    <UiIcon name="rewards" size={24}/>
    <View style={s.flex}>
     <Text style={s.choiceTitle}>{active?bossGatheringSetLabel[active.bossId]:'Boss-specific gathering set'}</Text>
     <Text style={s.choiceSub}>10 chest-exclusive pieces · randomized rarity, quality and skill-specific rolls</Text>
    </View>
   </View>
   <Text style={s.finePrint}>Personal damage: 10% chance per server-configured damage threshold, up to 3 extra chests. Each earned chest independently has a 10% gear chance. No authenticated entitlement or opening is available in this design QA screen.</Text>
   <Text style={s.finePrint}>Personal Damage Chest · 450 Gold · 6 Essence · 2 Gem Dust · 2 Tempering Dust · 8 boss-specific materials</Text>
   <Action label="Open chest · Not available" s={s} disabled/>
   <WorldBossChestOpeningPreview reduceMotion={reduceMotion}/>
  </Card>
 </>;
 return <Card s={s}><SectionHeading s={s} kicker="CONTRIBUTION BOARD" title="Realm rankings" sub="Official ranks must come from finalized server-verified account contributions, with a consistent power bracket and privacy checks."/><View style={s.empty}><UiIcon name="world" size={34}/><Text style={s.choiceTitle}>No authenticated ranking feed yet</Text><Text style={s.bodyText}>Personal contribution, final placements and account-wide rewards cannot be inferred from a boss health snapshot.</Text></View><Action label="Review battle rules" s={s} secondary onPress={()=>onTab('battle')}/></Card>;
}

const stories=[
 {id:'caravan',name:'Broken Caravan',scene:'KINGS_ROAD',accent:'#D8B17C',summary:'Survey the crossing, defend the wagons and rebuild the convoy.',approach:['Safe Pass','Fast Pass'],finale:['Brace Wagons','Disrupt Raiders'],stages:['Survey the crossing and inspect broken bridge supports.','Defend the wagons against the raider charge.','Repair axles and prepare the convoy defense.'],supplies:['Timber to brace damaged wagons','Ore to repair broken axles','Herbs for the convoy medics'],finaleThreat:'A raider charge threatens the wagons and their escort integrity.'},
 {id:'hunt',name:'Nightfall Hunt',scene:'IRONWOOD',accent:'#A7B3DF',summary:'Follow the tracks, flush out the pack and prepare the final trap.',approach:['Clear Trail','Shadow Trail'],finale:['Hold Ground','Hunt the Alpha'],stages:['Read tracks and study signs in the moonlit woods.','Flush the pack and interrupt its warning howls.','Mix scent decoys and prepare the alpha encounter.'],supplies:['Timber for concealment and traps','Ore for sturdy snares','Herbs to mask the party scent'],finaleThreat:'The alpha pack uses concealment and warning howls before its attack.'},
 {id:'wards',name:'Broken Wards',scene:'SILVERBROOK',accent:'#B6A6E0',summary:'Trace unstable runes and restore the circle before it collapses.',approach:['Ground Spires','Charge Sigils'],finale:['Protect Wards','Overload Wards'],stages:['Trace rune fractures and broken magic circuits.','Stabilize the crackling spires before they rupture.','Align the runestones and rehearse the final defense.'],supplies:['Timber to support unstable spires','Ore to anchor wardstones','Herbs to stabilize the ward circle'],finaleThreat:'Arcane surges strain the ward barrier; keep the circle stable.'},
 {id:'reliquary',name:'Lost Reliquary',scene:'OLD_MINES',accent:'#9FD4CC',summary:'Read the mirrored glyphs and choose what happens to the seal.',approach:['Quiet Passage','Deep Passage'],finale:['Preserve Seals','Break Seals'],stages:['Translate mirrored glyphs in the forgotten archive.','Cross the mirror hall as the vault awakens.','Restore the final seal and prepare the choice ahead.'],supplies:['Timber to reinforce the passage','Ore for mirror-shield fittings','Herbs for the corrupted vault air'],finaleThreat:'Reflections and pressure on the final seal shape the encounter.'},
] as const;
/** Authored from hidden Party Events v9. Informational only: server owns objectives. */
const partyStoryGuides={
 caravan:{
  actions:['Map the Wagon Route','Break the Ambush','Repair the Supply Train','Secure the Final Convoy'],
  preparations:[['Reinforced','Reinforced Wagon Frames','Defense +3%'],['Provisions','Repair Supplies','Max HP +3%'],['Specialist','Ambush Intelligence','Attack +2.5%']],
 },
 hunt:{
  actions:['Follow the Trail','Flush the Pack','Lay a Scent Decoy','Ready the Alpha Hunt'],
  preparations:[['Reinforced','Howl Shelters','Defense +2.5%'],['Provisions','Scent Poultices','Haste +1.5%'],['Specialist','Tracking Insight','Accuracy +4%']],
 },
 wards:{
  actions:['Read the Rune Fractures','Silence a Runestone','Ground a Failing Sigil','Ready the Ward Circle'],
  preparations:[['Reinforced','Grounded Runestone Plates','Defense +4%'],['Provisions','Arcane Recovery Salves','Healing +3%'],['Specialist','Rune Timing Charts','Haste +1.8%']],
 },
 reliquary:{
  actions:['Decipher the Vault Glyphs','Navigate the Mirror Hall','Stabilize the Inner Seal','Ready the Reliquary Entry'],
  preparations:[['Reinforced','Seal Insulation','Defense +2.5%'],['Provisions','Anti-Corruption Remedies','Healing +6%'],['Specialist','Translated Guardian Glyphs','Attack +3%']],
 },
} as const;
const partyActionStages=['Stage 1','Stage 2','Stage 2','Stage 3'] as const;
/** Only Party Events subscribes to live Party state; market and boss QA never rerender for Party updates. */
function PartyPreviewPanel({s,C,accent,tab,onTab,storyId,onStoryChange,onOpenParty,partyEventStatus,partyEventRewardStatus,trustedAccountId,nowMs}:Shared&{tab:string;onTab:(tab:string)=>void;storyId:(typeof stories)[number]['id'];onStoryChange:(id:(typeof stories)[number]['id'])=>void;onOpenParty:()=>void;partyEventStatus:unknown;partyEventRewardStatus:unknown;trustedAccountId:string;nowMs:number}){
 const social=usePartySocial();
 // App deliberately does not supply a live payload while the private service
 // and event migrations are unreleased. Malformed payloads fail closed.
 const status=useMemo(()=>decodePartyEventReadOnlySnapshot(partyEventStatus,nowMs),[partyEventStatus,nowMs]);
 const rewards=useMemo(()=>{
  // Both authoritatively authenticated event and reward snapshots must agree
  // about the owner, event week and enrolled family. No sample/cached fallback.
  if(!status||!trustedAccountId||!partyEventStatus||typeof partyEventStatus!=='object')return null;
  const starts=(partyEventStatus as {eventStartsAt?:unknown}).eventStartsAt;
  if(typeof starts!=='string')return null;
  const week=Date.parse(starts);
  const verified=decodePartyEventRewardReadOnlyV62(partyEventRewardStatus,trustedAccountId,week,nowMs);
  const families={caravan:'broken_caravan',hunt:'nightfall_hunt',wards:'broken_wards',reliquary:'lost_reliquary'} as const;
  return verified?.family===families[status.family]?verified:null;
 },[status,partyEventStatus,partyEventRewardStatus,trustedAccountId,nowMs]);
 return <PartyContents s={s} C={C} accent={accent} tab={tab} onTab={onTab} storyId={storyId} onStoryChange={onStoryChange}
  hasParty={Boolean(social.party?.id)} roster={social.party?.members.map(member=>({name:member.characterName,isLeader:member.isLeader}))??[]} onOpenParty={onOpenParty} status={status} rewards={rewards}/>;
}
function PartyPreviewDock({s,accent,partyUnread,onOpenParty,onOpenPartyChat}:{s:Shared['s'];accent:string;partyUnread:number;onOpenParty:()=>void;onOpenPartyChat:()=>void}){
 const social=usePartySocial();
 const partyConnected=Boolean(social.party?.id);
 return <Pressable accessibilityRole="button" accessibilityLabel={partyConnected?'Open Party Chat':'Open Party to find members'} onPress={partyConnected?onOpenPartyChat:onOpenParty} style={[s.partyDock,{borderTopColor:accent}]}>
   <View style={[s.dockGlyph,{borderColor:accent}]}><UiIcon name="chat" size={23}/></View>
   <View style={s.flex}><Text style={s.dockTitle}>Party Chat</Text><Text style={s.dockDescription}>{partyConnected?'Coordinate with your Party':'Join a Party to unlock chat'}</Text></View>
   {partyUnread>0&&partyConnected?<View style={s.unread}><Text style={s.unreadText}>{partyUnread>99?'99+':partyUnread}</Text></View>:null}
   <Text style={s.dockArrow}>›</Text>
 </Pressable>;
}
function PartyContents({s,C,accent,tab,onTab,storyId,onStoryChange,hasParty,roster,onOpenParty,status,rewards}:Shared&{tab:string;onTab:(tab:string)=>void;storyId:(typeof stories)[number]['id'];onStoryChange:(id:(typeof stories)[number]['id'])=>void;hasParty:boolean;roster:readonly {name:string;isLeader:boolean}[];onOpenParty:()=>void;status:PartyEventScreenSnapshot|null;rewards:PartyRewardMobileV62|null}){
 const [choice,setChoice]=useState<'secure'|'swift'|null>(null);
 const [finalChoice,setFinalChoice]=useState<'secure'|'swift'|null>(null);
 const [ballot,setBallot]=useState<'approach'|'finale'>('approach');
 const story=stories.find(e=>e.id===storyId)??stories[0];
 const storyGuide=partyStoryGuides[story.id];
 const storyStatus=status?.family===story.id?status:null;
 const rewardStatus=storyStatus&&rewards?rewards:null;
 const required=storyStatus?partyEventSupplyProgress(storyStatus,storyStatus.stage,'required'):null;
 if(tab==='adventure')return <>
  <Card s={s}><SectionHeading s={s} kicker="PRIVATE EVENT SNAPSHOT" title={status?'Enrolled adventure':'No verified event loaded'} sub={status?'Read-only event enrollment, separate from your current live Party. No combat or rewards are active.':'The Party roster below is real, but stages, votes and supplies require a separately authenticated event service.'}/>
   {status?<><View style={s.statRow}>
      <Stat s={s} label="FROZEN PARTY" value={status.rosterSize+' players'}/>
      <Stat s={s} label="EVENT STAGE" value={status.stage+' / 3'}/>
      <Stat s={s} label="STATUS" value={status.status.toUpperCase()}/>
    </View>
    <View style={s.detailRow}><View style={s.flex}><Text style={s.choiceTitle}>{stories.find(item=>item.id===status.family)?.name??'Party Event'}</Text><Text style={s.choiceSub}>{status.difficulty} · {status.completedActions.length} of 4 personal actions recorded</Text></View><Tag s={s} label="Read only" accent={accent}/></View>
    <Text style={s.finePrint}>This record does not authorize boss combat, supply donations, stage advances or claims.</Text>
   </>:<View style={s.empty}><UiIcon name="events" size={30}/><Text style={s.choiceTitle}>Event service not connected</Text><Text style={s.bodyText}>No real event points, stage deadlines, supply balances or locked ballots are displayed. The story content below is a design preview.</Text></View>}
  </Card>
  <Card s={s}><SectionHeading s={s} kicker="WEEK-LONG ADVENTURES" title="One journey, four possible stories" sub="Three evolving stages, team decisions and a finale. The event cycle is 21 days."/>
   <View style={s.statRow}><Stat s={s} label="PARTY SIZE" value="2–4"/><Stat s={s} label="STORY" value="7 days"/><Stat s={s} label="SETTLEMENT" value="Day 8"/></View>
   <View style={s.warning}><Text style={s.warningTitle}>{hasParty?'Your Party is connected':'No active Party'}</Text><Text style={s.bodyText}>{hasParty?roster.length+' current members. The weekly adventure prototype is not yet live.':'Create or join a Party to prepare for future events. Any valid Tank, Damage and Support role mix is allowed.'}</Text></View>
   {hasParty?<View style={s.rosterList} accessibilityLabel="Current Party members">
     <Text style={s.detailLabel}>YOUR PARTY · {roster.length} / 4</Text>
     {roster.map((member,index)=><View key={index} style={s.rosterMember}>
       <View style={[s.rosterAvatar,{borderColor:accent}]}><Text style={[s.rosterInitial,{color:accent}]}>{(member.name.trim().charAt(0)||'?').toUpperCase()}</Text></View>
       <Text numberOfLines={1} style={[s.choiceTitle,s.flex]}>{member.name}</Text>
       <Tag s={s} label={member.isLeader?'Leader':'Member'}/>
     </View>)}
     <Action label="Manage Party" s={s} secondary onPress={onOpenParty}/>
    </View>:null}
   {!hasParty?<Action label="Open Party" s={s} onPress={onOpenParty}/>:null}
  </Card>
  <Card s={s}><SectionHeading s={s} kicker="STORY SELECTION · PREVIEW" title="Explore the event families" sub="Every story has its own scouting, encounter and final preparation."/>
   {stories.map(storyOption=><Pressable key={storyOption.id} accessibilityRole="button" accessibilityState={{selected:story.id===storyOption.id}} onPress={()=>{onStoryChange(storyOption.id);setChoice(null);setFinalChoice(null);setBallot('approach')}} style={[s.choice,story.id===storyOption.id&&{borderColor:storyOption.accent,backgroundColor:C.panelRaised}]}>
    <View style={[s.motif,{borderColor:storyOption.accent}]}><UiIcon name="events" size={28}/></View><View style={s.flex}><Text style={s.choiceTitle}>{storyOption.name}</Text><Text style={s.choiceSub}>{storyOption.summary}</Text></View>
   </Pressable>)}
   <Action label="Inspect the story stages" s={s} onPress={()=>onTab('stages')}/>
  </Card>
 </>;
 if(tab==='stages')return <>
  <Card s={s}><SectionHeading s={s} kicker={'STORY · '+story.name.toUpperCase()} title="Three stages, one finale" sub={story.summary}/>
   {[
    ['01','Scout',story.stages[0]],
    ['02','Confront',story.stages[1]],
    ['03','Prepare',story.stages[2]],
   ].map(([index,title,description])=><View key={index} style={s.storyStage}><Text style={[s.storyNumber,{color:story.accent}]}>{index}</Text><View style={s.flex}><Text style={s.choiceTitle}>{title}</Text><Text style={s.bodyText}>{description}</Text></View></View>)}
   <Action label="Inspect supply preparation" s={s} onPress={()=>onTab('supplies')}/>
  </Card>
  <Card s={s}><SectionHeading s={s} kicker="PERSONAL ACTIONS · STORY PREVIEW" title="Four ways to help" sub="Every member can contribute through approved combat or noncombat evidence. These four objective slots do not require a specific class."/>
   {storyGuide.actions.map((action,i)=><View key={action} style={s.detailRow}>
    <Text style={[s.index,{color:accent}]}>{'0'+(i+1)}</Text>
    <View style={s.flex}><Text style={s.choiceTitle}>{action}</Text><Text style={s.choiceSub}>{partyActionStages[i]} · {storyStatus?.completedActions.includes((['scout_route','secure_approach','support_expedition','prepare_finale'] as const)[i]!)?'Recorded in private snapshot':'Not confirmed in this preview'}</Text></View>
    <Tag s={s} label={storyStatus?.completedActions.includes((['scout_route','secure_approach','support_expedition','prepare_finale'] as const)[i]!)?'Recorded':'Preview'}/>
   </View>)}
   <Text style={s.finePrint}>Objective completion and Event Points are unavailable in this preview. Only server-authenticated activity receipts will count.</Text>
   <Action label="Inspect the two route votes" s={s} secondary onPress={()=>onTab('vote')}/>
  </Card>
 </>;
 if(tab==='supplies')return <>
  <Card s={s}><SectionHeading s={s} kicker="SHARED PREPARATION" title="Contribute together" sub="Preparation consumes verified resources only when submitted to the real server. No preview contributions affect the economy."/>
   {story.supplies.map((entry,i)=><View key={entry} style={s.detailRow}><Text style={[s.index,{color:accent}]}>{i+1}</Text><View style={s.flex}><Text style={s.choiceTitle}>{entry}</Text><Text style={s.choiceSub}>Authoritative inventory check required</Text></View><Tag s={s} label="Preview"/></View>)}
   <Action label="Contribute · Not available" s={s} disabled/>
  </Card>
  {storyStatus&&required?<Card s={s}><SectionHeading s={s} kicker="FROZEN SUPPLY ORDERS · READ ONLY" title={'Stage '+storyStatus.stage+' supplies'} sub="Quantities come from private event receipts, not a donation quote or a promise of progression."/>
   {required.orders>0?<><Progress s={s} value={required.percent} accent={accent}/><Text style={s.bodyText}>{required.donated} / {required.target} required units recorded ({required.percent}%).</Text></>:<Text style={s.bodyText}>No server-authored required orders available for the current stage.</Text>}
   <Text style={s.finePrint}>The server separately verifies completion, action receipts and stage readiness.</Text>
  </Card>:null}
  <Card s={s}><SectionHeading s={s} kicker="OPTIONAL BUFFS · PROPOSED" title="Special preparations" sub="Fully completing a verified optional order may grant a small story-specific finale advantage. These values are design examples, not live bonuses."/>
   {storyGuide.preparations.map(([type,name,effect])=><View key={type} style={s.detailRow}>
    <View style={s.flex}><Text style={s.choiceTitle}>{name}</Text><Text style={s.choiceSub}>{type} preparation · verified completion required</Text></View>
    <Tag s={s} label={effect} accent={accent}/>
   </View>)}
   <Text style={s.finePrint}>Partial supplies never activate a preparation bonus. {storyStatus?'The quantities above are read-only; preparation bonuses are still proposed and never automatically activated.':'No real orders, inventory quantities or completion status are loaded here.'}</Text>
  </Card>
 </>;
 if(tab==='vote')return <Card s={s}><SectionHeading s={s} kicker="TWO LOCKED PARTY BALLOTS" title="The party decides" sub="Every story has a Stage 2 route and a later Stage 3 finale plan. Try the local preview; no votes are sent."/>
  <View style={s.stepRow}><Action label="Stage 2 · Approach" s={s} secondary={ballot!=='approach'} onPress={()=>setBallot('approach')}/><Action label="Stage 3 · Finale" s={s} secondary={ballot!=='finale'} onPress={()=>setBallot('finale')}/></View>
  {([0,1] as const).map(index=>{const id=index===0?'secure':'swift';const selected=ballot==='approach'?choice:finalChoice;const title=(ballot==='approach'?story.approach:story.finale)[index];return <Pressable key={id} accessibilityRole="radio" accessibilityState={{checked:selected===id}} onPress={()=>ballot==='approach'?setChoice(id):setFinalChoice(id)} style={[s.choice,selected===id&&{borderColor:accent,backgroundColor:C.panelRaised}]}>
   <View style={[s.radio,selected===id&&{borderColor:accent}]}>{selected===id?<View style={[s.radioInner,{backgroundColor:accent}]}/>:null}</View><View style={s.flex}><Text style={s.choiceTitle}>{title}</Text><Text style={s.choiceSub}>{ballot==='approach'?'Stage 2 · Approach choice':'Stage 3 · Finale preparation'}</Text></View>
  </Pressable>;})}
  {storyStatus?<View style={s.warning}>
   <Text style={s.warningTitle}>Read-only ballot status</Text>
   <Text style={s.bodyText}>Stage 2: {storyStatus.votes.stage2?'Locked':'Not locked'} · Your ballot: {storyStatus.votes.myStage2Ballot?'Recorded':'Not recorded'}</Text>
   <Text style={s.bodyText}>Stage 3: {storyStatus.votes.stage3?'Locked':'Not locked'} · Your ballot: {storyStatus.votes.myStage3Ballot?'Recorded':'Not recorded'}</Text>
   <Text style={s.finePrint}>The local choices below cannot change an authenticated vote.</Text>
  </View>:null}
  <Text accessibilityLiveRegion="polite" style={s.finePrint}>Local example: Stage 2 · {choice?story.approach[choice==='secure'?0:1]:'no choice'}; Stage 3 · {finalChoice?story.finale[finalChoice==='secure'?0:1]:'no choice'}. Nothing submitted.</Text>
  <Action label="Cast vote · Server unavailable" s={s} disabled/>
 </Card>;
 if(tab==='finale')return <Card s={s}><SectionHeading s={s} kicker={'FINALE · '+story.name.toUpperCase()} title="A decisive encounter" sub="Real class skills, companions, stage choices and server-verified preparation will determine the finale."/>
  <View style={s.statRow}><Stat s={s} label="PARTY" value="2–4"/><Stat s={s} label="ROUTES" value="2 votes"/><Stat s={s} label="REWARD" value="Day 8"/></View>
  {storyStatus?<Text style={s.finePrint}>Your private event record is at Stage {storyStatus.stage}/3 ({storyStatus.status}). It does not authorize a boss attempt.</Text>:null}
  <Text style={s.bodyText}>{story.finaleThreat} This is a story preview, not active combat.</Text>
  <View style={s.empty}><UiIcon name="dungeon" size={34}/><Text style={s.choiceTitle}>Finale preview is under construction</Text><Text style={s.bodyText}>No combat, event points or claims can be initiated from this screen yet.</Text></View>
  <Action label="Enter finale · Not available" s={s} disabled/>
 </Card>;
 return <>
  <Card s={s}><SectionHeading s={s} kicker="DAY 8 · SETTLEMENT" title="Adventure results" sub="Day 8 settlement choices remain separate from event treasure chests. All payouts require verified server receipts."/>
   <View style={s.statRow}><Stat s={s} label="RESULT" value="Not live"/><Stat s={s} label="CONTRIBUTION" value="No record"/><Stat s={s} label="CLAIM" value="Unavailable"/></View>
   <View style={s.empty}><UiIcon name="rewards" size={34}/><Text style={s.choiceTitle}>Awaiting a verified settlement</Text><Text style={s.bodyText}>Your Party's final outcome, personal rewards and earned chest entitlements will appear after an authenticated server settlement.</Text></View>
   <Action label="Claim settlement · Not available" s={s} disabled/>
  </Card>
  <Card s={s}><SectionHeading s={s} kicker="PARTY TREASURE · DESIGN QA" title="Three chests to earn" sub="Up to three per account per event week. These are baseline Standard gear chances, not guaranteed drops."/>
   {partyChestDesign.map((chest,i)=><View key={chest.name} style={s.detailRow}>
    <View style={[s.motif,{borderColor:accent}]}><UiIcon name="rewards" size={26}/></View>
    <View style={s.flex}><Text style={s.choiceTitle}>{chest.name}</Text><Text style={s.choiceSub}>{rewardStatus?.chests[i]?.unlockHint??chest.condition}</Text><Text accessibilityLiveRegion="polite" style={s.finePrint}>{rewardStatus?rewardStatus.chests[i]!.state.toUpperCase()+' · Verified private read; no claiming enabled':'No authenticated entitlement loaded'}</Text></View>
    <Tag s={s} label={rewardStatus?rewardStatus.chests[i]!.gearChancePercent+'%':chest.chance+' base'} accent={i===2?accent:undefined}/>
   </View>)}
   <Text style={s.finePrint}>Veteran and Heroic difficulty improve these base chances. Opening a chest cannot be simulated or claimed in this preview.</Text>
   <Action label="Open chest · Not available" s={s} disabled/>
  </Card>
  <Card s={s}><SectionHeading s={s} kicker={'EVENT EQUIPMENT · '+story.name.toUpperCase()} title="Two collections, five pieces" sub="A three-piece signature set and a two-piece support set. Bonuses only activate when the matching tier pieces are equipped."/>
   {rewardStatus?rewardStatus.sets.map(set=><View key={set.id} style={s.detailRow}>
    <View style={s.flex}><Text style={s.choiceTitle}>{set.name}</Text><Text style={s.choiceSub}>{set.collected} / {set.size} pieces collected · Equipped pieces activate bonuses</Text></View>
    <Tag s={s} label={set.size===3?'2 & 3 equipped':'2 equipped'}/>
   </View>):partyTreasureSets[story.id].map(set=><View key={set.name} style={s.detailRow}>
    <View style={s.flex}><Text style={s.choiceTitle}>{set.name}</Text><Text style={s.choiceSub}>{set.pieces}-piece set · Collection unavailable until the private inventory read is connected</Text></View>
    <Tag s={s} label={set.pieces===3?'2 & 3 equipped':'2 equipped'}/>
   </View>)}
   <Text style={s.finePrint}>Party Sigils: {rewardStatus?rewardStatus.partySigilsBalance+' verified':'balance unverified'} · One targeted missing piece may cost 60 Sigils per event week. No currency is debited in this screen.</Text>
   <Action label="Exchange gear · Not available" s={s} disabled/>
  </Card>
 </>;
}

const samples:readonly MarketPreviewItem[]=[
 {id:'ore',name:'Iron Ore',type:'Resources',amount:40,unit:18},
 {id:'timber',name:'Oak Logs',type:'Resources',amount:25,unit:12},
 {id:'fang',name:'Wolf Fang',type:'Materials',amount:6,unit:86},
 {id:'gem',name:'Effect Gem',type:'Gems',amount:1,unit:740},
 {id:'gear',name:'Example T2 Forged Armor',type:'Equipment',amount:1,unit:2500,requiredLevel:18,rarity:'Rare',tier:2,slot:'Armor'},
 {id:'blade',name:'Example T3 Forged Blade',type:'Equipment',amount:1,unit:4300,requiredLevel:30,rarity:'Epic',tier:3,slot:'Weapon',bonusPreview:'Example bonus roll · not a verified affix'},
];
// Static examples are deliberately not fetched from the real Market or displayed as verified sales.
const illustrativeSaleHistory=[12,18,15,21,19,26,24];
function MarketContents({s,C,accent,tab}:Shared&{tab:string}){
 const [category,setCategory]=useState('All'),[query,setQuery]=useState(''),[selected,setSelected]=useState<string|null>(null);
 const [sort,setSort]=useState<MarketPreviewSort>('unit');
 const [quantity,setQuantity]=useState('10'),[price,setPrice]=useState('20'),[review,setReview]=useState(false);
 const filtered=useMemo(()=>filterMarketPreviewItems(samples,category as MarketPreviewItem['type']|'All',query,sort),[category,query,sort]);
 const selectedItem=samples.find(item=>item.id===selected);
 const {gross,fee,net,valid:quoteValid,issue:quoteIssue}=useMemo(()=>estimateMarketPreviewQuote(quantity,price),[quantity,price]);
 if(tab==='browse')return <>
  <Card s={s}><SectionHeading s={s} kicker="SEARCH & DISCOVER" title="Find your next upgrade" sub="Illustrative listings. Final quotes, availability and equipment eligibility must be read from the authenticated Market service."/>
   <View style={s.searchRow}>
     <TextInput accessibilityLabel="Search example market items" value={query} onChangeText={value=>{setQuery(value);setSelected(null)}} placeholder="Search resources, gems, equipment…" placeholderTextColor={C.muted} autoCorrect={false} autoCapitalize="none" returnKeyType="search" style={[s.input,s.searchInput]}/>
     {query.length>0?<Action label="Clear" s={s} secondary onPress={()=>{setQuery('');setSelected(null)}}/>:null}
   </View>
   <ScrollView horizontal showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>{['All','Resources','Materials','Gems','Equipment'].map(entry=><Pressable key={entry} accessibilityRole="button" accessibilityState={{selected:category===entry}} onPress={()=>{setCategory(entry);setSelected(null)}} style={[s.filter,category===entry&&{borderColor:accent,backgroundColor:C.panelRaised}]}><Text style={[s.filterText,category===entry&&{color:C.text}]}>{entry}</Text></Pressable>)}</ScrollView>
   <View style={s.resultCount}><Text style={s.finePrint}>{filtered.length} example {filtered.length===1?'result':'results'}</Text><Tag s={s} label="Sample data" accent={accent}/></View>
   <View style={s.sortRow} accessibilityRole="radiogroup">
    <Text style={s.detailLabel}>SORT BY</Text>
    {([{id:'unit',label:'Unit price'},{id:'unit-desc',label:'Highest / unit'},{id:'lot',label:'Total lot'},{id:'name',label:'Name'}] as const).map(option=><Pressable key={option.id} accessibilityRole="radio" accessibilityState={{checked:sort===option.id}} onPress={()=>setSort(option.id)} style={[s.sortChip,sort===option.id&&{borderColor:accent,backgroundColor:C.panelRaised}]}><Text style={[s.filterText,sort===option.id&&{color:C.text}]}>{option.label}</Text></Pressable>)}
   </View>
   {filtered.length===0?<View style={s.empty}><Text style={s.bodyText}>No example items match this search or category.</Text><Action label="Clear search and filters" s={s} secondary onPress={()=>{setQuery('');setCategory('All');setSelected(null)}}/></View>:filtered.map(item=><View key={item.id} style={s.resultGroup}><Pressable accessibilityRole="button" accessibilityState={{expanded:selected===item.id}} accessibilityLabel={`${item.name}, ${item.amount} items, ${item.unit*item.amount} gold example lot, ${selected===item.id?'details open':'inspect details'}`} onPress={()=>setSelected(selected===item.id?null:item.id)} style={[s.marketRow,selected===item.id&&{borderColor:accent}]}>
    <View style={s.marketSymbol}><UiIcon name={item.type==='Equipment'?'inventory':item.type==='Gems'?'rewards':item.type==='Resources'?'world':'dungeon'} size={25}/></View>
    <View style={s.flex}><Text style={s.choiceTitle}>{item.name}</Text><Text style={s.choiceSub}>{item.type} · Example lot of {item.amount}{item.requiredLevel?' · Min. Lv '+item.requiredLevel:''}</Text></View>
    <View style={s.priceBlock}><Text style={s.goldPrice}>{(item.unit*item.amount).toLocaleString('en-US')} G</Text><Text style={s.choiceSub}>{item.unit} each</Text></View>
   </Pressable>
   {selectedItem?.id===item.id?<View style={s.detailPanel}>
    <View style={s.resultCount}><Text style={s.guideHeading}>{selectedItem.name}</Text><Tag s={s} label="Demo listing" accent={accent}/></View>
    <View style={s.detailRow}><Text style={s.bodyText}>Example lot price</Text><Text style={s.goldPrice}>{(selectedItem.unit*selectedItem.amount).toLocaleString('en-US')} Gold</Text></View>
    {selectedItem.requiredLevel?<View style={s.warning}><Text style={s.warningTitle}>Equipment eligibility</Text><Text style={s.bodyText}>Example requirement: Level {selectedItem.requiredLevel}{selectedItem.rarity?' · '+selectedItem.rarity:''}. The real server will verify class, level, exact item instance and restrictions before any purchase.</Text></View>:null}
    {selectedItem.type==='Equipment'?<View style={s.invoice}>
      <View style={s.resultCount}><Text style={s.choiceTitle}>Example equipment details</Text><Tag s={s} label={selectedItem.rarity??'Unverified'}/></View>
      <View style={s.detailRow}><Text style={s.bodyText}>Tier / slot</Text><Text style={s.choiceTitle}>T{selectedItem.tier??'?'} · {selectedItem.slot??'Unknown'}</Text></View>
      <View style={s.detailRow}><Text style={s.bodyText}>Bonus stats</Text><Text style={s.choiceSub}>{selectedItem.bonusPreview??'None shown in example'}</Text></View>
      <Text style={s.finePrint}>Gem policy preview: socketed gems can be replaced, not removed or extracted. Actual item sockets, lock state, ownership and tradability must come from the server.</Text>
    </View>:null}
    <Text style={s.detailLabel}>ILLUSTRATIVE PRICE TREND · NOT REAL SALES</Text>
    <View style={s.historyChart} accessibilityLabel="Sample seven point price chart, not real sales">
      {illustrativeSaleHistory.map((value,index)=><View key={index} style={s.historySlot}><View style={[s.historyBar,{height:(Math.round(value/26*66)+8),backgroundColor:index===illustrativeSaleHistory.length-1?accent:C.lineStrong}]}/><Text style={s.historyLabel}>{index+1}</Text></View>)}
    </View>
    <Text style={s.finePrint}>Live price history will use completed server-verified sales only. These bars are example data.</Text>
    <Action label="Purchase · Market unavailable" s={s} disabled/>
   </View>:null}</View>)}
  </Card>
 </>;
 if(tab==='sell')return <Card s={s}><SectionHeading s={s} kicker="CREATE A LISTING · CALCULATOR" title="Know the payout first" sub="Try a sample listing price. This calculator does not inspect inventory, reserve items or post an offer."/>
   <Text style={s.detailLabel}>EXAMPLE QUANTITY</Text><TextInput value={quantity} onChangeText={value=>{setQuantity(value);setReview(false)}} keyboardType="numeric" accessibilityLabel="Example quantity" style={s.input}/>
   <Text style={s.detailLabel}>EXAMPLE PRICE PER UNIT · GOLD</Text><TextInput value={price} onChangeText={value=>{setPrice(value);setReview(false)}} keyboardType="numeric" accessibilityLabel="Example unit price" style={s.input}/>
   {quoteIssue?<Text accessibilityLiveRegion="polite" style={s.warningTitle}>{quoteIssue}</Text>:null}
   <View style={s.invoice} accessibilityLiveRegion="polite"><View style={s.detailRow}><Text style={s.bodyText}>Gross sale</Text><Text style={s.choiceTitle}>{gross.toLocaleString('en-US')} Gold</Text></View>
    <View style={s.detailRow}><Text style={s.bodyText}>Seller fee · 5%</Text><Text style={s.choiceTitle}>−{fee.toLocaleString('en-US')} Gold</Text></View>
    <View style={s.detailRow}><Text style={s.choiceTitle}>Estimated seller payout</Text><Text style={[s.goldPrice,{fontSize:18}]}>{net.toLocaleString('en-US')} Gold</Text></View>
   </View>
   <Text style={s.finePrint}>Example only · 5% seller fee rounded up to the next whole Gold. Final listing limits and fees are confirmed by the server.</Text>
   <View style={s.detailPanel}><Text style={s.guideHeading}>Before listing equipment</Text>
     <Text style={s.bodyText}>The live market must verify your exact item, allowed class and level, lock and favorite protections, and eligibility for trade. Socketed gems are replace-only, not extractable. This preview does not check your bag or bank.</Text>
   </View>
   <Action label="Review example calculation" s={s} onPress={()=>setReview(true)} disabled={!quoteValid}/>
   {review?<View style={s.warning}><Text style={s.warningTitle}>Example review complete</Text><Text style={s.bodyText}>No listing has been submitted. Live selling will additionally enforce item ownership, minimum lot sizes, price corridors and safe escrow.</Text></View>:null}
   <Action label="Publish listing · Not available" s={s} disabled/>
  </Card>;
 if(tab==='listings')return <Card s={s}><SectionHeading s={s} kicker="YOUR MARKET ACTIVITY" title="My Listings" sub="Only real server-owned offers can appear here. Cancelling, expiry and escrow return must preserve exact items."/><View style={s.empty}><UiIcon name="inventory" size={34}/><Text style={s.choiceTitle}>Trading is not released</Text><Text style={s.bodyText}>No listings or ownership records are loaded into this design preview.</Text></View></Card>;
 if(tab==='inbox')return <Card s={s}><SectionHeading s={s} kicker="SECURE DELIVERIES" title="Market Inbox" sub="The existing Rewards Inbox contains the gated Market claim tab. This preview does not create a second reward wallet."/><View style={s.empty}><UiIcon name="rewards" size={34}/><Text style={s.choiceTitle}>No connected deliveries</Text><Text style={s.bodyText}>Bought, sold, expired and returned records will be shown only when verified by the service.</Text></View></Card>;
 return <Card s={s}><SectionHeading s={s} kicker="TRADE AUDIT TRAIL" title="Transaction History" sub="Finalized sales and purchases will appear here once the Market's authenticated ledger is released. Example listings are never recorded as actual transactions."/><View style={s.empty}><UiIcon name="inventory" size={34}/><Text style={s.choiceTitle}>No verified transactions</Text><Text style={s.bodyText}>Completed purchases, seller payouts, fees and return events will come from immutable server history.</Text></View></Card>;
}

function makeStyles(C:ThemeColors,compact=false){
 return StyleSheet.create({
  root:{flex:1,backgroundColor:C.bg},page:{padding:spacing.md,paddingBottom:34,gap:spacing.md},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',minHeight:40},
  headerRight:{flexDirection:'row',alignItems:'center',gap:10},smallButton:{flexDirection:'row',alignItems:'center',gap:5,paddingHorizontal:12,minHeight:44,justifyContent:'center',borderRadius:radii.sm,borderColor:C.lineStrong,borderWidth:1},smallButtonText:{color:C.text,fontWeight:'800',fontSize:12},
  privateLabel:{fontSize:10,fontWeight:'900',letterSpacing:1,color:C.muted},help:{width:44,height:44,borderRadius:22,borderWidth:1,borderColor:C.lineStrong,backgroundColor:C.panel,alignItems:'center',justifyContent:'center'},helpText:{color:C.text,fontSize:20,fontWeight:'800'},
  hero:{height:compact?142:166,borderWidth:1,borderRadius:radii.md,overflow:'hidden',justifyContent:'flex-end',backgroundColor:C.panel},heroImage:{opacity:.8},heroShade:{...StyleSheet.absoluteFill,backgroundColor:'rgba(2,7,12,.54)'},heroCopy:{padding:spacing.lg,gap:5},eyebrow:{fontWeight:'900',letterSpacing:1.7,fontSize:10},heroTitle:{color:'#FFFFFF',fontSize:compact?24:27,lineHeight:35,fontWeight:'900'},heroSub:{color:'#F4F1E9',fontSize:13,lineHeight:18,fontWeight:'700'},
  qaNote:{flexDirection:'row',alignItems:'flex-start',gap:8,padding:10,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel},qaSymbol:{fontSize:20,fontWeight:'900'},qaText:{color:C.muted,fontSize:11,lineHeight:17,flex:1},
  tabs:{gap:7,paddingVertical:2},tab:{minHeight:44,justifyContent:'center',paddingHorizontal:13,borderRadius:radii.sm,borderWidth:1,borderColor:C.line,backgroundColor:C.panel},tabText:{color:C.muted,fontSize:12,fontWeight:'800'},
  card:{gap:12,padding:spacing.md,borderRadius:radii.md,borderWidth:1,borderColor:C.lineStrong,backgroundColor:C.panel},sectionHead:{gap:4},kicker:{color:C.accent,fontSize:10,fontWeight:'900',letterSpacing:1.5},cardTitle:{...typography.title,color:C.text},bodyText:{...typography.body,color:C.muted,fontSize:12,lineHeight:18},finePrint:{color:C.muted,fontSize:11,lineHeight:16},
  statRow:{flexDirection:'row',gap:8,flexWrap:'wrap'},stat:{flexGrow:1,flexBasis:compact?'46%':'29%',minWidth:compact?110:0,padding:9,borderRadius:radii.sm,backgroundColor:C.panelRaised,borderWidth:1,borderColor:C.line,gap:3},statLabel:{fontSize:9,fontWeight:'900',letterSpacing:.7,color:C.muted},statValue:{fontSize:15,lineHeight:21,fontWeight:'900',color:C.text},statHint:{color:C.muted,fontSize:10},
  twoActions:{flexDirection:'row',gap:8},campTrack:{gap:5,paddingVertical:6},nextStep:{gap:3,paddingVertical:8,paddingHorizontal:10,backgroundColor:C.panelRaised,borderRadius:radii.sm},
  stepRow:{flexDirection:'row',gap:6,flexWrap:'wrap'},tag:{paddingHorizontal:9,paddingVertical:5,borderRadius:radii.sm,borderWidth:1,borderColor:C.lineStrong,backgroundColor:C.panel2,alignSelf:'flex-start'},tagText:{color:C.muted,fontSize:10,fontWeight:'800'},choice:{flexDirection:'row',alignItems:'center',gap:10,padding:10,minHeight:60,borderRadius:radii.sm,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},choiceTitle:{color:C.text,fontSize:13,lineHeight:19,fontWeight:'800'},choiceSub:{fontSize:11,lineHeight:16,color:C.muted},choiceArrow:{fontSize:20,fontWeight:'900'},motif:{width:43,height:43,justifyContent:'center',alignItems:'center',borderWidth:1,borderRadius:radii.sm},motifGlyph:{fontSize:27,fontWeight:'900'},flex:{flex:1,minWidth:0},action:{minHeight:46,paddingHorizontal:14,paddingVertical:11,alignItems:'center',justifyContent:'center',borderRadius:radii.sm,backgroundColor:C.primaryButton,borderColor:C.primaryButtonBorder,borderWidth:1},actionText:{color:C.primaryButtonText,fontWeight:'900',fontSize:12,textAlign:'center'},secondaryAction:{backgroundColor:C.secondaryButton,borderColor:C.secondaryButtonBorder},secondaryActionText:{color:C.secondaryButtonText},disabledAction:{opacity:.56},disabledText:{color:C.muted},
  detailLabel:{color:C.muted,fontSize:10,fontWeight:'900',letterSpacing:.8},detailRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:9,paddingVertical:10,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.line},index:{color:C.muted,fontSize:15,fontWeight:'900',width:28},track:{height:9,borderRadius:radii.sm,backgroundColor:C.line,overflow:'hidden'},progress:{height:'100%',borderRadius:radii.sm},warning:{gap:4,padding:11,borderRadius:radii.sm,borderWidth:1,borderColor:C.warning,backgroundColor:C.warningSurface},warningTitle:{color:C.warning,fontSize:12,fontWeight:'900'},
  rewardPanel:{flexDirection:'row',alignItems:'center',gap:10,padding:12,borderRadius:radii.sm,backgroundColor:C.panelRaised,borderWidth:1,borderColor:C.line},rewardGlyph:{fontSize:30},timelineRow:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:5},timelineDot:{width:30,height:30,alignItems:'center',justifyContent:'center',borderRadius:15,borderWidth:1},timelineNumber:{fontSize:12,fontWeight:'900'},
  empty:{minHeight:140,alignItems:'center',justifyContent:'center',padding:14,gap:8,backgroundColor:C.panel2,borderRadius:radii.sm},emptyGlyph:{fontSize:34,color:C.muted},rosterList:{gap:7,marginTop:3},rosterMember:{flexDirection:'row',alignItems:'center',gap:9,minHeight:45},rosterAvatar:{width:36,height:36,alignItems:'center',justifyContent:'center',borderRadius:8,borderWidth:1,backgroundColor:C.panel2},rosterInitial:{fontWeight:'900',fontSize:15},storyStage:{flexDirection:'row',gap:15,alignItems:'flex-start',paddingVertical:12,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.line},storyNumber:{fontSize:21,fontWeight:'900'},radio:{width:22,height:22,borderWidth:2,borderRadius:11,borderColor:C.muted,alignItems:'center',justifyContent:'center'},radioInner:{width:10,height:10,borderRadius:5},
  input:{color:C.text,backgroundColor:C.inputBg,borderColor:C.lineStrong,borderWidth:1,minHeight:46,borderRadius:radii.sm,paddingHorizontal:12,fontSize:13},searchRow:{flexDirection:'row',alignItems:'center',gap:7},searchInput:{flex:1,minWidth:0},filters:{gap:7},filter:{paddingHorizontal:12,minHeight:44,justifyContent:'center',borderRadius:radii.sm,borderWidth:1,borderColor:C.line},filterText:{fontSize:11,fontWeight:'800',color:C.muted},resultCount:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},resultGroup:{gap:6},sortRow:{flexDirection:'row',alignItems:'center',gap:7,flexWrap:'wrap'},sortChip:{minHeight:44,paddingHorizontal:10,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,justifyContent:'center'},marketRow:{flexDirection:'row',alignItems:'center',gap:9,padding:10,borderWidth:1,borderRadius:radii.sm,borderColor:C.line,backgroundColor:C.panel2,minHeight:65},marketSymbol:{height:40,width:40,borderRadius:radii.sm,backgroundColor:C.panelRaised,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.lineStrong},marketSymbolText:{fontSize:23,color:C.accent},priceBlock:{alignItems:'flex-end'},goldPrice:{fontSize:13,fontWeight:'900',color:C.warning},detailPanel:{gap:8,padding:12,borderWidth:1,borderColor:C.lineStrong,borderRadius:radii.sm},historyChart:{height:104,flexDirection:'row',alignItems:'flex-end',justifyContent:'space-around',gap:6,paddingTop:7,paddingBottom:5,backgroundColor:C.panel2,borderRadius:radii.sm},historySlot:{flex:1,alignItems:'center',justifyContent:'flex-end',gap:5},historyBar:{width:'62%',maxWidth:28,borderTopLeftRadius:3,borderTopRightRadius:3},historyLabel:{fontSize:9,color:C.muted,fontWeight:'800'},invoice:{padding:10,backgroundColor:C.panel2,borderRadius:radii.sm,gap:3},footer:{paddingTop:8,alignItems:'center'},footerText:{fontSize:9,fontWeight:'900',color:C.disabled,letterSpacing:1},
  partyDock:{minHeight:60,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:14,borderTopWidth:2,backgroundColor:C.panelRaised},dockGlyph:{width:32,height:32,alignItems:'center',justifyContent:'center',borderRadius:radii.sm,borderWidth:1},dockGlyphText:{fontSize:18,fontWeight:'900'},dockTitle:{color:C.text,fontSize:12,fontWeight:'900'},dockDescription:{color:C.muted,fontSize:11},dockArrow:{fontSize:25,fontWeight:'700',color:C.text},unread:{minWidth:22,height:22,paddingHorizontal:4,alignItems:'center',justifyContent:'center',backgroundColor:C.notification,borderRadius:11},unreadText:{fontSize:10,fontWeight:'900',color:C.notificationText},
  modalShade:{flex:1,justifyContent:'center',padding:18,backgroundColor:C.overlay},modal:{gap:13,maxHeight:'80%',padding:16,borderRadius:radii.lg,borderWidth:1,borderColor:C.lineStrong,backgroundColor:C.panel},modalHeading:{flexDirection:'row',alignItems:'center'},modalActions:{flexDirection:'row',gap:8},modalActionSlot:{flex:1},guideScroll:{flexGrow:0},guideTopic:{gap:4,paddingVertical:10,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.line},guideHeading:{color:C.text,fontSize:13,fontWeight:'900'},
 });
}
