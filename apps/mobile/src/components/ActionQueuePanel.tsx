import {StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {activityQueueLabel,MAX_ACTIVITY_QUEUE,normalizeActivityQueue} from '../core/activity-queue';
import {GameButton} from './GameButton';
import {C,equipmentColors,radii,spacing,typography} from '../theme/theme';

export function ActionQueuePanel({state,onRemove,onClear,onStartNext}:{state:GameState;onRemove:(index:number)=>void;onClear:()=>void;onStartNext:()=>void}){
 const queue=normalizeActivityQueue(state.character?.activityQueue),paused=state.character?.activityQueuePausedReason;
 if(!queue.length)return null;
 return <View style={s.panel}>
  <View style={s.header}><View style={s.flex}><Text style={s.kicker}>ACTION QUEUE · {queue.length}/{MAX_ACTIVITY_QUEUE}</Text><Text style={s.sub}>Planned stops advance automatically. Safety stops pause the queue.</Text></View>{queue.length>1&&<View style={s.clear}><GameButton compact title="Clear" tone="secondary" onPress={onClear}/></View>}</View>
  {paused&&<View style={s.pause}><Text style={s.pauseTitle}>QUEUE PAUSED</Text><Text style={s.pauseText}>{paused}</Text></View>}
  {queue.map((entry,index)=><View key={`${index}:${entry.kind}:${entry.targetId}`} style={s.row}><View style={s.index}><Text style={s.indexText}>{index+1}</Text></View><View style={s.flex}><Text numberOfLines={1} style={s.name}>{activityQueueLabel(entry)}</Text><Text style={s.meta}>{entry.kind==='combat'?'Hunt':'Gathering'}{index===0?' · next':''}</Text></View><View style={s.remove}><GameButton compact title="Remove" tone="secondary" onPress={()=>onRemove(index)}/></View></View>)}
  {!state.activity&&<GameButton title="Start next queued action" onPress={onStartNext}/>}
 </View>;
}

const s=StyleSheet.create({
 panel:{gap:spacing.sm,padding:spacing.sm,borderWidth:1,borderColor:equipmentColors.selectedLine,borderRadius:radii.md,backgroundColor:C.panel},
 header:{flexDirection:'row',alignItems:'center',gap:spacing.sm},flex:{flex:1,minWidth:0},clear:{width:78},remove:{width:88},
 kicker:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900',letterSpacing:.8},sub:{...typography.caption,color:C.muted},
 row:{minHeight:52,flexDirection:'row',alignItems:'center',gap:spacing.sm,padding:spacing.sm,borderRadius:radii.sm,backgroundColor:C.panel2},
 index:{width:28,height:28,alignItems:'center',justifyContent:'center',borderRadius:14,borderWidth:1,borderColor:C.info},indexText:{...typography.caption,color:C.info,fontWeight:'900'},
 name:{...typography.bodyStrong,color:C.text},meta:{...typography.caption,color:C.muted},
 pause:{gap:2,padding:spacing.sm,borderLeftWidth:3,borderLeftColor:C.warning,backgroundColor:'#332515'},pauseTitle:{...typography.caption,color:C.warning,fontWeight:'900',letterSpacing:.7},pauseText:{...typography.caption,color:C.text}
});
