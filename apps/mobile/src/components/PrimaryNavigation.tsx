import {Platform,Pressable,StyleSheet,Text,View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {PrimaryNavigationIcon,type PrimaryNavigationDestination} from './PrimaryNavigationIcon';
import {useGameTheme} from '../theme/ThemeContext';

export type NavigationBadge=number|'dot';

export function PrimaryNavigation<T extends PrimaryNavigationDestination>({destinations,active,labelFor,onNavigate,badges}:{destinations:readonly T[];active:T;labelFor:(destination:T)=>string;onNavigate:(destination:T)=>void;badges?:Partial<Record<T,NavigationBadge>>}){
 const C=useGameTheme();
 const {bottom}=useSafeAreaInsets();
 // iOS is already inside the root SafeAreaView. Android needs its real navigation/gesture inset here.
 const bottomInset=Platform.OS==='android'?Math.max(bottom,8):4;
 return <View accessibilityRole="tablist" style={[s.nav,{paddingBottom:bottomInset,backgroundColor:C.navBg,borderColor:C.line}]}>{destinations.map(item=>{const selected=active===item,label=labelFor(item),badge=badges?.[item];return <Pressable key={item} accessibilityRole="tab" accessibilityState={{selected}} accessibilityLabel={label} onPress={()=>onNavigate(item)} style={({pressed})=>[s.item,pressed&&s.pressed]}>
  {selected&&<View pointerEvents="none" style={[s.mark,{backgroundColor:C.accentSoft}]}/>}<View style={[s.iconShell,selected&&{backgroundColor:C.selection}]}><PrimaryNavigationIcon destination={item} active={selected}/>{badge!==undefined&&badge!==0?<View style={[s.badge,{borderColor:C.navBg,backgroundColor:C.notification},badge==='dot'&&s.dotBadge]}><Text style={[s.badgeText,{color:C.notificationText}]}>{badge==='dot'?'':typeof badge==='number'?(badge>99?'99+':badge):''}</Text></View>:null}</View>
  <Text numberOfLines={2} textBreakStrategy="balanced" android_hyphenationFrequency="normal" style={[s.label,{color:selected?C.accent:C.muted}]}>{label}</Text>
 </Pressable>})}</View>;
}
const s=StyleSheet.create({
 nav:{minHeight:72,flexDirection:'row',alignItems:'stretch',borderTopWidth:1,paddingHorizontal:4,paddingTop:3},
 item:{position:'relative',flex:1,minWidth:44,minHeight:60,alignItems:'center',justifyContent:'flex-start',gap:2,paddingHorizontal:2},pressed:{opacity:.76},mark:{position:'absolute',top:-3,width:24,height:3,borderBottomLeftRadius:2,borderBottomRightRadius:2},iconShell:{position:'relative',width:40,height:32,alignItems:'center',justifyContent:'center',borderRadius:16},label:{width:'100%',fontSize:10,lineHeight:14,fontWeight:'700',textAlign:'center'},
 badge:{position:'absolute',right:-8,top:-5,minWidth:18,height:18,paddingHorizontal:4,borderRadius:9,borderWidth:2,borderColor:'transparent',alignItems:'center',justifyContent:'center'},dotBadge:{minWidth:10,width:10,height:10,borderRadius:5,paddingHorizontal:0,right:-3,top:-1},badgeText:{fontSize:9,lineHeight:11,fontWeight:'900'}
});
