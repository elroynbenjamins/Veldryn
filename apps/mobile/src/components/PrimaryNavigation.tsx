import {Platform,Pressable,StyleSheet,Text,View} from 'react-native';
import {PrimaryNavigationIcon,type PrimaryNavigationDestination} from './PrimaryNavigationIcon';
import {C} from '../theme/theme';
export function PrimaryNavigation<T extends PrimaryNavigationDestination>({destinations,active,labelFor,onNavigate}:{destinations:readonly T[];active:T;labelFor:(destination:T)=>string;onNavigate:(destination:T)=>void}){
 return <View accessibilityRole="tablist" style={s.nav}>{destinations.map(item=>{const selected=active===item,label=labelFor(item);return <Pressable key={item} accessibilityRole="tab" accessibilityState={{selected}} accessibilityLabel={label} onPress={()=>onNavigate(item)} style={({pressed})=>[s.item,pressed&&s.pressed]}>
  {selected&&<View pointerEvents="none" style={s.mark}/>}<View style={[s.iconShell,selected&&s.iconActive]}><PrimaryNavigationIcon destination={item} active={selected}/></View>
  <Text numberOfLines={2} textBreakStrategy="balanced" android_hyphenationFrequency="normal" style={[s.label,selected&&s.active]}>{label}</Text>
 </Pressable>})}</View>;
}
const s=StyleSheet.create({nav:{minHeight:78,flexDirection:'row',alignItems:'stretch',borderTopWidth:1,borderColor:'#394657',backgroundColor:'#09131f',paddingHorizontal:4,paddingTop:4,paddingBottom:Platform.OS==='android'?22:4},item:{position:'relative',flex:1,minWidth:44,minHeight:66,alignItems:'center',justifyContent:'flex-start',gap:2,paddingHorizontal:2},pressed:{opacity:.76},mark:{position:'absolute',top:-4,width:22,height:2,backgroundColor:'#efd895'},iconShell:{width:40,height:34,alignItems:'center',justifyContent:'center',borderRadius:17},iconActive:{backgroundColor:'rgba(212,173,88,.13)'},label:{width:'100%',fontSize:11,lineHeight:15,fontWeight:'600',textAlign:'center',color:'#9eabbc'},active:{color:C.accent}});
