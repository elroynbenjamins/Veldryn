import {Modal,Pressable,StyleSheet,Text,View} from 'react-native';
import type {FirstSessionTutorialStep} from '../core/first-session-tutorial';
import {useGameTheme} from '../theme/ThemeContext';

export function FirstSessionTutorialPopup({step,onLater,onOpen}:{step?:FirstSessionTutorialStep;onLater:()=>void;onOpen:()=>void}){
 const C=useGameTheme();
 if(!step)return null;
 return <Modal transparent animationType="fade" visible onRequestClose={onLater}>
  <View style={s.backdrop}>
   <View accessibilityRole="summary" style={[s.card,{backgroundColor:C.panel,borderColor:C.accentSoft}]}>
    <Text style={[s.eyebrow,{color:C.accent}]}>{step.eyebrow}</Text>
    <Text style={[s.title,{color:C.text}]}>{step.title}</Text>
    <Text style={[s.body,{color:C.text}]}>{step.body}</Text>
    <View style={[s.hint,{backgroundColor:C.selection,borderColor:C.line}]}><Text style={[s.hintText,{color:C.muted}]}>{step.hint}</Text></View>
    <Text style={[s.small,{color:C.muted}]}>Only the next relevant area is highlighted. Other systems can wait.</Text>
    <View style={s.actions}>
     <Pressable accessibilityRole="button" onPress={onLater} style={({pressed})=>[s.secondary,{borderColor:C.line},pressed&&s.pressed]}><Text style={[s.secondaryText,{color:C.muted}]}>Later</Text></Pressable>
     <Pressable accessibilityRole="button" onPress={onOpen} style={({pressed})=>[s.primary,{backgroundColor:C.accent},pressed&&s.pressed]}><Text style={[s.primaryText,{color:C.bg}]}>{step.actionLabel}</Text></Pressable>
    </View>
   </View>
  </View>
 </Modal>;
}
const s=StyleSheet.create({
 backdrop:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(0,0,0,.58)',padding:14,paddingBottom:94},
 card:{borderWidth:1,borderRadius:18,padding:18,gap:10},
 eyebrow:{fontSize:11,fontWeight:'900',letterSpacing:1.1},
 title:{fontSize:22,lineHeight:27,fontWeight:'900'},
 body:{fontSize:15,lineHeight:21},
 hint:{borderWidth:1,borderRadius:12,padding:12},
 hintText:{fontSize:14,lineHeight:19,fontWeight:'700'},
 small:{fontSize:12,lineHeight:17},
 actions:{flexDirection:'row',justifyContent:'flex-end',gap:10,marginTop:2},
 secondary:{minHeight:44,justifyContent:'center',paddingHorizontal:16,borderWidth:1,borderRadius:12},
 secondaryText:{fontSize:14,fontWeight:'800'},
 primary:{minHeight:44,justifyContent:'center',paddingHorizontal:18,borderRadius:12},
 primaryText:{fontSize:14,fontWeight:'900'},
 pressed:{opacity:.72},
});
