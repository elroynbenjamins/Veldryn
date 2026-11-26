import {type PropsWithChildren,type ReactNode,useEffect,useMemo,useState} from 'react';
import {Animated,Easing,Modal,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useGameTheme} from '../theme/ThemeContext';
import {type ThemeColors} from '../theme/theme';
import {LOOP_NATIVE_DRIVER,useMotionEnabled} from './anim/motion';

/**
 * An immersive presentation for authoritative combat replays and raid status.
 * This surface never starts a fight or computes damage/rewards.
 */
export function CombatTheaterModal({visible,onClose,title,eyebrow,subtitle,compactHeader=false,tone='dungeon',reduceMotion=false,closeLabel='Minimize battle',footer,children}:PropsWithChildren<{
 visible:boolean;onClose:()=>void;title:string;eyebrow:string;subtitle?:string;compactHeader?:boolean;tone?:'dungeon'|'event'|'guild'|'companion';reduceMotion?:boolean;closeLabel?:string;footer?:ReactNode;
}>){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]),insets=useSafeAreaInsets();
 const [pulse]=useState(()=>new Animated.Value(0));
 const animate=useMotionEnabled(reduceMotion,visible);
 const haloMotion=useMemo(()=>({opacity:pulse.interpolate({inputRange:[0,1],outputRange:[.14,.35]}),transform:[{scale:pulse.interpolate({inputRange:[0,1],outputRange:[.9,1.2]})}]}),[pulse]);
 const accent=tone==='event'?C.special:tone==='guild'?C.warning:tone==='companion'?C.info:C.accent;
 useEffect(()=>{
  pulse.stopAnimation();pulse.setValue(0);
  if(!animate)return;
  const loop=Animated.loop(Animated.sequence([
   Animated.timing(pulse,{toValue:1,duration:1800,easing:Easing.inOut(Easing.quad),useNativeDriver:LOOP_NATIVE_DRIVER,isInteraction:false}),
   Animated.timing(pulse,{toValue:0,duration:1800,easing:Easing.inOut(Easing.quad),useNativeDriver:LOOP_NATIVE_DRIVER,isInteraction:false}),
  ]));
  loop.start();
  return()=>{loop.stop();pulse.stopAnimation();};
 },[animate,pulse]);
 return <Modal visible={visible} animationType={reduceMotion?'none':'fade'} onRequestClose={onClose} statusBarTranslucent hardwareAccelerated>
  <View style={s.root}>
   <View pointerEvents="none" style={s.ambient}>
    <Animated.View style={[s.halo,{borderColor:accent},haloMotion]}/>
   </View>
   <View style={[s.header,compactHeader&&s.headerCompact,{paddingTop:Math.max(insets.top,12)}]}>
    <View style={[s.heading,compactHeader&&s.headingCompact]}>
     <Text style={[s.eyebrow,{color:accent}]}>{eyebrow}</Text>
     <Text accessibilityRole="header" numberOfLines={2} style={[s.title,compactHeader&&s.titleCompact]}>{title}</Text>
     {subtitle?<Text style={s.subtitle}>{subtitle}</Text>:null}
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={closeLabel} onPress={onClose} style={({pressed})=>[s.close,compactHeader&&s.closeCompact,pressed&&s.pressed]}>
     <Text style={s.closeText}>×</Text>
    </Pressable>
   </View>
   <ScrollView style={s.scroll} contentContainerStyle={[s.content,{paddingBottom:Math.max(insets.bottom+20,32)}]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
    {children}
   </ScrollView>
   {footer?<View style={[s.footer,{paddingBottom:Math.max(insets.bottom,12)}]}>{footer}</View>:null}
  </View>
 </Modal>;
}

function styles(C:ThemeColors){return StyleSheet.create({
 root:{flex:1,backgroundColor:C.bg},
 ambient:{...StyleSheet.absoluteFill,overflow:'hidden',alignItems:'center',justifyContent:'center'},
 halo:{width:310,height:310,borderRadius:160,borderWidth:56,borderColor:C.accent,backgroundColor:C.infoSurface},
 header:{flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:16,paddingBottom:12,borderBottomWidth:1,borderColor:C.line,backgroundColor:C.panel},
 headerCompact:{paddingBottom:8},headingCompact:{gap:2},titleCompact:{fontSize:20,lineHeight:24},closeCompact:{width:44,height:44},
 heading:{flex:1,minWidth:0,gap:3},eyebrow:{fontSize:10,lineHeight:14,letterSpacing:1.2,fontWeight:'900',color:C.accent},
 title:{fontSize:21,lineHeight:26,fontWeight:'900',color:C.text},subtitle:{fontSize:11,lineHeight:16,color:C.muted},
 close:{width:46,height:46,alignItems:'center',justifyContent:'center',borderRadius:12,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},
 closeText:{fontSize:28,lineHeight:34,fontWeight:'400',color:C.text},pressed:{opacity:.7},
 scroll:{flex:1},content:{flexGrow:1,gap:14,paddingHorizontal:12,paddingTop:16},
 footer:{paddingHorizontal:12,paddingTop:10,borderTopWidth:1,borderColor:C.line,backgroundColor:C.panel},
});}
