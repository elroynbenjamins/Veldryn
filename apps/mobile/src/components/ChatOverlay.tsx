import {socialLabel,useSocialText} from '../i18n/social';
import {ChatChannelIcon} from './ChatChannelIcon';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {AppState,Keyboard,KeyboardAvoidingView,Modal,Platform,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
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
type ChatOverlayProps={state:GameState;initialChannel?:'world'|'guild';visible:boolean;onOpen:()=>void;onClose:()=>void;onEmoteTrayChange?:(ids:string[])=>void|Promise<void>;onManageEmotes?:()=>void;guildUnread?:number;guildMentions?:number;guildFirstUnreadMessageId?:string;partyUnread?:number;partyMentions?:number;partyFirstUnreadMessageId?:string;onChatRead?:()=>void};

export function ChatOverlay(props:ChatOverlayProps){
 const {session}=useAuthSession();
 // Channel state and cached views belong to the signed-in account, not a token refresh.
 return <AccountChatOverlay key={session?.user.id??('local:'+props.state.createdAtMs)} {...props}/>;
}

function AccountChatOverlay({state,initialChannel='world',visible,onOpen,onClose,onEmoteTrayChange,onManageEmotes,guildUnread=0,guildMentions=0,guildFirstUnreadMessageId,partyUnread=0,partyMentions=0,partyFirstUnreadMessageId,onChatRead}:ChatOverlayProps){
 const st=useSocialText();
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),insets=useSafeAreaInsets(),{width,height,fontScale}=useWindowDimensions();
 const compactTabs=width<360||fontScale>=1.25;
 const [channel,setChannel]=useState<Channel>('world');
 const [visitedChannels,setVisitedChannels]=useState<Channel[]>(['world']);
 const [worldChannel,setWorldChannel]=useState(Math.max(0,Math.min(WORLD_CHANNELS.length-1,(state.settings.defaultWorldChat??1)-1)));
 const [languageMenuOpen,setLanguageMenuOpen]=useState(false);
 const [keyboardVisible,setKeyboardVisible]=useState(false);
 const [keyboardOverlap,setKeyboardOverlap]=useState(0);
 const modalRootRef=useRef<View>(null),keyboardTopRef=useRef<number|null>(null);
 // Android translucent Modals do not consistently resize with adjustResize.
 // Measure the actual modal window against the IME rather than letting
 // KeyboardAvoidingView subtract its height a second time (or collapse).
 const measureKeyboardOverlap=useCallback(()=>{
  if(Platform.OS!=='android'||keyboardTopRef.current===null)return;
  const keyboardTop=keyboardTopRef.current;
  modalRootRef.current?.measureInWindow((_x,y,_width,viewHeight)=>{
   if(keyboardTopRef.current!==keyboardTop)return;
   const overlap=Math.max(0,Math.ceil(y+viewHeight-keyboardTop));
   setKeyboardOverlap(previous=>previous===overlap?previous:overlap);
  });
 },[]);
 const [guildTitle,setGuildTitle]=useState('');
 const pendingGuildChannel=useRef(false);
 const [onlineGuildAvailable,setOnlineGuildAvailable]=useState(state.account.guildMember);
 const guildCheckedAt=useRef(0),guildLoading=useRef(false),mounted=useRef(true);
 const {party,accountId,refresh}=usePartySocial();
 const chatEnabled=state.settings.autoJoinWorldChat!==false;
 const wasVisible=useRef(false);
 const selectChannel=(next:Channel)=>{
  if(next!==channel)Keyboard.dismiss();
  pendingGuildChannel.current=false;
  setLanguageMenuOpen(false);
  setChannel(next);
  setVisitedChannels(current=>current.includes(next)?current:[...current,next]);
 };

 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 useEffect(()=>{if(visible)void refresh();},[visible,refresh]);
 useEffect(()=>{if(!party&&channel==='party')selectChannel('world');},[party,channel]);
 useEffect(()=>{guildCheckedAt.current=0;},[visible,state.account.guildMember]);
 useEffect(()=>{
  if(!onlineConfigured){setOnlineGuildAvailable(state.account.guildMember);return;}
  if(!visible)return;
  let active=true;
  const load=async()=>{
   if(!active||(AppState.currentState!=='active'&&AppState.currentState!==null)||guildLoading.current||Date.now()-guildCheckedAt.current<30000)return;
   guildLoading.current=true;
   try{const guild=await myGuild();if(mounted.current){setOnlineGuildAvailable(!!guild);guildCheckedAt.current=Date.now();}}
   catch{/* Keep confirmed membership through temporary network failures. */}
   finally{guildLoading.current=false;}
  };
  void load();const timer=setInterval(()=>void load(),30000);
  const foreground=AppState.addEventListener('change',next=>{if(next==='active')void load();});
  return()=>{active=false;clearInterval(timer);foreground.remove();};
 },[visible,state.account.guildMember]);
 const guildAvailable=onlineConfigured?onlineGuildAvailable:state.account.guildMember;
 useEffect(()=>{if(!guildAvailable&&channel==='guild')selectChannel('world');},[guildAvailable,channel]);
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
 useEffect(()=>{
  if(!visible){keyboardTopRef.current=null;setKeyboardVisible(false);setKeyboardOverlap(0);return;}
  const showing=Keyboard.addListener('keyboardDidShow',event=>{
   const top=event.endCoordinates?.screenY;
   keyboardTopRef.current=typeof top==='number'&&Number.isFinite(top)?top:null;
   setKeyboardVisible(true);
   setLanguageMenuOpen(false);
   measureKeyboardOverlap();
  });
  const hiding=Keyboard.addListener('keyboardDidHide',()=>{
   keyboardTopRef.current=null;
   setKeyboardVisible(false);
   setKeyboardOverlap(0);
  });
  return()=>{showing.remove();hiding.remove();};
 },[visible,measureKeyboardOverlap]);
 useEffect(()=>{if(visible&&keyboardVisible)measureKeyboardOverlap();},[visible,keyboardVisible,width,height,measureKeyboardOverlap]);
 const closeChat=()=>{Keyboard.dismiss();pendingGuildChannel.current=false;setLanguageMenuOpen(false);onChatRead?.();onClose();};
 const activeLabel=channel==='world'?st("Global chat"):channel==='guild'?(guildTitle||st("Guild members")):channel==='party'?st("Your party"):st("Game notifications");

 return <>
  {!visible&&chatEnabled&&<ChatDock enabled={onlineConfigured} onOpen={onOpen} lines={state.settings.chatDockLines??1} selectedChannel={state.settings.defaultWorldChat??1} unreadCount={guildUnread+partyUnread} mentionCount={guildMentions+partyMentions}/>}
  <Modal visible={visible&&chatEnabled} transparent statusBarTranslucent animationType={state.settings.reduceMotion?'none':'fade'} onRequestClose={()=>{if(languageMenuOpen)setLanguageMenuOpen(false);else closeChat();}}>
   <View ref={modalRootRef} onLayout={measureKeyboardOverlap} style={[s.modalRoot,{paddingTop:Math.max(insets.top,8)+4,paddingBottom:keyboardVisible?4+(Platform.OS==='android'?keyboardOverlap:0):Math.max(insets.bottom,8)}]}>
    <Pressable accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" onPress={closeChat} style={StyleSheet.absoluteFill}/>
    <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} keyboardVerticalOffset={0} style={s.keyboard}>
     <View accessibilityViewIsModal onAccessibilityEscape={()=>{if(languageMenuOpen)setLanguageMenuOpen(false);else closeChat();}} style={s.window}>
      <View style={s.header}>
       <View style={s.brandBlock}>
        <Text style={s.eyebrow}>VELDRYN</Text>
        <Text style={s.title}>{st("Chat")}</Text>
       </View>
       <View style={s.headerSpacer}/>
       {onlineConfigured&&<View style={s.onlinePill}><View style={s.onlineDot}/><Text style={s.onlineText}>ONLINE</Text></View>}
       <Pressable accessibilityRole="button" accessibilityLabel={st("Close chat")} onPress={closeChat} style={({pressed})=>[s.close,pressed&&s.pressed]}><Text style={s.closeText}>×</Text></Pressable>
      </View>
      <View accessibilityRole="tablist" style={[s.tabs,compactTabs&&s.tabsCompact]}>
       <ChatTab channel="world" label={st("World")} selected={channel==='world'} onPress={()=>selectChannel('world')} compact={compactTabs}/>
       <ChatTab channel="guild" label={st("Guild")} selected={channel==='guild'} disabled={!guildAvailable} unread={guildAvailable?guildUnread:0} mentions={guildAvailable?guildMentions:0} onPress={()=>selectChannel('guild')} compact={compactTabs}/>
       <PartyChatGate party={party} accountId={accountId}><ChatTab channel="party" label={st("Party")} selected={channel==='party'} unread={partyUnread} mentions={partyMentions} onPress={()=>selectChannel('party')} compact={compactTabs}/></PartyChatGate>
       <ChatTab channel="system" label={st("System")} selected={channel==='system'} onPress={()=>selectChannel('system')} compact={compactTabs}/>
      </View>
      <View style={s.channelMeta}>
       <ChatChannelIcon channel={channel} color={C.accent}/>
       <Text numberOfLines={1} style={s.channelName}>{activeLabel}</Text>
       <View style={s.headerSpacer}/>
       {channel==='world'&&<Pressable accessibilityRole="button" accessibilityLabel={st('World language: {language}',{language:WORLD_CHANNELS[worldChannel].name})} accessibilityState={{expanded:languageMenuOpen}} onPress={()=>{Keyboard.dismiss();setLanguageMenuOpen(value=>!value);}} style={({pressed})=>[s.languageButton,pressed&&s.pressed]}>
        <Text numberOfLines={1} style={s.languageText}>{WORLD_CHANNELS[worldChannel].name}</Text>
        <DropdownChevron open={languageMenuOpen} color={C.info}/>
       </Pressable>}
      </View>
      <View style={s.content} accessibilityElementsHidden={languageMenuOpen} importantForAccessibility={languageMenuOpen?'no-hide-descendants':'auto'}>
       <View style={[s.channelPanel,channel!=='world'&&s.hiddenPanel]} accessibilityElementsHidden={channel!=='world'} importantForAccessibility={channel==='world'?'auto':'no-hide-descendants'}>
        {onlineConfigured?<OnlineWorldChat active={visible&&channel==='world'} selectedChannel={worldChannel} reduceMotion={state.settings.reduceMotion} playerName={state.character?.name??''} language={state.settings.language} unlockedEmoteIds={state.account.unlockedEmoteIds} trayIds={state.settings.chatEmoteTrayIds} bodyPresentation={state.character?.bodyPresentation} onTrayChange={onEmoteTrayChange} onManageEmotes={onManageEmotes} embedded/>:__DEV__?<WorldChat selectedChannel={worldChannel} language={state.settings.language} unlockedEmoteIds={state.account.unlockedEmoteIds} trayIds={state.settings.chatEmoteTrayIds} bodyPresentation={state.character?.bodyPresentation} onTrayChange={onEmoteTrayChange} onManageEmotes={onManageEmotes} embedded/>:<View style={s.chatUnavailable}><Text style={s.chatUnavailableTitle}>{socialLabel(state.settings.language,"Online chat unavailable")}</Text><Text style={s.chatUnavailableText}>{socialLabel(state.settings.language,"This release is missing its online service configuration. Update or reinstall the production build rather than using temporary demo chat.")}</Text></View>}
       </View>
       {visitedChannels.includes('guild')&&guildAvailable&&<View style={[s.channelPanel,channel!=='guild'&&s.hiddenPanel]} accessibilityElementsHidden={channel!=='guild'} importantForAccessibility={channel==='guild'?'auto':'no-hide-descendants'}>
        <GuildChat embedded active={visible&&channel==='guild'} onTitleChange={setGuildTitle} reduceMotion={state.settings.reduceMotion} language={state.settings.language} currentPlayerName={state.character?.name} unlockedEmoteIds={state.account.unlockedEmoteIds} trayIds={state.settings.chatEmoteTrayIds} bodyPresentation={state.character?.bodyPresentation} onTrayChange={onEmoteTrayChange} onManageEmotes={onManageEmotes} firstUnreadMessageId={guildFirstUnreadMessageId} onRead={onChatRead}/>
       </View>}
       {visitedChannels.includes('party')&&party&&<View style={[s.channelPanel,channel!=='party'&&s.hiddenPanel]} accessibilityElementsHidden={channel!=='party'} importantForAccessibility={channel==='party'?'auto':'no-hide-descendants'}>
        <OnlinePartyChat expanded active={visible&&channel==='party'} reduceMotion={state.settings.reduceMotion} unlockedEmoteIds={state.account.unlockedEmoteIds} trayIds={state.settings.chatEmoteTrayIds} bodyPresentation={state.character?.bodyPresentation} onTrayChange={onEmoteTrayChange} onManageEmotes={onManageEmotes} firstUnreadMessageId={partyFirstUnreadMessageId} onRead={onChatRead}/>
       </View>}
       {visitedChannels.includes('system')&&<View style={[s.channelPanel,channel!=='system'&&s.hiddenPanel]} accessibilityElementsHidden={channel!=='system'} importantForAccessibility={channel==='system'?'auto':'no-hide-descendants'}>
        <SystemNoticeLog expanded state={state} active={visible&&channel==='system'}/>
       </View>}
      </View>
      {languageMenuOpen&&<Pressable accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" onPress={()=>setLanguageMenuOpen(false)} style={s.popoverDismiss}/>}
      {languageMenuOpen&&channel==='world'&&<View accessibilityViewIsModal style={s.languagePopover}>
       <ScrollView keyboardShouldPersistTaps="handled" style={s.languageOptions} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>{WORLD_CHANNELS.map((item,index)=><Pressable key={item.id} accessibilityRole="button" accessibilityState={{selected:worldChannel===index}} onPress={()=>{setWorldChannel(index);setLanguageMenuOpen(false);}} style={({pressed})=>[s.languageOption,worldChannel===index&&s.languageOptionSelected,pressed&&s.pressed]}><Text style={s.languageOptionText}>{item.name}</Text>{worldChannel===index&&<Text style={s.languageCheck}>✓</Text>}</Pressable>)}</ScrollView>
      </View>}
     </View>
    </KeyboardAvoidingView>
   </View>
  </Modal>
 </>;
}

function DropdownChevron({open,color}:{open:boolean;color:string}){
 return <View pointerEvents="none" accessible={false} style={[chevronStyles.mark,{borderColor:color,transform:[{rotate:open?'225deg':'45deg'}]}]}/>;
}
const chevronStyles=StyleSheet.create({mark:{width:8,height:8,borderRightWidth:2,borderBottomWidth:2,borderRadius:1,marginHorizontal:3}});

function ChatTab({channel,label,selected,disabled=false,unread=0,mentions=0,onPress,compact=false}:{channel:Channel;label:string;selected:boolean;disabled?:boolean;unread?:number;mentions?:number;onPress:()=>void;compact?:boolean}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const attention=mentions>0?'@'+(mentions>9?'9+':mentions):unread>0?(unread>99?'99+':String(unread)):undefined;
 const detail=(mentions?', '+mentions+' mentions':'')+(unread?', '+unread+' unread':'');
 return <Pressable accessibilityRole="tab" accessibilityLabel={label+detail} accessibilityHint={disabled?'Join a Guild to chat':undefined} accessibilityState={{selected,disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>[s.tab,selected&&s.tabSelected,disabled&&s.tabDisabled,pressed&&s.pressed]}>
  <Text numberOfLines={1} style={[s.tabLabel,compact&&s.tabLabelCompact,selected&&s.tabLabelSelected]}>{label}</Text>
  {attention&&<View style={[s.tabBadge,{backgroundColor:mentions>0?C.warning:C.notification}]}><Text style={s.tabBadgeText}>{attention}</Text></View>}
 </Pressable>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 hiddenPanel:{display:'none'},chatUnavailable:{minHeight:160,alignItems:'center',justifyContent:'center',gap:6,padding:16},chatUnavailableTitle:{fontSize:15,fontWeight:'900',color:C.warning},chatUnavailableText:{fontSize:12,lineHeight:18,textAlign:'center',color:C.muted},
 pressed:{opacity:.72},
 modalRoot:{flex:1,justifyContent:'flex-end',alignItems:'center',backgroundColor:C.overlay,paddingHorizontal:6},
 keyboard:{width:'100%',maxWidth:480,flex:1,justifyContent:'flex-end'},
 window:{width:'100%',flex:1,minHeight:0,backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:16,overflow:'hidden',elevation:12,shadowColor:'#000',shadowOpacity:.25,shadowRadius:16,shadowOffset:{width:0,height:6}},
 header:{minHeight:56,flexDirection:'row',alignItems:'center',paddingLeft:14,paddingRight:8,gap:8,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.line,backgroundColor:C.panel2},
 brandBlock:{justifyContent:'center',gap:1},
 eyebrow:{color:C.accent,fontSize:9,fontWeight:'900',letterSpacing:1.5},
 title:{color:C.accent,fontSize:20,fontWeight:'900'},
 headerSpacer:{flex:1,minWidth:0},
 onlinePill:{flexDirection:'row',alignItems:'center',gap:5,paddingHorizontal:7,paddingVertical:4,borderRadius:99},
 onlineDot:{width:7,height:7,borderRadius:4,backgroundColor:C.good},
 onlineText:{fontSize:9,color:C.good,fontWeight:'900',letterSpacing:.7},
 close:{width:44,height:44,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panelRaised},
 closeText:{fontSize:24,lineHeight:27,color:C.text,fontWeight:'400'},
 tabs:{minHeight:58,flexDirection:'row',alignItems:'center',gap:5,paddingHorizontal:9,paddingVertical:7,backgroundColor:C.panel2},
 tabsCompact:{gap:3,paddingHorizontal:6},
 tab:{flex:1,minWidth:0,minHeight:44,alignItems:'center',justifyContent:'center',paddingHorizontal:3,borderWidth:1,borderColor:C.line,borderRadius:9,backgroundColor:C.panelRaised},
 tabSelected:{backgroundColor:C.selection,borderColor:C.accent},
 tabDisabled:{opacity:.46},
 tabLabel:{fontSize:11,fontWeight:'900',color:C.muted},
 tabLabelCompact:{fontSize:10},
 tabLabelSelected:{color:C.text},
 tabBadge:{position:'absolute',top:-5,right:-3,minWidth:17,height:17,paddingHorizontal:3,borderRadius:9,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.panel2},
 tabBadgeText:{fontSize:9,color:C.notificationText,fontWeight:'900'},
 channelMeta:{height:48,minHeight:48,flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:12,backgroundColor:C.panel2,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.line},
 channelName:{flexShrink:1,fontSize:11,color:C.muted,fontWeight:'700'},
 languageButton:{minHeight:44,maxWidth:142,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,paddingHorizontal:10,borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.panelRaised},
 languageText:{fontSize:11,color:C.info,fontWeight:'800',flexShrink:1},
 content:{flex:1,minHeight:0,paddingHorizontal:10,paddingTop:8,paddingBottom:9},
 channelPanel:{flex:1,minHeight:0},
 popoverDismiss:{position:'absolute',top:162,right:0,bottom:0,left:0,zIndex:18,backgroundColor:'transparent'},
 languagePopover:{position:'absolute',zIndex:30,elevation:18,top:162,right:10,width:220,maxWidth:'78%',padding:6,borderWidth:1,borderColor:C.selectionLine,borderRadius:12,backgroundColor:C.panel2,shadowColor:'#000',shadowOpacity:.24,shadowRadius:12,shadowOffset:{width:0,height:6}},
 languageOptions:{maxHeight:222},
 languageOption:{minHeight:44,flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:12,paddingVertical:8,borderRadius:8},
 languageOptionSelected:{backgroundColor:C.selection},
 languageOptionText:{flex:1,color:C.text,fontSize:13,fontWeight:'600'},
 languageCheck:{color:C.info,fontSize:14},
});}
