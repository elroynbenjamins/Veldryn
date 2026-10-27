import {Pressable,StyleSheet,Text,View} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';
import {useSocialText} from '../i18n/social';
import {ThemedIcon} from './ThemedNavigationIcon';

export type GuildPrimarySection='Home'|'PvE'|'Activities'|'Hall'|'Chat';
const destinations=[{id:'Home',label:'Home',icon:'guild'},{id:'PvE',label:'The Raid Gate',icon:'dungeon'},{id:'Activities',label:'Activities',icon:'quests'},{id:'Hall',label:'Hall',icon:'guild'},{id:'Chat',label:'Chat',icon:'chat'}] as const;
export function GuildNavigation({value,onChange,unread=0,mentions=0}:{value:string;onChange:(next:GuildPrimarySection)=>void;unread?:number;mentions?:number}){
 const C=useGameTheme(),st=useSocialText();
 const active=destinations.some(item=>item.id===value)?value:'Home';
 return <View accessibilityRole="tablist" accessibilityLabel="Guild sections" style={[s.tabs,{backgroundColor:C.panel,borderColor:C.line}]}>{destinations.map(item=><Pressable key={item.id} accessibilityRole="tab" accessibilityLabel={st(item.label)} accessibilityState={{selected:active===item.id}} onPress={()=>onChange(item.id)} style={({pressed})=>[s.tab,{borderBottomColor:active===item.id?C.good:'transparent'},pressed&&s.pressed]}><ThemedIcon name={item.icon} size={20}/><Text numberOfLines={1} style={[s.label,{color:active===item.id?C.good:C.muted}]}>{item.id==='PvE'?st('Raid'):st(item.label)}</Text>{item.id==='Chat'&&(unread>0||mentions>0)?<View style={[s.badge,{backgroundColor:mentions?C.warning:C.notification}]}><Text style={{fontSize:11,lineHeight:14,color:C.notificationText,fontWeight:'900'}}>{mentions?'@':unread>9?'9+':unread}</Text></View>:null}</Pressable>)}</View>;
}
const s=StyleSheet.create({tabs:{flexDirection:'row',borderBottomWidth:1},tab:{flex:1,minWidth:0,minHeight:60,alignItems:'center',justifyContent:'center',gap:4,borderBottomWidth:2},label:{fontSize:11,lineHeight:16,fontWeight:'600'},badge:{position:'absolute',top:2,right:4,minWidth:16,height:16,borderRadius:8,alignItems:'center',justifyContent:'center'},pressed:{opacity:.7}});
