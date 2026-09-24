import {ChatChannelIcon} from './ChatChannelIcon';
import {useEffect,useMemo,useState} from 'react';
import {KeyboardAvoidingView,Modal,Platform,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import type {GameState} from '../core/types';
import {onlineConfigured} from '../online/supabase';
import {type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {GuildChat} from './GuildChat';
import {OnlineWorldChat} from './OnlineWorldChat';
import {WorldChat} from './WorldChat';
import {OnlinePartyChat} from './OnlinePartyChat';
import {PartyChatGate} from './PartyChatGate';
import {usePartySocial} from '../online/PartySocialProvider';
import {ChatDock} from './ChatDock';
import {SystemNoticeLog} from './SystemNoticeLog';
import {myGuild,WORLD_CHANNELS} from '../online/social';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

type Channel='world'|'guild'|'party'|'system';

export function ChatOverlay({state,visible,onOpen,onClose,onEmoteTrayChange,guildUnread=0,guildMentions=0,guildFirstUnreadMessageId,partyUnread=0,partyMentions=0,partyFirstUnreadMessageId,onChatRead}:{state:GameState;visible:boolean;onOpen:()=>void;onClose:()=>void;onEmoteTrayChange?:(ids:string[])=>void|Promise<void>;guildUnread?:number;guildMentions?:number;guildFirstUnreadMessageId?:string;partyUnread?:number;partyMentions?:number;partyFirstUnreadMessageId?:string;onChatRead?:()=>void}){
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),insets=useSafeAreaInsets(),{width,fontScale}=useWindowDimensions(),expandWindow=width<360||fontScale>=1.25,bottomOffset=72+(Platform.OS==='android'?Math.max(insets.bottom,8):Math.max(insets.bottom,4));
  const [channel,setChannel]=useState<Channel>('world');
  const [worldChannel,setWorldChannel]=useState((state.settings.defaultWorldChat??1)-1);
  const [languageMenuOpen,setLanguageMenuOpen]=useState(false);
  useEffect(()=>{setLanguageMenuOpen(false);},[visible,channel]);
  const [onlineGuildAvailable,setOnlineGuildAvailable]=useState(state.account.guildMember);
  const {party,accountId,refresh}=usePartySocial();
  useEffect(()=>{if(!party&&channel==='party')setChannel('world');},[party,channel]);
  useEffect(()=>{if(visible)void refresh();},[visible,refresh]);
  useEffect(()=>{if(!onlineConfigured){setOnlineGuildAvailable(state.account.guildMember);return;}let active=true;const load=async()=>{try{const guild=await myGuild();if(active)setOnlineGuildAvailable(!!guild)}catch{if(active)setOnlineGuildAvailable(state.account.guildMember)}};void load();if(!visible)return()=>{active=false};const timer=setInterval(()=>void load(),30000);return()=>{active=false;clearInterval(timer)};},[visible,state.account.guildMember]);
  const guildAvailable=onlineConfigured?onlineGuildAvailable:state.account.guildMember;
  useEffect(()=>{if(!guildAvailable&&channel==='guild')setChannel('world');},[guildAvailable,channel]);
  const closeChat=()=>{onChatRead?.();onClose();};
  return <>
    {!visible&&<ChatDock enabled={onlineConfigured} onOpen={onOpen} lines={state.settings.chatDockLines??1} unreadCount={guildUnread+partyUnread} mentionCount={guildMentions+partyMentions}/>}
    <Modal visible={visible} transparent statusBarTranslucent animationType={state.settings.reduceMotion?'none':'fade'} onRequestClose={closeChat}>
      <View style={[s.modalRoot,{paddingTop:Math.max(insets.top,8),paddingBottom:bottomOffset}]}>
        <Pressable accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" onPress={closeChat} style={StyleSheet.absoluteFill}/>
        <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} keyboardVerticalOffset={insets.top} style={s.keyboard}><View accessibilityViewIsModal onAccessibilityEscape={closeChat} style={[s.window,expandWindow&&s.windowExpanded]}>
          <View style={s.chatLayout}>
            <View accessibilityRole="tablist" style={s.rail}>
              <RailTab channel="world" label="World" selected={channel==='world'} onPress={()=>setChannel('world')}/>
              <RailTab channel="guild" label="Guild" selected={channel==='guild'} disabled={!guildAvailable} unread={guildUnread} mentions={guildMentions} onPress={()=>setChannel('guild')}/>
              <PartyChatGate party={party} accountId={accountId}><RailTab channel="party" label="Party" selected={channel==='party'} unread={partyUnread} mentions={partyMentions} onPress={()=>setChannel('party')}/></PartyChatGate>
              <RailTab channel="system" label="System" selected={channel==='system'} onPress={()=>setChannel('system')}/>
            </View>
            <View style={s.conversation}>
              <View style={s.header}>
                <Text accessibilityRole="header" style={s.title}>{channel==='world'?'World':channel==='guild'?'Guild':channel==='party'?'Party':'System'}</Text>
                {channel==='world'&&<Pressable accessibilityRole="button" accessibilityLabel={'World language: '+WORLD_CHANNELS[worldChannel].name} accessibilityState={{expanded:languageMenuOpen}} onPress={()=>setLanguageMenuOpen(value=>!value)} style={({pressed})=>[s.languageButton,pressed&&s.pressed]}><Text style={s.languageText}>{WORLD_CHANNELS[worldChannel].name}</Text><Text style={s.chevron}>{languageMenuOpen?'⌃':'⌄'}</Text></Pressable>}
                <Pressable accessibilityRole="button" accessibilityLabel="Close chat" onPress={closeChat} style={({pressed})=>[s.close,pressed&&s.pressed]}><Text style={s.closeText}>×</Text></Pressable>
              </View>
              {languageMenuOpen&&channel==='world'&&<View style={s.languagePopover}>
                <ScrollView keyboardShouldPersistTaps="handled" style={s.languageOptions}>{WORLD_CHANNELS.map((item,index)=><Pressable key={item.id} accessibilityRole="button" accessibilityState={{selected:worldChannel===index}} onPress={()=>{setWorldChannel(index);setLanguageMenuOpen(false);}} style={({pressed})=>[s.languageOption,worldChannel===index&&s.languageOptionSelected,pressed&&s.pressed]}><Text style={s.languageOptionText}>{item.name}</Text>{worldChannel===index&&<Text style={s.languageCheck}>✓</Text>}</Pressable>)}</ScrollView>
              </View>}
          <View style={s.content}>{channel==='system'?<SystemNoticeLog state={state}/>:channel==='party'?<OnlinePartyChat reduceMotion={state.settings.reduceMotion} unlockedEmoteIds={state.account.unlockedEmoteIds} trayIds={state.settings.chatEmoteTrayIds} bodyPresentation={state.character?.bodyPresentation} onTrayChange={onEmoteTrayChange} firstUnreadMessageId={partyFirstUnreadMessageId} onRead={onChatRead}/>:channel==='guild'&&guildAvailable?<GuildChat reduceMotion={state.settings.reduceMotion} language={state.settings.language} currentPlayerName={state.character?.name} unlockedEmoteIds={state.account.unlockedEmoteIds} trayIds={state.settings.chatEmoteTrayIds} bodyPresentation={state.character?.bodyPresentation} onTrayChange={onEmoteTrayChange} firstUnreadMessageId={guildFirstUnreadMessageId} onRead={onChatRead}/>:onlineConfigured?<OnlineWorldChat key={worldChannel} selectedChannel={worldChannel} reduceMotion={state.settings.reduceMotion} playerName={state.character!.name} language={state.settings.language} unlockedEmoteIds={state.account.unlockedEmoteIds} trayIds={state.settings.chatEmoteTrayIds} bodyPresentation={state.character?.bodyPresentation} onTrayChange={onEmoteTrayChange} embedded/>:<WorldChat selectedChannel={worldChannel} language={state.settings.language} unlockedEmoteIds={state.account.unlockedEmoteIds} trayIds={state.settings.chatEmoteTrayIds} bodyPresentation={state.character?.bodyPresentation} onTrayChange={onEmoteTrayChange} embedded/>}</View>
            </View>
          </View>
        </View></KeyboardAvoidingView>
      </View>
    </Modal>
  </>;
}

function RailTab({channel,label,selected,disabled=false,unread=0,mentions=0,onPress}:{channel:Channel;label:string;selected:boolean;disabled?:boolean;unread?:number;mentions?:number;onPress:()=>void}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const attention=mentions>0?'@':unread>0?(unread>9?'9+':String(unread)):undefined;
 return <Pressable accessibilityRole="tab" accessibilityLabel={label+(disabled?', join a guild to chat':'')+(unread?', '+unread+' unread':'')+(mentions?', '+mentions+' mentions':'')} accessibilityState={{selected,disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>[s.railTab,selected&&s.railTabSelected,disabled&&s.railTabDisabled,pressed&&s.pressed]}>
  <ChatChannelIcon channel={channel} color={selected?C.info:C.muted}/>
  {attention&&<View accessible={false} style={[s.badge,mentions>0&&s.mentionBadge]}><Text style={s.badgeText}>{attention}</Text></View>}
 </Pressable>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 pressed:{opacity:.7},modalRoot:{flex:1,justifyContent:'flex-end',alignItems:'flex-start',backgroundColor:C.overlay,paddingHorizontal:8},
 keyboard:{width:'100%',maxWidth:480,flex:1,justifyContent:'flex-end'},
 window:{width:'100%',maxWidth:480,maxHeight:'88%',flexShrink:1,backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:16,overflow:'hidden',elevation:12,shadowColor:'#000',shadowOpacity:.25,shadowRadius:16,shadowOffset:{width:0,height:6}},
 windowExpanded:{maxHeight:'94%'},chatLayout:{flexDirection:'row',flexShrink:1,minHeight:0},
 rail:{width:52,flexShrink:0,paddingVertical:6,paddingHorizontal:3,gap:4,borderRightWidth:StyleSheet.hairlineWidth,borderRightColor:C.line,backgroundColor:C.bg},
 railTab:{width:44,height:44,alignItems:'center',justifyContent:'center',borderRadius:11,position:'relative'},
 railTabSelected:{backgroundColor:C.infoSurface},railTabDisabled:{opacity:.4},
 badge:{position:'absolute',top:1,right:0,minWidth:15,height:15,borderRadius:8,paddingHorizontal:3,alignItems:'center',justifyContent:'center',backgroundColor:C.notification},
 mentionBadge:{backgroundColor:C.warning},badgeText:{fontSize:9,lineHeight:13,color:C.notificationText,fontWeight:'800'},
 conversation:{flex:1,minWidth:0,minHeight:0,flexShrink:1,position:'relative'},
 header:{minHeight:46,flexDirection:'row',flexWrap:'wrap',alignItems:'center',paddingLeft:12,paddingRight:2,gap:2,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.line},
 title:{flexGrow:1,flexShrink:1,color:C.text,fontSize:14,fontWeight:'700'},
 languageButton:{minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:5,paddingHorizontal:7,flexShrink:1},
 languageText:{fontSize:12,color:C.muted,flexShrink:1},chevron:{fontSize:16,color:C.muted},
 close:{width:44,height:44,alignItems:'center',justifyContent:'center'},closeText:{fontSize:25,color:C.muted,fontWeight:'400'},
 languagePopover:{position:'absolute',zIndex:50,elevation:16,top:46,right:8,left:8,padding:6,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel2,shadowColor:'#000',shadowOpacity:.25,shadowRadius:12,shadowOffset:{width:0,height:6}},
 languageOptions:{maxHeight:196},languageOption:{minHeight:44,flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:12,paddingVertical:8,borderRadius:8},
 languageOptionSelected:{backgroundColor:C.selection},languageOptionText:{flex:1,color:C.text,fontSize:13,fontWeight:'500'},languageCheck:{color:C.info,fontSize:14},
 content:{minHeight:0,flexShrink:1,paddingHorizontal:10,paddingTop:8,paddingBottom:10},
});}
