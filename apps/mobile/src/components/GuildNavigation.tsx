import {Pressable,StyleSheet,Text,View} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';
import {useSocialText} from '../i18n/social';
import {ThemedIcon} from './ThemedNavigationIcon';

export type GuildPrimarySection='Home'|'PvE'|'Activities'|'Hall'|'Progress';
const destinations=[
 {id:'Home',label:'Home',icon:'guild'},
 {id:'PvE',label:'The Raid Gate',icon:'dungeon'},
 {id:'Activities',label:'Activities',icon:'quests'},
 {id:'Hall',label:'Hall',icon:'guild'},
 {id:'Progress',label:'Progress',icon:'skills'},
] as const;

export function GuildNavigation({value,onChange,voteReminder=false}:{value:string;onChange:(next:GuildPrimarySection)=>void;voteReminder?:boolean}){
 const C=useGameTheme(),st=useSocialText();
 // Roster, member management and other secondary pages are not Home.
 // Leave the primary tabs unselected rather than misleading the player.
 const active=destinations.some(item=>item.id===value)?value:null;
 return <View accessibilityRole="tablist" accessibilityLabel="Guild sections" style={[s.tabs,{backgroundColor:C.panel,borderColor:C.line}]}>
  {destinations.map(item=><Pressable
   key={item.id}
   accessibilityRole="tab"
   accessibilityLabel={st(item.label)}
   accessibilityState={{selected:active===item.id}}
   onPress={()=>onChange(item.id)}
   style={({pressed})=>[s.tab,{borderBottomColor:active===item.id?C.good:'transparent'},pressed&&s.pressed]}
  ><ThemedIcon name={item.icon} size={20}/>{item.id==='Progress'&&voteReminder?<View accessibilityLabel="Weekly Guild Project vote available" style={[s.voteDot,{backgroundColor:C.notification}]}/>:null}<Text numberOfLines={1} style={[s.label,{color:active===item.id?C.good:C.muted}]}>{item.id==='PvE'?st('Raid'):st(item.label)}</Text></Pressable>)}
 </View>;
}
const s=StyleSheet.create({
 tabs:{flexDirection:'row',borderBottomWidth:1},
 tab:{flex:1,minWidth:0,minHeight:60,alignItems:'center',justifyContent:'center',gap:4,borderBottomWidth:2},
 label:{fontSize:11,lineHeight:16,fontWeight:'600'},voteDot:{position:'absolute',right:'24%',top:8,width:7,height:7,borderRadius:4},
 pressed:{opacity:.7},
});
