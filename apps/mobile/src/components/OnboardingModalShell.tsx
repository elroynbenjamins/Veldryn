import type {ReactNode} from 'react';
import {Modal,ScrollView,StyleSheet,View,useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useGameTheme} from '../theme/ThemeContext';

/** A bounded, scrollable explanation. No timeout, forced animation or fixed bottom offset. */
export function OnboardingModalShell({children,footer,onClose,reduceMotion=true}:{children:ReactNode;footer:ReactNode;onClose:()=>void;reduceMotion?:boolean}){
 const C=useGameTheme(),{height}=useWindowDimensions(),insets=useSafeAreaInsets();
 const maxHeight=Math.max(120,height-insets.top-insets.bottom-32);
 return <Modal transparent visible animationType={reduceMotion?'none':'fade'} onRequestClose={onClose}>
  <View style={[s.backdrop,{paddingTop:insets.top+16,paddingBottom:insets.bottom+16}]}>
   <View accessibilityViewIsModal style={[s.card,{maxHeight,backgroundColor:C.panel,borderColor:C.accentSoft}]}>
    <ScrollView style={s.scroll} contentContainerStyle={s.content} bounces={false}>{children}</ScrollView>
    <View style={[s.footer,{borderColor:C.line}]}>{footer}</View>
   </View>
  </View>
 </Modal>;
}
const s=StyleSheet.create({backdrop:{flex:1,justifyContent:'center',paddingHorizontal:16,backgroundColor:'rgba(0,0,0,.68)'},card:{width:'100%',maxWidth:460,alignSelf:'center',borderWidth:1,borderRadius:20,overflow:'hidden'},scroll:{flexShrink:1},content:{padding:20,gap:10},footer:{padding:14,borderTopWidth:1}});
