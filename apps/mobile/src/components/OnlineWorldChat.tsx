import React,{useEffect,useState} from 'react';
import {Alert,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {C} from '../theme/theme';
import {onlineConfigured} from '../online/supabase';
import {postWorldMessage,WORLD_CHANNELS,worldMessages,type WorldMessage} from '../online/social';

export function OnlineWorldChat({playerName}:{playerName:string}){
  const [open,setOpen]=useState(false),[channel,setChannel]=useState(0),[text,setText]=useState(''),[rows,setRows]=useState<WorldMessage[]>([]),[busy,setBusy]=useState(false);
  const load=async()=>{try{setRows(await worldMessages(WORLD_CHANNELS[channel].id))}catch(error){Alert.alert('World chat',error instanceof Error?error.message:'Unable to load chat.')}};
  useEffect(()=>{if(open&&onlineConfigured)load()},[open,channel]);
  if(!onlineConfigured)return null;
  if(!open)return <Panel><Text style={s.title}>World chat</Text><Text style={s.note}>Open chat to connect. No message service is contacted until you do.</Text><GameButton title="Open World chat" onPress={()=>setOpen(true)}/></Panel>;
  const send=async()=>{setBusy(true);try{await postWorldMessage(WORLD_CHANNELS[channel].id,text,playerName);setText('');await load()}catch(error){Alert.alert('World chat',error instanceof Error?error.message:'Unable to send message.')}finally{setBusy(false)}};
  return <Panel><Text style={s.title}>World chat · online</Text><Text style={s.note}>Open only when you choose to join a world channel.</Text><ScrollView horizontal style={s.channels}>{WORLD_CHANNELS.map((item,i)=><View key={item.id} style={s.channel}><GameButton title={`${item.name} · ${item.language}`} tone={channel===i?'primary':'secondary'} onPress={()=>setChannel(i)}/></View>)}</ScrollView><ScrollView style={s.log}>{rows.length?rows.map(row=><Text key={row.id} style={s.msg}><Text style={s.name}>{row.sender_name}</Text>: {row.body}</Text>):<Text style={s.note}>No messages yet.</Text>}</ScrollView><View style={s.compose}><TextInput value={text} onChangeText={setText} onSubmitEditing={send} placeholder="Message this world…" placeholderTextColor={C.muted} style={s.input} maxLength={300}/><GameButton title={busy?'…':'Send'} disabled={busy} onPress={send}/></View><View style={s.actions}><View style={s.flex}><GameButton title="Refresh" tone="secondary" onPress={load}/></View><View style={s.flex}><GameButton title="Close chat" tone="secondary" onPress={()=>setOpen(false)}/></View></View></Panel>;
}
const s=StyleSheet.create({title:{color:C.text,fontSize:18,fontWeight:'900'},note:{color:C.muted,fontSize:12,marginTop:3},channels:{marginTop:8},channel:{marginRight:6},log:{maxHeight:120,marginTop:7},msg:{color:C.text,paddingVertical:4},name:{color:C.accent,fontWeight:'900'},compose:{flexDirection:'row',gap:8,alignItems:'center',marginTop:8},input:{flex:1,minHeight:44,borderWidth:1,borderColor:C.line,borderRadius:6,color:C.text,paddingHorizontal:10},actions:{flexDirection:'row',gap:8,marginTop:8},flex:{flex:1}});
