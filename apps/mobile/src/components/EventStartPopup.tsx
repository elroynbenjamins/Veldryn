import {Image,ImageBackground,StyleSheet,Text,View} from 'react-native';
import type {LiveEventRuntime} from '../core/types';
import {liveEventDef} from '../content/live-events';
import {liveEventVisuals} from '../ui/live-event-visuals-active';
import {GameButton} from './GameButton';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {useMemo} from 'react';

export function EventStartPopup({runtime,reduceMotion,onOpen,onClose}:{runtime:LiveEventRuntime|null;reduceMotion:boolean;onOpen:()=>void;onClose:()=>void}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 if(!runtime)return null;
 const definition=liveEventDef(runtime.eventId),visuals=liveEventVisuals(definition?.visualKey),accent=definition?.accent??C.accent;
 const highlights=definition?.signature.highlights.slice(0,2)??['Earn event rewards from your regular play.','Claim completed activities whenever you are ready.'];
 const ends=new Date(runtime.endsAtMs).toLocaleDateString(undefined,{month:'short',day:'numeric'});
 return <GameModalSurface visible presentation="dialog" reduceMotion={reduceMotion} onClose={onClose} backdropLabel="Close event announcement" surfaceStyle={[s.surface,{borderColor:accent}]}>
  <GameModalHeader eyebrow="SEASONAL EVENT" title={definition?.name??runtime.eventId} onClose={onClose}/>
  <ImageBackground source={visuals.heroBackground} imageStyle={s.heroImage} style={s.hero}>
   <View style={s.heroShade}/><View style={[s.livePill,{borderColor:accent}]}><View style={[s.liveDot,{backgroundColor:accent}]}/><Text style={s.liveText}>LIVE NOW</Text></View>
   {visuals.badgeIcon?<Image source={visuals.badgeIcon} resizeMode="contain" accessibilityLabel="Event badge" style={s.badge}/>:null}
   <View style={s.heroCopy}><Text style={s.heroTitle}>{definition?.signature.title??'A new chapter is here'}</Text><Text style={s.heroBody}>{definition?.summary??'A new seasonal event is available.'}</Text></View>
   <View style={s.heroStats}><View style={s.heroStat}><Text style={s.heroStatLabel}>ENDS</Text><Text style={s.heroStatValue}>{ends}</Text></View><View style={s.heroStat}><Text style={s.heroStatLabel}>ACTIVITIES</Text><Text style={s.heroStatValue}>{definition?.weeklyObjectives.length??3} weekly</Text></View></View>
  </ImageBackground>
  <View style={s.content}><Text style={[s.kicker,{color:accent}]}>{definition?.signature.label??'EVENT HIGHLIGHTS'}</Text><Text style={s.copy}>{definition?.signature.description??'Play normally to build event progress and unlock its reward path.'}</Text><View style={s.highlightList}>{highlights.map((highlight,index)=><View key={highlight} style={s.highlight}><Text style={[s.highlightNumber,{color:accent}]}>{index+1}</Text><Text style={s.highlightText}>{highlight}</Text></View>)}</View><View style={s.rewardStrip}>{visuals.commonCurrencyIcon?<Image source={visuals.commonCurrencyIcon} style={s.currencyIcon}/>:null}<View style={s.flex}><Text style={s.rewardTitle}>{definition?.currencyName??'Event currency'}</Text><Text style={s.rewardCopy}>Earned automatically from eligible play</Text></View>{visuals.prestigeCurrencyIcon?<Image source={visuals.prestigeCurrencyIcon} style={s.currencyIcon}/>:null}</View></View>
  <View style={s.actions}><View style={s.flex}><GameButton title="Explore event" onPress={onOpen}/></View><View style={s.flex}><GameButton title="Later" tone="secondary" onPress={onClose}/></View></View>
 </GameModalSurface>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({surface:{maxHeight:'94%',overflow:'hidden',padding:0},hero:{height:246,justifyContent:'flex-end',padding:spacing.lg,position:'relative'},heroImage:{opacity:.9},heroShade:{...StyleSheet.absoluteFill,backgroundColor:'rgba(5,10,20,.55)'},livePill:{position:'absolute',top:spacing.md,left:spacing.md,flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:9,paddingVertical:5,borderWidth:1,borderRadius:99,backgroundColor:'rgba(8,14,25,.72)'},liveDot:{width:7,height:7,borderRadius:99},liveText:{fontSize:9,color:'#fff',fontWeight:'900',letterSpacing:1},badge:{position:'absolute',top:spacing.sm,right:spacing.md,width:82,height:82,zIndex:2},heroCopy:{zIndex:2,gap:4,maxWidth:'85%'},heroTitle:{...typography.title,color:'#fff',fontWeight:'900',textShadowColor:'#000',textShadowRadius:6},heroBody:{...typography.body,color:'rgba(255,255,255,.9)',lineHeight:20,textShadowColor:'#000',textShadowRadius:4},heroStats:{zIndex:2,flexDirection:'row',gap:8,marginTop:spacing.md},heroStat:{minWidth:90,paddingHorizontal:9,paddingVertical:7,borderWidth:1,borderColor:'rgba(255,255,255,.2)',borderRadius:radii.sm,backgroundColor:'rgba(5,10,20,.58)'},heroStatLabel:{fontSize:8,color:'rgba(255,255,255,.68)',fontWeight:'900',letterSpacing:.7},heroStatValue:{fontSize:12,color:'#fff',fontWeight:'800',marginTop:2},content:{gap:spacing.sm,paddingHorizontal:spacing.lg,paddingTop:spacing.md},kicker:{fontSize:10,fontWeight:'900',letterSpacing:1},copy:{...typography.body,color:C.muted,lineHeight:20},highlightList:{gap:6},highlight:{flexDirection:'row',alignItems:'center',gap:9,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},highlightNumber:{width:20,fontSize:12,fontWeight:'900',textAlign:'center'},highlightText:{flex:1,...typography.caption,color:C.text,lineHeight:17,fontWeight:'700'},rewardStrip:{flexDirection:'row',alignItems:'center',gap:9,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel},currencyIcon:{width:30,height:30,resizeMode:'contain'},rewardTitle:{...typography.bodyStrong,color:C.text},rewardCopy:{...typography.caption,color:C.muted,marginTop:1},actions:{flexDirection:'row',gap:spacing.sm,padding:spacing.lg,paddingTop:spacing.md},flex:{flex:1,minWidth:0},});}
