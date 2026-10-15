import {Image,ImageBackground,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {LiveEventRuntime} from '../core/types';
import {liveEventDef} from '../content/live-events';
import {liveEventVisuals} from '../ui/live-event-visuals-active';
import {GameButton} from './GameButton';
import {GameModalSurface} from './GameModalSurface';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {useMemo} from 'react';

export function EventStartPopup({runtime,reduceMotion,onOpen,onClose}:{runtime:LiveEventRuntime|null;reduceMotion:boolean;onOpen:()=>void;onClose:()=>void}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 if(!runtime)return null;
 const definition=liveEventDef(runtime.eventId),visuals=liveEventVisuals(definition?.visualKey),accent=definition?.accent??C.accent;
 return <GameModalSurface visible presentation="dialog" reduceMotion={reduceMotion} onClose={onClose} backdropLabel="Close event announcement" surfaceStyle={s.surface}>
  <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
   <ImageBackground source={visuals.heroBackground} resizeMode="cover" style={s.hero}>
    <View style={s.shade}/>
    <View style={s.heroTop}><View style={[s.pill,{borderColor:accent}]}><Text style={s.pillText}>●  LIVE EVENT</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={s.closeButton}><Text style={s.closeText}>×</Text></Pressable></View>
    {visuals.badgeIcon?<Image source={visuals.badgeIcon} resizeMode="contain" style={s.badge}/>:null}
    <View style={s.heroBottom}><Text style={s.eyebrow}>A NEW SEASON HAS BEGUN</Text><Text style={s.eventTitle}>{definition?.name??runtime.eventId}</Text></View>
   </ImageBackground>
   <View style={s.body}>
    <Text style={s.summary}>{definition?.summary??'A new seasonal event is now available.'}</Text>
    <View style={s.divider}/>
    <View style={s.feature}><Text style={[s.featureIcon,{color:accent}]}>✦</Text><View style={s.featureCopy}><Text style={s.featureTitle}>Earn rewards as you play</Text><Text style={s.featureDetail}>Your regular gameplay contributes to the event.</Text></View></View>
    <View style={s.feature}><Text style={[s.featureIcon,{color:accent}]}>✓</Text><View style={s.featureCopy}><Text style={s.featureTitle}>3 weekly activities</Text><Text style={s.featureDetail}>Progress tracks automatically. Claim each once when complete. Progress is kept after the event ends.</Text></View></View>
    <View style={s.actions}><View style={s.flex}><GameButton title="Open event" onPress={onOpen}/></View><View style={s.flex}><GameButton title="Later" tone="secondary" onPress={onClose}/></View></View>
   </View>
  </ScrollView>
 </GameModalSurface>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 surface:{maxWidth:440,maxHeight:'86%',overflow:'hidden',padding:0,borderColor:C.lineStrong,borderRadius:radii.lg},
 hero:{height:225,justifyContent:'space-between'},shade:{...StyleSheet.absoluteFill,backgroundColor:'rgba(5,6,14,.26)'},
 heroTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:14,paddingTop:10},
 pill:{paddingHorizontal:11,paddingVertical:7,borderWidth:1,borderRadius:99,backgroundColor:'rgba(8,9,15,.82)'},pillText:{fontSize:10,color:'#fff',fontWeight:'900',letterSpacing:1},
 closeButton:{width:40,height:40,alignItems:'center',justifyContent:'center',borderRadius:20,backgroundColor:'rgba(8,9,15,.8)'},closeText:{fontSize:28,color:'#fff',lineHeight:32},
 badge:{position:'absolute',right:18,top:68,width:70,height:70},
 heroBottom:{paddingHorizontal:18,paddingVertical:14,backgroundColor:'rgba(5,6,14,.7)'},eyebrow:{fontSize:9,fontWeight:'900',letterSpacing:1.2,color:'#efbd99'},eventTitle:{fontSize:25,lineHeight:31,fontWeight:'900',color:'#fff'},
 body:{paddingHorizontal:18,paddingTop:15,paddingBottom:18,gap:12},
 summary:{...typography.bodyStrong,fontSize:13,lineHeight:19,color:C.text},divider:{height:1,backgroundColor:C.line},
 feature:{flexDirection:'row',alignItems:'flex-start',gap:12},featureIcon:{width:28,fontSize:22,fontWeight:'900',textAlign:'center'},featureCopy:{flex:1,gap:3},featureTitle:{fontSize:12,fontWeight:'900',color:C.text},featureDetail:{fontSize:11,lineHeight:16,color:C.muted},
 actions:{flexDirection:'row',gap:spacing.sm,marginTop:6},flex:{flex:1,minWidth:0},
});}
