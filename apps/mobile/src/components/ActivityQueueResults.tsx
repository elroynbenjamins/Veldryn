import {useGameplayText} from '../i18n/gameplay';
import {useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import type {RewardBundle} from '../core/types';
import {GATHERING,recipeDef} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import {MONSTERS} from '../content/monsters';
import {itemDef} from '../content/items';
import {formatGameNumber} from '../core/number-format';
import {useGameTheme} from '../theme/ThemeContext';
import {ActivityArtwork} from './ActivityArtwork';
import {MonsterPortraitFrame} from './MonsterPortraitFrame';
import {activityQueueLabel} from '../core/activity-queue';
import {activityIconId} from '../core/activity-icon';

function elapsed(seconds:number){const minutes=Math.floor(seconds/60);return minutes>=60?`${Math.floor(minutes/60)}h ${minutes%60}m`:minutes?`${minutes}m`:`${Math.floor(seconds)}s`;}
export function ActivityQueueResults({reward,numberMode,compact=false}:{reward:RewardBundle;numberMode:'abbreviated'|'exact';compact?:boolean}){
 const {gt,gl,language}=useGameplayText();
 const C=useGameTheme(),[expanded,setExpanded]=useState<Record<number,boolean>>({});
 const rows=reward.activityResults??[],current=reward.continuingActivity;
 const currentShownInTimeline=Boolean(current&&rows.some(row=>row.activity.kind===current.kind&&row.activity.targetId===current.targetId));
 return <View style={{gap:compact?8:12}}>
  <Text style={{fontSize:compact?11:14,fontWeight:'700',color:C.text,letterSpacing:compact?0.6:0}}>{gt("Activity timeline")}</Text>
  {rows.map((row,index)=>{
   const source=[...GATHERING,...HERB_NODES,...MONSTERS].find(entry=>entry.id===row.activity.targetId),combat=row.activity.kind==='combat',monster=combat?MONSTERS.find(entry=>entry.id===row.activity.targetId):undefined,last=index===rows.length-1;
   const status=row.goalReached?gt("Goal reached"):(row.reward.stoppedReason?gl(row.reward.stoppedReason):undefined)??(last&&current?gt("Still active"):gt("Completed"));
   const compactActive=Boolean(current&&row.activity.kind===current.kind&&row.activity.targetId===current.targetId);
   const compactStatus=row.goalReached?gt("Goal reached"):(row.reward.stoppedReason?gl(row.reward.stoppedReason):undefined)??(compactActive?gt("Still active"):gt("Completed"));
   const compactName=(row.activity.kind==='processing'||row.activity.kind==='alchemy'?recipeDef(row.activity.targetId)?.name:undefined)??source?.name??row.activity.targetId.replace(/_/g,' ');
   if(compact)return <View key={index} style={{borderBottomWidth:1,borderBottomColor:C.line,paddingBottom:8,gap:4}}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${compactName}, ${compactStatus}`} accessibilityState={{expanded:!!expanded[index]}} onPress={()=>setExpanded(value=>({...value,[index]:!value[index]}))} style={{minHeight:48,flexDirection:'row',alignItems:'center',gap:8}}>
     {monster?<MonsterPortraitFrame monster={monster} size={28} framed={false}/>:<ActivityArtwork id={activityIconId(row.activity)} size={28}/>}
     <View style={{flex:1,minWidth:0,gap:2}}><Text numberOfLines={2} style={{fontSize:13,lineHeight:18,fontWeight:'700',color:C.text}}>{compactName}</Text><Text style={{fontSize:11,lineHeight:15,color:row.goalReached?C.good:C.muted}}>{compactStatus} · {elapsed(row.reward.elapsedSeconds)}</Text></View>
     <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{fontSize:12,lineHeight:18,color:C.good,fontWeight:'700',minWidth:48,textAlign:'right'}}>+{formatGameNumber(row.reward.xp,numberMode,language)} XP</Text>
     <Text style={{fontSize:16,color:C.muted,marginLeft:2}}>{expanded[index]?'−':'+'}</Text>
    </Pressable>
    {expanded[index]?<View style={{paddingLeft:36,gap:4}}>{combat?<Text style={{fontSize:11,color:C.muted}}>{gt('+{gold} gold · {food} food used',{gold:formatGameNumber(row.reward.gold,numberMode,language),food:row.reward.foodConsumed??0})}</Text>:null}{row.reward.items.map(item=><Text key={item.itemId} style={{fontSize:12,color:C.text}}>{itemDef(item.itemId).name} ×{formatGameNumber(item.quantity,numberMode,language)}</Text>)}{!row.reward.items.length?<Text style={{fontSize:12,color:C.muted}}>{gt("No item drops")}</Text>:null}</View>:null}
   </View>;
   return <View key={index} style={{borderBottomWidth:1,borderBottomColor:C.line,paddingBottom:12,gap:8}}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${source?.name??row.activity.targetId}, ${status}`} accessibilityState={{expanded:!!expanded[index]}} onPress={()=>setExpanded(value=>({...value,[index]:!value[index]}))} style={{minHeight:48,flexDirection:'row',alignItems:'center',gap:10}}>
     {monster?<MonsterPortraitFrame monster={monster} size={40} framed={false}/>:<ActivityArtwork id={activityIconId(row.activity)}/>}<View style={{flex:1,minWidth:0,gap:3}}><Text style={{fontSize:14,lineHeight:20,fontWeight:'700',color:C.text}}>{source?.name??row.activity.targetId.replace(/_/g,' ')}</Text><Text style={{fontSize:12,lineHeight:18,color:row.goalReached?C.good:C.muted}}>{status} · {elapsed(row.reward.elapsedSeconds)}</Text></View><Text style={{fontSize:22,color:C.muted}}>{expanded[index]?'-':'+'}</Text>
    </Pressable>
    <Text style={{fontSize:13,lineHeight:19,color:C.good}}>+{formatGameNumber(row.reward.xp,numberMode,language)} XP{combat?' · '+gt('+{gold} gold · {food} food used',{gold:formatGameNumber(row.reward.gold,numberMode,language),food:row.reward.foodConsumed??0}):''}</Text>
    {expanded[index]?<View style={{gap:5}}>{row.reward.items.map(item=><Text key={item.itemId} style={{fontSize:13,lineHeight:19,color:C.text}}>{itemDef(item.itemId).name} ×{formatGameNumber(item.quantity,numberMode,language)}</Text>)}{!row.reward.items.length?<Text style={{fontSize:13,color:C.muted}}>{gt("No item drops")}</Text>:null}</View>:null}
   </View>;
  })}
  {current&&(!compact||!currentShownInTimeline||current.queueGoalsCompleted)?<Text style={{fontSize:compact?12:14,lineHeight:compact?18:21,fontWeight:'700',color:C.good}}>{current.queueGoalsCompleted?gt('ALL QUEUE GOALS COMPLETED')+' · ':''}{gt('Still {activity}',{activity:gl(current.kind==='combat'?'Hunt':current.kind)})}</Text>:null}
  {reward.queuePausedReason?<Text style={{fontSize:compact?12:13,lineHeight:compact?17:19,color:C.warning}}>{gt(current?'Queued activity waiting: {reason}':'Queue paused: {reason}',{reason:gl(reward.queuePausedReason)})}</Text>:null}
  {reward.pendingQueue?.map((entry,index)=><Text key={index} style={{fontSize:compact?12:13,lineHeight:compact?17:19,color:C.muted}}>{gt('Waiting · {activity}',{activity:gl(activityQueueLabel(entry))})}</Text>)}
  {reward.offlineCapReached?<Text style={{fontSize:compact?12:13,lineHeight:compact?17:19,color:C.warning}}>{gt("Offline limit reached. Additional time away earned no rewards.")}</Text>:null}
 </View>;
}
