import React,{useEffect,useRef} from 'react';
import {Animated,Easing,StyleSheet,Text,View} from 'react-native';
import {RewardBundle} from '../core/types';
import {itemDef} from '../content/items';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {C,spacing,typography} from '../theme/theme';

function duration(seconds:number){
  if(seconds<60)return `${seconds}s`;
  const hours=Math.floor(seconds/3600),minutes=Math.floor((seconds%3600)/60);
  return hours?`${hours}h ${minutes}m`:`${minutes}m`;
}

export function ActivityCard({title,kind,cycleSeconds,capHours,preview,rates,onClaim,onStop}:{title:string;kind:'combat'|'gathering';cycleSeconds:number;capHours:number;preview:RewardBundle;rates:{actionsPerHour:number;xpPerHour:number;goldPerHour:number};onClaim:()=>void;onStop:()=>void}){
  const pulse=useRef(new Animated.Value(0)).current;
  useEffect(()=>{const loop=Animated.loop(Animated.timing(pulse,{toValue:1,duration:1100,easing:Easing.linear,useNativeDriver:true}));loop.start();return()=>loop.stop()},[pulse]);
  const hasRewards=preview.kills>0||!!preview.stoppedReason;
  const loot=preview.items.map(stack=>`${stack.quantity}× ${itemDef(stack.itemId).name}`).join(' · ');
  const capped=preview.elapsedSeconds>=capHours*60*60;
  const cycleProgress=preview.stoppedReason||capped?1:(preview.elapsedSeconds%cycleSeconds)/cycleSeconds;
  const remaining=Math.max(1,Math.ceil(cycleSeconds-(preview.elapsedSeconds%cycleSeconds)));
  return <Panel>
    <View style={s.heading}>
      <View style={s.headingCopy}>
        <Text style={s.eyebrow}>{kind==='combat'?'HUNTING':'GATHERING'}</Text>
        <Text style={s.title}>{title}</Text>
      </View>
      <View style={[s.status,(capped||!!preview.stoppedReason)&&s.statusCapped]}><Text style={s.statusText}>{preview.stoppedReason?'STOPPED':capped?'8H CAP':'ACTIVE'}</Text></View>
    </View>
    <Text style={s.detail}>{duration(preview.elapsedSeconds)} since last claim · {preview.stoppedReason?'combat has stopped':`up to ${capHours} hours of offline progress`}</Text>
    <View style={s.rateRow}><Text style={s.rate}>≈ {rates.actionsPerHour}/hr</Text><Text style={s.rate}>+{rates.xpPerHour.toLocaleString()} XP/hr</Text>{rates.goldPerHour>0&&<Text style={s.rate}>+{rates.goldPerHour.toLocaleString()} gold/hr</Text>}</View>
    <View accessible accessibilityRole="progressbar" accessibilityLabel={`${title} action progress`} accessibilityValue={{min:0,max:100,now:Math.round(cycleProgress*100)}} style={s.progressBlock}><View style={s.progressMeta}><Text style={s.progressLabel}>{preview.stoppedReason?'ACTIVITY STOPPED':capped?'OFFLINE STORAGE FULL':kind==='combat'?'NEXT ENCOUNTER':'NEXT GATHER'}</Text><Text style={s.progressTime}>{preview.stoppedReason||capped?'—':`${remaining}s`}</Text></View><View style={s.track}><View style={[s.fill,{width:`${cycleProgress*100}%`}]}><Animated.View style={[s.shine,{transform:[{translateX:pulse.interpolate({inputRange:[0,1],outputRange:[-90,260]})}]}]}/></View></View></View>
    {kind==='combat'&&<Text style={s.detail}>Projected health: {preview.endHp??'—'} HP · Food used: {preview.foodConsumed??0}</Text>}
    {!!preview.stoppedReason&&<Text accessibilityRole="alert" style={s.capNotice}>{preview.stoppedReason}. Collect to settle combat, then heal or equip food in Inventory.</Text>}
    <View style={s.rewardRow}>
      <View><Text style={s.rewardNumber}>{preview.kills}</Text><Text style={s.rewardLabel}>{kind==='combat'?'kills ready':'actions ready'}</Text></View>
      <View style={s.totals}><Text style={s.xp}>+{preview.xp} XP</Text>{preview.gold>0&&<Text style={s.gold}>+{preview.gold} gold</Text>}</View>
    </View>
    <Text style={loot?s.loot:s.emptyLoot}>{loot||'Keep this activity running to earn your first reward.'}</Text>
    {capped&&!preview.stoppedReason&&<Text style={s.capNotice}>Offline storage is full. Collect now to resume earning.</Text>}
    <GameButton title={hasRewards?'Collect Rewards':'Rewards building…'} onPress={onClaim} disabled={!hasRewards}/>
    <GameButton title="Collect & stop" onPress={onStop}/>
  </Panel>;
}

const s=StyleSheet.create({
  heading:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',gap:spacing.md},
  headingCopy:{flex:1},eyebrow:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1},
  title:{...typography.title,color:C.text},detail:{...typography.body,color:C.muted},
  status:{borderWidth:1,borderColor:C.good,borderRadius:99,paddingHorizontal:spacing.sm,paddingVertical:spacing.xs},
  statusCapped:{borderColor:C.warning},statusText:{...typography.caption,color:C.text,fontWeight:'900'},
  rewardRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:spacing.sm},
  rewardNumber:{fontSize:42,lineHeight:46,color:C.text,fontWeight:'900'},rewardLabel:{...typography.caption,color:C.muted},
  totals:{alignItems:'flex-end'},xp:{...typography.bodyStrong,color:C.good},gold:{...typography.bodyStrong,color:C.accent},
  loot:{...typography.body,color:C.text},emptyLoot:{...typography.body,color:C.muted},
  capNotice:{...typography.bodyStrong,color:C.warning},
  progressBlock:{gap:spacing.xs,paddingVertical:spacing.xs},progressMeta:{flexDirection:'row',justifyContent:'space-between'},progressLabel:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1},progressTime:{...typography.bodyStrong,color:C.text},track:{height:16,borderRadius:8,overflow:'hidden',backgroundColor:C.bg,borderWidth:1,borderColor:C.line},fill:{height:'100%',overflow:'hidden',backgroundColor:C.good,borderRadius:8},shine:{position:'absolute',width:54,height:'100%',backgroundColor:'rgba(255,255,255,.28)'},
  rateRow:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm},rate:{...typography.caption,color:C.info,fontWeight:'800'},
});
