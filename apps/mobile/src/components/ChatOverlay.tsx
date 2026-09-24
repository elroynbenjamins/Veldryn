import {UiIcon} from './UiIcon';
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
          <View style={s.header}>
            <View style={s.heading}><Text style={s.eyebrow}>ASTERFALL CHAT</Text><Text style={s.title}>Conversations</Text></View>
            <TabAttention unread={guildUnread+partyUnread} mentions={guildMentions+partyMentions}/>
            <Pressable accessibilityRole="button" accessibilityLabel="Close chat" onPress={closeChat} style={s.close}><UiIcon name="close" size={24}/></Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.primaryTabs} keyboardShouldPersistTaps="handled">
            <Pressable accessibilityRole="tab" accessibilityState={{selected:channel==='world'}} onPress={()=>setChannel('world')} style={[s.primaryTab,channel==='world'&&s.primaryTabActive]}><Text style={[s.primaryTabText,channel==='world'&&s.primaryTabTextActive]}>World</Text></Pressable>
            <Pressable accessibilityRole="tab" accessibilityLabel={'Guild'+(!guildAvailable?', join a guild to chat':', '+guildUnread+' unread, '+guildMentions+' mentions')} accessibilityState={{selected:channel==='guild',disabled:!guildAvailable}} disabled={!guildAvailable} onPress={()=>setChannel('guild')} style={[s.primaryTab,guildMentions>0&&s.tabMention,channel==='guild'&&s.primaryTabActive,!guildAvailable&&s.tabDisabled]}><Text style={[s.primaryTabText,channel==='guild'&&s.primaryTabTextActive]}>Guild</Text><TabAttention unread={guildUnread} mentions={guildMentions}/></Pressable>
            <PartyChatGate party={party} accountId={accountId}><Pressable accessibilityRole="tab" accessibilityLabel={'Party, '+partyUnread+' unread, '+partyMentions+' mentions'} accessibilityState={{selected:channel==='party'}} onPress={()=>setChannel('party')} style={[s.primaryTab,partyMentions>0&&s.tabMention,channel==='party'&&s.primaryTabActive]}><Text style={[s.primaryTabText,channel==='party'&&s.primaryTabTextActive]}>Party</Text><TabAttention unread={partyUnread} mentions={partyMentions}/></Pressable></PartyChatGate>
            <Pressable accessibilityRole="tab" accessibilityState={{selected:channel==='system'}} onPress={()=>setChannel('system')} style={[s.primaryTab,channel==='system'&&s.primaryTabActive]}><Text style={[s.primaryTabText,channel==='system'&&s.primaryTabTextActive]}>System</Text></Pressable>
          </ScrollView>
          {channel==='world'&&<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.worldTabs} keyboardShouldPersistTaps="handled">{WORLD_CHANNELS.map((item,index)=><Pressable key={item.id} accessibilityRole="tab" accessibilityState={{selected:worldChannel===index}} onPress={()=>setWorldChannel(index)} style={[s.worldTab,worldChannel===index&&s.worldTabActive]}><Text style={[s.worldTabText,worldChannel===index&&s.worldTabTextActive]}>{item.name}</Text></Pressable>)}</ScrollView>}
          <View style={s.content}>{channel==='system'?<SystemNoticeLog state={state}/>:channel==='party'?<OnlinePartyChat reduceMotion={state.settings.reduceMotion} unlockedEmoteIds={state.account.unlockedEmoteIds} trayIds={state.settings.chatEmoteTrayIds} bodyPresentation={state.character?.bodyPresentation} onTrayChange={onEmoteTrayChange} firstUnreadMessageId={partyFirstUnreadMessageId} onRead={onChatRead}/>:channel==='guild'&&guildAvailable?<GuildChat reduceMotion={state.settings.reduceMotion} language={state.settings.language} currentPlayerName={state.character?.name} unlockedEmoteIds={state.account.unlockedEmoteIds} trayIds={state.settings.chatEmoteTrayIds} bodyPresentation={state.character?.bodyPresentation} onTrayChange={onEmoteTrayChange} firstUnreadMessageId={guildFirstUnreadMessageId} onRead={onChatRead}/>:onlineConfigured?<OnlineWorldChat key={worldChannel} selectedChannel={worldChannel} reduceMotion={state.settings.reduceMotion} playerName={state.character!.name} language={state.settings.language} unlockedEmoteIds={state.account.unlockedEmoteIds} trayIds={state.settings.chatEmoteTrayIds} bodyPresentation={state.character?.bodyPresentation} onTrayChange={onEmoteTrayChange} embedded/>:<WorldChat selectedChannel={worldChannel} language={state.settings.language} unlockedEmoteIds={state.account.unlockedEmoteIds} trayIds={state.settings.chatEmoteTrayIds} bodyPresentation={state.character?.bodyPresentation} onTrayChange={onEmoteTrayChange} embedded/>}</View>
        </View></KeyboardAvoidingView>
      </View>
    </Modal>
  </>;
}

function TabAttention({unread,mentions}:{unread:number;mentions:number}){const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);if(unread<=0&&mentions<=0)return null;return <View accessible={false} style={s.tabAttention}>{mentions>0?<Text style={s.tabMentionText}>@{mentions>9?'9+':mentions}</Text>:null}{unread>0?<Text style={s.tabUnreadText}>{unread>99?'99+':unread}</Text>:null}</View>}

function makeStyles(C:ThemeColors){return StyleSheet.create({
  pressed:{opacity:.68,transform:[{translateY:1}]},
  modalRoot:{flex:1,justifyContent:'flex-end',alignItems:'flex-start',backgroundColor:C.overlay},keyboard:{width:'100%',maxWidth:480,flex:1,justifyContent:'flex-end'},window:{width:'100%',maxWidth:480,maxHeight:'88%',flexShrink:1,marginHorizontal:8,backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:24,overflow:'hidden',elevation:16,shadowColor:'#000',shadowOpacity:.32,shadowRadius:20,shadowOffset:{width:0,height:10}},windowExpanded:{maxHeight:'94%'},heading:{flex:1,minWidth:0},header:{minHeight:62,flexDirection:'row',alignItems:'center',paddingLeft:18,paddingRight:6,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.line,backgroundColor:C.panel2},eyebrow:{color:C.info,fontSize:9,fontWeight:'900',letterSpacing:1.2},title:{color:C.text,fontSize:19,fontWeight:'900'},close:{width:48,height:48,alignItems:'center',justifyContent:'center',borderRadius:24,marginLeft:8,marginRight:2,backgroundColor:C.bg},closeText:{color:C.muted,fontSize:30,lineHeight:32},primaryTabs:{gap:8,paddingHorizontal:12,paddingVertical:10,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.line,backgroundColor:C.bg},primaryTab:{position:'relative',minHeight:38,paddingHorizontal:14,justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:19,backgroundColor:C.panel},primaryTabActive:{borderColor:C.selectionLine,backgroundColor:C.selection},primaryTabText:{fontSize:11,color:C.muted,fontWeight:'900',letterSpacing:.5},primaryTabTextActive:{color:C.text},worldTabs:{gap:6,paddingHorizontal:12,paddingBottom:8,paddingTop:2,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.line,backgroundColor:C.panel},worldTab:{minHeight:30,paddingHorizontal:11,justifyContent:'center',borderRadius:15},worldTabActive:{backgroundColor:C.infoSurface},worldTabText:{fontSize:10,color:C.muted,fontWeight:'800'},worldTabTextActive:{color:C.info},tabMention:{borderColor:C.warning},tabDisabled:{opacity:.35},tabAttention:{position:'absolute',right:4,top:-5,flexDirection:'row',alignItems:'center',gap:2},tabMentionText:{fontSize:7,color:C.warning,fontWeight:'900'},tabUnreadText:{minWidth:16,height:16,paddingHorizontal:3,borderRadius:8,overflow:'hidden',textAlign:'center',fontSize:7,lineHeight:16,color:C.notificationText,fontWeight:'900',backgroundColor:C.notification},content:{minHeight:0,flexShrink:1,paddingHorizontal:12,paddingTop:10,paddingBottom:12},
});}
