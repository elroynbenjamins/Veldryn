import {UiIcon} from './UiIcon';
import {useEffect,useState} from 'react';
import {Modal,Platform,Pressable,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {onlineConfigured} from '../online/supabase';
import {C} from '../theme/theme';
import {GuildChat} from './GuildChat';
import {OnlineWorldChat} from './OnlineWorldChat';
import {WorldChat} from './WorldChat';
import {OnlinePartyChat} from './OnlinePartyChat';
import {PartyChatGate} from './PartyChatGate';
import {usePartySocial} from '../online/PartySocialProvider';
import {ChatDock} from './ChatDock';
import {myGuild} from '../online/social';

type Channel='world'|'guild'|'party';

export function ChatOverlay({state,visible,onOpen,onClose,guildUnread=0,guildMentions=0,guildFirstUnreadMessageId,partyUnread=0,partyMentions=0,partyFirstUnreadMessageId,onChatRead}:{state:GameState;visible:boolean;onOpen:()=>void;onClose:()=>void;guildUnread?:number;guildMentions?:number;guildFirstUnreadMessageId?:string;partyUnread?:number;partyMentions?:number;partyFirstUnreadMessageId?:string;onChatRead?:()=>void}){
  const [channel,setChannel]=useState<Channel>('world');
  const [onlineGuildAvailable,setOnlineGuildAvailable]=useState(state.account.guildMember);
  const {party,accountId,refresh}=usePartySocial();
  useEffect(()=>{if(!party&&channel==='party')setChannel('world');},[party,channel]);
  useEffect(()=>{if(visible)void refresh();},[visible,refresh]);
  useEffect(()=>{if(!onlineConfigured){setOnlineGuildAvailable(state.account.guildMember);return;}let active=true;const load=async()=>{try{const guild=await myGuild();if(active)setOnlineGuildAvailable(!!guild)}catch{if(active)setOnlineGuildAvailable(state.account.guildMember)}};void load();if(!visible)return()=>{active=false};const timer=setInterval(()=>void load(),30000);return()=>{active=false;clearInterval(timer)};},[visible,state.account.guildMember]);
  const guildAvailable=onlineConfigured?onlineGuildAvailable:state.account.guildMember;
  useEffect(()=>{if(!guildAvailable&&channel==='guild')setChannel('world');},[guildAvailable,channel]);
  const closeChat=()=>{onChatRead?.();onClose();};
  return <>
    {!visible&&<ChatDock enabled={onlineConfigured} onOpen={onOpen} unreadCount={guildUnread+partyUnread} mentionCount={guildMentions+partyMentions}/>}
    <Modal visible={visible} transparent statusBarTranslucent animationType={state.settings.reduceMotion?'none':'fade'} onRequestClose={closeChat}>
      <View style={s.modalRoot}>
        <Pressable accessibilityLabel="Close chat overlay" onPress={closeChat} style={StyleSheet.absoluteFill}/>
        <View style={s.window}>
          <View style={s.header}>
            <View><Text style={s.eyebrow}>LIVE CHAT</Text><Text style={s.title}>{channel==='world'?'World':channel==='party'?'Party':'Guild'}</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close chat" onPress={closeChat} style={s.close}><UiIcon name="close" size={24}/></Pressable>
          </View>
          <View accessibilityRole="tablist" style={s.tabs}>
            <PartyChatGate party={party} accountId={accountId}><Pressable accessibilityRole="tab" accessibilityState={{selected:channel==='party'}} onPress={()=>setChannel('party')} style={[s.tab,partyMentions>0&&s.tabMention,channel==='party'&&s.tabActive]}><Text style={[s.tabText,channel==='party'&&s.tabTextActive]}>PARTY</Text><TabAttention unread={partyUnread} mentions={partyMentions}/></Pressable></PartyChatGate>
            <Pressable accessibilityRole="tab" accessibilityState={{selected:channel==='world'}} onPress={()=>setChannel('world')} style={[s.tab,channel==='world'&&s.tabActive]}><Text style={[s.tabText,channel==='world'&&s.tabTextActive]}>WORLD</Text></Pressable>
            <Pressable accessibilityRole="tab" accessibilityState={{selected:channel==='guild',disabled:!guildAvailable}} disabled={!guildAvailable} onPress={()=>setChannel('guild')} style={[s.tab,guildMentions>0&&s.tabMention,channel==='guild'&&s.tabActive,!guildAvailable&&s.tabDisabled]}><Text style={[s.tabText,channel==='guild'&&s.tabTextActive]}>GUILD</Text><TabAttention unread={guildUnread} mentions={guildMentions}/></Pressable>
          </View>
          <View style={s.content}>{channel==='party'?<OnlinePartyChat firstUnreadMessageId={partyFirstUnreadMessageId} onRead={onChatRead}/>:channel==='guild'&&guildAvailable?<GuildChat language={state.settings.language} currentPlayerName={state.character?.name} firstUnreadMessageId={guildFirstUnreadMessageId} onRead={onChatRead}/>:onlineConfigured?<OnlineWorldChat playerName={state.character!.name} language={state.settings.language} embedded/>:<WorldChat language={state.settings.language} embedded/>}</View>
        </View>
      </View>
    </Modal>
  </>;
}

function TabAttention({unread,mentions}:{unread:number;mentions:number}){if(unread<=0&&mentions<=0)return null;return <View accessible accessibilityLabel={[unread>0?unread+' unread':null,mentions>0?mentions+' mentions':null].filter(Boolean).join(', ')} style={s.tabAttention}>{mentions>0?<Text style={s.tabMentionText}>@{mentions>9?'9+':mentions}</Text>:null}{unread>0?<Text style={s.tabUnreadText}>{unread>99?'99+':unread}</Text>:null}</View>}

const s=StyleSheet.create({
  pressed:{opacity:.68,transform:[{translateY:1}]},
  modalRoot:{flex:1,justifyContent:'flex-end',alignItems:'flex-start',paddingBottom:Platform.OS==='android'?76:88,backgroundColor:'rgba(0,0,0,.38)'},window:{width:'100%',maxWidth:480,maxHeight:'70%',backgroundColor:'#0d1621',borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:C.line,borderTopLeftRadius:20,borderTopRightRadius:20,overflow:'hidden'},header:{minHeight:58,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingLeft:16,paddingRight:4,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.line},eyebrow:{color:'#70b9de',fontSize:9,fontWeight:'900',letterSpacing:1.2},title:{color:C.text,fontSize:18,fontWeight:'800'},close:{width:52,height:52,alignItems:'center',justifyContent:'center'},closeText:{color:C.muted,fontSize:30,lineHeight:32},tabs:{flexDirection:'row',paddingHorizontal:10,paddingTop:8,paddingBottom:8,gap:6},tab:{minHeight:38,flex:1,alignItems:'center',justifyContent:'center',borderRadius:99,borderWidth:1,borderColor:'#304659',backgroundColor:'#0b1018'},tabActive:{backgroundColor:'#123e61',borderColor:'#43bdf2'},tabMention:{borderColor:C.warning},tabDisabled:{opacity:.35},tabText:{color:C.muted,fontSize:11,fontWeight:'800',letterSpacing:.7},tabTextActive:{color:'#d9f3ff'},tabAttention:{position:'absolute',right:4,top:3,flexDirection:'row',alignItems:'center',gap:2},tabMentionText:{fontSize:7,color:C.warning,fontWeight:'900'},tabUnreadText:{minWidth:14,height:14,paddingHorizontal:3,borderRadius:7,overflow:'hidden',textAlign:'center',fontSize:7,lineHeight:14,color:'#fff',fontWeight:'900',backgroundColor:'#d93646'},content:{paddingHorizontal:10,paddingBottom:10},
});
