import {useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {ActiveActivity,ActivityKind,RewardBundle} from '../core/types';
import type {IdleResourceRate} from '../core/idle-activity-insights';
import type {LevelPaceProjection} from '../core/balance-projection';
import {activityStopPresentation} from '../core/activity-stop-presentation';
import {idleActivityInsights} from '../core/idle-activity-insights';
import {formatGameNumber} from '../core/number-format';
import {MONSTERS} from '../content/monsters';
import {useGameplayText} from '../i18n/gameplay';
import {useGameTheme} from '../theme/ThemeContext';
import {radii,spacing,type ThemeColors} from '../theme/theme';
import {ActivityArtwork} from './ActivityArtwork';
import {MonsterPortraitFrame} from './MonsterPortraitFrame';
import {ActivityCard} from './ActivityCard';
import {GameButton} from './GameButton';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';

type Props={
 title:string;kind:ActivityKind;activity:ActiveActivity;cycleSeconds:number;capHours:number;
 preview:RewardBundle;rates:{actionsPerHour:number;xpPerHour:number;goldPerHour:number};
 resourceRate?:IdleResourceRate;maxHp?:number;levelPace?:LevelPaceProjection;reduceMotion?:boolean;
 numberMode?:'exact'|'abbreviated';onClaim:()=>void;onStop:()=>void;
};
const kindNames:Record<ActivityKind,string>={combat:'HUNTING',mining:'MINING',woodcutting:'WOODCUTTING',fishing:'FISHING',herbalism:'HERBALISM',alchemy:'ALCHEMY',processing:'PROCESSING',faith:'FAITH',training:'TRAINING',exploration:'EXPLORATION'};
const unitNames:Record<ActivityKind,string>={combat:'kills',mining:'actions',woodcutting:'actions',fishing:'actions',herbalism:'actions',alchemy:'brews',processing:'crafts',faith:'practices',training:'drills',exploration:'routes'};
export function HomeActivityFocus(props:Props){
 const {gt,gl,language}=useGameplayText();
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const [detailOpen,setDetailOpen]=useState(false),[stopOpen,setStopOpen]=useState(false);
 const {kind,preview,activity,rates,resourceRate}=props;
 const insights=useMemo(()=>idleActivityInsights({kind,rates,preview,resource:resourceRate,maxHp:props.maxHp}),[kind,rates,preview,resourceRate,props.maxHp]);
 const formatted=(n:number)=>formatGameNumber(Math.max(0,Math.round(n)),props.numberMode??'abbreviated',language);
 const count=kind==='combat'?preview.kills:kind==='alchemy'||kind==='processing'?(preview.craftingActions??0):kind==='faith'?(preview.faithActions??0):kind==='training'?(preview.trainingActions??0):preview.kills;
 const canCollect=count>0||!!preview.stoppedReason;
 const capped=preview.elapsedSeconds>=props.capHours*3600;
 const stopped=!!preview.stoppedReason;
 const reserve=Math.max(0,props.capHours-preview.elapsedSeconds/3600);
 const progress=stopped||capped?100:Math.max(0,Math.min(100,100*(preview.nextProgressFraction??(preview.elapsedSeconds/Math.max(1,props.cycleSeconds)%1*Math.max(1,props.cycleSeconds))/Math.max(1,props.cycleSeconds))));
 const remaining=Math.max(1,Math.ceil(props.cycleSeconds*(1-progress/100)));
 const monster=kind==='combat'?MONSTERS.find(row=>row.id===activity.targetId):undefined;
 const iconId=(kind==='processing'?'cooking':kind==='training'?'combat':kind==='faith'?'faith':kind) as Parameters<typeof ActivityArtwork>[0]['id'];
 const stop=preview.stoppedReason?activityStopPresentation(preview.stoppedReason):undefined;
 const act=()=>{setStopOpen(false);setDetailOpen(false);props.onStop()};
 return <>
  <View style={[s.card,stopped&&s.stopped]}>
   <View style={s.top}><Text style={s.eyebrow}>{gt('CURRENT ACTIVITY')}</Text>
    <View style={[s.status,{borderColor:stopped?C.bad:capped?C.warning:C.good,backgroundColor:stopped?C.badSurface:capped?C.warningSurface:C.goodSurface}]}>
     <Text style={[s.statusLabel,{color:stopped?C.bad:capped?C.warning:C.good}]}>{stopped?gt('STOPPED'):capped?gt('AFK FULL'):gt('ACTIVE')}</Text>
    </View>
   </View>
   <View style={s.identity}>
    <View style={s.art}>{monster?<MonsterPortraitFrame monster={monster} size={44} framed={false} reduceMotion/>:<ActivityArtwork id={iconId} size={38}/>}</View>
    <View style={s.copy}><Text numberOfLines={2} style={s.name}>{gl(props.title)}</Text><Text style={s.sub}>{gl(kindNames[kind])} · {gt('Rewards since last collection')}</Text></View>
    <Pressable accessibilityRole="button" accessibilityLabel={gt('Activity rates and details')} onPress={()=>setDetailOpen(true)} style={({pressed})=>[s.info,pressed&&s.pressed]}><Text style={s.infoText}>⌕</Text></Pressable>
   </View>
   {stop?<Text accessibilityRole="alert" style={[s.warning,{color:C.bad}]}>{gl(stop.title)} · {gl(preview.stoppedReason??'')}</Text>:null}
   <View style={s.progressHead}><Text style={s.meta}>{stopped?gt('ACTIVITY STOPPED'):capped?gt('OFFLINE STORAGE FULL'):gt('NEXT ACTION')}</Text><Text style={s.time}>{stopped||capped?'—':remaining+'s'}</Text></View>
   <View accessible accessibilityRole="progressbar" accessibilityLabel={gt('Activity progress')} accessibilityValue={{min:0,max:100,now:Math.round(progress)}} style={s.track}><View style={[s.fill,{width:(progress+'%') as `${number}%`,backgroundColor:stopped?C.bad:C.good}]}/></View>
   <View style={s.metrics}>
    <View style={s.metric}><Text style={s.metricLabel}>{kind==='combat'?gt('KILLS / HR'):gt('ACTIONS / HR')}</Text><Text style={s.metricValue}>≈ {formatted(rates.actionsPerHour)}</Text></View>
    <View style={s.metric}><Text style={s.metricLabel}>{gt('XP / HR')}</Text><Text style={s.metricValue}>≈ {formatted(rates.xpPerHour)}</Text></View>
    <View style={s.metric}><Text style={s.metricLabel}>{gt('AFK LEFT')}</Text><Text style={s.metricValue}>{reserve>0?reserve.toFixed(1)+'h':'0h'}</Text></View>
   </View>
   <View style={s.bottom}><View style={s.flex}><Text style={s.reward}>{formatted(count)} {gt(unitNames[kind])} {gt('ready')}</Text><Text style={s.sub}>+{formatted(preview.xp)} XP{resourceRate?' · '+resourceRate.name:''}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={gt('More activity details')} onPress={()=>setDetailOpen(true)} style={s.detailLink}><Text style={s.detailText}>{gt('Details')} ›</Text></Pressable></View>
   <View style={s.actions}><View style={s.flex}><GameButton title={canCollect?gt('Collect rewards'):gt('Rewards building…')} disabled={!canCollect} onPress={()=>{setDetailOpen(false);props.onClaim()}}/></View><View style={s.secondary}><GameButton title={gt('Stop')} tone="secondary" onPress={()=>setStopOpen(true)}/></View></View>
  </View>
  {detailOpen?<GameModalSurface visible onClose={()=>setDetailOpen(false)} reduceMotion={props.reduceMotion} surfaceStyle={s.sheet}>
   <GameModalHeader eyebrow={gt('CURRENT ACTIVITY')} title={gl(props.title)} onClose={()=>setDetailOpen(false)}/>
   <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
    <ActivityCard {...props} onClaim={()=>{setDetailOpen(false);props.onClaim()}} onStop={()=>{setDetailOpen(false);setStopOpen(true)}}/>
    {insights.combat?.lowProjectedHp?<Text style={[s.warning,{color:C.warning}]}>{gt('Projected health is low. Check food before continuing.')}</Text>:null}
   </ScrollView>
  </GameModalSurface>:null}
  {stopOpen?<GameModalSurface visible presentation="dialog" onClose={()=>setStopOpen(false)} reduceMotion={props.reduceMotion} surfaceStyle={s.confirmSheet}>
   <GameModalHeader eyebrow={gt('STOP ACTIVITY')} title={gt('Collect & stop?')} onClose={()=>setStopOpen(false)}/>
   <Text style={s.confirmCopy}>{gt('Collect the current activity rewards and stop this activity. Queued actions still follow their goal and safety rules.')}</Text>
   <View style={[s.confirmPreview,{backgroundColor:C.panel2,borderColor:C.line}]}>
    <Text style={s.name}>{gl(props.title)}</Text><Text style={s.sub}>{formatted(count)} {gt(unitNames[kind])} · +{formatted(preview.xp)} XP</Text>
   </View>
   <View style={s.actions}><View style={s.flex}><GameButton title={gt('Keep running')} tone="secondary" onPress={()=>setStopOpen(false)}/></View><View style={s.flex}><GameButton title={gt('Collect & stop')} onPress={act}/></View></View>
  </GameModalSurface>:null}
 </>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 card:{padding:spacing.md,gap:spacing.sm,borderWidth:1,borderRadius:radii.lg,borderColor:C.good,backgroundColor:C.panelRaised},
 stopped:{borderColor:C.bad},top:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 eyebrow:{fontSize:10,lineHeight:14,fontWeight:'900',letterSpacing:.8,color:C.accent},
 status:{minHeight:24,paddingHorizontal:8,borderWidth:1,borderRadius:99,justifyContent:'center'},statusLabel:{fontSize:9,lineHeight:12,fontWeight:'900'},
 identity:{flexDirection:'row',gap:10,alignItems:'center'},art:{width:50,height:50,alignItems:'center',justifyContent:'center',backgroundColor:C.panel2,borderWidth:1,borderColor:C.line,borderRadius:10},
 copy:{flex:1,minWidth:0,gap:3},name:{fontSize:16,lineHeight:21,fontWeight:'900',color:C.text},sub:{fontSize:10,lineHeight:15,color:C.muted},info:{width:44,height:44,alignItems:'center',justifyContent:'center',borderRadius:9,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},infoText:{fontSize:23,color:C.accent},
 progressHead:{flexDirection:'row',justifyContent:'space-between',gap:8},meta:{fontSize:10,fontWeight:'900',color:C.muted},time:{fontSize:11,fontWeight:'900',color:C.text,fontVariant:['tabular-nums']},
 track:{height:6,borderRadius:99,overflow:'hidden',backgroundColor:C.line},fill:{height:'100%',borderRadius:99},
 metrics:{flexDirection:'row',gap:6},metric:{minWidth:0,flex:1,padding:7,borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.panel2,alignItems:'center',gap:3},metricLabel:{fontSize:8,lineHeight:12,color:C.muted,fontWeight:'900'},metricValue:{fontSize:12,lineHeight:17,fontWeight:'900',color:C.text},
 bottom:{flexDirection:'row',alignItems:'center',gap:8},flex:{flex:1,minWidth:0},reward:{fontSize:11,lineHeight:16,fontWeight:'800',color:C.good},
 detailLink:{minHeight:44,justifyContent:'center',paddingHorizontal:7},detailText:{fontSize:11,fontWeight:'800',color:C.info},
 actions:{flexDirection:'row',gap:8,alignItems:'stretch'},secondary:{flex:0.57,minWidth:0},pressed:{opacity:.72},
 sheet:{paddingHorizontal:spacing.md},scroll:{flexShrink:1,minHeight:0},content:{gap:spacing.md,paddingBottom:spacing.md},
 warning:{fontSize:11,lineHeight:16,fontWeight:'700'},confirmSheet:{gap:spacing.md},confirmCopy:{fontSize:13,lineHeight:19,color:C.muted},
 confirmPreview:{padding:spacing.md,borderRadius:10,borderWidth:1,gap:5}
});}
