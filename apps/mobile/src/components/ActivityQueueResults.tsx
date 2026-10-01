import {useGameplayText} from '../i18n/gameplay';
import {useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import type {RewardBundle} from '../core/types';
import {GATHERING} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import {MONSTERS} from '../content/monsters';
import {itemDef} from '../content/items';
import {formatGameNumber} from '../core/number-format';
import {useGameTheme} from '../theme/ThemeContext';
import {ActivityArtwork} from './ActivityArtwork';
import {activityQueueLabel} from '../core/activity-queue';

function elapsed(seconds:number){const minutes=Math.floor(seconds/60);return minutes>=60?`${Math.floor(minutes/60)}h ${minutes%60}m`:minutes?`${minutes}m`:`${Math.floor(seconds)}s`;}
export function ActivityQueueResults({reward,numberMode}:{reward:RewardBundle;numberMode:'abbreviated'|'exact'}){
 const {gt,gl,language}=useGameplayText();
 const C=useGameTheme(),[expanded,setExpanded]=useState<Record<number,boolean>>({});
 const rows=reward.activityResults??[],current=reward.continuingActivity;
 return <View style={{gap:12}}>
  <Text style={{fontSize:14,fontWeight:'700',color:C.text}}>{gt("Activity timeline")}</Text>
  {rows.map((row,index)=>{
   const source=[...GATHERING,...HERB_NODES,...MONSTERS].find(entry=>entry.id===row.activity.targetId),combat=row.activity.kind==='combat',last=index===rows.length-1;
   const status=row.goalReached?gt("Goal reached"):(row.reward.stoppedReason?gl(row.reward.stoppedReason):undefined)??(last&&current?gt("Still active"):gt("Completed"));
   return <View key={index} style={{borderBottomWidth:1,borderBottomColor:C.line,paddingBottom:12,gap:8}}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${source?.name??row.activity.targetId}, ${status}`} accessibilityState={{expanded:!!expanded[index]}} onPress={()=>setExpanded(value=>({...value,[index]:!value[index]}))} style={{minHeight:48,flexDirection:'row',alignItems:'center',gap:10}}>
     <ActivityArtwork id={row.activity.kind==='processing'?'cooking':row.activity.kind}/><View style={{flex:1,minWidth:0,gap:3}}><Text style={{fontSize:14,lineHeight:20,fontWeight:'700',color:C.text}}>{source?.name??row.activity.targetId.replace(/_/g,' ')}</Text><Text style={{fontSize:12,lineHeight:18,color:row.goalReached?C.good:C.muted}}>{status} · {elapsed(row.reward.elapsedSeconds)}</Text></View><Text style={{fontSize:22,color:C.muted}}>{expanded[index]?'-':'+'}</Text>
    </Pressable>
    <Text style={{fontSize:13,lineHeight:19,color:C.good}}>+{formatGameNumber(row.reward.xp,numberMode,language)} XP{combat?' · '+gt('+{gold} gold · {food} food used',{gold:formatGameNumber(row.reward.gold,numberMode,language),food:row.reward.foodConsumed??0}):''}</Text>
    {expanded[index]?<View style={{gap:5}}>{row.reward.items.map(item=><Text key={item.itemId} style={{fontSize:13,lineHeight:19,color:C.text}}>{itemDef(item.itemId).name} ×{formatGameNumber(item.quantity,numberMode,language)}</Text>)}{!row.reward.items.length?<Text style={{fontSize:13,color:C.muted}}>{gt("No item drops")}</Text>:null}</View>:null}
   </View>;
  })}
  {current?<Text style={{fontSize:14,lineHeight:21,fontWeight:'700',color:C.good}}>{current.queueGoalsCompleted?gt('ALL QUEUE GOALS COMPLETED')+' · ':''}{gt('Still {activity}',{activity:gl(current.kind==='combat'?'Hunt':current.kind)})}</Text>:null}
  {reward.queuePausedReason?<Text style={{fontSize:13,lineHeight:19,color:C.warning}}>{gt(current?'Queued activity waiting: {reason}':'Queue paused: {reason}',{reason:gl(reward.queuePausedReason)})}</Text>:null}
  {reward.pendingQueue?.map((entry,index)=><Text key={index} style={{fontSize:13,lineHeight:19,color:C.muted}}>{gt('Waiting · {activity}',{activity:gl(activityQueueLabel(entry))})}</Text>)}
  {reward.offlineCapReached?<Text style={{fontSize:13,lineHeight:19,color:C.warning}}>{gt("Offline limit reached. Additional time away earned no rewards.")}</Text>:null}
 </View>;
}
