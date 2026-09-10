import {useEffect,useMemo,useState} from 'react';
import {Pressable,SafeAreaView,StyleSheet,Text,View} from 'react-native';
import {ChatController,createDemoTransport,demoMessages,demoProfiles} from '../features/chat-pilot/src/core/chat';
import type {Emote,Profile} from '../features/chat-pilot/src/core/chat';
import emoteData from '../features/chat-pilot/data/emotes.json';
import {ChatScreen} from '../features/chat-pilot/src/native/ChatScreen';
import type {SocialAction} from '../features/chat-pilot/src/native/ChatScreen';
import {asyncStorageSettings} from '../features/chat-pilot/src/native/asyncStorageSettings';
import {PlayerProfileCard} from '../components/PlayerProfileCard';
import {CLASSES} from '../content/classes';
import {GameState} from '../core/types';
import {C} from '../theme/theme';

const catalog=emoteData as Emote[];

export function ChatPilotDevScreen({state,onClose,initialPanel='chat'}:{state:GameState;onClose:()=>void;initialPanel?:'chat'|'emotes'}){
  const character=state.character!;
  const [showHostProfile,setShowHostProfile]=useState(false);
  const viewer=useMemo<Profile>(()=>({
    id:character.id,
    name:character.name,
    className:CLASSES.find(item=>item.id===character.classId)?.name??character.classId,
    level:character.level,
    portrait:character.bodyPresentation==='female'?'portraits/adventurer_female':'portraits/adventurer_male',
    title:character.profileTitle??'New Adventurer',
    online:true,
  }),[character.id,character.name,character.classId,character.level,character.bodyPresentation,character.profileTitle]);
  const session=useMemo(()=>{
    const transport=createDemoTransport(viewer);
    const controller=new ChatController(`local-preview:${character.id}`,viewer,catalog,transport,asyncStorageSettings,demoMessages(catalog),new Set(catalog.map(emote=>emote.id)));
    controller.setPermissions({guildMember:state.account.guildMember});
    return {controller,transport};
  },[character.id,state.account.guildMember,viewer]);
  const profiles=useMemo(()=>[viewer,...demoProfiles.slice(1)],[viewer]);
  useEffect(()=>{void session.controller.loadSettings();},[session]);
  function injectIncoming(){session.controller.receive({id:`host-preview-${Date.now()}`,senderId:'aric',channelId:session.controller.getSnapshot().channelId,segments:[{type:'text',text:'A local preview message for your active character.'}],createdAt:Date.now(),delivery:'sent'});}
  async function handleSocialAction(action:SocialAction,profile:Profile){
    if(action==='view_profile'&&profile.id===viewer.id){
      setShowHostProfile(true);
      return;
    }
    if(action==='view_profile')throw new Error('Demo identities are isolated fixtures and do not have host player profiles.');
    throw new Error(`The ${action.replace('_',' ')} service is not connected. No request was sent.`);
  }
  return <SafeAreaView style={s.safe}>
    <View style={s.header}>
      <View>
        <Text style={s.eyebrow}>DEVELOPMENT PREVIEW</Text>
        <Text style={s.title}>Chat Pilot</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Close Chat Pilot" onPress={onClose} style={s.close}>
        <Text style={s.closeText}>Close</Text>
      </Pressable>
    </View>
    <View style={s.body}>
      <ChatScreen controller={session.controller} profiles={profiles} initialSettingsOpen={initialPanel==='emotes'} demoControls={{failNext:session.transport.failNext,setOffline:session.transport.setOffline,injectIncoming}} onSocialAction={handleSocialAction}/>
    </View>
    <PlayerProfileCard visible={showHostProfile} onClose={()=>setShowHostProfile(false)} state={state} name={character.name} title={character.profileTitle??'New Adventurer'} showModerationActions={false}/>
  </SafeAreaView>;
}

const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:C.bg},
  header:{minHeight:60,paddingHorizontal:16,paddingVertical:8,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderColor:C.line,backgroundColor:'#0d141e'},
  eyebrow:{color:C.accent,fontSize:10,fontWeight:'900',letterSpacing:1},
  title:{color:C.text,fontSize:20,fontWeight:'900'},
  close:{minWidth:64,minHeight:44,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.accent,borderRadius:8,paddingHorizontal:12},
  closeText:{color:C.accent,fontWeight:'900'},
  body:{flex:1},
});
