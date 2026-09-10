import {useState} from 'react';
import {Image,Modal,Platform,Pressable,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {onlineConfigured} from '../online/supabase';
import {C,equipmentColors} from '../theme/theme';
import {GuildChat} from './GuildChat';
import {OnlineWorldChat} from './OnlineWorldChat';
import {WorldChat} from './WorldChat';

type Channel='world'|'guild';

export function ChatOverlay({state,visible,onOpen,onClose}:{state:GameState;visible:boolean;onOpen:()=>void;onClose:()=>void}){
  const [channel,setChannel]=useState<Channel>('world');
  const guildAvailable=state.account.guildMember;
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel="Open chat overlay" accessibilityHint="Opens chat without leaving the current screen" onPress={onOpen} style={({pressed})=>[s.launcher,pressed&&s.pressed]}>
      <Image source={require('../features/chat-pilot/assets/icons/chat.png')} resizeMode="contain" style={s.launcherIcon}/>
    </Pressable>
    <Modal visible={visible} transparent statusBarTranslucent animationType={state.settings.reduceMotion?'none':'fade'} onRequestClose={onClose}>
      <View style={s.modalRoot}>
        <Pressable accessibilityLabel="Close chat overlay" onPress={onClose} style={StyleSheet.absoluteFill}/>
        <View style={s.window}>
          <View style={s.header}>
            <Text style={s.title}>{channel==='world'?'World chat':'Guild chat'}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close chat" onPress={onClose} style={s.close}><Text style={s.closeText}>×</Text></Pressable>
          </View>
          <View accessibilityRole="tablist" style={s.tabs}>
            <Pressable accessibilityRole="tab" accessibilityState={{selected:channel==='world'}} onPress={()=>setChannel('world')} style={[s.tab,channel==='world'&&s.tabActive]}><Text style={[s.tabText,channel==='world'&&s.tabTextActive]}>WORLD</Text></Pressable>
            <Pressable accessibilityRole="tab" accessibilityState={{selected:channel==='guild',disabled:!guildAvailable}} disabled={!guildAvailable} onPress={()=>setChannel('guild')} style={[s.tab,channel==='guild'&&s.tabActive,!guildAvailable&&s.tabDisabled]}><Text style={[s.tabText,channel==='guild'&&s.tabTextActive]}>GUILD</Text></Pressable>
          </View>
          <View style={s.content}>{channel==='guild'&&guildAvailable?<GuildChat language={state.settings.language}/>:onlineConfigured?<OnlineWorldChat playerName={state.character!.name} language={state.settings.language} embedded/>:<WorldChat language={state.settings.language} embedded/>}</View>
        </View>
      </View>
    </Modal>
  </>;
}

const s=StyleSheet.create({
  launcher:{position:'absolute',left:12,bottom:82,zIndex:20,width:50,height:50,alignItems:'center',justifyContent:'center',backgroundColor:equipmentColors.panelRaised,borderWidth:1,borderColor:equipmentColors.lineStrong,borderRadius:25,shadowColor:'#000',shadowOpacity:.42,shadowRadius:8,shadowOffset:{width:0,height:4},elevation:8},launcherIcon:{width:25,height:25},pressed:{opacity:.68,transform:[{translateY:1}]},
  modalRoot:{flex:1,justifyContent:'flex-end',alignItems:'flex-start',paddingHorizontal:10,paddingBottom:Platform.OS==='android'?82:94,backgroundColor:'rgba(0,0,0,.52)'},window:{width:'100%',maxWidth:440,maxHeight:'72%',backgroundColor:equipmentColors.background,borderWidth:1,borderColor:equipmentColors.lineStrong,borderRadius:14,overflow:'hidden'},header:{minHeight:58,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingLeft:14,borderBottomWidth:1,borderBottomColor:equipmentColors.line},eyebrow:{color:equipmentColors.gold,fontSize:9,fontWeight:'900',letterSpacing:1.2},title:{color:C.text,fontSize:20,fontWeight:'900'},close:{width:48,height:48,alignItems:'center',justifyContent:'center'},closeText:{color:C.muted,fontSize:30,lineHeight:32},tabs:{flexDirection:'row',padding:8,gap:8,backgroundColor:'#091522'},tab:{minHeight:44,flex:1,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:7},tabActive:{backgroundColor:equipmentColors.selected,borderColor:equipmentColors.selectedLine},tabDisabled:{opacity:.35},tabText:{color:C.muted,fontSize:12,fontWeight:'900',letterSpacing:.8},tabTextActive:{color:C.text},content:{padding:8},
});
