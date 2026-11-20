import {useEffect,useRef} from 'react';
import {Animated,Easing,StyleSheet,Text,View} from 'react-native';
import type {CoopRunRoutePathView} from '../../core/coop-presentation';
import {useSocialText} from '../../i18n/social';
import {useGameLanguage} from '../../i18n/GameLanguageProvider';
import {dungeonUxText} from '../../i18n/dungeon-ux-copy';
import {useCoopStyles} from '../../theme/useCoopStyles';
import {type CoopColors,coopSpacing,coopTypography} from '../../theme/coop-ui-theme';

/** A horizontal depth-indexed mini-map. Rooms the server has already resolved
 * are solid; the current step pulses; upcoming slots stay hollow until picked. */
export function RoutePathStrip({path,reduceMotion=false}:{path:CoopRunRoutePathView;reduceMotion?:boolean}){
 const {styles:s,colors:C}=useCoopStyles(makeStyles);
 const st=useSocialText();
 const language=useGameLanguage();
 const pulse=useRef(new Animated.Value(0)).current;
 useEffect(()=>{
  if(reduceMotion||path.totalDepth>16){pulse.setValue(0);return;}
  const loop=Animated.loop(Animated.sequence([
   Animated.timing(pulse,{toValue:1,duration:1100,easing:Easing.inOut(Easing.quad),useNativeDriver:true}),
   Animated.timing(pulse,{toValue:0,duration:1100,easing:Easing.inOut(Easing.quad),useNativeDriver:true}),
  ]));
  loop.start();
  return()=>loop.stop();
 },[reduceMotion,pulse,path.totalDepth]);
 const currentStyle={transform:[{scale:pulse.interpolate({inputRange:[0,1],outputRange:[1,1.14]})}],opacity:pulse.interpolate({inputRange:[0,1],outputRange:[.85,1]})};
 // Endurance routes can last dozens of rooms; a 43-dot minimap would
 // collapse on mobile. Show just the current seven-room checkpoint segment.
 if(path.totalDepth>16){
  const cleared=path.depth,checkpointAvailable=cleared>0&&cleared%7===0;
  const completedThisSegment=checkpointAvailable?7:cleared%7;
  const finalBossAvailable=cleared>=path.totalDepth-1;
  const nextRoom=Math.min(cleared+1,path.totalDepth);
  const threatTier=Math.min(7,Math.floor((nextRoom-1)/7)+1);
  const nextBossAt=Math.min(path.totalDepth-1,checkpointAvailable?cleared:Math.ceil((cleared+1)/7)*7);
  const checkpoints=Math.max(1,Math.ceil((path.totalDepth-1)/7));
  const segment=Math.min(checkpoints,Math.max(1,Math.ceil(Math.max(cleared,1)/7)));
  return <View style={s.container} accessibilityRole="progressbar" accessibilityValue={{min:0,max:path.totalDepth,now:Math.min(cleared,path.totalDepth)}} accessibilityLabel={st('Route progress: room {current} of {total}',{current:Math.min(cleared+1,path.totalDepth),total:path.totalDepth})}>
    <View style={s.header}><Text style={s.label}>{dungeonUxText(language,'enduranceRoute')} · {dungeonUxText(language,'threat')} {threatTier}</Text><Text style={s.counter}>{dungeonUxText(language,'room')} {nextRoom}</Text></View>
    <View style={s.strip}>{Array.from({length:7},(_,index)=><View key={index} style={[s.enduranceDot,index<completedThisSegment?s.visitedDot:s.futureDot]}/>)}</View>
    <View style={s.legendRow}><Text style={s.bossLegend}>{finalBossAvailable?dungeonUxText(language,'finalBossLegend'):checkpointAvailable?dungeonUxText(language,'bossCheckpoint'):dungeonUxText(language,'nextBossAt',{room:nextBossAt})}</Text><Text style={s.segmentMeta}>{segment}/{checkpoints}</Text></View>
   </View>;
 }
 const steps=Array.from({length:path.totalDepth},(_,index)=>index);
 return <View style={s.container} accessibilityRole="progressbar" accessibilityValue={{min:0,max:path.totalDepth,now:Math.min(path.depth,path.totalDepth)}} accessibilityLabel={st("Route progress: room {current} of {total}",{current:Math.min(path.depth+1,path.totalDepth),total:path.totalDepth})}>
  <View style={s.header}>
   <Text style={s.label}>{st("ROUTE")}</Text>
   <View style={s.headerRight}><Text style={s.bossLegend}>{st('FINAL BOSS')}</Text><Text style={s.counter}>{Math.min(path.depth+1,path.totalDepth)} / {path.totalDepth}</Text></View>
  </View>
  <View style={s.strip}>
   {steps.map(index=>{
    const isBoss=index===path.totalDepth-1;
    const visited=index<path.depth;
    const current=index===path.depth;
    if(current){
     return <Animated.View key={index} style={[s.dot,isBoss?s.bossDot:s.currentDot,currentStyle]}>{isBoss?<Text style={s.bossGlyph}>✦</Text>:null}</Animated.View>;
    }
    return <View key={index} style={[s.dot,visited?s.visitedDot:isBoss?s.bossDotFuture:s.futureDot]}>{isBoss?<Text style={[s.bossGlyph,visited?s.bossGlyphVisited:s.bossGlyphFuture]}>✦</Text>:null}</View>;
   }).reduce<React.ReactNode[]>((acc,node,index)=>{
    if(index>0)acc.push(<View key={'line-'+index} style={s.line}/>);
    acc.push(node);
    return acc;
   },[])}
  </View>
 </View>;
}

const makeStyles=(C:CoopColors)=>StyleSheet.create({
 container:{gap:6,paddingVertical:8,paddingHorizontal:coopSpacing.sm,borderWidth:1,borderColor:C.goldDim,borderRadius:12,backgroundColor:C.surface},
 legendRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 segmentMeta:{fontSize:10,lineHeight:14,color:C.textMuted,fontWeight:'800'},
 header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},headerRight:{flexDirection:'row',alignItems:'center',gap:10},bossLegend:{fontSize:10,lineHeight:14,color:C.gold,fontWeight:'700',letterSpacing:.2,flexShrink:1},
 label:{...coopTypography.meta,color:C.textMuted,fontWeight:'800',letterSpacing:.8,fontSize:10},
 counter:{...coopTypography.meta,color:C.gold,fontWeight:'800'},
 strip:{flexDirection:'row',alignItems:'center',gap:0},
 dot:{width:16,height:16,borderRadius:8,alignItems:'center',justifyContent:'center',borderWidth:1},
 enduranceDot:{flex:1,height:9,borderRadius:5,borderWidth:1},
 visitedDot:{backgroundColor:C.cyan,borderColor:C.cyan},
 currentDot:{backgroundColor:C.gold,borderColor:C.gold,shadowColor:C.gold,shadowOpacity:.5,shadowRadius:4,shadowOffset:{width:0,height:0},elevation:3},
 futureDot:{backgroundColor:'transparent',borderColor:C.line},
 bossDot:{backgroundColor:C.gold,borderColor:C.gold},
 bossDotFuture:{backgroundColor:'transparent',borderColor:C.goldDim},
 bossGlyph:{fontSize:10,lineHeight:12,fontWeight:'900'},
 bossGlyphVisited:{color:C.background},
 bossGlyphFuture:{color:C.gold},
 line:{flex:1,height:2,backgroundColor:C.line,marginHorizontal:2},
});
