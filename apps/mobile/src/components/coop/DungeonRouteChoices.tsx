import {AccessibilityInfo,Animated,Easing,Pressable,StyleSheet,Text,View} from 'react-native';
import {useEffect,useMemo,useState} from 'react';
import type {CoopMode,CoopRouteOptionView} from '../../core/coop-presentation';
import {type CoopColors,coopSpacing,coopTypography} from '../../theme/coop-ui-theme';
import {useCoopStyles} from '../../theme/useCoopStyles';
import {useSocialText} from '../../i18n/social';
import {dungeonUxText} from '../../i18n/dungeon-ux-copy';
import {useGameLanguage} from '../../i18n/GameLanguageProvider';
import {useDungeonDynamicUiText} from '../../i18n/dungeon-dynamic-ui';
import {localizedDungeonEncounterPreview} from '../../i18n/dungeon-encounter-preview';
import {seasonalDungeonRoomTitle} from '../../i18n/seasonal-dungeon-copy';
import {localizedSeasonalDungeonRouteRisk,localizedSeasonalDungeonRouteReward} from '../../i18n/seasonal-dungeon-effects';
import {CoopImageSlot} from './CoopVisualKit';
import {IdentityArtwork} from '../SocialIdentity';
import {dungeonRoomPresentation} from './dungeon-room-presentation';
import {localizedDungeonRoomModifier} from '../../i18n/dungeon-room-modifiers';

/**
 * One decision per room card. The whole card is the Choose/Vote target;
 * the existing server-authoritative onChoose callback remains unchanged.
 */
export function DungeonRouteChoices({options,mode,phase,busy=false,onChoose,myVotedNodeId,selfVoter,combatMarksRemaining=25}:{
 options:CoopRouteOptionView[];mode:CoopMode;phase:string;busy?:boolean;onChoose?:(nodeId:string)=>void;myVotedNodeId?:string;combatMarksRemaining?:number;selfVoter?:{name:string;profileIconId?:string|null;className?:string|null};
}){
 const {styles:s}=useCoopStyles(makeStyles);
 const st=useSocialText(),ui=useDungeonDynamicUiText(),language=useGameLanguage(),canChoose=Boolean(onChoose)&&phase==='awaiting_choice'&&!busy;
 const action=mode==='qmode'?ui('Choose room'):ui('Vote');
 const live=mode==='live',totalVotes=live?options.reduce((total,option)=>total+(option.votes??0),0):0;
 const stepKey=options.map(option=>option.nodeId).join('|');
 const [reduceMotion,setReduceMotion]=useState(false);
 const anims=useMemo(()=>options.map(()=>new Animated.Value(0)),[stepKey]);
 useEffect(()=>{
  let mounted=true;
  void AccessibilityInfo.isReduceMotionEnabled().then(enabled=>{if(mounted)setReduceMotion(enabled);}).catch(()=>{});
  const subscription=AccessibilityInfo.addEventListener('reduceMotionChanged',setReduceMotion);
  return ()=>{mounted=false;subscription.remove();};
 },[]);
 useEffect(()=>{
  if(reduceMotion){anims.forEach(value=>value.setValue(1));return;}
  anims.forEach(value=>value.setValue(0));
  const animation=Animated.stagger(70,anims.map(value=>Animated.timing(value,{toValue:1,duration:260,easing:Easing.out(Easing.cubic),useNativeDriver:true})));
  animation.start();
  return ()=>animation.stop();
 },[anims,reduceMotion]);
 return <View style={s.list}>
  {options.map((option,optionIndex)=>{
   const enter=anims[optionIndex]??new Animated.Value(1);
   const enterStyle={opacity:enter,transform:[{translateY:enter.interpolate({inputRange:[0,1],outputRange:[10,0]})}]};
   const canPress=canChoose&&!option.hidden;
   const bossExit=option.kind==='boss'&&options.length>1;
   const routeAction=bossExit?(live?dungeonUxText(language,'bossVote'):dungeonUxText(language,'bossFinish')):option.kind==='boss'&&!live?dungeonUxText(language,'bossFinal'):action;
   const votedHere=live&&myVotedNodeId===option.nodeId;
   const room=dungeonRoomPresentation(option.kind);
   const title=room&&(option.title.trim().toLowerCase()===option.kind.trim().toLowerCase()||(option.kind==='boss'&&option.title.trim().toLowerCase()==='final boss'))?st(room.name):seasonalDungeonRoomTitle(language,option.title);
   const preview=option.encounterPreview?localizedDungeonEncounterPreview(language,option.encounterPreview).summary:(room?st(room.description):undefined);
   const modifier=option.kind==='elite'?localizedDungeonRoomModifier(language,option.modifierId):undefined;
   const riskBaseline=/^risk\s+1(?:\.0+)?$/i.test(option.risk.trim());
   const redundantReward=option.reward.trim().toLowerCase().replace(/[\s_-]+/g,'')===option.kind.trim().toLowerCase().replace(/[\s_-]+/g,'');
   const translatedRisk=localizedSeasonalDungeonRouteRisk(language,option.risk);
   const translatedReward=localizedSeasonalDungeonRouteReward(language,option.reward);
    const roomMarks=option.kind==='battle'?3:option.kind==='elite'?5:0;
    const combatMarks=Math.min(roomMarks,Math.max(0,combatMarksRemaining));
   return <Animated.View key={option.nodeId} style={enterStyle}><Pressable
    accessibilityRole="button"
    accessibilityLabel={ui('Route {title}: {risk}; {reward}. {extra}{action}',{title,risk:translatedRisk,reward:translatedReward,extra:(modifier?modifier.label+'. ':'')+(live?ui('{votes} of {total} votes. ',{votes:option.votes??0,total:totalVotes})+(votedHere?ui('Your vote. '):''):'') ,action:canPress?(votedHere?ui('Your vote'):routeAction):ui('Unavailable')})}
    accessibilityHint={bossExit?`${preview??''} ${dungeonUxText(language,'bossHint')}`:preview}
    accessibilityState={{disabled:!canPress,selected:votedHere}}
    disabled={!canPress}
    onPress={()=>onChoose?.(option.nodeId)}
    style={({pressed})=>[s.card,option.kind==='boss'&&s.bossCard,votedHere&&s.myChoice,option.hidden&&s.hiddenCard,pressed&&canPress&&s.pressed]}
   >
    <CoopImageSlot assetId={room?.art??'node_event'} size="node" accessibilityLabel={title}/>
    <View style={s.content}>
     <View style={s.heading}>
      <Text style={s.title} numberOfLines={1}>{title}</Text>
      {live?<View style={s.voteLine}>
       <Text style={s.votes}>{ui('{votes}/4 votes',{votes:option.votes??0})}</Text>
       {votedHere&&selfVoter?<View style={s.myVote}><IdentityArtwork name={selfVoter.name} profileIconId={selfVoter.profileIconId} className={selfVoter.className} size={18}/></View>:null}
      </View>:null}
      <Text style={[s.actionCue,bossExit&&s.bossAction]}>{votedHere?ui('Your vote'):routeAction} <Text style={s.chevron}>{'›'}</Text></Text>
     </View>
     {preview?<Text numberOfLines={1} style={s.preview}>{preview}</Text>:null}
     {bossExit?<Text numberOfLines={1} style={s.bossHint}>{dungeonUxText(language,'bossHint')}</Text>:null}
     {(!riskBaseline||!redundantReward||modifier||roomMarks>0)?<View style={s.tags}>
      {modifier?<View style={s.modifierTag}><Text style={s.modifierText} numberOfLines={1}>{modifier.label}</Text></View>:null}
      {!riskBaseline?<View style={s.riskTag}><Text style={s.riskText} numberOfLines={1}>{translatedRisk}</Text></View>:null}
      {roomMarks>0?<View style={s.rewardTag}><Text style={s.rewardText} >{combatMarks>0?`+${combatMarks} ${st('Marks')}`:st('Combat Marks capped')}</Text></View>:null}
       {!redundantReward?<View style={s.rewardTag}><Text style={s.rewardText} numberOfLines={1}>{translatedReward}</Text></View>:null}
     </View>:null}
    </View>
   </Pressable></Animated.View>;
  })}
 </View>;
}
function makeStyles(C:CoopColors){return StyleSheet.create({
 list:{gap:6},
 card:{minHeight:62,flexDirection:'row',alignItems:'center',gap:9,paddingHorizontal:10,paddingVertical:7,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.surface,overflow:'hidden'},
 bossCard:{borderColor:C.goldDim,backgroundColor:C.surfaceRaised},bossAction:{color:C.gold},bossHint:{fontSize:10,lineHeight:14,fontWeight:'700',color:C.gold},myChoice:{borderColor:C.cyan,borderWidth:2,backgroundColor:C.selection},
 hiddenCard:{opacity:.6},
 pressed:{backgroundColor:C.surfaceRaised},
 content:{flex:1,minWidth:0,justifyContent:'center',gap:2},
 heading:{flexDirection:'row',alignItems:'center',gap:6,minHeight:19},
 title:{flex:1,minWidth:0,fontSize:15,lineHeight:20,color:C.text,fontWeight:'800'},
 tags:{flexDirection:'row',alignItems:'center',gap:5},
 modifierTag:{borderRadius:4,paddingHorizontal:5,paddingVertical:1,backgroundColor:C.surfaceRaised,maxWidth:'48%'},
 modifierText:{fontSize:10,lineHeight:13,color:C.cyan,fontWeight:'800'},
 riskTag:{borderRadius:4,paddingHorizontal:5,paddingVertical:1,backgroundColor:C.surfaceRaised,maxWidth:'48%'},
 riskText:{fontSize:10,lineHeight:13,color:C.danger,fontWeight:'700'},
 rewardTag:{borderRadius:4,paddingHorizontal:5,paddingVertical:1,backgroundColor:C.surfaceRaised,maxWidth:'48%'},
 rewardText:{fontSize:10,lineHeight:13,color:C.gold,fontWeight:'700'},
 preview:{fontSize:12,lineHeight:16,color:C.textSecondary},
 voteLine:{flexDirection:'row',alignItems:'center',gap:4,flexShrink:0},
 myVote:{alignItems:'center',justifyContent:'center'},
 votes:{fontSize:11,lineHeight:16,color:C.cyan,fontWeight:'800'},
 actionCue:{fontSize:11,lineHeight:16,color:C.gold,fontWeight:'800',flexShrink:0},
 chevron:{fontSize:16,lineHeight:18,color:C.gold,fontWeight:'700'},
 });}
