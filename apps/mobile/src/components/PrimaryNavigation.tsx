import {Platform,Pressable,StyleSheet,Text,View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {PrimaryNavigationIcon,type PrimaryNavigationDestination} from './PrimaryNavigationIcon';
import {useGameTheme} from '../theme/ThemeContext';

export type NavigationBadge=number|'dot';

export function PrimaryNavigation<T extends PrimaryNavigationDestination>({destinations,active,labelFor,onNavigate,badges,guidedDestination}:{destinations:readonly T[];active?:T;labelFor:(destination:T)=>string;onNavigate:(destination:T)=>void;badges?:Partial<Record<T,NavigationBadge>>;guidedDestination?:T}){
 const C=useGameTheme();
 const {bottom}=useSafeAreaInsets();
 // The app shell leaves the bottom edge to persistent navigation on both platforms.
 const bottomInset=Math.max(bottom,Platform.OS==='android'?8:4);
 return <View accessibilityRole="tablist" style={[s.nav,{paddingBottom:bottomInset,backgroundColor:C.navBg,borderColor:C.line}]}>{destinations.map(item=>{const selected=active===item,guided=guidedDestination===item,label=labelFor(item),badge=badges?.[item],badgeLabel=badge==='dot'?'new activity':typeof badge==='number'&&badge>0?`${badge} notification${badge===1?'':'s'}`:'';return <Pressable key={item} accessibilityRole="tab" accessibilityState={{selected}} accessibilityLabel={badgeLabel?`${label}, ${badgeLabel}`:label} onPress={()=>onNavigate(item)} style={({pressed})=>[s.item,selected&&{backgroundColor:C.selection},guided&&[s.guided,{borderColor:C.accent}],pressed&&s.pressed]}>
  {selected&&<View pointerEvents="none" style={[s.mark,{backgroundColor:C.selectionLine}]}/>}<View style={s.iconShell}><PrimaryNavigationIcon destination={item} active={selected}/>{badge!==undefined&&badge!==0?<View style={[s.badge,{borderColor:C.navBg,backgroundColor:C.notification},badge==='dot'&&s.dotBadge]}><Text style={[s.badgeText,{color:C.notificationText}]}>{badge==='dot'?'':typeof badge==='number'?(badge>99?'99+':badge):''}</Text></View>:null}</View>
  <Text numberOfLines={2} textBreakStrategy="balanced" android_hyphenationFrequency="normal" style={[s.label,{color:selected?C.selectionLine:C.muted}]}>{label}</Text>
 </Pressable>})}</View>;
}
const s=StyleSheet.create({
 nav:{minHeight:72,flexDirection:'row',alignItems:'stretch',borderTopWidth:1,paddingHorizontal:0,paddingTop:0},
 item:{position:'relative',flex:1,minWidth:44,minHeight:60,alignItems:'center',justifyContent:'flex-start',gap:4,paddingHorizontal:2,paddingTop:7},guided:{borderWidth:2,borderRadius:12},pressed:{opacity:.76},mark:{position:'absolute',top:0,left:0,right:0,height:2},iconShell:{position:'relative',width:44,height:34,alignItems:'center',justifyContent:'center',borderRadius:12},label:{width:'100%',fontSize:11,lineHeight:15,fontWeight:'600',textAlign:'center'},
 badge:{position:'absolute',right:-8,top:-5,minWidth:18,height:18,paddingHorizontal:4,borderRadius:9,borderWidth:2,borderColor:'transparent',alignItems:'center',justifyContent:'center'},dotBadge:{minWidth:10,width:10,height:10,borderRadius:5,paddingHorizontal:0,right:-3,top:-1},badgeText:{fontSize:9,lineHeight:11,fontWeight:'900'}
});
