import {useEffect,useMemo,useState} from 'react';
import {Image,Pressable,StyleSheet,Text,View} from 'react-native';
import {WORLD_CHANNELS,worldMessages,type WorldMessage} from '../online/social';
import {uiIcons} from '../theme/ui-icons';
import {radii,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {ChatMessageText} from './ChatMessageText';

export function ChatDock({enabled,onOpen,lines=1,unreadCount=0,mentionCount=0}:{enabled:boolean;onOpen:()=>void;lines?:1|2|3;unreadCount?:number;mentionCount?:number}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const [rows,setRows]=useState<WorldMessage[]>([]);
 useEffect(()=>{if(!enabled){setRows([]);return;}let active=true;const load=()=>void worldMessages(WORLD_CHANNELS[0].id).then(next=>{if(active)setRows(next.slice(-3));}).catch(()=>{});load();const timer=setInterval(load,8000);return()=>{active=false;clearInterval(timer)};},[enabled]);
 const shown=rows.slice(-lines),latest=shown[shown.length-1],height=lines===1?44:lines===2?61:78;
 const attention=[mentionCount>0?mentionCount+' mention'+(mentionCount===1?'':'s'):null,unreadCount>0?unreadCount+' unread':null].filter(Boolean).join(', ');
 const label=latest?'Open chat. Latest World message from '+latest.sender_name+': '+latest.body+(attention?'. '+attention:''):'Open chat'+(attention?'. '+attention:'');
 return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint="Opens full chat" onPress={onOpen} style={({pressed})=>[s.dock,{minHeight:height},pressed&&s.pressed]}>
   {(shown.length?shown:[null]).map((row,index)=><View key={row?.id??'empty'} style={s.line}>
     {index===0?<><Image source={uiIcons.chat} resizeMode="contain" style={s.icon}/><Text style={s.channel}>{enabled?'WORLD':'CHAT'}</Text></>:<View style={s.indent}/>} 
     <View style={s.messageWrap}>{row?<><Text numberOfLines={1} style={s.name}>{row.sender_name}: </Text><View style={s.bodyWrap}><ChatMessageText body={row.body} compact numberOfLines={1}/></View></>:<Text numberOfLines={1} style={s.empty}>{enabled?'World chat is quiet.':'Tap to open chat.'}</Text>}</View>
     {index===0?<View style={s.trailing}>{mentionCount>0?<View style={s.mentionBadge}><Text style={s.mentionText}>@{mentionCount>9?'9+':mentionCount}</Text></View>:null}{unreadCount>0?<View style={s.unreadBadge}><Text style={s.unreadText}>{unreadCount>99?'99+':unreadCount}</Text></View>:null}<Text style={s.open}>›</Text></View>:null}
   </View>)}
 </Pressable>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 dock:{width:'100%',zIndex:20,justifyContent:'center',paddingHorizontal:10,paddingVertical:4,backgroundColor:C.dark?'rgba(13,30,45,.88)':'rgba(255,250,240,.90)',borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:C.lineStrong},
 line:{minHeight:18,flexDirection:'row',alignItems:'center',gap:5},
 icon:{width:17,height:17},
 channel:{...typography.caption,color:C.info,fontSize:9,fontWeight:'900',letterSpacing:.7},
 indent:{width:47},
 messageWrap:{flex:1,minWidth:0,flexDirection:'row',alignItems:'center'},
 bodyWrap:{flex:1,minWidth:0},
 name:{color:C.info,fontSize:11,lineHeight:16,fontWeight:'800',flexShrink:0,maxWidth:'42%'},
 empty:{...typography.caption,color:C.muted,fontSize:10.5},
 trailing:{flexDirection:'row',alignItems:'center',gap:3,marginLeft:4},
 mentionBadge:{minWidth:23,height:17,paddingHorizontal:4,alignItems:'center',justifyContent:'center',borderRadius:9,backgroundColor:C.warningSurface,borderWidth:1,borderColor:C.warning},
 mentionText:{fontSize:8,color:C.warning,fontWeight:'900'},
 unreadBadge:{minWidth:18,height:17,paddingHorizontal:4,alignItems:'center',justifyContent:'center',borderRadius:9,backgroundColor:C.notification},
 unreadText:{fontSize:8,color:C.notificationText,fontWeight:'900'},
 open:{fontSize:20,lineHeight:20,color:C.muted,fontWeight:'900'},
 pressed:{opacity:.7},
});}
