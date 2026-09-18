import {Dimensions,Platform,Pressable,StatusBar,StyleSheet,Text,useWindowDimensions,View} from 'react-native';
import {PrimaryNavigationIcon,type PrimaryNavigationDestination} from './PrimaryNavigationIcon';
import {C} from '../theme/theme';

export type NavigationBadge=number|'dot';

export function PrimaryNavigation<T extends PrimaryNavigationDestination>({destinations,active,labelFor,onNavigate,badges}:{destinations:readonly T[];active:T;labelFor:(destination:T)=>string;onNavigate:(destination:T)=>void;badges?:Partial<Record<T,NavigationBadge>>}){
 const {height:windowHeight}=useWindowDimensions();
 const screenHeight=Dimensions.get('screen').height;
 const measuredBottom=Platform.OS==='android'?screenHeight-windowHeight-(StatusBar.currentHeight??0):0;
 const bottomInset=Platform.OS==='android'?Math.max(24,Math.min(52,measuredBottom>0?measuredBottom:30)):4;
 return <View accessibilityRole="tablist" style={[s.nav,{paddingBottom:bottomInset}]}>{destinations.map(item=>{const selected=active===item,label=labelFor(item),badge=badges?.[item];return <Pressable key={item} accessibilityRole="tab" accessibilityState={{selected}} accessibilityLabel={label} onPress={()=>onNavigate(item)} style={({pressed})=>[s.item,pressed&&s.pressed]}>
  {selected&&<View pointerEvents="none" style={s.mark}/>}<View style={[s.iconShell,selected&&s.iconActive]}><PrimaryNavigationIcon destination={item} active={selected}/>{badge!==undefined&&badge!==0?<View style={[s.badge,badge==='dot'&&s.dotBadge]}><Text style={s.badgeText}>{badge==='dot'?'':badge>99?'99+':badge}</Text></View>:null}</View>
  <Text numberOfLines={2} textBreakStrategy="balanced" android_hyphenationFrequency="normal" style={[s.label,selected&&s.active]}>{label}</Text>
 </Pressable>})}</View>;
}
const s=StyleSheet.create({
 nav:{minHeight:78,flexDirection:'row',alignItems:'stretch',borderTopWidth:1,borderColor:'#394657',backgroundColor:'#09131f',paddingHorizontal:4,paddingTop:4},
 item:{position:'relative',flex:1,minWidth:44,minHeight:66,alignItems:'center',justifyContent:'flex-start',gap:2,paddingHorizontal:2},pressed:{opacity:.76},mark:{position:'absolute',top:-4,width:22,height:2,backgroundColor:'#efd895'},iconShell:{position:'relative',width:40,height:34,alignItems:'center',justifyContent:'center',borderRadius:17},iconActive:{backgroundColor:'rgba(212,173,88,.13)'},label:{width:'100%',fontSize:11,lineHeight:15,fontWeight:'600',textAlign:'center',color:'#9eabbc'},active:{color:C.accent},
 badge:{position:'absolute',right:-8,top:-5,minWidth:18,height:18,paddingHorizontal:4,borderRadius:9,backgroundColor:'#d93646',borderWidth:2,borderColor:'#09131f',alignItems:'center',justifyContent:'center'},dotBadge:{minWidth:10,width:10,height:10,borderRadius:5,paddingHorizontal:0,right:-3,top:-1},badgeText:{color:'#fff',fontSize:9,lineHeight:11,fontWeight:'900'}
});
