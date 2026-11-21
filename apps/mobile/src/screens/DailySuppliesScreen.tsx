import {useEffect,useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import type {GameCommand} from '../core/game-commands';
import {accountText,accountDuration,accountError} from '../i18n/account';
import {DAILY_SUPPLY_BOOST_TYPES,DAILY_SUPPLY_MILESTONES,dailySupplyRewardForDay,dailySuppliesStatus,dailySupplyBoostLabel,dailySupplyBank,dailySupplyQueued,activeDailySupplyBoosts,dailySupplyBonusText,type DailySupplyBoostType} from '../core/daily-supplies';
import {Panel} from '../components/Panel';
import {GameButton} from '../components/GameButton';
import {ActionFeedback,type FeedbackTone} from '../components/ActionFeedback';
import {StatusPill} from '../components/StatusPill';
import {UiIcon} from '../components/UiIcon';
import {SupplyJourneyGlyph} from '../components/SupplyJourneyGlyph';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

const CHAPTERS=[1,2,3,4] as const;
const durationHours=(seconds:number)=>Math.round(seconds/3600)+'h';

export function DailySuppliesScreen({state,nowMs=Date.now(),onCommand}:{state:GameState;nowMs?:number;onCommand:(command:GameCommand)=>Promise<void>}){
 const language=state.settings.language,a=(text:string,params?:Record<string,string|number>)=>accountText(language,text,params);
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const status=dailySuppliesStatus(state,nowMs),total=state.account.dailySupplies?.totalClaims??0;
 const displayCycle=status.canClaim?status.cycle:Math.max(1,Math.ceil(total/28));
 const completed=status.canClaim?total%28:total>0?(total-1)%28+1:0;
 const claimDay=status.canClaim?status.dayInTrack:completed||1;
 const [tab,setTab]=useState<'path'|'vault'>('path');
 const [week,setWeek]=useState(Math.ceil(claimDay/7));
 const [selectedDay,setSelectedDay]=useState(claimDay);
 const [blessing,setBlessing]=useState<DailySupplyBoostType>('gathering_speed');
 const [busy,setBusy]=useState(false);
 const [feedback,setFeedback]=useState<{message:string;tone:FeedbackTone}|null>(null);
 const [showRules,setShowRules]=useState(false);
 const active=activeDailySupplyBoosts(state),bank=dailySupplyBank(state),queued=dailySupplyQueued(state);
 const activeCount=DAILY_SUPPLY_BOOST_TYPES.filter(type=>!!active[type]).length;
 const savedCount=DAILY_SUPPLY_BOOST_TYPES.reduce((count,type)=>count+(bank[type]?.length??0),0);
 const reward=dailySupplyRewardForDay(selectedDay,displayCycle);
 const isToday=status.canClaim&&status.dayInTrack===selectedDay&&status.cycle===displayCycle;
 const isClaimed=selectedDay<=completed;

 useEffect(()=>{if(status.canClaim&&status.dayInTrack!==selectedDay&&status.dayInTrack>completed){setSelectedDay(status.dayInTrack);setWeek(Math.ceil(status.dayInTrack/7));}},[status.currentDayKey,status.canClaim,status.dayInTrack]);
 async function run(command:GameCommand,success:string){
  if(busy)return;
  setBusy(true);setFeedback(null);
  try{await onCommand(command);setFeedback({message:success,tone:'success'})}
  catch(error){setFeedback({message:error instanceof Error?error.message:'Daily Supplies action failed.',tone:'error'})}
  finally{setBusy(false)}
 }
 const resetToday=()=>{setWeek(Math.ceil(claimDay/7));setSelectedDay(claimDay);setTab('path')};
 const selectDay=(day:number)=>{setSelectedDay(day);setWeek(Math.ceil(day/7))};
 const milestone=reward.kind==='milestone';
 const todayReward=status.reward;
 return <ScrollView contentContainerStyle={s.root} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
  <View style={s.headingRow}><View style={s.flex}><Text style={s.kicker}>{a('ACCOUNT / DAILY REWARDS')}</Text><Text accessibilityRole="header" style={s.heading}>{a('Supply Journey')}</Text><Text style={s.copy}>{a('One claim per UTC day. Missed days pause, never reset, the journey.')}</Text></View><View style={s.chapterIcon}><UiIcon name="rewards" size={26}/></View></View>
  <View style={s.tabs}>
   <Pressable accessibilityRole="tab" accessibilityState={{selected:tab==='path'}} onPress={()=>setTab('path')} style={[s.tab,tab==='path'&&s.tabSelected]}><Text style={[s.tabText,tab==='path'&&s.tabTextSelected]}>{a('Reward Path')}</Text></Pressable>
   <Pressable accessibilityRole="tab" accessibilityState={{selected:tab==='vault'}} onPress={()=>setTab('vault')} style={[s.tab,tab==='vault'&&s.tabSelected]}><Text style={[s.tabText,tab==='vault'&&s.tabTextSelected]}>{a('Boost Vault')} · {savedCount}</Text></Pressable>
  </View>
  {tab==='path'?<>
   <Panel style={s.progressPanel}>
    <View style={s.between}><Text style={s.title}>{a('Journey {cycle}',{cycle:displayCycle})}</Text><StatusPill label={status.canClaim?a('READY'):a('CLAIMED TODAY')} tone={status.canClaim?'good':'muted'}/></View>
    <View accessibilityRole="progressbar" accessibilityLabel={a('Supply Journey progress')} accessibilityValue={{min:0,max:28,now:completed}} style={s.progress}><View style={[s.progressFill,{width:(completed/28*100)+'%'}]}/></View>
    <Text style={s.meta}>{a('{count}/28 rewards claimed',{count:completed})}</Text>
   </Panel>
   <View style={s.chapters}>{CHAPTERS.map(number=><Pressable key={number} accessibilityRole="button" accessibilityState={{selected:week===number}} onPress={()=>{setWeek(number);setSelectedDay(number===Math.ceil(claimDay/7)?claimDay:(number-1)*7+1)}} style={[s.chapter,week===number&&s.chapterSelected]}><Text style={[s.chapterLabel,week===number&&s.chapterSelectedLabel]}>{a('CH. {number}',{number})}</Text><Text style={s.meta}>{(number-1)*7+1}–{number*7}</Text></Pressable>)}</View>
   <Panel>
    <View style={s.between}><Text style={s.title}>{a('Chapter {chapter}',{chapter:week})}</Text><Text style={s.meta}>{(week-1)*7+1}–{week*7} / 28</Text></View>
    <View style={s.days}>{Array.from({length:7},(_,index)=>(week-1)*7+index+1).map(day=>{
     const claimed=day<=completed,ready=status.canClaim&&day===status.dayInTrack&&displayCycle===status.cycle,chosen=selectedDay===day,gem=!!DAILY_SUPPLY_MILESTONES[day];
     return <Pressable key={day} accessibilityRole="button" accessibilityState={{selected:chosen}} accessibilityLabel={a('Day {day}',{day})+(claimed?', claimed':ready?', ready':'')+(gem?', milestone':'')} onPress={()=>selectDay(day)} style={[s.day,claimed&&s.dayClaimed,ready&&s.dayReady,gem&&s.dayMilestone,chosen&&s.daySelected]}><Text style={[s.dayNumber,claimed&&s.dayDone]}>{day}</Text><Text style={[s.daySymbol,claimed&&s.dayDone]}>{claimed?'✓':gem?'◆':ready?'✦':'◇'}</Text></Pressable>;
    })}</View>
    <Text style={s.meta}>{a('Select a day to inspect its reward. Milestone days are marked with a diamond.')}</Text>
   </Panel>
   <Panel accentColor={milestone?C.special:C.selectionLine} accentSurface={milestone?C.specialSurface:undefined} style={s.rewardPanel}>
    <View style={s.between}><Text style={s.kicker}>{a('DAY {day} REWARD',{day:selectedDay})}</Text><StatusPill label={isClaimed?a('COLLECTED'):isToday?a('AVAILABLE'):a('PREVIEW')} tone={isClaimed?'muted':isToday?'good':'info'}/></View>
    <View style={s.rewardRow}><View style={[s.rewardGlyph,milestone&&s.rewardGlyphSpecial]}><SupplyJourneyGlyph kind={milestone?'milestone':reward.type} size={46}/></View><View style={s.flex}><Text style={s.rewardName}>{milestone?a('Supply Blessing'):a(dailySupplyBoostLabel(reward.type))}</Text><Text style={s.rewardAmount}>{dailySupplyBonusText(reward.bonus)} · {durationHours(reward.seconds)}</Text><Text style={s.meta}>{milestone?a('Choose one enhanced buff to store'):a('Stored until activated · time drains only during eligible activity')}</Text></View></View>
    {milestone&&isToday?<View style={s.blessingBox}><Text style={s.label}>{a('CHOOSE YOUR BLESSING')}</Text><View style={s.choices}>{DAILY_SUPPLY_BOOST_TYPES.map(type=><Pressable key={type} accessibilityRole="radio" accessibilityState={{selected:blessing===type}} disabled={busy} onPress={()=>setBlessing(type)} style={[s.choice,blessing===type&&s.choiceSelected]}><SupplyJourneyGlyph kind={type} size={24}/><Text style={[s.choiceText,blessing===type&&s.choiceTextSelected]}>{a(dailySupplyBoostLabel(type))}</Text></Pressable>)}</View></View>:null}
    {isToday?<GameButton title={milestone?a('Claim Supply Blessing'):a('Claim Today’s Supply')} disabled={busy} loading={busy} onPress={()=>run({type:'daily_supplies_claim',args:{characterId:state.character!.id,...(todayReward.kind==='milestone'?{choiceType:blessing}:{})}},a('Reward banked account-wide.'))}/>:isClaimed?<GameButton title={a('Reward Collected')} disabled onPress={()=>{}}/>:<GameButton tone="secondary" title={a('View Current Claim')} onPress={resetToday}/>}
   </Panel>
   <Panel>
    <Text style={s.title}>{a('Chapter Milestones')}</Text>
    <View style={s.milestones}>{CHAPTERS.map((_,index)=>{const day=(index+1)*7,m=DAILY_SUPPLY_MILESTONES[day];return <View key={day} style={[s.milestone,completed>=day&&s.milestoneDone]}><Text style={s.milestoneGlyph}>{completed>=day?'✓':'◆'}</Text><Text style={s.milestoneLabel}>{a('DAY {day}',{day})}</Text><Text style={s.milestoneAmount}>{dailySupplyBonusText(m.bonus)}</Text><Text style={s.milestoneDuration}>{durationHours(m.seconds)}</Text></View>})}</View>
   </Panel>
   <GameButton tone="secondary" title={a('Open Boost Vault')+' · '+savedCount} onPress={()=>setTab('vault')}/>
  </>:<>
   <Panel accentColor={C.special} accentSurface={C.specialSurface}><View style={s.between}><View style={s.flex}><Text style={s.title}>{a('Boost Vault')}</Text><Text style={s.copy}>{a('Five activity bonuses, saved across all your characters.')}</Text></View><UiIcon name="rewards" size={28}/></View><Text style={s.meta}>{activeCount}/5 {a('active')} · {savedCount} {a('saved')}</Text></Panel>
   {DAILY_SUPPLY_BOOST_TYPES.map(type=>{
    const current=active[type],charges=bank[type]??[],queuedCount=queued[type]?.length??0;
    const best=charges.reduce((top,entry)=>Math.max(top,entry.bonus),0);
    return <Panel key={type}><View style={s.vaultRow}><View style={s.boostGlyph}><SupplyJourneyGlyph kind={type} size={32}/></View><View style={s.flex}><Text style={s.boostName}>{a(dailySupplyBoostLabel(type))}</Text><Text style={s.meta}>{current?dailySupplyBonusText(current.bonus)+' · '+accountDuration(language,current.remainingSeconds)+' '+a('left'):a('No active boost')}</Text><Text style={s.meta}>{charges.length} {a('saved')}{queuedCount?' · '+queuedCount+' '+a('queued'):''}{best?' · '+a('best')+' '+dailySupplyBonusText(best):''}</Text></View></View>
     <GameButton compact tone="secondary" selected={!!current} disabled={busy||charges.length===0} title={charges.length?a('Activate strongest saved')+(current?' / queue':''):a('No saved boosts')} onPress={()=>run({type:'daily_supplies_activate',args:{type}},a(dailySupplyBoostLabel(type))+' '+a('activated or queued.'))}/>
    </Panel>;
   })}
   <GameButton tone="secondary" title={a('Back to Reward Path')} onPress={()=>setTab('path')}/>
  </>}
  <Pressable accessibilityRole="button" accessibilityState={{expanded:showRules}} onPress={()=>setShowRules(value=>!value)} style={s.rulesToggle}><View style={s.flex}><Text style={s.label}>{a('HOW SUPPLY BUFFS WORK')}</Text><Text style={s.meta}>{a('Activity time, strongest bonus and stacking')}</Text></View><Text style={s.rulesArrow}>{showRules?'−':'+'}</Text></Pressable>
  {showRules?<Panel>
   <Text style={s.copy}>{a('Only the strongest Supply buff of a category applies. Weaker active buffs pause while a stronger one runs, then resume.')}</Text>
   <Text style={s.copy}>{a('Supply buffs affect account-wide stored bonuses but use a shared timer across characters. Different categories can run together.')}</Text>
   <Text style={s.copy}>{a('Event boosts, candy, pets and independent bonuses still stack according to their own rules.')}</Text>
   <Text style={s.copy}>{a('Gathering Speed covers mining, woodcutting, fishing and herbalism. Crafting Speed accelerates timed processing, alchemy and Equipment Forge jobs; instant recipes have no waiting time to shorten.')}</Text>
   <Text style={s.copy}>{a('Forge jobs across all slots share one Crafting Speed timer. When timed alchemy or processing runs at the same time, it takes priority and Forge uses its regular speed, preventing double consumption.')}</Text>
   <Text style={s.copy}>{a('Combat Speed applies to ordinary idle hunts, not dungeon, boss or PvP cooldowns. Supply buffs do not extend Offline Reserve.')}</Text>
  </Panel>:null}
  {feedback?<ActionFeedback message={feedback.tone==='error'?accountError(language,feedback.message):a(feedback.message)} tone={feedback.tone} reduceMotion={state.settings.reduceMotion}/>:null}
 </ScrollView>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{padding:spacing.lg,gap:spacing.md,paddingBottom:116},headingRow:{flexDirection:'row',alignItems:'center',gap:12},flex:{flex:1,minWidth:0},
 kicker:{...typography.caption,color:C.accentSoft,fontWeight:'900',letterSpacing:1},
 heading:{...typography.hero,color:C.text},copy:{...typography.body,color:C.muted,lineHeight:20},
 title:{...typography.title,color:C.text},label:{...typography.caption,color:C.muted,fontWeight:'900',letterSpacing:.6},
 meta:{...typography.caption,color:C.muted},between:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 chapterIcon:{width:50,height:50,borderRadius:11,backgroundColor:C.panel2,borderWidth:1,borderColor:C.selectionLine,alignItems:'center',justifyContent:'center'},
 tabs:{flexDirection:'row',backgroundColor:C.panel2,borderRadius:radii.md,padding:4,gap:4,borderWidth:1,borderColor:C.line},
 tab:{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',paddingHorizontal:5,borderRadius:radii.sm},
 tabSelected:{backgroundColor:C.selection,borderBottomWidth:2,borderColor:C.selectionLine},
 tabText:{...typography.bodyStrong,color:C.muted,textAlign:'center'},tabTextSelected:{color:C.text},
 progressPanel:{gap:8},progress:{height:8,borderRadius:4,backgroundColor:C.panel2,overflow:'hidden'},progressFill:{height:'100%',backgroundColor:C.good},
 chapters:{flexDirection:'row',gap:6},chapter:{flex:1,minWidth:0,minHeight:52,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel,alignItems:'center',justifyContent:'center',gap:3,padding:3},
 chapterSelected:{borderColor:C.selectionLine,backgroundColor:C.selection},chapterLabel:{...typography.caption,color:C.muted,fontWeight:'900'},chapterSelectedLabel:{color:C.text},
 days:{flexDirection:'row',gap:4},day:{flex:1,minWidth:0,height:51,borderWidth:1,borderColor:C.line,borderRadius:5,backgroundColor:C.panel2,alignItems:'center',justifyContent:'center'},
 dayClaimed:{backgroundColor:C.goodSurface,borderColor:C.good},dayReady:{backgroundColor:C.warningSurface,borderColor:C.warning},dayMilestone:{borderColor:C.special},daySelected:{borderWidth:2,borderColor:C.selectionLine},
 dayNumber:{fontSize:12,fontWeight:'900',color:C.text},daySymbol:{fontSize:15,color:C.muted,fontWeight:'900'},dayDone:{color:C.good},
 rewardPanel:{gap:12},rewardRow:{flexDirection:'row',alignItems:'center',gap:12},
 rewardGlyph:{width:66,height:66,borderWidth:2,borderColor:C.selectionLine,borderRadius:8,backgroundColor:C.panel2,alignItems:'center',justifyContent:'center'},
 rewardGlyphSpecial:{backgroundColor:C.specialSurface,borderColor:C.special},
 rewardName:{...typography.title,color:C.text},rewardAmount:{...typography.bodyStrong,color:C.good},
 blessingBox:{gap:8},choices:{flexDirection:'row',flexWrap:'wrap',gap:7},
 choice:{flexDirection:'row',alignItems:'center',gap:6,minHeight:44,borderWidth:1,borderColor:C.line,borderRadius:7,paddingHorizontal:10,paddingVertical:7,backgroundColor:C.panel2,justifyContent:'center'},
 choiceSelected:{borderColor:C.special,backgroundColor:C.specialSurface},choiceText:{...typography.caption,color:C.muted,fontWeight:'700'},choiceTextSelected:{color:C.text},
 milestones:{flexDirection:'row',gap:6},milestone:{flex:1,minWidth:0,backgroundColor:C.panel2,borderWidth:1,borderColor:C.special,borderRadius:8,paddingVertical:12,paddingHorizontal:3,alignItems:'center',gap:4},
 milestoneDone:{borderColor:C.good,backgroundColor:C.goodSurface},milestoneGlyph:{fontSize:19,color:C.special},milestoneLabel:{fontSize:10,fontWeight:'900',color:C.text},
 milestoneAmount:{fontSize:14,fontWeight:'900',color:C.text},milestoneDuration:{...typography.caption,color:C.muted},
 vaultRow:{flexDirection:'row',alignItems:'center',gap:12},boostGlyph:{width:46,height:46,borderWidth:1,borderColor:C.lineStrong,borderRadius:7,backgroundColor:C.panel2,justifyContent:'center',alignItems:'center'},
 boostName:{...typography.bodyStrong,color:C.text},
 rulesToggle:{minHeight:58,backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:radii.md,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:8},
 rulesArrow:{fontSize:24,fontWeight:'800',color:C.info},
 });}
