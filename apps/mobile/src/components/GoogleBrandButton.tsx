import {ActivityIndicator,Pressable,StyleSheet,Text,View} from 'react-native';
import {radii,spacing,touchTargetPreferred} from '../theme/theme';

export function GoogleBrandButton({title,onPress,disabled=false,loading=false}:{title:string;onPress:()=>void;disabled?:boolean;loading?:boolean}){
 const inactive=disabled||loading;
 return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{disabled:inactive,busy:loading}} disabled={inactive} onPress={onPress} style={({pressed})=>[s.button,pressed&&!inactive&&s.pressed,inactive&&s.disabled]}>
  <View style={s.mark}><Text style={s.markText}>G</Text></View>
  {loading?<ActivityIndicator color="#202124" size="small"/>:<Text style={s.label}>{title}</Text>}
 </Pressable>;
}

const s=StyleSheet.create({button:{minHeight:touchTargetPreferred,paddingHorizontal:spacing.md,justifyContent:'center',alignItems:'center',flexDirection:'row',gap:10,borderWidth:1,borderColor:'#DADCE0',borderRadius:radii.sm,backgroundColor:'#FFFFFF'},mark:{width:22,height:22,alignItems:'center',justifyContent:'center'},markText:{fontSize:20,lineHeight:22,fontWeight:'800',color:'#4285F4'},label:{fontSize:14,lineHeight:20,fontWeight:'600',color:'#202124',textAlign:'center'},pressed:{opacity:.78,transform:[{translateY:1}]},disabled:{opacity:.5}});
