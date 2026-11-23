import {useSocialText} from '../i18n/social';
import {useMemo} from 'react';
import {Pressable,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {VISIBLE_WORLD_CHANNELS,worldMessages,type WorldMessage} from '../online/social';
import {visibleWorldChatIndex} from '../core/world-chat-visibility';
import {useChatFeed} from '../online/useChatFeed';
import {typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {ChatMessageText} from './ChatMessageText';
import {PlayerStyledName} from './PlayerStyledName';
import {ThemedIcon} from './ThemedNavigationIcon';

function chatDockTime(value:string){
 const time=new Date(value);
 return Number.isFinite(time.getTime())?time.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'';
}

export function ChatDock({enabled,onOpen,lines=1,selectedChannel=1,unreadCount=0,mentionCount=0,active=true}:{enabled:boolean;onOpen:()=>void;lines?:1|2|3;selectedChannel?:number;unreadCount?:number;mentionCount?:number;active?:boolean}){
 const st=useSocialText();
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const {width,fontScale}=useWindowDimensions();
 const narrow=width<360||fontScale>=1.2;
 const showTime=width>=360&&fontScale<1.2&&mentionCount===0&&unreadCount===0;
 const channelIndex=visibleWorldChatIndex(selectedChannel-1),channelId=VISIBLE_WORLD_CHANNELS[channelIndex].id;
 const {value:history}=useChatFeed<WorldMessage[]>({key:'world:'+channelId,read:()=>worldMessages(channelId),initial:[],active:enabled&&active,channelType:'world',channelId});
 const rows=enabled?history:[];
 const shown=rows.slice(-lines),latest=shown[shown.length-1],height=lines===1?74:lines===2?100:130;
 const attention=[mentionCount>0?st('{count} mentions',{count:mentionCount}):null,unreadCount>0?st('{count} unread',{count:unreadCount}):null].filter(Boolean).join(', ');
 const label=latest?st('Open chat. Latest World message from {name}: {message}',{name:latest.sender_name,message:latest.body})+(attention?'. '+attention:''):st('Open chat')+(attention?'. '+attention:'');
 return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={st('Opens full chat')} onPress={onOpen} style={({pressed})=>[s.dock,narrow&&s.dockNarrow,{minHeight:height},pressed&&s.pressed]}>
   <View style={[s.iconFrame,narrow&&s.iconFrameNarrow]}><ThemedIcon name="chat" size={20}/></View>
   <View style={s.messages}>{(shown.length?shown:[null]).map(row=>{const time=row&&showTime?chatDockTime(row.created_at):'';return <View key={row?.id??'empty'} style={s.line}>
    <View style={s.header}>
     <Text numberOfLines={1} style={s.channel}>{enabled?st('WORLD'):st('CHAT')}</Text>
     {row?<><Text style={s.separator}>·</Text><View style={s.playerName}><PlayerStyledName name={row.sender_name} nameStyle={row.player_name_style??undefined} reduceMotion numberOfLines={1} style={s.name}/></View>{time?<Text style={s.time}>{time}</Text>:null}</>:null}
    </View>
    {row?<View style={s.bodyWrap}><ChatMessageText body={row.body.replace(/\s+/g,' ').trim()} compact numberOfLines={lines===1?2:1} style={s.body}/></View>:<Text numberOfLines={1} style={s.empty}>{enabled?st('World chat is quiet.'):st('Tap to open chat.')}</Text>}
   </View>})}</View>
   <View style={s.trailing}>{mentionCount>0||unreadCount>0?<View style={[s.attention,narrow&&s.attentionNarrow]}>{mentionCount>0?<View style={s.mentionBadge}><Text style={s.mentionText}>@{mentionCount>9?'9+':mentionCount}</Text></View>:null}{unreadCount>0?<View style={s.unreadBadge}><Text style={s.unreadText}>{unreadCount>99?'99+':unreadCount}</Text></View>:null}</View>:null}<Text style={s.open}>›</Text></View>
 </Pressable>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 dock:{width:'100%',zIndex:20,flexDirection:'row',alignItems:'center',gap:8,marginTop:8,paddingHorizontal:10,paddingVertical:7,borderWidth:1,borderColor:C.line,borderRadius:16,backgroundColor:C.panel2,shadowColor:'#000',shadowOpacity:.18,shadowRadius:8,shadowOffset:{width:0,height:3},elevation:4},
 dockNarrow:{gap:6,paddingHorizontal:8},
 iconFrame:{width:32,height:32,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panelRaised,flexShrink:0},
 iconFrameNarrow:{width:28,height:28,borderRadius:9},
 messages:{flex:1,minWidth:0,gap:5},
 line:{minWidth:0,gap:2},
 header:{minWidth:0,flexDirection:'row',alignItems:'center',gap:5},
 channel:{...typography.caption,color:C.accentSoft,fontSize:10,lineHeight:17,fontWeight:'900',letterSpacing:.5,flexShrink:0},
 separator:{color:C.muted,fontSize:12,lineHeight:17},
 playerName:{flex:1,minWidth:0,overflow:'hidden'},
 name:{color:C.info,fontSize:12,lineHeight:18,fontWeight:'800'},
 time:{color:C.muted,fontSize:10,lineHeight:17,flexShrink:0},
 bodyWrap:{minWidth:0},
 body:{fontSize:12,lineHeight:22,color:C.text},
 empty:{...typography.caption,color:C.muted,fontSize:12,lineHeight:20},
 trailing:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:4,flexShrink:0},
 attention:{flexDirection:'row',alignItems:'center',gap:4},
 attentionNarrow:{flexDirection:'column',gap:2},
 mentionBadge:{minWidth:23,height:17,paddingHorizontal:4,alignItems:'center',justifyContent:'center',borderRadius:9,backgroundColor:C.warningSurface,borderWidth:1,borderColor:C.warning},
 mentionText:{fontSize:8,color:C.warning,fontWeight:'900'},
 unreadBadge:{minWidth:18,height:17,paddingHorizontal:4,alignItems:'center',justifyContent:'center',borderRadius:9,backgroundColor:C.notification},
 unreadText:{fontSize:8,color:C.notificationText,fontWeight:'900'},
 open:{fontSize:22,lineHeight:24,color:C.info,fontWeight:'500'},
 pressed:{opacity:.74,transform:[{scale:.99}]},
});}
