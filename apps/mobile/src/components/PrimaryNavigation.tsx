import {Dimensions,Platform,Pressable,StatusBar,StyleSheet,Text,useWindowDimensions,View} from 'react-native';
import {PrimaryNavigationIcon,type PrimaryNavigationDestination} from './PrimaryNavigationIcon';
import {useMemo} from 'react';
import {useGameTheme,type ThemePalette} from '../theme/app-theme';

export type NavigationBadge=number|'dot';

export function PrimaryNavigation<T extends PrimaryNavigationDestination>({destinations,active,labelFor,onNavigate,badges}:{destinations:readonly T[];active:T;labelFor:(destination:T)=>string;onNavigate:(destination:T)=>void;badges?:Partial<Record<T,NavigationBadge>>}){
 const {height:windowHeight}=useWindowDimensions();
 const screenHeight=Dimensions.get('screen').height;
 const measuredBottom=Platform.OS==='android'?screenHeight-windowHeight-(StatusBar.currentHeight??0):0;
 const bottomInset=Platform.OS==='android'?Math.max(16,Math.min(36,measuredBottom>0?measuredBottom:22)):4;
 const theme=useGameTheme(),s=useMemo(()=>styles(theme),[theme]);
 return <View accessibilityRole="tablist" style={[s.nav,{paddingBottom:bottomInset}]}>{destinations.map(item=>{const selected=active===item,label=labelFor(item),badge=badges?.[item];return <Pressable key={item} accessibilityRole="tab" accessibilityState={{selected}} accessibilityLabel={label} onPress={()=>onNavigate(item)} style={({pressed})=>[s.item,pressed&&s.pressed]}>
  {selected&&<View pointerEvents="none" style={s.mark}/>}<View style={[s.iconShell,selected&&s.iconActive]}><PrimaryNavigationIcon destination={item} active={selected}/>{badge!==undefined&&badge!==0?<View style={[s.badge,badge==='dot'&&s.dotBadge]}><Text style={s.badgeText}>{badge==='dot'?'':typeof badge==='number'?(badge>99?'99+':badge):''}</Text></View>:null}</View>
  <Text numberOfLines={1} style={[s.label,selected&&s.active]}>{label}</Text>
 </Pressable>})}</View>;
}
const styles=(t:ThemePalette)=>StyleSheet.create({
 nav:{minHeight:68,flexDirection:'row',alignItems:'stretch',borderTopWidth:1,borderColor:t.lineStrong,backgroundColor:t.nav,paddingHorizontal:4,paddingTop:3},
 item:{position:'relative',flex:1,minWidth:44,minHeight:58,alignItems:'center',justifyContent:'flex-start',gap:1,paddingHorizontal:2},pressed:{opacity:.72,transform:[{translateY:1}]},
 mark:{position:'absolute',top:-3,width:24,height:3,backgroundColor:t.accent,borderBottomLeftRadius:2,borderBottomRightRadius:2},
 iconShell:{position:'relative',width:40,height:33,alignItems:'center',justifyContent:'center',borderRadius:17},
 iconActive:{backgroundColor:t.actionSurface},
 label:{width:'100%',fontSize:10,lineHeight:14,fontWeight:'700',textAlign:'center',color:t.muted},
 active:{color:t.accentSoft},
 badge:{position:'absolute',right:-8,top:-5,minWidth:18,height:18,paddingHorizontal:4,borderRadius:9,backgroundColor:t.bad,borderWidth:2,borderColor:t.nav,alignItems:'center',justifyContent:'center'},
 dotBadge:{minWidth:10,width:10,height:10,borderRadius:5,paddingHorizontal:0,right:-3,top:-1},
 badgeText:{color:'#fff',fontSize:9,lineHeight:11,fontWeight:'900'}
});
