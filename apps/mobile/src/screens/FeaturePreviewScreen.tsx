import {useMemo,useState,type ReactNode} from 'react';
import {ImageBackground,Modal,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {usePartySocial} from '../online/PartySocialProvider';
import type {FeatureHubPreviewRoute} from '../core/feature-hub-routes';

type Feature='boss'|'party'|'market';
type TabItem={id:string;label:string};
type Props={route:FeatureHubPreviewRoute;onClose:()=>void;onOpenParty:()=>void;onOpenPartyChat:()=>void;partyUnread?:number};

const bossTabs:TabItem[]=[
 {id:'overview',label:'Overview'},{id:'camp',label:'War Camp'},{id:'battle',label:'Battle'},
 {id:'rewards',label:'Rewards'},{id:'rankings',label:'Rankings'},
];
const partyTabs:TabItem[]=[
 {id:'adventure',label:'Adventure'},{id:'stages',label:'Stages'},{id:'supplies',label:'Supplies'},
 {id:'vote',label:'Voting'},{id:'finale',label:'Finale'},
];
const marketTabs:TabItem[]=[
 {id:'browse',label:'Browse'},{id:'sell',label:'Sell'},{id:'listings',label:'My Listings'},{id:'inbox',label:'Inbox'},
];
const art={
 boss:require('../../assets/card-backgrounds/kingdom_approach_portrait.webp'),
 party:require('../../assets/card-backgrounds/guild_plaza_wide_v2.webp'),
 market:require('../../assets/card-backgrounds/guild_plaza_wide_v2.webp'),
};
const meta={
 boss:{eyebrow:'WORLD ENCOUNTER',title:'World Bosses',subtitle:'One realm. One enormous threat.',accent:'#E8B66B'},
 party:{eyebrow:'CO-OP ADVENTURES',title:'Party Events',subtitle:'Shape the expedition together.',accent:'#91CFC4'},
 market:{eyebrow:'REALM ECONOMY',title:'Player Market',subtitle:'Trade with purpose and clarity.',accent:'#D5C196'},
};

export function FeaturePreviewScreen({route,onClose,onOpenParty,onOpenPartyChat,partyUnread=0}:Props){
 const feature:Feature=route==='WorldBossPreview'?'boss':route==='PartyEventPreview'?'party':'market';
 const tabs=feature==='boss'?bossTabs:feature==='party'?partyTabs:marketTabs;
 const [tab,setTab]=useState(tabs[0].id),[guide,setGuide]=useState(false);
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const title=meta[feature],accent=title.accent;
 const social=usePartySocial();
 const partyConnected=Boolean(social.party?.id);
 const guideTopics=feature==='boss'?[
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
   <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to Account" onPress={onClose} style={s.smallButton}><Text style={s.smallButtonText}>‹ Back</Text></Pressable>
      <View style={s.headerRight}><Text style={s.privateLabel}>DESIGN QA</Text><Pressable accessibilityRole="button" accessibilityLabel={title.title+' guide'} onPress={()=>setGuide(true)} style={s.help}><Text style={s.helpText}>?</Text></Pressable></View>
    </View>
    <ImageBackground source={art[feature]} resizeMode="cover" imageStyle={s.heroImage} style={[s.hero,{borderColor:accent}]}>
      <View style={s.heroShade}/>
      <View style={s.heroCopy}>
        <Text style={[s.eyebrow,{color:accent}]}>{title.eyebrow}</Text>
        <Text style={s.heroTitle}>{title.title}</Text>
        <Text style={s.heroSub}>{title.subtitle}</Text>
      </View>
    </ImageBackground>
    <View style={s.qaNote}><Text style={[s.qaSymbol,{color:accent}]}>◇</Text><Text style={s.qaText}>Developer-only UI preview. All example data is illustrative. No game resources, attempts, votes, listings or rewards are changed.</Text></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>
      {tabs.map(item=><Pressable key={item.id} accessibilityRole="tab" accessibilityState={{selected:tab===item.id}} onPress={()=>setTab(item.id)} style={[s.tab,tab===item.id&&{backgroundColor:C.panelRaised,borderColor:accent}]}><Text style={[s.tabText,tab===item.id&&{color:C.text}]}>{item.label}</Text></Pressable>)}
    </ScrollView>
    {feature==='boss'?<BossContents s={s} C={C} accent={accent} tab={tab} onTab={setTab}/>:null}
    {feature==='party'?<PartyContents s={s} C={C} accent={accent} tab={tab} onTab={setTab} hasParty={partyConnected} members={social.party?.members.length??0} onOpenParty={onOpenParty}/>:null}
    {feature==='market'?<MarketContents s={s} C={C} accent={accent} tab={tab}/>:null}
    <View style={s.footer}><Text style={s.footerText}>VELDRYN  •  FEATURE DESIGN REVIEW</Text></View>
   </ScrollView>
   {feature==='party'?<Pressable accessibilityRole="button" accessibilityLabel={partyConnected?'Open Party Chat':'Open Party to find members'} onPress={partyConnected?onOpenPartyChat:onOpenParty} style={[s.partyDock,{borderTopColor:accent}]}>
     <View style={[s.dockGlyph,{borderColor:accent}]}><Text style={[s.dockGlyphText,{color:accent}]}>✦</Text></View>
     <View style={s.flex}><Text style={s.dockTitle}>Party Chat</Text><Text style={s.dockDescription}>{partyConnected?'Coordinate with your Party':'Join a Party to unlock chat'}</Text></View>
     {partyUnread>0&&partyConnected?<View style={s.unread}><Text style={s.unreadText}>{partyUnread>99?'99+':partyUnread}</Text></View>:null}
     <Text style={s.dockArrow}>›</Text>
   </Pressable>:null}
   <Modal transparent animationType="fade" visible={guide} onRequestClose={()=>setGuide(false)}>
     <View style={s.modalShade}><Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Close guide" onPress={()=>setGuide(false)}/><View style={s.modal}>
       <View style={s.modalHeading}><View style={s.flex}><Text style={[s.eyebrow,{color:accent}]}>FIELD GUIDE</Text><Text accessibilityRole="header" style={s.cardTitle}>{title.title}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Close guide" onPress={()=>setGuide(false)} style={s.help}><Text style={s.helpText}>×</Text></Pressable></View>
       <ScrollView style={s.guideScroll}>{guideTopics.map(([heading,body])=><View key={heading} style={s.guideTopic}><Text style={s.guideHeading}>{heading}</Text><Text style={s.bodyText}>{body}</Text></View>)}</ScrollView>
       <Action label="Got it" onPress={()=>setGuide(false)} s={s}/>
     </View></View>
   </Modal>
 </View>;
}

type Shared={s:ReturnType<typeof makeStyles>;C:ThemeColors;accent:string};
function Card({s,children}:{s:Shared['s'];children:ReactNode}){return <View style={s.card}>{children}</View>;}
function SectionHeading({s,kicker,title,sub}:{s:Shared['s'];kicker:string;title:string;sub?:string}){return <View style={s.sectionHead}><Text style={s.kicker}>{kicker}</Text><Text style={s.cardTitle}>{title}</Text>{sub?<Text style={s.bodyText}>{sub}</Text>:null}</View>;}
function Action({label,onPress,s,disabled=false,secondary=false}:{label:string;onPress?:()=>void;s:Shared['s'];disabled?:boolean;secondary?:boolean}){
 return <Pressable accessibilityRole="button" accessibilityState={{disabled:disabled||!onPress}} disabled={disabled||!onPress} onPress={onPress} style={[s.action,secondary&&s.secondaryAction,(disabled||!onPress)&&s.disabledAction]}>
  <Text style={[s.actionText,secondary&&s.secondaryActionText,(disabled||!onPress)&&s.disabledText]}>{label}</Text>
 </Pressable>;
}
function Stat({s,label,value,hint}:{s:Shared['s'];label:string;value:string;hint?:string}){return <View style={s.stat}><Text style={s.statLabel}>{label}</Text><Text style={s.statValue}>{value}</Text>{hint?<Text style={s.statHint}>{hint}</Text>:null}</View>;}
function Progress({s,value,accent}:{s:Shared['s'];value:number;accent:string}){return <View style={s.track}><View style={[s.progress,{width:((Math.max(0,Math.min(100,value)))+'%') as import('react-native').DimensionValue,backgroundColor:accent}]}/></View>;}
function Tag({s,label,accent}:{s:Shared['s'];label:string;accent?:string}){return <View style={[s.tag,accent&&{borderColor:accent}]}><Text style={[s.tagText,accent&&{color:accent}]}>{label}</Text></View>;}

const bosses=[
 {id:'hollow',name:'Hollowroot',region:'Asterfall',motif:'THE ROOTBOUND ANCIENT',color:'#A4C387'},
 {id:'sunscar',name:'Sunscar',region:'Sunscar',motif:'THE SUN-FORGED TITAN',color:'#E2AE73'},
 {id:'frost',name:'Frostmarch',region:'Frostmarch',motif:'THE WHITEOUT SENTINEL',color:'#98C8E9'},
] as const;
function BossContents({s,C,accent,tab,onTab}:Shared&{tab:string;onTab:(value:string)=>void}){
 const [selected,setSelected]=useState<(typeof bosses)[number]['id']>('hollow');
 const boss=bosses.find(item=>item.id===selected)??bosses[0];
 if(tab==='overview')return <>
  <Card s={s}><SectionHeading s={s} kicker="14-DAY REALM CYCLE" title="The next great encounter" sub="Five days to prepare. One continuous weekend battle. A week to recover."/>
   <View style={s.statRow}><Stat s={s} label="PREPARATION" value="5 days"/><Stat s={s} label="BATTLE" value="48 hours"/><Stat s={s} label="ATTEMPTS" value="3 / account"/></View>
   <View style={s.stepRow}><Tag s={s} label="01 War Camp" accent={accent}/><Tag s={s} label="02 Battle"/><Tag s={s} label="03 Results"/></View>
  </Card>
  <Card s={s}><SectionHeading s={s} kicker="ENCOUNTER CODEX" title="Choose a boss to inspect" sub="The following are design previews, not live boss availability."/>
   {bosses.map(entry=><Pressable key={entry.id} accessibilityRole="button" accessibilityState={{selected:selected===entry.id}} onPress={()=>setSelected(entry.id)} style={[s.choice,selected===entry.id&&{borderColor:entry.color,backgroundColor:C.panelRaised}]}>
     <View style={[s.motif,{backgroundColor:C.panel2,borderColor:entry.color}]}><Text style={[s.motifGlyph,{color:entry.color}]}>✥</Text></View><View style={s.flex}><Text style={s.choiceTitle}>{entry.name}</Text><Text style={s.choiceSub}>{entry.region} · {entry.motif}</Text></View><Text style={[s.choiceArrow,{color:entry.color}]}>{selected===entry.id?'✓':'›'}</Text>
   </Pressable>)}
   <Action label={'Inspect '+boss.name+' War Camp'} s={s} onPress={()=>onTab('camp')}/>
  </Card>
 </>;
 if(tab==='camp')return <>
  <Card s={s}><SectionHeading s={s} kicker={'WAR CAMP · '+boss.region.toUpperCase()} title={'Prepare for '+boss.name} sub="Donations are account-wide and consume real resources only after a verified server transaction."/>
   <View style={s.statRow}><Stat s={s} label="DONATION LIMIT" value="2 per event"/><Stat s={s} label="FREEZE" value="Saturday"/><Stat s={s} label="BONUSES" value="Server verified"/></View>
   <Text style={s.detailLabel}>EXAMPLE WAR SUPPLY METER</Text><Progress s={s} value={65} accent={boss.color}/><Text style={s.finePrint}>Illustrative progress only. No current donation total is available in this preview.</Text>
  </Card>
  <Card s={s}><SectionHeading s={s} kicker="PREPARATION TASKS" title="Support the war effort"/>
   {['Stockpile ore for reinforced armor','Gather timber for barricades','Prepare supplies for the front line'].map((name,i)=><View key={name} style={s.detailRow}><Text style={s.index}>{'0'+(i+1)}</Text><View style={s.flex}><Text style={s.choiceTitle}>{name}</Text><Text style={s.choiceSub}>Pending authenticated stock and cost check</Text></View><Tag s={s} label="Locked"/></View>)}
   <Action label="Donate supplies · Awaiting server" s={s} disabled/>
  </Card>
 </>;
 if(tab==='battle')return <>
  <Card s={s}><SectionHeading s={s} kicker="CONTINUOUS WEEKEND BATTLE" title={'Face '+boss.name} sub="Up to five eligible owned characters can contribute in a single account-wide battle."/>
   <View style={s.statRow}><Stat s={s} label="ATTEMPTS" value="3 shared"/><Stat s={s} label="COMBAT" value="14 rounds"/><Stat s={s} label="WINDOW" value="Sat–Sun"/></View>
   <View style={s.warning}><Text style={s.warningTitle}>Battle not connected</Text><Text style={s.bodyText}>The server must reserve attempts, verify your actual roster, record combat and settle HP exactly once. This preview cannot start a fight.</Text></View>
   <Action label="Begin account raid · Not available" s={s} disabled/>
  </Card>
  <Card s={s}><SectionHeading s={s} kicker="ENCOUNTER MECHANICS" title="Watch the boss, not a timer"/>
   {['Warning cast and response','Guard, damage and support impact','Phase transition and recovery'].map((label,i)=><View key={label} style={s.timelineRow}><View style={[s.timelineDot,{borderColor:boss.color}]}><Text style={[s.timelineNumber,{color:boss.color}]}>{i+1}</Text></View><Text style={s.choiceTitle}>{label}</Text></View>)}
  </Card>
 </>;
 if(tab==='rewards')return <>
  <Card s={s}><SectionHeading s={s} kicker="ACCOUNT-WIDE REWARDS" title="Earn World Sigils" sub="Contribution and eligibility determine rewards; owning more characters does not multiply payout."/>
   <View style={s.rewardPanel}><Text style={[s.rewardGlyph,{color:accent}]}>✧</Text><View style={s.flex}><Text style={s.choiceTitle}>World Sigils</Text><Text style={s.choiceSub}>Future shop currency · quantities not yet approved</Text></View></View>
   <View style={s.detailRow}><Text style={s.choiceSub}>Contribution</Text><Text style={s.choiceTitle}>No live record</Text></View>
   <View style={s.detailRow}><Text style={s.choiceSub}>Claim status</Text><Text style={s.choiceTitle}>Unavailable</Text></View>
   <Action label="Claim rewards · Not available" s={s} disabled/>
  </Card>
 </>;
 return <Card s={s}><SectionHeading s={s} kicker="CONTRIBUTION BOARD" title="Realm rankings" sub="Real ranks must come from immutable server-verified contribution ledgers, not client-reported damage."/><View style={s.empty}><Text style={s.emptyGlyph}>▥</Text><Text style={s.choiceTitle}>No authenticated ranking feed yet</Text><Text style={s.bodyText}>Personal contribution and fair power-bracket views will appear here after verification.</Text></View></Card>;
}

const stories=[
 {id:'caravan',name:'Broken Caravan',accent:'#D8B17C',summary:'Survey the crossing, defend the wagons and rebuild the convoy.',approach:['Safe Pass','Fast Pass'],finale:['Brace Wagons','Disrupt Raiders']},
 {id:'hunt',name:'Nightfall Hunt',accent:'#A7B3DF',summary:'Follow the tracks, flush out the pack and prepare the final trap.',approach:['Clear Trail','Shadow Trail'],finale:['Hold Ground','Hunt the Alpha']},
 {id:'wards',name:'Broken Wards',accent:'#B6A6E0',summary:'Trace unstable runes and restore the circle before it collapses.',approach:['Ground Spires','Charge Sigils'],finale:['Protect Wards','Overload Wards']},
 {id:'reliquary',name:'Lost Reliquary',accent:'#9FD4CC',summary:'Read the mirrored glyphs and choose what happens to the seal.',approach:['Quiet Passage','Deep Passage'],finale:['Preserve Seals','Break Seals']},
] as const;
function PartyContents({s,C,accent,tab,onTab,hasParty,members,onOpenParty}:Shared&{tab:string;onTab:(tab:string)=>void;hasParty:boolean;members:number;onOpenParty:()=>void}){
 const [storyId,setStoryId]=useState<(typeof stories)[number]['id']>('caravan');
 const [choice,setChoice]=useState<'secure'|'swift'|null>(null);
 const [finalChoice,setFinalChoice]=useState<'secure'|'swift'|null>(null);
 const [ballot,setBallot]=useState<'approach'|'finale'>('approach');
 const story=stories.find(e=>e.id===storyId)??stories[0];
 if(tab==='adventure')return <>
  <Card s={s}><SectionHeading s={s} kicker="WEEK-LONG ADVENTURES" title="One journey, four possible stories" sub="Three evolving stages, team decisions and a finale. The event cycle is 21 days."/>
   <View style={s.statRow}><Stat s={s} label="PARTY SIZE" value="2–4"/><Stat s={s} label="STORY" value="7 days"/><Stat s={s} label="SETTLEMENT" value="Day 8"/></View>
   <View style={s.warning}><Text style={s.warningTitle}>{hasParty?'Your Party is connected':'No active Party'}</Text><Text style={s.bodyText}>{hasParty?members+' current members. The weekly adventure prototype is not yet live.':'Create or join a Party to prepare for future events. Any valid Tank, Damage and Support role mix is allowed.'}</Text></View>
   {!hasParty?<Action label="Open Party" s={s} onPress={onOpenParty}/>:null}
  </Card>
  <Card s={s}><SectionHeading s={s} kicker="STORY SELECTION · PREVIEW" title="Explore the event families"/>
   {stories.map(storyOption=><Pressable key={storyOption.id} accessibilityRole="button" accessibilityState={{selected:story.id===storyOption.id}} onPress={()=>{setStoryId(storyOption.id);setChoice(null);setFinalChoice(null);setBallot('approach')}} style={[s.choice,story.id===storyOption.id&&{borderColor:storyOption.accent,backgroundColor:C.panelRaised}]}>
    <View style={[s.motif,{borderColor:storyOption.accent}]}><Text style={[s.motifGlyph,{color:storyOption.accent}]}>✦</Text></View><View style={s.flex}><Text style={s.choiceTitle}>{storyOption.name}</Text><Text style={s.choiceSub}>{storyOption.summary}</Text></View>
   </Pressable>)}
   <Action label="Inspect the story stages" s={s} onPress={()=>onTab('stages')}/>
  </Card>
 </>;
 if(tab==='stages')return <>
  <Card s={s}><SectionHeading s={s} kicker={'STORY · '+story.name.toUpperCase()} title="Three stages, one finale" sub={story.summary}/>
   {[
    ['01','Scout','Discover routes and gather clues. Noncombat choices are available.'],
    ['02','Confront','Fight stage-specific foes and commit a verified choice.'],
    ['03','Prepare','Commit supplies and lock the path to the final boss.'],
   ].map(([index,title,description])=><View key={index} style={s.storyStage}><Text style={[s.storyNumber,{color:story.accent}]}>{index}</Text><View style={s.flex}><Text style={s.choiceTitle}>{title}</Text><Text style={s.bodyText}>{description}</Text></View></View>)}
   <Action label="Inspect supply preparation" s={s} onPress={()=>onTab('supplies')}/>
  </Card>
 </>;
 if(tab==='supplies')return <Card s={s}><SectionHeading s={s} kicker="SHARED PREPARATION" title="Contribute together" sub="Preparation consumes verified resources only when submitted to the real server. No preview contributions affect the economy."/>
  {['Timber for defenses','Ore for reinforcement','Herbs for recovery'].map((entry,i)=><View key={entry} style={s.detailRow}><Text style={[s.index,{color:accent}]}>{i+1}</Text><View style={s.flex}><Text style={s.choiceTitle}>{entry}</Text><Text style={s.choiceSub}>Authoritative inventory check required</Text></View><Tag s={s} label="Preview"/></View>)}
  <Action label="Contribute · Not available" s={s} disabled/>
 </Card>;
 if(tab==='vote')return <Card s={s}><SectionHeading s={s} kicker="TWO LOCKED PARTY BALLOTS" title="The party decides" sub="Every story has a Stage 2 route and a later Stage 3 finale plan. Try the local preview; no votes are sent."/>
  <View style={s.stepRow}><Action label="Stage 2 · Approach" s={s} secondary={ballot!=='approach'} onPress={()=>setBallot('approach')}/><Action label="Stage 3 · Finale" s={s} secondary={ballot!=='finale'} onPress={()=>setBallot('finale')}/></View>
  {([0,1] as const).map(index=>{const id=index===0?'secure':'swift';const selected=ballot==='approach'?choice:finalChoice;const title=(ballot==='approach'?story.approach:story.finale)[index];return <Pressable key={id} accessibilityRole="radio" accessibilityState={{checked:selected===id}} onPress={()=>ballot==='approach'?setChoice(id):setFinalChoice(id)} style={[s.choice,selected===id&&{borderColor:accent,backgroundColor:C.panelRaised}]}>
   <View style={[s.radio,selected===id&&{borderColor:accent}]}>{selected===id?<View style={[s.radioInner,{backgroundColor:accent}]}/>:null}</View><View style={s.flex}><Text style={s.choiceTitle}>{title}</Text><Text style={s.choiceSub}>{ballot==='approach'?'Stage 2 · Approach choice':'Stage 3 · Finale preparation'}</Text></View>
  </Pressable>;})}
  <Text style={s.finePrint}>Local example: Stage 2 · {choice?story.approach[choice==='secure'?0:1]:'no choice'}; Stage 3 · {finalChoice?story.finale[finalChoice==='secure'?0:1]:'no choice'}. Nothing submitted.</Text>
  <Action label="Cast vote · Server unavailable" s={s} disabled/>
 </Card>;
 return <Card s={s}><SectionHeading s={s} kicker={'FINALE · '+story.name.toUpperCase()} title="A decisive encounter" sub="Real class skills, companions, stage choices and server-verified preparation will determine the finale."/>
  <View style={s.statRow}><Stat s={s} label="PARTY" value="2–4"/><Stat s={s} label="ROUTES" value="2 votes"/><Stat s={s} label="REWARD" value="Day 8"/></View>
  <View style={s.empty}><Text style={s.emptyGlyph}>⚔</Text><Text style={s.choiceTitle}>Finale preview is under construction</Text><Text style={s.bodyText}>No combat, event points or claims can be initiated from this screen yet.</Text></View>
  <Action label="Enter finale · Not available" s={s} disabled/>
 </Card>;
}

const samples=[
 {id:'ore',name:'Iron Ore',type:'Resources',amount:40,unit:18},
 {id:'timber',name:'Oak Logs',type:'Resources',amount:25,unit:12},
 {id:'fang',name:'Wolf Fang',type:'Materials',amount:6,unit:86},
 {id:'gem',name:'Effect Gem',type:'Gems',amount:1,unit:740},
] as const;
function MarketContents({s,C,accent,tab}:Shared&{tab:string}){
 const [category,setCategory]=useState('All'),[query,setQuery]=useState(''),[selected,setSelected]=useState<string|null>(null);
 const [quantity,setQuantity]=useState('10'),[price,setPrice]=useState('20'),[review,setReview]=useState(false);
 const filtered=samples.filter(item=>(category==='All'||item.type===category)&&item.name.toLowerCase().includes(query.trim().toLowerCase()));
 const qty=Math.min(99999,Math.max(0,Math.floor(Number(quantity)||0))),per=Math.min(99999999,Math.max(0,Math.floor(Number(price)||0)));
 const gross=qty*per,fee=Math.ceil(gross*.05),net=gross-fee;
 if(tab==='browse')return <>
  <Card s={s}><SectionHeading s={s} kicker="SEARCH & DISCOVER" title="Find your next upgrade" sub="Illustrative listings. Final quotes, availability and equipment eligibility must be read from the authenticated Market service."/>
   <TextInput accessibilityLabel="Search example market items" value={query} onChangeText={setQuery} placeholder="Search resources, gems, equipment…" placeholderTextColor={C.muted} style={s.input}/>
   <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>{['All','Resources','Materials','Gems'].map(entry=><Pressable key={entry} accessibilityRole="button" accessibilityState={{selected:category===entry}} onPress={()=>setCategory(entry)} style={[s.filter,category===entry&&{borderColor:accent,backgroundColor:C.panelRaised}]}><Text style={[s.filterText,category===entry&&{color:C.text}]}>{entry}</Text></Pressable>)}</ScrollView>
   <View style={s.resultCount}><Text style={s.finePrint}>{filtered.length} example results</Text><Tag s={s} label="Sample data" accent={accent}/></View>
   {filtered.length===0?<View style={s.empty}><Text style={s.bodyText}>No example items match this search.</Text></View>:filtered.map(item=><Pressable key={item.id} accessibilityRole="button" accessibilityState={{expanded:selected===item.id}} onPress={()=>setSelected(selected===item.id?null:item.id)} style={[s.marketRow,selected===item.id&&{borderColor:accent}]}>
    <View style={s.marketSymbol}><Text style={s.marketSymbolText}>{item.type==='Resources'?'▤':item.type==='Gems'?'◇':'✥'}</Text></View>
    <View style={s.flex}><Text style={s.choiceTitle}>{item.name}</Text><Text style={s.choiceSub}>{item.type} · Example lot of {item.amount}</Text></View>
    <View style={s.priceBlock}><Text style={s.goldPrice}>{(item.unit*item.amount).toLocaleString('en-US')} G</Text><Text style={s.choiceSub}>{item.unit} each</Text></View>
   </Pressable>)}
   {selected?<View style={s.detailPanel}><Text style={s.guideHeading}>Listing inspection</Text><Text style={s.bodyText}>Verified sale history, exact item eligibility, seller confirmation and secure purchase will be shown here after launch.</Text><Action label="Purchase · Market unavailable" s={s} disabled/></View>:null}
  </Card>
 </>;
 if(tab==='sell')return <Card s={s}><SectionHeading s={s} kicker="CREATE A LISTING · CALCULATOR" title="Know the payout first" sub="Try a sample listing price. This calculator does not inspect inventory, reserve items or post an offer."/>
   <Text style={s.detailLabel}>EXAMPLE QUANTITY</Text><TextInput value={quantity} onChangeText={value=>{setQuantity(value);setReview(false)}} keyboardType="numeric" accessibilityLabel="Example quantity" style={s.input}/>
   <Text style={s.detailLabel}>EXAMPLE PRICE PER UNIT · GOLD</Text><TextInput value={price} onChangeText={value=>{setPrice(value);setReview(false)}} keyboardType="numeric" accessibilityLabel="Example unit price" style={s.input}/>
   <View style={s.invoice}><View style={s.detailRow}><Text style={s.bodyText}>Gross sale</Text><Text style={s.choiceTitle}>{gross.toLocaleString('en-US')} Gold</Text></View>
    <View style={s.detailRow}><Text style={s.bodyText}>Seller fee · 5%</Text><Text style={s.choiceTitle}>−{fee.toLocaleString('en-US')} Gold</Text></View>
    <View style={s.detailRow}><Text style={s.choiceTitle}>Estimated seller payout</Text><Text style={[s.goldPrice,{fontSize:18}]}>{net.toLocaleString('en-US')} Gold</Text></View>
   </View>
   <Action label="Review example calculation" s={s} onPress={()=>setReview(true)} disabled={gross<=0}/>
   {review?<View style={s.warning}><Text style={s.warningTitle}>Example review complete</Text><Text style={s.bodyText}>No listing has been submitted. Live selling will additionally enforce item ownership, minimum lot sizes, price corridors and safe escrow.</Text></View>:null}
   <Action label="Publish listing · Not available" s={s} disabled/>
  </Card>;
 if(tab==='listings')return <Card s={s}><SectionHeading s={s} kicker="YOUR MARKET ACTIVITY" title="My Listings" sub="Only real server-owned offers can appear here. Cancelling, expiry and escrow return must preserve exact items."/><View style={s.empty}><Text style={s.emptyGlyph}>▦</Text><Text style={s.choiceTitle}>Trading is not released</Text><Text style={s.bodyText}>No listings or ownership records are loaded into this design preview.</Text></View></Card>;
 return <Card s={s}><SectionHeading s={s} kicker="SECURE DELIVERIES" title="Market Inbox" sub="The existing Rewards Inbox contains the gated Market claim tab. This preview does not create a second reward wallet."/><View style={s.empty}><Text style={s.emptyGlyph}>✉</Text><Text style={s.choiceTitle}>No connected deliveries</Text><Text style={s.bodyText}>Bought, sold, expired and returned records will be shown only when verified by the service.</Text></View></Card>;
}

function makeStyles(C:ThemeColors){
 return StyleSheet.create({
  root:{flex:1,backgroundColor:C.bg},page:{padding:spacing.md,paddingBottom:34,gap:spacing.md},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',minHeight:40},
  headerRight:{flexDirection:'row',alignItems:'center',gap:10},smallButton:{paddingHorizontal:12,minHeight:40,justifyContent:'center',borderRadius:radii.sm,borderColor:C.lineStrong,borderWidth:1},smallButtonText:{color:C.text,fontWeight:'800',fontSize:12},
  privateLabel:{fontSize:10,fontWeight:'900',letterSpacing:1,color:C.muted},help:{width:40,height:40,borderRadius:20,borderWidth:1,borderColor:C.lineStrong,backgroundColor:C.panel,alignItems:'center',justifyContent:'center'},helpText:{color:C.text,fontSize:20,fontWeight:'800'},
  hero:{height:190,borderWidth:1,borderRadius:radii.md,overflow:'hidden',justifyContent:'flex-end',backgroundColor:C.panel},heroImage:{opacity:.8},heroShade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(2,7,12,.54)'},heroCopy:{padding:spacing.lg,gap:5},eyebrow:{fontWeight:'900',letterSpacing:1.7,fontSize:10},heroTitle:{color:'#FFFFFF',fontSize:29,lineHeight:35,fontWeight:'900'},heroSub:{color:'#F4F1E9',fontSize:13,lineHeight:18,fontWeight:'700'},
  qaNote:{flexDirection:'row',alignItems:'flex-start',gap:8,padding:10,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel},qaSymbol:{fontSize:20,fontWeight:'900'},qaText:{color:C.muted,fontSize:11,lineHeight:17,flex:1},
  tabs:{gap:7,paddingVertical:2},tab:{minHeight:44,justifyContent:'center',paddingHorizontal:13,borderRadius:radii.sm,borderWidth:1,borderColor:C.line,backgroundColor:C.panel},tabText:{color:C.muted,fontSize:12,fontWeight:'800'},
  card:{gap:12,padding:spacing.md,borderRadius:radii.md,borderWidth:1,borderColor:C.lineStrong,backgroundColor:C.panel},sectionHead:{gap:4},kicker:{color:C.accent,fontSize:10,fontWeight:'900',letterSpacing:1.5},cardTitle:{...typography.title,color:C.text},bodyText:{...typography.body,color:C.muted,fontSize:12,lineHeight:18},finePrint:{color:C.muted,fontSize:11,lineHeight:16},
  statRow:{flexDirection:'row',gap:8},stat:{flex:1,minWidth:0,padding:9,borderRadius:radii.sm,backgroundColor:C.panelRaised,borderWidth:1,borderColor:C.line,gap:3},statLabel:{fontSize:9,fontWeight:'900',letterSpacing:.7,color:C.muted},statValue:{fontSize:15,lineHeight:21,fontWeight:'900',color:C.text},statHint:{color:C.muted,fontSize:10},
  stepRow:{flexDirection:'row',gap:6,flexWrap:'wrap'},tag:{paddingHorizontal:9,paddingVertical:5,borderRadius:radii.sm,borderWidth:1,borderColor:C.lineStrong,backgroundColor:C.panel2,alignSelf:'flex-start'},tagText:{color:C.muted,fontSize:10,fontWeight:'800'},choice:{flexDirection:'row',alignItems:'center',gap:10,padding:10,minHeight:60,borderRadius:radii.sm,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},choiceTitle:{color:C.text,fontSize:13,lineHeight:19,fontWeight:'800'},choiceSub:{fontSize:11,lineHeight:16,color:C.muted},choiceArrow:{fontSize:20,fontWeight:'900'},motif:{width:43,height:43,justifyContent:'center',alignItems:'center',borderWidth:1,borderRadius:radii.sm},motifGlyph:{fontSize:27,fontWeight:'900'},flex:{flex:1,minWidth:0},action:{minHeight:46,paddingHorizontal:14,paddingVertical:11,alignItems:'center',justifyContent:'center',borderRadius:radii.sm,backgroundColor:C.primaryButton,borderColor:C.primaryButtonBorder,borderWidth:1},actionText:{color:C.primaryButtonText,fontWeight:'900',fontSize:12,textAlign:'center'},secondaryAction:{backgroundColor:C.secondaryButton,borderColor:C.secondaryButtonBorder},secondaryActionText:{color:C.secondaryButtonText},disabledAction:{opacity:.56},disabledText:{color:C.muted},
  detailLabel:{color:C.muted,fontSize:10,fontWeight:'900',letterSpacing:.8},detailRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:9,paddingVertical:10,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.line},index:{color:C.muted,fontSize:15,fontWeight:'900',width:28},track:{height:9,borderRadius:radii.sm,backgroundColor:C.line,overflow:'hidden'},progress:{height:'100%',borderRadius:radii.sm},warning:{gap:4,padding:11,borderRadius:radii.sm,borderWidth:1,borderColor:C.warning,backgroundColor:C.warningSurface},warningTitle:{color:C.warning,fontSize:12,fontWeight:'900'},
  rewardPanel:{flexDirection:'row',alignItems:'center',gap:10,padding:12,borderRadius:radii.sm,backgroundColor:C.panelRaised,borderWidth:1,borderColor:C.line},rewardGlyph:{fontSize:30},timelineRow:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:5},timelineDot:{width:30,height:30,alignItems:'center',justifyContent:'center',borderRadius:15,borderWidth:1},timelineNumber:{fontSize:12,fontWeight:'900'},
  empty:{minHeight:140,alignItems:'center',justifyContent:'center',padding:14,gap:8,backgroundColor:C.panel2,borderRadius:radii.sm},emptyGlyph:{fontSize:34,color:C.muted},storyStage:{flexDirection:'row',gap:15,alignItems:'flex-start',paddingVertical:12,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.line},storyNumber:{fontSize:21,fontWeight:'900'},radio:{width:22,height:22,borderWidth:2,borderRadius:11,borderColor:C.muted,alignItems:'center',justifyContent:'center'},radioInner:{width:10,height:10,borderRadius:5},
  input:{color:C.text,backgroundColor:C.inputBg,borderColor:C.lineStrong,borderWidth:1,minHeight:46,borderRadius:radii.sm,paddingHorizontal:12,fontSize:13},filters:{gap:7},filter:{paddingHorizontal:12,minHeight:40,justifyContent:'center',borderRadius:radii.sm,borderWidth:1,borderColor:C.line},filterText:{fontSize:11,fontWeight:'800',color:C.muted},resultCount:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},marketRow:{flexDirection:'row',alignItems:'center',gap:9,padding:10,borderWidth:1,borderRadius:radii.sm,borderColor:C.line,backgroundColor:C.panel2,minHeight:65},marketSymbol:{height:40,width:40,borderRadius:radii.sm,backgroundColor:C.panelRaised,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.lineStrong},marketSymbolText:{fontSize:23,color:C.accent},priceBlock:{alignItems:'flex-end'},goldPrice:{fontSize:13,fontWeight:'900',color:C.warning},detailPanel:{gap:8,padding:12,borderWidth:1,borderColor:C.lineStrong,borderRadius:radii.sm},invoice:{padding:10,backgroundColor:C.panel2,borderRadius:radii.sm,gap:3},footer:{paddingTop:8,alignItems:'center'},footerText:{fontSize:9,fontWeight:'900',color:C.disabled,letterSpacing:1},
  partyDock:{minHeight:60,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:14,borderTopWidth:2,backgroundColor:C.panelRaised},dockGlyph:{width:32,height:32,alignItems:'center',justifyContent:'center',borderRadius:radii.sm,borderWidth:1},dockGlyphText:{fontSize:18,fontWeight:'900'},dockTitle:{color:C.text,fontSize:12,fontWeight:'900'},dockDescription:{color:C.muted,fontSize:11},dockArrow:{fontSize:25,fontWeight:'700',color:C.text},unread:{minWidth:22,height:22,paddingHorizontal:4,alignItems:'center',justifyContent:'center',backgroundColor:C.notification,borderRadius:11},unreadText:{fontSize:10,fontWeight:'900',color:C.notificationText},
  modalShade:{flex:1,justifyContent:'center',padding:18,backgroundColor:C.overlay},modal:{gap:13,maxHeight:'80%',padding:16,borderRadius:radii.lg,borderWidth:1,borderColor:C.lineStrong,backgroundColor:C.panel},modalHeading:{flexDirection:'row',alignItems:'center'},guideScroll:{flexGrow:0},guideTopic:{gap:4,paddingVertical:10,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.line},guideHeading:{color:C.text,fontSize:13,fontWeight:'900'},
 });
}
