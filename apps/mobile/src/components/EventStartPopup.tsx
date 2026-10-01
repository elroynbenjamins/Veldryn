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
 return <GameModalSurface visible presentation="dialog" reduceMotion={reduceMotion} onClose={onClose} backdropLabel="Close event announcement" surfaceStyle={[s.surface,{borderColor:accent}]}>
  <GameModalHeader eyebrow="LIVE EVENT" title={definition?.name??runtime.eventId} onClose={onClose}/>
  <ImageBackground source={visuals.heroBackground} imageStyle={s.heroImage} style={s.hero}>
   {visuals.badgeIcon?<Image source={visuals.badgeIcon} resizeMode="contain" accessibilityLabel="Event badge" style={s.badge}/>:null}
   <View style={s.heroShade}/>
   <Text style={s.live}>NOW LIVE</Text>
  </ImageBackground>
  <Text style={s.title}>{definition?.summary??'A new seasonal event is now available.'}</Text>
  <Text style={s.copy}>Event activities, rewards, contracts, and event progression are now available. Your progress remains yours after the event ends.</Text>
  <View style={s.actions}><View style={s.flex}><GameButton title="Open event" onPress={onOpen}/></View><View style={s.flex}><GameButton title="Later" tone="secondary" onPress={onClose}/></View></View>
 </GameModalSurface>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({surface:{overflow:'hidden',padding:0},hero:{height:150,justifyContent:'flex-end',padding:spacing.md,position:'relative'},heroImage:{opacity:.78},heroShade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(0,0,0,.28)'},badge:{position:'absolute',top:spacing.md,right:spacing.md,width:72,height:72,zIndex:2},live:{zIndex:2,color:'#fff',fontSize:11,fontWeight:'900',letterSpacing:1.4,textShadowColor:'#000',textShadowRadius:4},title:{...typography.bodyStrong,color:C.text,paddingHorizontal:spacing.lg,paddingTop:spacing.lg},copy:{color:C.muted,lineHeight:20,paddingHorizontal:spacing.lg,paddingTop:spacing.sm},actions:{flexDirection:'row',gap:spacing.sm,padding:spacing.lg},flex:{flex:1,minWidth:0},});}
