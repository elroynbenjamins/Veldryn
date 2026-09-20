import {useEffect,useRef,useState} from 'react';
import {Alert,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {GameTextInput as TextInput} from './GameTextInput';
import {GameButton} from './GameButton';
import {ChatEmotePicker} from './ChatEmotePicker';
import {ChatMessageText} from './ChatMessageText';
import {ChatPlayerSheet} from './ChatPlayerSheet';
import {GuildTaggedPlayerName} from './GuildTaggedPlayerName';
import {C,radii,spacing,typography} from '../theme/theme';
import {Language,ot} from '../i18n';
import {onlineConfigured} from '../online/supabase';
import {chatEmoteCount} from '../core/chat-emotes';
import {guildChatCommandKey,guildChatState,markSocialChatRead,sendGuildChat,type GuildChatMessage,type GuildChatState} from '../online/social';

export function GuildChat({language,currentPlayerName,onRead}:{language:Language;currentPlayerName?:string;onRead?:()=>void}){
 const [snapshot,setSnapshot]=useState<GuildChatState|null>(null),[selected,setSelected]=useState<GuildChatMessage|null>(null),[body,setBody]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const pending=useRef<{body:string;key:string}|null>(null);
 const active=useRef(true),notifiedRead=useRef(false);
 const markRead=async()=>{try{await markSocialChatRead('guild');if(active.current&&!notifiedRead.current){notifiedRead.current=true;onRead?.()}}catch{}};
 const load=async()=>{if(!onlineConfigured)return;try{const next=await guildChatState();if(active.current){setSnapshot(next);setError('');if(next.guild)void markRead();}}catch(reason){if(active.current)setError(reason instanceof Error?reason.message:'Guild chat unavailable.')}};
 useEffect(()=>{active.current=true;notifiedRead.current=false;setSnapshot(null);setSelected(null);setBody('');pending.current=null;if(!onlineConfigured)return()=>{active.current=false};void load();const timer=setInterval(()=>void load(),5000);return()=>{active.current=false;clearInterval(timer)};},[onRead]);

 if(!onlineConfigured)return <View style={s.unavailable}><Text style={s.title}>{ot(language,'chat.guild')}</Text><Text style={s.note}>Guild Chat requires online services. No simulated chat is shown.</Text></View>;
 const guild=snapshot?.guild??null,messages=snapshot?.messages??[];
 const send=async()=>{
  const clean=body.trim();if(!clean||busy||!guild)return;
  if(chatEmoteCount(clean)>8){Alert.alert('Guild chat','Use at most 8 emotes in one message.');return}
  if(pending.current?.body!==clean)pending.current={body:clean,key:guildChatCommandKey()};
  setBusy(true);setError('');
  try{await sendGuildChat(clean,pending.current.key);const next=await guildChatState();if(active.current){setSnapshot(next);setBody('');pending.current=null;}}
  catch(reason){setError(reason instanceof Error?reason.message:'Message failed. Try again.')}
  finally{if(active.current)setBusy(false)}
 };

 if(snapshot&&!guild)return <View style={s.unavailable}><Text style={s.title}>{ot(language,'chat.guild')}</Text><Text style={s.note}>Join an online Guild to use Guild Chat.</Text></View>;

 return <View style={s.root}>
  <View style={s.header}><View style={s.grow}><Text style={s.eyebrow}>GUILD CHANNEL</Text><Text numberOfLines={1} style={s.title}>{guild?((guild.tag?'['+guild.tag+'] ':'')+guild.name):ot(language,'chat.guild')}</Text></View><Text style={s.secure}>MEMBERS ONLY</Text></View>
  <ScrollView style={s.log} contentContainerStyle={s.logInner} keyboardShouldPersistTaps="handled">
   {messages.length?messages.map(message=><View key={message.id} style={s.message}>
    <View style={s.messageHead}><Pressable accessibilityRole="button" accessibilityLabel={'Open '+message.sender_name+"'s player profile"} onPress={()=>setSelected(message)} style={s.nameButton}><GuildTaggedPlayerName style={s.name} name={message.sender_name} guildTag={message.guild_tag} tagColorId={message.guild_tag_color_id}/><Text style={s.profileMark}>›</Text></Pressable>{message.guild_role?<Text style={[s.role,message.guild_role==='leader'&&s.roleLeader,message.guild_role==='officer'&&s.roleOfficer]}>{message.guild_role.toUpperCase()}</Text>:null}<Text style={s.time}>{new Date(message.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</Text></View>
    <ChatMessageText body={message.body} mentionName={currentPlayerName}/>
   </View>):<Text style={s.empty}>No Guild messages yet. Start the conversation.</Text>}
  </ScrollView>
  {!!error&&<View accessibilityRole="alert" style={s.errorCard}><Text style={s.errorLabel}>GUILD CHAT UNAVAILABLE</Text><Text style={s.error}>{error}</Text><GameButton compact title="Retry" tone="secondary" disabled={busy} onPress={()=>void load()}/></View>}
  <View style={s.compose}><TextInput accessibilityLabel="Guild message" value={body} onChangeText={setBody} onSubmitEditing={()=>void send()} maxLength={300} placeholder={ot(language,'chat.placeholder')} style={s.input}/><ChatEmotePicker onPick={token=>setBody(value=>(value+token).slice(0,300))}/><View style={s.send}><GameButton title={busy?'…':ot(language,'chat.send')} disabled={busy||!body.trim()||!guild} onPress={()=>void send()}/></View></View>
  <ChatPlayerSheet message={selected} onClose={()=>setSelected(null)} onBlocked={blockedId=>setSnapshot(current=>current?{...current,messages:current.messages.filter(message=>message.account_id!==blockedId)}:current)}/>
 </View>;
}

const s=StyleSheet.create({
 root:{gap:spacing.sm},unavailable:{gap:4,padding:spacing.md,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},
 header:{minHeight:42,flexDirection:'row',alignItems:'center',gap:8},grow:{flex:1,minWidth:0},eyebrow:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.8},title:{...typography.title,color:C.text},secure:{fontSize:8,color:C.good,fontWeight:'900',letterSpacing:.7},
 note:{...typography.body,color:C.muted,lineHeight:18},log:{minHeight:130,maxHeight:260},logInner:{paddingVertical:2},message:{paddingVertical:8,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.line},messageHead:{minHeight:24,flexDirection:'row',alignItems:'center',gap:6},nameButton:{flex:1,minWidth:0,alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:4},name:{color:'#8dcdf0',fontWeight:'800'},profileMark:{fontSize:16,lineHeight:18,color:C.info,fontWeight:'900'},role:{fontSize:7,color:C.muted,fontWeight:'900',letterSpacing:.5},roleLeader:{color:'#e7c66d'},roleOfficer:{color:C.info},time:{fontSize:9,color:C.muted},
 empty:{...typography.body,color:C.muted,textAlign:'center',paddingVertical:28},errorCard:{gap:5,padding:spacing.sm,borderWidth:1,borderColor:C.bad,borderRadius:radii.md,backgroundColor:'#2a1b20'},errorLabel:{...typography.caption,color:C.bad,fontWeight:'900',letterSpacing:1},error:{...typography.caption,color:C.text},
 compose:{flexDirection:'row',alignItems:'center',gap:spacing.sm},input:{flex:1},send:{minWidth:72}
});
