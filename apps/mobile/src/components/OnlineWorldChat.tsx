import React,{useEffect,useState} from 'react';
import {Alert,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {C} from '../theme/theme';
import {onlineConfigured} from '../online/supabase';
import {postWorldMessage,sendFriendRequest,setPlayerBlocked,WORLD_CHANNELS,worldMessages,type WorldMessage} from '../online/social';
import {Language,ot} from '../i18n';

export function OnlineWorldChat({playerName,language}:{playerName:string;language:Language}){
  const [open,setOpen]=useState(false),[channel,setChannel]=useState(0),[text,setText]=useState(''),[rows,setRows]=useState<WorldMessage[]>([]),[busy,setBusy]=useState(false);
  const load=async()=>{try{setRows(await worldMessages(WORLD_CHANNELS[channel].id))}catch(error){Alert.alert('World chat',error instanceof Error?error.message:'Unable to load chat.')}};
  useEffect(()=>{if(open&&onlineConfigured)load()},[open,channel]);
  if(!onlineConfigured)return null;
  if(!open)return <Panel><Text style={s.title}>{ot(language,'chat.world')}</Text><Text style={s.note}>{ot(language,'chat.closed')}</Text><GameButton title={ot(language,'chat.open')} onPress={()=>setOpen(true)}/></Panel>;
  const send=async()=>{setBusy(true);try{await postWorldMessage(WORLD_CHANNELS[channel].id,text,playerName);setText('');await load()}catch(error){Alert.alert('World chat',error instanceof Error?error.message:'Unable to send message.')}finally{setBusy(false)}};
  const playerActions=(row:WorldMessage)=>Alert.alert(row.sender_name,'Choose a social action.',[
    {text:'Cancel'},
    {text:'Add friend',onPress:()=>{setBusy(true);sendFriendRequest(row.account_id).then(result=>Alert.alert('Friend request',result==='sent'?`Request sent to ${row.sender_name}.`:result==='already_friends'?'You are already friends.':result==='already_pending'?'Your request is already pending.':'This player has already sent you a request. Open Friends to respond.')).catch(error=>Alert.alert('Friend request',error instanceof Error?error.message:'Unable to send request.')).finally(()=>setBusy(false))}},
    {text:'Block',style:'destructive',onPress:()=>{setBusy(true);setPlayerBlocked(row.account_id,true).then(()=>{setRows(current=>current.filter(message=>message.account_id!==row.account_id));Alert.alert('Player blocked',`${row.sender_name} was removed from your social lists.`)}).catch(error=>Alert.alert('Block player',error instanceof Error?error.message:'Unable to block player.')).finally(()=>setBusy(false))}},
  ]);
  return <Panel><Text style={s.title}>{ot(language,'chat.world')} · online</Text><Text style={s.note}>{ot(language,'chat.tap')}</Text><ScrollView horizontal style={s.channels}>{WORLD_CHANNELS.map((item,i)=><View key={item.id} style={s.channel}><GameButton title={`${item.name} · ${item.language}`} tone={channel===i?'primary':'secondary'} onPress={()=>setChannel(i)}/></View>)}</ScrollView><ScrollView style={s.log}>{rows.length?rows.map(row=><View key={row.id} style={s.messageRow}><Pressable accessibilityRole="button" accessibilityLabel={`Actions for ${row.sender_name}`} onPress={()=>playerActions(row)}><Text style={s.name}>{row.sender_name}</Text></Pressable><Text style={s.msg}>: {row.body}</Text></View>):<Text style={s.note}>{ot(language,'chat.none')}</Text>}</ScrollView><View style={s.compose}><TextInput value={text} onChangeText={setText} onSubmitEditing={send} placeholder={ot(language,'chat.placeholder')} placeholderTextColor={C.muted} style={s.input} maxLength={300}/><GameButton title={busy?'…':ot(language,'chat.send')} disabled={busy} onPress={send}/></View><View style={s.actions}><View style={s.flex}><GameButton title={ot(language,'chat.refresh')} tone="secondary" onPress={load}/></View><View style={s.flex}><GameButton title={ot(language,'chat.close')} tone="secondary" onPress={()=>setOpen(false)}/></View></View></Panel>;
}
const s=StyleSheet.create({title:{color:C.text,fontSize:18,fontWeight:'900'},note:{color:C.muted,fontSize:12,marginTop:3},channels:{marginTop:8},channel:{marginRight:6},log:{maxHeight:120,marginTop:7},messageRow:{flexDirection:'row',alignItems:'baseline',paddingVertical:4},msg:{color:C.text,flexShrink:1},name:{color:C.accent,fontWeight:'900',textDecorationLine:'underline'},compose:{flexDirection:'row',gap:8,alignItems:'center',marginTop:8},input:{flex:1,minHeight:44,borderWidth:1,borderColor:C.line,borderRadius:6,color:C.text,paddingHorizontal:10},actions:{flexDirection:'row',gap:8,marginTop:8},flex:{flex:1}});
