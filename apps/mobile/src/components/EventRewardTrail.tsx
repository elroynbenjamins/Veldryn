import {useMemo} from 'react';
import {StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import type {EventRewardKind} from '../content/live-events';
import type {GameState} from '../core/types';
import {eventRewardTrail} from '../core/event-reward-trail';
import {eventRewardText,type EventRewardMessage} from '../i18n/event-rewards';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {formatLocalizedDate,formatLocalizedNumber,type TranslationParams} from '../i18n/translator';
import {useGameTheme} from '../theme/ThemeContext';
import {GameButton} from './GameButton';
import {RewardArt} from './EventRewardArt';
import {UiIcon} from './UiIcon';

const rewardKindLabels:Partial<Record<EventRewardKind,EventRewardMessage>>={profile_icon:'Profile icon',pet:'Cosmetic pet',companion:'Combat companion',background:'Profile background',border:'Profile frame',emote:'Emote',title:'Profile title',candy:'Consumable',gold:'Gold',companion_essence:'Companion Essence'};

export function EventRewardTrail({state,now,busy=false,pendingRewardId,onClaim}:{state:GameState;now:number;busy?:boolean;pendingRewardId?:string|null;onClaim:(id:string)=>unknown;onClaimAll?:()=>unknown}){
 const C=useGameTheme(),language=useGameLanguage(),{width,fontScale}=useWindowDimensions();
 const trail=useMemo(()=>eventRewardTrail(state,now),[state,now]);
 const t=(key:EventRewardMessage,params?:TranslationParams)=>eventRewardText(language,key,params),n=(value:number)=>formatLocalizedNumber(language,value);
 const narrow=width<360||fontScale>=1.25;
 if(!trail||!trail.rows.length)return <Text style={[s.meta,{color:C.muted}]}>{t('No personal milestone rewards for this event.')}</Text>;
 const claiming=trail.event.phase==='claiming';
 return <View style={s.root}>
  <View style={s.headingRow}><View style={s.grow}><Text accessibilityRole="header" style={[s.title,{color:C.text}]}>{t('Reward trail')}</Text><Text style={[s.meta,{color:C.muted}]}>{t('Festival reputation')}</Text></View><View style={[s.edition,{borderColor:C.line,backgroundColor:C.panel}]}><Text style={[s.meta,{color:C.muted}]}>{t('{year} edition',{year:trail.edition})}</Text></View></View>
  <View style={s.progressCopy}><Text style={[s.progress,{color:C.text}]}>{n(trail.progress)}<Text style={[s.progressTarget,{color:C.muted}]}> / {n(trail.target)}</Text></Text><Text style={[s.meta,{color:trail.readyCount?C.accent:C.muted}]}>{trail.readyCount?(trail.readyCount===1?t('1 reward ready'):t('{count} rewards ready',{count:n(trail.readyCount)})):t('{claimed} / {total} claimed',{claimed:n(trail.claimedCount),total:n(trail.rows.length)})}</Text></View>
  {trail.readyCount>1&&onClaimAll?<GameButton compact title={pendingRewardId==='milestones'?t('Claiming…'):`Claim all (${n(trail.readyCount)})`} loading={pendingRewardId==='milestones'} disabled={busy} onPress={onClaimAll}/>:null}
  <View accessibilityRole="progressbar" accessibilityLabel={t('Festival reputation')} accessibilityValue={{min:0,max:Math.max(1,trail.target),now:Math.min(trail.progress,Math.max(1,trail.target)),text:`${n(trail.progress)} / ${n(trail.target)}`}} style={[s.track,{backgroundColor:C.panel2}]}><View style={{height:'100%',width:`${trail.percent}%`,backgroundColor:C.special}}/></View>
  <Text style={[s.meta,{color:C.muted}]}>{trail.allClaimed?t('Your collection is complete'):trail.allUnlocked?t('All personal rewards unlocked'):claiming?t('Reputation earning has ended.'):t('{points} reputation to {reward}',{points:n(trail.remaining),reward:trail.next!.reward.name})}</Text>
  {claiming?<View style={[s.claimWindow,{backgroundColor:C.infoSurface}]}><Text style={[s.meta,{color:C.info}]}>{t('Claim available rewards before {date}.',{date:formatLocalizedDate(language,trail.event.claimEndsAtMs,{day:'numeric',month:'short'})})}</Text></View>:null}
  <View style={s.trail}>{trail.rows.map((row,index)=>{
   const ready=row.status==='ready',claimed=row.status==='claimed',next=row===trail.next,pending=pendingRewardId===row.reward.id;
   const status=claimed?t('Claimed'):ready?t('Ready to claim'):next?t('Up next'):t('Locked');
   const color=claimed?C.good:ready?C.accent:C.muted;
   return <View key={row.reward.id} style={s.milestone}>
    <View style={s.rail}>{index<trail.rows.length-1?<View style={[s.connector,{backgroundColor:C.lineStrong}]}/>:null}<View accessible={false} style={[s.node,{backgroundColor:C.panel,borderColor:ready?C.accent:claimed?C.good:C.lineStrong}]}><Text style={[s.nodeMark,{color}]}>{claimed?'✓':ready?'✦':next?'◇':'·'}</Text></View></View>
    <View style={[s.reward,{backgroundColor:ready?C.accentSurface:C.panel,borderColor:ready?C.accent:C.line}]}>
     <View style={[s.statusRow,narrow&&s.statusStack]}><Text style={[s.status,{color}]}>{status}</Text><Text style={[s.meta,{color:C.muted}]}>{t('{points} reputation',{points:n(row.points)})}</Text></View>
     <View style={[s.rewardCopy,fontScale>=1.5&&s.copyStack]}><RewardArt reward={row.reward} definition={trail.event.definition} size={narrow?42:48}/><View style={s.grow}><Text accessibilityRole="header" style={[s.rewardName,{color:C.text}]}>{row.reward.name}</Text><Text style={[s.meta,{color:C.muted}]}>{t(rewardKindLabels[row.reward.kind]??'Reward trail')}{row.reward.quantity!=null?` · ×${n(row.reward.quantity)}`:''}</Text></View></View>
     {ready?<GameButton compact title={pending?t('Claiming…'):t('Claim reward')} loading={pending} disabled={busy} onPress={()=>onClaim(row.reward.id)}/>:null}
    </View>
   </View>;
  })}</View>
  {trail.hasGuildRewards?<View style={[s.guildNote,{borderColor:C.line}]}><UiIcon name="guild" size={22}/><Text style={[s.meta,s.grow,{color:C.muted}]}>{t('Guild rewards are separate · Guild → PvE')}</Text></View>:null}
 </View>;
}
const s=StyleSheet.create({root:{gap:10},headingRow:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:10},grow:{flex:1,minWidth:0},title:{fontSize:21,lineHeight:27,fontWeight:'800'},meta:{fontSize:12,lineHeight:18},edition:{paddingHorizontal:9,paddingVertical:5,borderRadius:8,borderWidth:1},progressCopy:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',alignItems:'baseline',gap:8},progress:{fontSize:25,lineHeight:32,fontWeight:'800'},progressTarget:{fontSize:14,fontWeight:'500'},track:{height:6,borderRadius:6,overflow:'hidden'},claimWindow:{padding:10,borderRadius:9},trail:{marginTop:10},milestone:{flexDirection:'row',alignItems:'stretch',gap:10},rail:{width:32,alignItems:'center'},connector:{position:'absolute',top:26,bottom:0,width:1},node:{width:32,height:32,borderWidth:1,borderRadius:16,alignItems:'center',justifyContent:'center',marginTop:1},nodeMark:{fontSize:17,fontWeight:'700'},reward:{flex:1,minWidth:0,borderWidth:1,borderRadius:13,padding:12,gap:10,marginBottom:14},statusRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:4},statusStack:{flexDirection:'column',alignItems:'flex-start'},status:{fontSize:11,lineHeight:16,fontWeight:'800',letterSpacing:.6},rewardCopy:{flexDirection:'row',alignItems:'center',gap:10},copyStack:{flexDirection:'column',alignItems:'flex-start'},rewardName:{fontSize:15,lineHeight:21,fontWeight:'700'},guildNote:{borderTopWidth:1,paddingTop:14,flexDirection:'row',alignItems:'center',gap:10}});
