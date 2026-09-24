import {useEffect,useMemo,useState} from 'react';
import {Image,Pressable,StyleSheet,Text,View} from 'react-native';
import {WORLD_CHANNELS,worldMessages,type WorldMessage} from '../online/social';
import {uiIcons} from '../theme/ui-icons';
import {typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {ChatMessageText} from './ChatMessageText';

export function ChatDock({enabled,onOpen,lines=1,unreadCount=0,mentionCount=0}:{enabled:boolean;onOpen:()=>void;lines?:1|2|3;unreadCount?:number;mentionCount?:number}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const [rows,setRows]=useState<WorldMessage[]>([]);
 useEffect(()=>{if(!enabled){setRows([]);return;}let active=true;const load=()=>void worldMessages(WORLD_CHANNELS[0].id).then(next=>{if(active)setRows(next.slice(-3));}).catch(()=>{});load();const timer=setInterval(load,8000);return()=>{active=false;clearInterval(timer)};},[enabled]);
 const shown=rows.slice(-lines),latest=shown[shown.length-1],height=lines===1?48:lines===2?68:88;
 const attention=[mentionCount>0?mentionCount+' mention'+(mentionCount===1?'':'s'):null,unreadCount>0?unreadCount+' unread':null].filter(Boolean).join(', ');
 const label=latest?'Open chat. Latest World message from '+latest.sender_name+': '+latest.body+(attention?'. '+attention:''):'Open chat'+(attention?'. '+attention:'');
 return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint="Opens full chat" onPress={onOpen} style={({pressed})=>[s.dock,{minHeight:height},pressed&&s.pressed]}>
   <View style={s.channelColumn}><Image source={uiIcons.chat} resizeMode="contain" style={s.icon}/><Text style={s.channel}>{enabled?'WORLD':'CHAT'}</Text></View>
   <View style={s.messages}>{(shown.length?shown:[null]).map(row=><View key={row?.id??'empty'} style={s.line}>
     {row?<><Text numberOfLines={1} style={s.name}>{row.sender_name}</Text><View style={s.bodyWrap}><ChatMessageText body={row.body} compact numberOfLines={1} style={s.body}/></View></>:<Text numberOfLines={1} style={s.empty}>{enabled?'World chat is quiet.':'Tap to open chat.'}</Text>}
   </View>)}</View>
   <View style={s.trailing}>{mentionCount>0?<View style={s.mentionBadge}><Text style={s.mentionText}>@{mentionCount>9?'9+':mentionCount}</Text></View>:null}{unreadCount>0?<View style={s.unreadBadge}><Text style={s.unreadText}>{unreadCount>99?'99+':unreadCount}</Text></View>:null}<Text style={s.open}>›</Text></View>
 </Pressable>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 dock:{width:'100%',zIndex:20,flexDirection:'row',alignItems:'center',gap:10,marginTop:8,paddingHorizontal:12,paddingVertical:8,borderWidth:1,borderColor:C.line,borderRadius:16,backgroundColor:C.panel2,shadowColor:'#000',shadowOpacity:.18,shadowRadius:8,shadowOffset:{width:0,height:3},elevation:4},
 channelColumn:{alignSelf:'stretch',width:42,alignItems:'center',justifyContent:'center',gap:2,paddingRight:10,borderRightWidth:StyleSheet.hairlineWidth,borderRightColor:C.line},
 line:{minHeight:22,flexDirection:'row',alignItems:'center',gap:8},
 icon:{width:22,height:22},
 channel:{...typography.caption,color:C.accentSoft,fontSize:8,lineHeight:12,fontWeight:'900',letterSpacing:.9},
 messages:{flex:1,minWidth:0,gap:2},
 bodyWrap:{flex:1,minWidth:0},
 name:{color:C.info,fontSize:12,lineHeight:18,fontWeight:'800',flexShrink:1,maxWidth:'42%'},
 body:{fontSize:12,lineHeight:20,color:C.text},
 empty:{...typography.caption,color:C.muted},
 trailing:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:4},
 mentionBadge:{minWidth:23,height:17,paddingHorizontal:4,alignItems:'center',justifyContent:'center',borderRadius:9,backgroundColor:C.warningSurface,borderWidth:1,borderColor:C.warning},
 mentionText:{fontSize:8,color:C.warning,fontWeight:'900'},
 unreadBadge:{minWidth:18,height:17,paddingHorizontal:4,alignItems:'center',justifyContent:'center',borderRadius:9,backgroundColor:C.notification},
 unreadText:{fontSize:8,color:C.notificationText,fontWeight:'900'},
 open:{fontSize:25,lineHeight:25,color:C.info,fontWeight:'500'},
 pressed:{opacity:.74,transform:[{scale:.99}]},
});}
