import {Image,ImageBackground,StyleSheet,Text,View} from 'react-native';
import type {LiveEventRuntime} from '../core/types';
import {liveEventDef} from '../content/live-events';
import {liveEventVisuals} from '../ui/live-event-visuals-active';
import {GameButton} from './GameButton';
import {GameModalSurface} from './GameModalSurface';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {useMemo} from 'react';

/** A deliberately short launch card: detail belongs on the event hub, not in the interruption. */
export function EventStartPopup({runtime,reduceMotion,onOpen,onClose}:{runtime:LiveEventRuntime|null;reduceMotion:boolean;onOpen:()=>void;onClose:()=>void}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 if(!runtime)return null;
 const definition=liveEventDef(runtime.eventId),visuals=liveEventVisuals(definition?.visualKey),accent=definition?.accent??C.accent;
 const nextObjective=definition?.objectives[0];
 const ends=new Date(runtime.endsAtMs).toLocaleDateString(undefined,{month:'short',day:'numeric'});
 const activityCount=definition?.objectives.length??0;
 return <GameModalSurface visible presentation="dialog" reduceMotion={reduceMotion} onClose={onClose} backdropLabel="Close event announcement" surfaceStyle={[s.surface,{borderColor:accent}]}>
  <ImageBackground source={visuals.heroBackground} imageStyle={s.heroImage} style={s.hero}>
   <View style={s.heroShade}/><View style={[s.heroGlow,{backgroundColor:accent}]}/>
   <View style={s.heroTop}><Text style={[s.eventTag,{color:accent}]}>SEASONAL EVENT</Text><View style={s.livePill}><View style={[s.liveDot,{backgroundColor:accent}]}/><Text style={s.liveText}>LIVE</Text></View></View>
   {visuals.badgeIcon?<View style={[s.badgeShell,{borderColor:accent}]}><Image source={visuals.badgeIcon} resizeMode="contain" accessibilityLabel="Event badge" style={s.badge}/></View>:null}
   <View style={s.heroCopy}><Text accessibilityRole="header" style={s.eventName}>{definition?.name??runtime.eventId}</Text><Text numberOfLines={2} style={s.heroTitle}>{definition?.signature.title??'A new chapter is here'}</Text></View>
   <View style={s.heroStats}><View style={s.heroStat}><Text style={s.heroStatLabel}>ENDS</Text><Text style={s.heroStatValue}>{ends}</Text></View><View style={s.heroStat}><Text style={s.heroStatLabel}>WAYS TO HELP</Text><Text style={s.heroStatValue}>{activityCount} activities</Text></View></View>
  </ImageBackground>
  <View style={s.content}>
   <Text style={[s.eyebrow,{color:accent}]}>YOUR NEXT MOVE</Text>
   <View style={[s.objectiveCard,{borderColor:accent}]}>
    <View style={[s.objectiveMark,{backgroundColor:accent}]}><Text style={s.objectiveMarkText}>✦</Text></View>
    <View style={s.flex}><Text style={s.objectiveTitle}>{nextObjective?.name??'Join the ward effort'}</Text><Text numberOfLines={2} style={s.objectiveCopy}>{nextObjective?.description??'Keep playing to build event progress and uncover seasonal rewards.'}</Text></View>
   </View>
   <View style={s.rewardRow}>{visuals.commonCurrencyIcon?<Image source={visuals.commonCurrencyIcon} style={s.currencyIcon}/>:null}<View style={s.flex}><Text style={s.rewardTitle}>{definition?.currencyName??'Event currency'}</Text><Text style={s.rewardCopy}>Earned automatically from eligible play</Text></View>{visuals.prestigeCurrencyIcon?<Image source={visuals.prestigeCurrencyIcon} style={s.currencyIcon}/>:null}</View>
  </View>
  <View style={s.actions}><View style={s.flex}><GameButton title="Open Veilbreak" onPress={onOpen}/></View><GameButton title="Not now" tone="secondary" onPress={onClose}/></View>
 </GameModalSurface>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 surface:{height:'94%',maxHeight:'96%',overflow:'hidden',padding:0,backgroundColor:C.bg},
 hero:{height:238,justifyContent:'flex-end',padding:spacing.lg,position:'relative',overflow:'hidden'},
 heroImage:{opacity:.94},
 heroShade:{...StyleSheet.absoluteFill,backgroundColor:'rgba(4,8,17,.52)'},
 heroGlow:{position:'absolute',right:-80,bottom:-105,width:260,height:260,borderRadius:999,opacity:.18},
 heroTop:{position:'absolute',top:20,left:spacing.lg,right:spacing.lg,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 eventTag:{fontSize:10,fontWeight:'900',letterSpacing:1.4},
 livePill:{flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:9,paddingVertical:5,borderWidth:1,borderColor:'rgba(255,255,255,.22)',borderRadius:99,backgroundColor:'rgba(5,10,20,.72)'},
 liveDot:{width:7,height:7,borderRadius:99},liveText:{fontSize:9,color:'#fff',fontWeight:'900',letterSpacing:1},
 badgeShell:{position:'absolute',top:54,right:spacing.lg,width:76,height:76,borderWidth:1,borderRadius:38,backgroundColor:'rgba(5,10,20,.72)',alignItems:'center',justifyContent:'center'},
 badge:{width:66,height:66},
 heroCopy:{zIndex:2,gap:5,maxWidth:'78%'},
 eventName:{...typography.hero,color:'#fff',fontWeight:'900',textShadowColor:'#000',textShadowRadius:7},
 heroTitle:{...typography.bodyStrong,color:'rgba(255,255,255,.92)',lineHeight:20,textShadowColor:'#000',textShadowRadius:4},
 heroStats:{zIndex:2,flexDirection:'row',gap:8,marginTop:spacing.md},
 heroStat:{minWidth:106,paddingHorizontal:9,paddingVertical:7,borderWidth:1,borderColor:'rgba(255,255,255,.18)',borderRadius:radii.sm,backgroundColor:'rgba(5,10,20,.65)'},
 heroStatLabel:{fontSize:8,color:'rgba(255,255,255,.64)',fontWeight:'900',letterSpacing:.8},heroStatValue:{fontSize:12,color:'#fff',fontWeight:'800',marginTop:2},
 content:{flexGrow:1,gap:spacing.sm,padding:spacing.lg,paddingBottom:spacing.md},eyebrow:{fontSize:10,fontWeight:'900',letterSpacing:1.25},
 objectiveCard:{flexDirection:'row',alignItems:'center',gap:10,padding:spacing.md,borderWidth:1,borderLeftWidth:4,borderRadius:radii.sm,backgroundColor:C.panel2},
 objectiveMark:{width:30,height:30,borderRadius:15,alignItems:'center',justifyContent:'center'},objectiveMarkText:{fontSize:15,color:'#fff',fontWeight:'900'},
 flex:{flex:1,minWidth:0},objectiveTitle:{...typography.bodyStrong,color:C.text},objectiveCopy:{...typography.caption,color:C.muted,lineHeight:17,marginTop:2},
 rewardRow:{flexDirection:'row',alignItems:'center',gap:9,paddingHorizontal:spacing.sm,paddingVertical:7,borderRadius:radii.sm,backgroundColor:C.panel},
 currencyIcon:{width:28,height:28,resizeMode:'contain'},rewardTitle:{...typography.caption,color:C.text,fontWeight:'900'},rewardCopy:{fontSize:11,color:C.muted,marginTop:1},
 actions:{flexShrink:0,flexDirection:'row',alignItems:'center',gap:spacing.sm,paddingHorizontal:spacing.lg,paddingBottom:spacing.lg},
});}
