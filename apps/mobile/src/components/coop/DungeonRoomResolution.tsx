import {useEffect,useRef} from 'react';
import {ActivityIndicator,Animated,Easing,StyleSheet,Text,View} from 'react-native';
import {useCoopStyles} from '../../theme/useCoopStyles';
import {useSocialText} from '../../i18n/social';
import {type CoopColors,coopSpacing} from '../../theme/coop-ui-theme';
import {CoopImageSlot,FantasyPanel} from './CoopVisualKit';
import {dungeonRoomPresentation} from './dungeon-room-presentation';

/** Used only for non-combat resolution. Never launches the combat theater. */
export function DungeonRoomResolution({kind,reduceMotion=false}:{kind?:string;reduceMotion?:boolean}){
 const {colors,styles:s}=useCoopStyles(makeStyles),st=useSocialText();
 const room=dungeonRoomPresentation(kind);
 const pulse=useRef(new Animated.Value(0)).current;
 useEffect(()=>{
  if(reduceMotion){pulse.setValue(0);return;}
  const loop=Animated.loop(Animated.sequence([
   Animated.timing(pulse,{toValue:1,duration:1200,easing:Easing.inOut(Easing.quad),useNativeDriver:true}),
   Animated.timing(pulse,{toValue:0,duration:1200,easing:Easing.inOut(Easing.quad),useNativeDriver:true}),
  ]));
  loop.start();
  return()=>loop.stop();
 },[reduceMotion,pulse]);
 const haloStyle={opacity:pulse.interpolate({inputRange:[0,1],outputRange:[.35,.85]}),transform:[{scale:pulse.interpolate({inputRange:[0,1],outputRange:[1,1.06]})}]};
 return <FantasyPanel variant="default">
  <View style={s.row}>
   {room?<View style={s.artHolder}>
    <Animated.View pointerEvents="none" style={[s.halo,{borderColor:colors.cyan},haloStyle]}/>
    <CoopImageSlot assetId={room.art} size="thumbnail" accessibilityLabel={st(room.name)}/>
   </View>:null}
   <View style={s.grow}>
    <Text style={s.kicker}>{st('Room in progress')}</Text>
    <Text style={s.title}>{room?st(room.name):st('Resolving the selected room')}</Text>
    {room?<Text style={s.description} numberOfLines={2}>{st(room.description)}</Text>:null}
   </View>
  </View>
  <View style={s.progress} accessibilityLiveRegion="polite">
   {!reduceMotion?<ActivityIndicator size="small" color={colors.cyan}/>:null}
   <Text style={s.progressText}>{st('Saving room progress')}</Text>
  </View>
 </FantasyPanel>;
}

const makeStyles=(C:CoopColors)=>StyleSheet.create({
 row:{flexDirection:'row',alignItems:'center',gap:coopSpacing.md},
 artHolder:{position:'relative',alignItems:'center',justifyContent:'center'},
 halo:{position:'absolute',top:-6,left:-6,right:-6,bottom:-6,borderRadius:16,borderWidth:2},
 grow:{flex:1,minWidth:0,gap:4},
 kicker:{fontSize:10,lineHeight:14,color:C.gold,fontWeight:'800',letterSpacing:.7},
 title:{fontSize:17,lineHeight:23,color:C.text,fontWeight:'800'},
 description:{fontSize:12,lineHeight:18,color:C.textSecondary},
 progress:{minHeight:34,flexDirection:'row',gap:coopSpacing.sm,alignItems:'center',paddingTop:coopSpacing.xs,borderTopWidth:StyleSheet.hairlineWidth,borderColor:C.line},
 progressText:{fontSize:12,lineHeight:17,color:C.textMuted},
});
