import {useMemo} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {activityQueueCapacity,activityQueueHandoffStatus,activityQueueLabel,normalizeActivityQueue,queuedActivityReadiness} from '../core/activity-queue';
import {useGameTheme} from '../theme/ThemeContext';
import {useGameplayText} from '../i18n/gameplay';
import {radii,spacing,type ThemeColors} from '../theme/theme';
import {GameButton} from './GameButton';

export function HomeQueueSummary({state,onOpen}:{state:GameState;onOpen:()=>void}){
 const {gt,gl}=useGameplayText(),C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const capacity=activityQueueCapacity(state),queue=normalizeActivityQueue(state.character?.activityQueue,capacity),next=queue[0];
 const handoff=activityQueueHandoffStatus(state);
 const readiness=next?queuedActivityReadiness(state,next):null;
 const waiting=!!next&&!!state.activity;
 return <View style={s.card}>
  <View style={s.header}>
   <View style={s.flex}><Text style={s.kicker}>{gt('UP NEXT · ACTIVITY QUEUE')}</Text><Text style={s.title}>{queue.length?gt('{count} waiting',{count:queue.length}):gt('Your queue is empty')}</Text></View>
   <GameButton compact title={gt('Manage')} tone="secondary" onPress={onOpen}/>
  </View>
  {next?<Pressable accessibilityRole="button" accessibilityLabel={gt('Manage activity queue')} onPress={onOpen} style={({pressed})=>[s.next,pressed&&s.pressed]}>
    <View style={s.number}><Text style={s.numberText}>1</Text></View>
    <View style={s.flex}><Text numberOfLines={1} style={s.nextTitle}>{gl(activityQueueLabel(next))}</Text><Text numberOfLines={2} style={[s.nextMeta,{color:readiness?.ready?C.muted:C.warning}]}>{readiness?.ready?(waiting?gt('Waiting for current activity to finish'):gt('Ready to start')):gl(readiness?.blocker??handoff.nextBlocker??gt('Needs attention'))}</Text></View>
    <Text style={s.chevron}>›</Text>
   </Pressable>:<Text style={s.empty}>{gt('Plan your next hunt, skill or exploration activity.')}</Text>}
  {queue.length>1?<Text style={s.extra}>{gt('+ {count} more queued',{count:queue.length-1})}</Text>:null}
  {!next?<GameButton title={gt('＋ Add activity')} compact tone="secondary" onPress={onOpen}/>:null}
 </View>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 card:{gap:6,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},
 header:{flexDirection:'row',alignItems:'center',gap:8},flex:{flex:1,minWidth:0},
 kicker:{fontSize:9,lineHeight:14,fontWeight:'900',letterSpacing:.8,color:C.accent},
 title:{fontSize:14,lineHeight:19,fontWeight:'900',color:C.text,marginTop:2},
 next:{minHeight:52,padding:spacing.sm,borderRadius:radii.sm,backgroundColor:C.panel2,flexDirection:'row',alignItems:'center',gap:8},
 number:{width:26,height:26,borderWidth:1,borderColor:C.info,borderRadius:13,alignItems:'center',justifyContent:'center'},
 numberText:{fontSize:12,fontWeight:'900',color:C.info},
 nextTitle:{fontSize:12,fontWeight:'800',color:C.text},nextMeta:{fontSize:10,lineHeight:15},
 chevron:{fontSize:22,fontWeight:'800',color:C.accent},empty:{fontSize:11,lineHeight:17,color:C.muted},
 extra:{fontSize:10,lineHeight:14,color:C.muted,paddingLeft:spacing.sm},pressed:{opacity:.75},
});}
