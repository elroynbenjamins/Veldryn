import {useEffect,useRef,useState,useMemo} from 'react';
import {Animated,Easing,Pressable,StyleSheet,Text,View} from 'react-native';
import {ActiveActivity,RewardBundle} from '../core/types';
import {huntGoalProgress,huntMomentumStatus} from '../core/hunt-goals';
import {itemDef} from '../content/items';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {spacing,typography,equipmentTheme,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {formatGameNumber} from '../core/number-format';

function duration(seconds:number){
  if(seconds<60)return `${seconds}s`;
  const hours=Math.floor(seconds/3600),minutes=Math.floor((seconds%3600)/60);
  return hours?`${hours}h ${minutes}m`:`${minutes}m`;
}

export function ActivityCard({title,kind,activity,cycleSeconds,capHours,preview,rates,reduceMotion=false,numberMode='abbreviated',onClaim,onStop}:{title:string;kind:'combat'|'gathering';activity?:ActiveActivity;cycleSeconds:number;capHours:number;preview:RewardBundle;rates:{actionsPerHour:number;xpPerHour:number;goldPerHour:number};reduceMotion?:boolean;numberMode?:'abbreviated'|'exact';onClaim:()=>void;onStop:()=>void}){
 const C=useGameTheme(),equipmentColors=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);
  const [showDetails,setShowDetails]=useState(false);
  const pulse=useRef(new Animated.Value(0)).current;
  useEffect(()=>{pulse.setValue(0);if(reduceMotion)return;const loop=Animated.loop(Animated.timing(pulse,{toValue:1,duration:1100,easing:Easing.linear,useNativeDriver:true}));loop.start();return()=>loop.stop()},[pulse,reduceMotion]);
  const hasRewards=preview.kills>0||!!preview.stoppedReason;
  const loot=preview.items.map(stack=>`${formatGameNumber(stack.quantity,numberMode)}× ${itemDef(stack.itemId).name}`).join(' · ');
  const capped=preview.elapsedSeconds>=capHours*60*60;
  const cycleProgress=preview.stoppedReason||capped?1:(preview.elapsedSeconds%cycleSeconds)/cycleSeconds;
  const remaining=Math.max(1,Math.ceil(cycleSeconds-(preview.elapsedSeconds%cycleSeconds))),goal=activity?.kind==='combat'?huntGoalProgress(activity,preview.kills,preview.championEncounters?.count??0):undefined,momentum=activity?.kind==='combat'?huntMomentumStatus((activity.sessionKills??0)+preview.kills):undefined;
  return <Panel>
    <View style={s.heading}>
      <View style={s.headingCopy}>
        <Text style={s.eyebrow}>{kind==='combat'?'HUNTING':'GATHERING'}</Text>
        <Text style={s.title}>{title}</Text>
      </View>
      <View style={[s.status,(capped||!!preview.stoppedReason)&&s.statusCapped]}><Text style={[s.statusText,preview.stoppedReason?s.statusStopped:capped?s.statusCappedText:s.statusActive]}>{preview.stoppedReason?'STOPPED':capped?`${capHours}H CAP`:'ACTIVE'}</Text></View>
    </View>
    <View accessible accessibilityRole="progressbar" accessibilityLabel={`${title} action progress`} accessibilityValue={{min:0,max:100,now:Math.round(cycleProgress*100)}} style={s.progressBlock}><View style={s.progressMeta}><Text style={s.progressLabel}>{preview.stoppedReason?'ACTIVITY STOPPED':capped?'OFFLINE STORAGE FULL':kind==='combat'?'NEXT ENCOUNTER':'NEXT GATHER'}</Text><Text style={s.progressTime}>{preview.stoppedReason||capped?'—':`${remaining}s`}</Text></View><View style={s.track}><View style={[s.fill,{width:`${cycleProgress*100}%`}]}>{!reduceMotion&&<Animated.View style={[s.shine,{transform:[{translateX:pulse.interpolate({inputRange:[0,1],outputRange:[-90,260]})}]}]}/>}</View></View></View>
    {!!preview.stoppedReason&&<View accessibilityRole="alert" style={s.stopNotice}><Text style={s.noticeLabel}>ACTIVITY STOPPED</Text><Text style={s.capNotice}>{preview.stoppedReason}. Collect to settle combat, then heal or equip food in Inventory.</Text></View>}
    {goal&&<View style={s.goal}><View style={s.progressMeta}><Text style={s.goalLabel}>HUNT GOAL · {goal.label.toUpperCase()}</Text><Text style={s.goalValue}>{goal.current}/{goal.target}</Text></View><View style={s.goalTrack}><View style={[s.goalFill,{width:`${Math.max(2,Math.min(100,goal.current/goal.target*100))}%`}]}/></View></View>}
    {momentum&&<View style={s.momentum}><View style={s.progressMeta}><Text style={s.momentumLabel}>HUNT MOMENTUM · {momentum.tier.name.toUpperCase()}</Text><Text style={s.momentumValue}>{momentum.bonusPct?`+${momentum.bonusPct}% XP & GOLD`:'BUILDING'}</Text></View><View style={s.momentumTrack}><View style={[s.momentumFill,{width:`${Math.max(2,Math.round(momentum.progressPct*100))}%`}]}/></View><Text style={s.momentumHint}>{momentum.next?`${momentum.killsToNext} kills to ${momentum.next.name} (+${Math.round(momentum.next.bonus*100)}%)`:`Max momentum · ${momentum.kills} session kills`}</Text></View>}
    {preview.championEncounters?.count?<View style={s.champion}><Text style={s.championLabel}>CHAMPION ENCOUNTER</Text><Text style={s.championText}>{preview.championEncounters.count} champion{preview.championEncounters.count===1?'':'s'} defeated · +{formatGameNumber(preview.championEncounters.bonusXp,numberMode)} XP · +{formatGameNumber(preview.championEncounters.bonusGold,numberMode)} gold</Text></View>:null}
    <View style={s.rewardRow}>
      <View><Text style={s.rewardNumber}>{formatGameNumber(preview.kills,numberMode)}</Text><Text style={s.rewardLabel}>{kind==='combat'?'kills ready':'actions ready'}</Text></View>
      <View style={s.totals}><Text style={s.xp}>+{formatGameNumber(preview.xp,numberMode)} XP</Text>{preview.gold>0&&<Text style={s.gold}>+{formatGameNumber(preview.gold,numberMode)} gold</Text>}</View>
    </View>
    {!loot&&!hasRewards&&<Text style={s.emptyLoot}>Keep this activity running to earn your first reward.</Text>}
    {capped&&!preview.stoppedReason&&<View style={s.stopNotice}><Text style={s.noticeLabel}>STORAGE FULL</Text><Text style={s.capNotice}>Offline storage is full. Collect now to resume earning.</Text></View>}
    <GameButton title={hasRewards?'Collect Rewards':'Rewards building…'} onPress={onClaim} disabled={!hasRewards}/>
    <GameButton title="Collect & stop" tone="secondary" onPress={onStop}/>
    <Pressable accessibilityRole="button" accessibilityState={{expanded:showDetails}} onPress={()=>setShowDetails(value=>!value)} style={s.detailsToggle}><Text style={s.detailsLabel}>{showDetails?'HIDE DETAILS':'RATES & DETAILS'}</Text><Text style={s.detailsMark}>{showDetails?'−':'+'}</Text></Pressable>
    {showDetails&&<View style={s.details}><Text style={s.detail}>{duration(preview.elapsedSeconds)} since last claim · up to {capHours} hours offline</Text><View style={s.rateRow}><Text style={s.rate}>≈ {formatGameNumber(rates.actionsPerHour,numberMode)}/hr</Text><Text style={s.rate}>+{formatGameNumber(rates.xpPerHour,numberMode)} XP/hr</Text>{rates.goldPerHour>0&&<Text style={s.rate}>+{formatGameNumber(rates.goldPerHour,numberMode)} gold/hr</Text>}</View>{kind==='combat'&&<Text style={s.detail}>Projected health: {preview.endHp??'—'} HP · Food used: {preview.foodConsumed??0}</Text>}{loot?<Text style={s.loot}>{loot}</Text>:null}</View>}

  </Panel>;
}

function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({
  heading:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',gap:spacing.md},
  headingCopy:{flex:1},eyebrow:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1},
  title:{...typography.title,color:C.text},detail:{...typography.body,color:C.muted},
  status:{borderWidth:1,borderColor:C.good,borderRadius:99,paddingHorizontal:spacing.sm,paddingVertical:spacing.xs},
  statusCapped:{borderColor:C.warning},statusText:{...typography.caption,fontWeight:'900'},statusActive:{color:C.good},statusCappedText:{color:C.warning},statusStopped:{color:C.bad},
  goal:{gap:4,padding:spacing.sm,borderWidth:1,borderColor:C.info,borderRadius:8,backgroundColor:'#132333'},goalLabel:{...typography.caption,color:C.info,fontWeight:'900',letterSpacing:.7},goalValue:{...typography.caption,color:C.text,fontWeight:'900'},goalTrack:{height:7,borderRadius:4,overflow:'hidden',backgroundColor:C.bg},goalFill:{height:'100%',backgroundColor:C.info},
  momentum:{gap:4,padding:spacing.sm,borderWidth:1,borderColor:C.good,borderRadius:8,backgroundColor:C.panel2},momentumLabel:{...typography.caption,color:C.good,fontWeight:'900',letterSpacing:.7},momentumValue:{...typography.caption,color:C.text,fontWeight:'900'},momentumHint:{...typography.caption,color:C.muted},momentumTrack:{height:7,borderRadius:4,overflow:'hidden',backgroundColor:C.bg},momentumFill:{height:'100%',backgroundColor:C.good},
  champion:{gap:2,padding:spacing.sm,borderWidth:1,borderColor:'#d7a94f',borderRadius:8,backgroundColor:'#2b2417'},championLabel:{...typography.caption,color:'#f2c96f',fontWeight:'900',letterSpacing:.8},championText:{...typography.bodyStrong,color:C.text},
  rewardRow:{flexDirection:'row',flexWrap:'wrap',gap:8,justifyContent:'space-between',alignItems:'center',paddingVertical:spacing.sm},
  rewardNumber:{fontSize:42,lineHeight:46,color:C.text,fontWeight:'900'},rewardLabel:{...typography.caption,color:C.muted},
  totals:{alignItems:'flex-end'},xp:{...typography.bodyStrong,color:C.good},gold:{...typography.bodyStrong,color:C.accent},
  loot:{...typography.body,color:C.text},emptyLoot:{...typography.body,color:C.muted},
  detailsToggle:{minHeight:42,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderTopWidth:1,borderTopColor:C.line},detailsLabel:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.8},detailsMark:{fontSize:22,color:C.accent},details:{gap:spacing.xs},
  capNotice:{...typography.body,color:C.text},noticeLabel:{...typography.caption,color:C.warning,fontWeight:'900',letterSpacing:1},stopNotice:{gap:4,padding:spacing.sm,borderWidth:1,borderColor:C.warning,borderRadius:8,backgroundColor:'#332515'},
  progressBlock:{gap:spacing.xs,paddingVertical:spacing.xs},progressMeta:{flexDirection:'row',flexWrap:'wrap',gap:6,justifyContent:'space-between'},progressLabel:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1},progressTime:{...typography.bodyStrong,color:C.text},track:{height:16,borderRadius:8,overflow:'hidden',backgroundColor:C.bg,borderWidth:1,borderColor:C.line},fill:{height:'100%',overflow:'hidden',backgroundColor:C.good,borderRadius:8},shine:{position:'absolute',width:54,height:'100%',backgroundColor:'rgba(255,255,255,.28)'},
  rateRow:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm},rate:{...typography.caption,color:C.info,fontWeight:'800'},
});}
