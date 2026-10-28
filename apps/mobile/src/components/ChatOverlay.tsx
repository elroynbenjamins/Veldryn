import {socialLabel,useSocialText} from '../i18n/social';
import {ChatChannelIcon} from './ChatChannelIcon';
import {useEffect,useMemo,useRef,useState} from 'react';
import {AppState,KeyboardAvoidingView,Modal,Platform,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
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
import {useAuthSession} from '../online/AuthSessionProvider';

type Channel='world'|'guild'|'party'|'system';
type ChatOverlayProps={state:GameState;initialChannel?:'world'|'guild';visible:boolean;onOpen:()=>void;onClose:()=>void;onEmoteTrayChange?:(ids:string[])=>void|Promise<void>;guildUnread?:number;guildMentions?:number;guildFirstUnreadMessageId?:string;partyUnread?:number;partyMentions?:number;partyFirstUnreadMessageId?:string;onChatRead?:()=>void};

export function ChatOverlay(props:ChatOverlayProps){
 const {session}=useAuthSession();
 // Channel views belong to an account, not to a token refresh or tab selection.
 return <AccountChatOverlay key={session?.user.id??`local:${props.state.createdAtMs}`} {...props}/>;
}

function AccountChatOverlay({state,initialChannel='world',visible,onOpen,onClose,onEmoteTrayChange,guildUnread=0,guildMentions=0,guildFirstUnreadMessageId,partyUnread=0,partyMentions=0,partyFirstUnreadMessageId,onChatRead}:ChatOverlayProps){
 const st=useSocialText();
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),insets=useSafeAreaInsets(),{width,fontScale}=useWindowDimensions(),expandWindow=width<360||fontScale>=1.25,bottomOffset=72+(Platform.OS==='android'?Math.max(insets.bottom,8):Math.max(insets.bottom,4));
  const [channel,setChannel]=useState<Channel>('world');
  const pendingGuildChannel=useRef(false);
  const [visitedChannels,setVisitedChannels]=useState<Channel[]>(['world']);
  const selectChannel=(next:Channel)=>{pendingGuildChannel.current=false;setChannelMenuOpen(false);setLanguageMenuOpen(false);setChannel(next);setVisitedChannels(current=>current.includes(next)?current:[...current,next]);};
  const [worldChannel,setWorldChannel]=useState(Math.max(0,Math.min(WORLD_CHANNELS.length-1,(state.settings.defaultWorldChat??1)-1)));
  const [languageMenuOpen,setLanguageMenuOpen]=useState(false),[channelMenuOpen,setChannelMenuOpen]=useState(false);
  useEffect(()=>{setLanguageMenuOpen(false);setChannelMenuOpen(false);},[visible,channel]);
  const [onlineGuildAvailable,setOnlineGuildAvailable]=useState(state.account.guildMember);
  const guildCheckedAt=useRef(0),guildLoading=useRef(false),mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const {party,accountId,refresh}=usePartySocial();
  useEffect(()=>{if(!party&&channel==='party')setChannel('world');},[party,channel]);
  useEffect(()=>{if(visible)void refresh();},[visible,refresh]);
  // Opening chat must immediately reconcile Guild membership, including after
   // accepting an invitation while the app stayed foregrounded.
   useEffect(()=>{guildCheckedAt.current=0;},[visible,state.account.guildMember]);
  useEffect(()=>{
    if(!onlineConfigured){setOnlineGuildAvailable(state.account.guildMember);return;}
    if(!visible)return;
    let active=true;
    const load=async()=>{
      if(!active||(AppState.currentState!=='active'&&AppState.currentState!==null)||guildLoading.current||Date.now()-guildCheckedAt.current<30000)return;
      guildLoading.current=true;
      try{const guild=await myGuild();if(mounted.current){setOnlineGuildAvailable(!!guild);guildCheckedAt.current=Date.now();}}
      catch{/* Keep the last confirmed membership during a temporary connection failure. */}
      finally{guildLoading.current=false;}
    };
    void load();const timer=setInterval(()=>void load(),30000);
    const foreground=AppState.addEventListener('change',next=>{if(next==='active')void load();});
    return()=>{active=false;clearInterval(timer);foreground.remove();};
  },[visible,state.account.guildMember]);
  const guildAvailable=onlineConfigured?onlineGuildAvailable:state.account.guildMember;
  useEffect(()=>{if(!guildAvailable&&channel==='guild')setChannel('world');},[guildAvailable,channel]);
  const wasVisible=useRef(false),chatEnabled=state.settings.autoJoinWorldChat!==false;
  useEffect(()=>{if(!chatEnabled&&visible)onClose();},[chatEnabled,visible,onClose]);
  useEffect(()=>{
    if(visible&&!wasVisible.current){
      selectChannel(initialChannel==='guild'&&guildAvailable?'guild':'world');
      pendingGuildChannel.current=initialChannel==='guild'&&!guildAvailable;
      setWorldChannel(Math.max(0,Math.min(WORLD_CHANNELS.length-1,(state.settings.defaultWorldChat??1)-1)));
    }
    wasVisible.current=visible;
  },[visible,initialChannel,state.settings.defaultWorldChat,guildAvailable]);
  useEffect(()=>{if(visible&&guildAvailable&&pendingGuildChannel.current)selectChannel('guild');},[visible,guildAvailable]);
  const closeChat=()=>{pendingGuildChannel.current=false;setChannelMenuOpen(false);setLanguageMenuOpen(false);onChatRead?.();onClose();};
  return <>
    {!visible&&chatEnabled&&<ChatDock enabled={onlineConfigured} onOpen={onOpen} lines={state.settings.chatDockLines??1} selectedChannel={state.settings.defaultWorldChat??1} unreadCount={guildUnread+partyUnread} mentionCount={guildMentions+partyMentions}/>}
    <Modal visible={visible&&chatEnabled} transparent statusBarTranslucent animationType={state.settings.reduceMotion?'none':'fade'} onRequestClose={()=>{if(channelMenuOpen)setChannelMenuOpen(false);else if(languageMenuOpen)setLanguageMenuOpen(false);else closeChat();}}>
      <View style={[s.modalRoot,{paddingTop:Math.max(insets.top,8),paddingBottom:bottomOffset}]}>
        <Pressable accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" onPress={closeChat} style={StyleSheet.absoluteFill}/>
        <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} keyboardVerticalOffset={insets.top} style={s.keyboard}><View accessibilityViewIsModal onAccessibilityEscape={()=>{if(channelMenuOpen)setChannelMenuOpen(false);else if(languageMenuOpen)setLanguageMenuOpen(false);else closeChat();}} style={[s.window,expandWindow&&s.windowExpanded]}>
          <View style={s.chatLayout}>
            <View style={s.conversation}>
              <View style={s.header}>
                <Pressable accessibilityRole="button" accessibilityLabel={st("Change chat channel")+' · '+st(channel==='world'?'World':channel==='guild'?'Guild':channel==='party'?'Party':'System')} accessibilityState={{expanded:channelMenuOpen}} onPress={()=>{setLanguageMenuOpen(false);setChannelMenuOpen(value=>!value);}} style={({pressed})=>[s.channelTrigger,{borderColor:channelMenuOpen?C.accent:C.line,backgroundColor:channelMenuOpen?C.selection:C.panelRaised},pressed&&s.pressed]}>
                  <ChatChannelIcon channel={channel} color={channelMenuOpen?C.accent:C.text}/>
                  <Text numberOfLines={1} style={s.channelTriggerText}>{st(channel==='world'?'World':channel==='guild'?'Guild':channel==='party'?'Party':'System')}</Text>
                  <DropdownChevron open={channelMenuOpen} color={channelMenuOpen?C.accent:C.muted}/>
                </Pressable>
                {onlineConfigured&&width>=400&&<View style={s.onlinePill}><View style={s.onlineDot}/><Text style={s.onlineText}>ONLINE</Text></View>}
                <View style={s.headerSpacer}/>
                {channel==='world'&&<Pressable accessibilityRole="button" accessibilityLabel={st('World language: {language}',{language:WORLD_CHANNELS[worldChannel].name})} accessibilityState={{expanded:languageMenuOpen}} onPress={()=>{setChannelMenuOpen(false);setLanguageMenuOpen(value=>!value)}} style={({pressed})=>[s.languageButton,pressed&&s.pressed]}>
                  <Text numberOfLines={1} style={s.languageText}>{WORLD_CHANNELS[worldChannel].name}</Text>
                  <DropdownChevron open={languageMenuOpen} color={C.muted}/>
                </Pressable>}
                <Pressable accessibilityRole="button" accessibilityLabel={st("Close chat")} onPress={closeChat} style={({pressed})=>[s.close,pressed&&s.pressed]}><Text style={s.closeText}>×</Text></Pressable>
              </View>
          <View style={s.content} accessibilityElementsHidden={channelMenuOpen||languageMenuOpen} importantForAccessibility={channelMenuOpen||languageMenuOpen?'no-hide-descendants':'auto'}>
            <View style={channel!=='world'?s.hiddenPanel:undefined} accessibilityElementsHidden={channel!=='world'} importantForAccessibility={channel==='world'?'auto':'no-hide-descendants'}>
              {onlineConfigured?<OnlineWorldChat active={visible&&channel==='world'} selectedChannel={worldChannel} reduceMotion={state.settings.reduceMotion} playerName={state.character?.name??''} language={state.settings.language} unlockedEmoteIds={state.account.unlockedEmoteIds} trayIds={state.settings.chatEmoteTrayIds} bodyPresentation={state.character?.bodyPresentation} onTrayChange={onEmoteTrayChange} embedded/>:__DEV__?<WorldChat selectedChannel={worldChannel} language={state.settings.language} unlockedEmoteIds={state.account.unlockedEmoteIds} trayIds={state.settings.chatEmoteTrayIds} bodyPresentation={state.character?.bodyPresentation} onTrayChange={onEmoteTrayChange} embedded/>:<View style={s.chatUnavailable}><Text style={s.chatUnavailableTitle}>{socialLabel(state.settings.language,"Online chat unavailable")}</Text><Text style={s.chatUnavailableText}>{socialLabel(state.settings.language,"This release is missing its online service configuration. Update or reinstall the production build rather than using temporary demo chat.")}</Text></View>}
            </View>
            {visitedChannels.includes('guild')&&guildAvailable&&<View style={channel!=='guild'?s.hiddenPanel:undefined} accessibilityElementsHidden={channel!=='guild'} importantForAccessibility={channel==='guild'?'auto':'no-hide-descendants'}>
              <GuildChat active={visible&&channel==='guild'} reduceMotion={state.settings.reduceMotion} language={state.settings.language} currentPlayerName={state.character?.name} unlockedEmoteIds={state.account.unlockedEmoteIds} trayIds={state.settings.chatEmoteTrayIds} bodyPresentation={state.character?.bodyPresentation} onTrayChange={onEmoteTrayChange} firstUnreadMessageId={guildFirstUnreadMessageId} onRead={onChatRead}/>
            </View>}
            {visitedChannels.includes('party')&&party&&<View style={channel!=='party'?s.hiddenPanel:undefined} accessibilityElementsHidden={channel!=='party'} importantForAccessibility={channel==='party'?'auto':'no-hide-descendants'}>
              <OnlinePartyChat active={visible&&channel==='party'} reduceMotion={state.settings.reduceMotion} unlockedEmoteIds={state.account.unlockedEmoteIds} trayIds={state.settings.chatEmoteTrayIds} bodyPresentation={state.character?.bodyPresentation} onTrayChange={onEmoteTrayChange} firstUnreadMessageId={partyFirstUnreadMessageId} onRead={onChatRead}/>
            </View>}
            {visitedChannels.includes('system')&&<View style={channel!=='system'?s.hiddenPanel:undefined} accessibilityElementsHidden={channel!=='system'} importantForAccessibility={channel==='system'?'auto':'no-hide-descendants'}><SystemNoticeLog state={state} active={visible&&channel==='system'}/></View>}
          </View>
          {(channelMenuOpen||languageMenuOpen)&&<Pressable accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" onPress={()=>{setChannelMenuOpen(false);setLanguageMenuOpen(false)}} style={s.popoverDismiss}/>}
          {channelMenuOpen&&<View accessibilityViewIsModal style={s.channelPopover}>
            <View pointerEvents="none" style={s.channelPopoverNotch}/>
            <Text style={s.channelPopoverHeading}>{st("Chat channels")}</Text>
            <ChannelChoice channel="world" label={st("World")} description={st("Global chat")} selected={channel==='world'} onPress={()=>selectChannel('world')}/>
            <ChannelChoice channel="guild" label={st("Guild")} description={guildAvailable?st("Guild members"):st("Join a Guild to chat")} selected={channel==='guild'} disabled={!guildAvailable} unread={guildUnread} mentions={guildMentions} onPress={()=>selectChannel('guild')}/>
            <PartyChatGate party={party} accountId={accountId}><ChannelChoice channel="party" label={st("Party")} description={st("Your party")} selected={channel==='party'} unread={partyUnread} mentions={partyMentions} onPress={()=>selectChannel('party')}/></PartyChatGate>
            <ChannelChoice channel="system" label={st("System")} description={st("Game notifications")} selected={channel==='system'} onPress={()=>selectChannel('system')}/>
          </View>}
          {languageMenuOpen&&channel==='world'&&<View style={s.languagePopover}>
            <ScrollView keyboardShouldPersistTaps="handled" style={s.languageOptions} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>{WORLD_CHANNELS.map((item,index)=><Pressable key={item.id} accessibilityRole="button" accessibilityState={{selected:worldChannel===index}} onPress={()=>{setWorldChannel(index);setLanguageMenuOpen(false);}} style={({pressed})=>[s.languageOption,worldChannel===index&&s.languageOptionSelected,pressed&&s.pressed]}><Text style={s.languageOptionText}>{item.name}</Text>{worldChannel===index&&<Text style={s.languageCheck}>✓</Text>}</Pressable>)}</ScrollView>
          </View>}
            </View>
          </View>
        </View></KeyboardAvoidingView>
      </View>
    </Modal>
  </>;
}

function DropdownChevron({open,color}:{open:boolean;color:string}){
 return <View pointerEvents="none" accessible={false} style={[chevronStyles.mark,{borderColor:color,transform:[{rotate:open?'225deg':'45deg'}]}]}/>;
}
const chevronStyles=StyleSheet.create({mark:{width:9,height:9,borderRightWidth:2,borderBottomWidth:2,borderRadius:1,marginHorizontal:4}});

function ChannelChoice({channel,label,description,selected,disabled=false,unread=0,mentions=0,onPress}:{channel:Channel;label:string;description:string;selected:boolean;disabled?:boolean;unread?:number;mentions?:number;onPress:()=>void}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const attention=mentions>0?'@':unread>0?(unread>9?'9+':String(unread)):undefined;
 return <Pressable accessibilityRole="button" accessibilityLabel={label+' · '+description+(unread?', '+unread+' unread':'')+(mentions?', '+mentions+' mentions':'')} accessibilityState={{selected,disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>[s.channelOption,selected&&s.channelOptionSelected,disabled&&s.channelOptionDisabled,pressed&&s.pressed]}>
  <ChatChannelIcon channel={channel} color={selected?C.accent:disabled?C.muted:C.text}/>
  <View style={s.channelOptionBody}><Text numberOfLines={1} style={s.channelOptionTitle}>{label}</Text><Text numberOfLines={1} style={s.channelOptionSub}>{description}</Text></View>
  {attention&&<View accessible={false} style={[s.channelBadge,{backgroundColor:mentions>0?C.warning:C.notification}]}><Text style={s.channelBadgeText}>{attention}</Text></View>}
  {selected&&<Text accessible={false} style={[s.channelCheck,{color:C.accent}]}>✓</Text>}
 </Pressable>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 hiddenPanel:{display:'none'},chatUnavailable:{minHeight:160,alignItems:'center',justifyContent:'center',gap:6,padding:16},chatUnavailableTitle:{fontSize:15,fontWeight:'900',color:C.warning},chatUnavailableText:{fontSize:12,lineHeight:18,textAlign:'center',color:C.muted},
 pressed:{opacity:.7},modalRoot:{flex:1,justifyContent:'flex-end',alignItems:'flex-start',backgroundColor:C.overlay,paddingHorizontal:8},
 keyboard:{width:'100%',maxWidth:480,flex:1,justifyContent:'flex-end'},
 window:{width:'100%',maxWidth:480,maxHeight:'88%',flexShrink:1,backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:16,overflow:'hidden',elevation:12,shadowColor:'#000',shadowOpacity:.25,shadowRadius:16,shadowOffset:{width:0,height:6}},
 windowExpanded:{maxHeight:'94%'},chatLayout:{flexDirection:'row',flexShrink:1,minHeight:0},
 conversation:{flex:1,minWidth:0,minHeight:0,flexShrink:1,position:'relative'},
 header:{minHeight:50,flexDirection:'row',alignItems:'center',paddingLeft:9,paddingRight:2,gap:6,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.line},
 headerSpacer:{flex:1,minWidth:0},
 channelTrigger:{minHeight:44,minWidth:100,maxWidth:162,flexShrink:1,flexDirection:'row',alignItems:'center',gap:7,paddingHorizontal:8,borderWidth:1,borderRadius:10},
 channelTriggerText:{fontSize:13,fontWeight:'800',color:C.text,flexShrink:1},
 onlinePill:{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:6,paddingVertical:3,borderWidth:1,borderColor:C.good,borderRadius:99,backgroundColor:C.goodSurface},onlineDot:{width:6,height:6,borderRadius:3,backgroundColor:C.good},onlineText:{fontSize:7,color:C.good,fontWeight:'900',letterSpacing:.6},
 languageButton:{minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,paddingHorizontal:8,maxWidth:110,flexShrink:1,borderWidth:1,borderColor:C.line,borderRadius:9,backgroundColor:C.panelRaised},
 languageText:{fontSize:12,color:C.text,fontWeight:'700',flexShrink:1},
 close:{width:40,height:44,alignItems:'center',justifyContent:'center'},closeText:{fontSize:25,color:C.muted,fontWeight:'400'},
 popoverDismiss:{position:'absolute',top:50,right:0,bottom:0,left:0,zIndex:18,backgroundColor:'transparent'},
 channelPopover:{position:'absolute',zIndex:30,elevation:18,top:54,left:8,width:278,maxWidth:'94%',padding:7,borderWidth:1,borderColor:C.selectionLine,borderRadius:12,backgroundColor:C.panel2,shadowColor:'#000',shadowOpacity:.28,shadowRadius:14,shadowOffset:{width:0,height:6}},
 channelPopoverNotch:{position:'absolute',top:-6,left:29,width:11,height:11,transform:[{rotate:'45deg'}],backgroundColor:C.panel2,borderTopWidth:1,borderLeftWidth:1,borderColor:C.selectionLine},
 channelPopoverHeading:{fontSize:10,fontWeight:'800',letterSpacing:.6,color:C.muted,paddingHorizontal:10,paddingVertical:6},
 channelOption:{minHeight:52,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:10,paddingVertical:7,borderWidth:1,borderColor:'transparent',borderRadius:9},
 channelOptionSelected:{borderColor:C.accent,backgroundColor:C.selection},
 channelOptionDisabled:{opacity:.45},
 channelOptionBody:{flex:1,minWidth:0,gap:2},
 channelOptionTitle:{fontSize:13,lineHeight:18,fontWeight:'800',color:C.text},
 channelOptionSub:{fontSize:10,lineHeight:14,color:C.muted},
 channelBadge:{minWidth:19,height:19,borderRadius:10,paddingHorizontal:4,alignItems:'center',justifyContent:'center'},
 channelBadgeText:{fontSize:10,lineHeight:14,color:C.notificationText,fontWeight:'900'},
 channelCheck:{fontSize:15,fontWeight:'800'},
 badge:{position:'absolute',top:1,right:0,minWidth:15,height:15,borderRadius:8,paddingHorizontal:3,alignItems:'center',justifyContent:'center',backgroundColor:C.notification},
 languagePopover:{position:'absolute',zIndex:30,elevation:18,top:54,right:48,width:222,maxWidth:'78%',padding:6,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel2,shadowColor:'#000',shadowOpacity:.25,shadowRadius:12,shadowOffset:{width:0,height:6}},
 languageOptions:{maxHeight:196},languageOption:{minHeight:44,flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:12,paddingVertical:8,borderRadius:8},
 languageOptionSelected:{backgroundColor:C.selection},languageOptionText:{flex:1,color:C.text,fontSize:13,fontWeight:'500'},languageCheck:{color:C.info,fontSize:14},
 content:{minHeight:0,flexShrink:1,paddingHorizontal:10,paddingTop:8,paddingBottom:10},
});}
