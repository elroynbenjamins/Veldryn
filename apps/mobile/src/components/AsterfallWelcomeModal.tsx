import {Modal,Pressable,StyleSheet,Text,View} from 'react-native';
import type {ClassId} from '../core/types';
import {CLASSES} from '../content/classes';
import {useGameTheme} from '../theme/ThemeContext';

export function AsterfallWelcomeModal({visible,name,classId,onContinue}:{visible:boolean;name:string;classId:ClassId;onContinue:()=>void}){
 const C=useGameTheme(),className=CLASSES.find(row=>row.id===classId)?.name??'Adventurer';
 return <Modal visible={visible} transparent animationType="fade" onRequestClose={onContinue}>
  <View style={s.backdrop}><View style={[s.card,{backgroundColor:C.panel,borderColor:C.accentSoft}]}>
   <Text style={[s.kicker,{color:C.accent}]}>WELCOME TO ASTERFALL</Text>
   <Text style={[s.title,{color:C.text}]}>{name}</Text>
   <Text style={[s.className,{color:C.accentSoft}]}>{className}</Text>
   <Text style={[s.body,{color:C.muted}]}>Your journey starts small. We will show you only what matters for your next objective.</Text>
   <View style={[s.next,{backgroundColor:C.selection,borderColor:C.line}]}><Text style={[s.nextLabel,{color:C.accent}]}>FIRST OBJECTIVE</Text><Text style={[s.nextText,{color:C.text}]}>Make the Greenfields road safer by defeating 5 Moss Rats.</Text></View>
   <Pressable accessibilityRole="button" onPress={onContinue} style={({pressed})=>[s.button,{backgroundColor:C.accent},pressed&&s.pressed]}><Text style={[s.buttonText,{color:C.bg}]}>Begin Journey</Text></Pressable>
  </View></View>
 </Modal>;
}
const s=StyleSheet.create({backdrop:{flex:1,justifyContent:'center',backgroundColor:'rgba(0,0,0,.72)',padding:20},card:{width:'100%',maxWidth:440,alignSelf:'center',borderWidth:1,borderRadius:22,padding:22,gap:10,alignItems:'center'},kicker:{fontSize:10,lineHeight:15,fontWeight:'900',letterSpacing:1.8},title:{fontSize:28,lineHeight:34,fontWeight:'900',textAlign:'center'},className:{fontSize:14,lineHeight:20,fontWeight:'800'},body:{fontSize:14,lineHeight:21,textAlign:'center',marginBottom:4},next:{width:'100%',borderWidth:1,borderRadius:14,padding:14,gap:5,marginVertical:4},nextLabel:{fontSize:10,lineHeight:15,fontWeight:'900',letterSpacing:1.1},nextText:{fontSize:14,lineHeight:20,fontWeight:'700'},button:{width:'100%',minHeight:48,borderRadius:14,alignItems:'center',justifyContent:'center',marginTop:4},buttonText:{fontSize:15,fontWeight:'900'},pressed:{opacity:.72}});
