import {useEffect,useMemo} from 'react';
import {Alert, SafeAreaView, StyleSheet} from 'react-native';
import {ChatController,createDemoTransport,createMemorySettingsStore,demoMessages,demoProfiles} from '../core/chat';
import type {Emote,SettingsStore} from '../core/chat';
import emoteData from '../../data/emotes.json';
import {ChatScreen} from './ChatScreen';
const catalog=emoteData as Emote[];
/** Isolated offline preview. Integrate ChatScreen with the host app's controller/services separately. */
export default function DemoApp({accountId='demo-account',settingsStore}:{accountId?:string;settingsStore?:SettingsStore}){
 const viewer=demoProfiles[0];
 const session=useMemo(()=>{
  const transport=createDemoTransport(viewer);
  // All art is selectable ONLY in this preview. A real account uses authoritative unlocked IDs.
  const controller=new ChatController(accountId,viewer,catalog,transport,settingsStore??createMemorySettingsStore(),demoMessages(catalog),new Set(catalog.map(e=>e.id)));
  return {transport,controller};
 },[accountId,settingsStore]);
 useEffect(()=>{void session.controller.loadSettings();},[session]);
 function inject(){session.controller.receive({id:`demo-incoming-${Date.now()}`,senderId:'aric',channelId:session.controller.getSnapshot().channelId,segments:[{type:'text',text:'A new local preview message. :male_01:'}],createdAt:Date.now(),delivery:'sent'});}
 return <SafeAreaView style={s.safe}><ChatScreen controller={session.controller} profiles={demoProfiles} showDemoNavigation demoControls={{failNext:session.transport.failNext,setOffline:session.transport.setOffline,injectIncoming:inject}} onNavigate={destination=>Alert.alert('Preview navigation',`Bind ${destination} to the existing app navigator.`)}/></SafeAreaView>;
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:'#06131f'}});
