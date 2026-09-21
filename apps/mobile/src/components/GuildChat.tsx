import {useEffect,useMemo,useRef,useState} from 'react';
import {Alert,Pressable,StyleSheet,Text,View} from 'react-native';
import {GameTextInput as TextInput} from './GameTextInput';
import {GameButton} from './GameButton';
import {ChatEmotePicker} from './ChatEmotePicker';
import {ChatMessageText} from './ChatMessageText';
import {ChatPlayerSheet} from './ChatPlayerSheet';
import {GuildTaggedPlayerName} from './GuildTaggedPlayerName';
import {ChatLog} from './ChatLog';
import {ChatMentionSuggestions} from './ChatMentionSuggestions';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {Language,ot} from '../i18n';
import {onlineConfigured} from '../online/supabase';
import {chatEmoteCount,chatUnavailableEmoteIds} from '../core/chat-emotes';
import {guildChatCommandKey,guildChatState,guildRoster,markSocialChatRead,sendGuildChat,type GuildChatMessage,type GuildChatState} from '../online/social';

export function GuildChat({language,currentPlayerName,unlockedEmoteIds=[],firstUnreadMessageId,onRead}:{language:Language;currentPlayerName?:string;unlockedEmoteIds?:readonly string[];firstUnreadMessageId?:string;onRead?:()=>void}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const [snapshot,setSnapshot]=useState<GuildChatState|null>(null),[selected,setSelected]=useState<GuildChatMessage|null>(null),[body,setBody]=useState(''),[mentionNames,setMentionNames]=useState<string[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const pending=useRef<{body:string;key:string}|null>(null);
 const active=useRef(true),onReadRef=useRef(onRead);onReadRef.current=onRead;
 const load=async()=>{if(!onlineConfigured)return;try{const next=await guildChatState();if(active.current){setSnapshot(next);setError('')}}catch(reason){if(active.current)setError(reason instanceof Error?reason.message:'Guild chat unavailable.')}};
 useEffect(()=>{active.current=true;setSnapshot(null);setSelected(null);setBody('');pending.current=null;if(!onlineConfigured)return()=>{active.current=false};void load();const timer=setInterval(()=>void load(),5000);return()=>{active.current=false;clearInterval(timer)};},[]);
 useEffect(()=>{const guildId=snapshot?.guild?.id;if(!guildId){setMentionNames([]);return;}let alive=true;const loadRoster=()=>void guildRoster(guildId).then(rows=>{if(alive)setMentionNames(rows.map(row=>row.display_name))}).catch(()=>{});loadRoster();const timer=setInterval(loadRoster,30000);return()=>{alive=false;clearInterval(timer)};},[snapshot?.guild?.id]);

 if(!onlineConfigured)return <View style={s.unavailable}><Text style={s.title}>{ot(language,'chat.guild')}</Text><Text style={s.note}>Guild Chat requires online services. No simulated chat is shown.</Text></View>;
 const guild=snapshot?.guild??null,messages=snapshot?.messages??[];
 const send=async()=>{
  const clean=body.trim();if(!clean||busy||!guild)return;
  if(chatEmoteCount(clean)>8){Alert.alert('Guild chat','Use at most 8 emotes in one message.');return}const locked=chatUnavailableEmoteIds(clean,unlockedEmoteIds);if(locked.length){Alert.alert('Guild chat','One or more emotes in this message are still locked.');return}
  if(pending.current?.body!==clean)pending.current={body:clean,key:guildChatCommandKey()};
  setBusy(true);setError('');
  try{await sendGuildChat(clean,pending.current.key);const next=await guildChatState();if(active.current){setSnapshot(next);setBody('');pending.current=null;}}
  catch(reason){setError(reason instanceof Error?reason.message:'Message failed. Try again.')}
  finally{if(active.current)setBusy(false)}
 };

 if(snapshot&&!guild)return <View style={s.unavailable}><Text style={s.title}>{ot(language,'chat.guild')}</Text><Text style={s.note}>Join an online Guild to use Guild Chat.</Text></View>;

 return <View style={s.root}>
  <View style={s.header}><View style={s.grow}><Text style={s.eyebrow}>GUILD CHANNEL</Text>{guild?<GuildTaggedPlayerName name={guild.name} guildTag={guild.tag} tagColorId={guild.tagColorId} style={s.title}/>:<Text numberOfLines={1} style={s.title}>{ot(language,'chat.guild')}</Text>}</View><View style={s.securePill}><Text style={s.secure}>MEMBERS ONLY</Text></View></View>
  <ChatLog channelKey={guild?.id??'guild:none'} items={messages} firstUnreadMessageId={firstUnreadMessageId} emptyText="No Guild messages yet. Start the conversation." onCaughtUp={()=>void markSocialChatRead('guild').then(()=>onReadRef.current?.()).catch(()=>{})} renderItem={message=><View style={s.message}>
    <View style={s.messageHead}><Pressable accessibilityRole="button" accessibilityLabel={'Open '+message.sender_name+"'s player profile"} onPress={()=>setSelected(message)} style={s.nameButton}><GuildTaggedPlayerName style={s.name} name={message.sender_name} guildTag={message.guild_tag} tagColorId={message.guild_tag_color_id}/><Text style={s.profileMark}>›</Text></Pressable>{message.guild_role?<View style={[s.rolePill,message.guild_role==='leader'?s.roleLeader:message.guild_role==='officer'?s.roleOfficer:s.roleMember]}><Text style={[s.role,message.guild_role==='leader'?s.roleTextLeader:message.guild_role==='officer'?s.roleTextOfficer:s.roleTextMember]}>{message.guild_role.toUpperCase()}</Text></View>:null}<Text style={s.time}>{new Date(message.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</Text></View>
    <ChatMessageText body={message.body} mentionName={currentPlayerName}/>
   </View>}/>
  {!!error&&<View accessibilityRole="alert" style={s.errorCard}><Text style={s.errorLabel}>GUILD CHAT UNAVAILABLE</Text><Text style={s.error}>{error}</Text><GameButton compact title="Retry" tone="secondary" disabled={busy} onPress={()=>void load()}/></View>}
  <ChatMentionSuggestions value={body} names={mentionNames} currentName={currentPlayerName} onChange={setBody}/>
  <View style={s.compose}><TextInput accessibilityLabel="Guild message" value={body} onChangeText={setBody} onSubmitEditing={()=>void send()} maxLength={300} placeholder={ot(language,'chat.placeholder')} style={s.input}/><ChatEmotePicker unlockedIds={unlockedEmoteIds} onPick={token=>setBody(value=>(value+token).slice(0,300))}/><View style={s.send}><GameButton compact title={busy?'…':ot(language,'chat.send')} disabled={busy||!body.trim()||!guild} onPress={()=>void send()}/></View></View>
  <ChatPlayerSheet message={selected?{...selected,message_id:selected.id}:null} onClose={()=>setSelected(null)} onBlocked={blockedId=>setSnapshot(current=>current?{...current,messages:current.messages.filter(message=>message.account_id!==blockedId)}:current)}/>
 </View>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{gap:spacing.sm},unavailable:{gap:4,padding:spacing.md,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},
 header:{minHeight:40,flexDirection:'row',alignItems:'center',gap:8},grow:{flex:1,minWidth:0},eyebrow:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.8},title:{...typography.title,color:C.text},securePill:{paddingHorizontal:6,paddingVertical:3,borderWidth:1,borderColor:C.good,borderRadius:99,backgroundColor:C.goodSurface},secure:{fontSize:7,color:C.good,fontWeight:'900',letterSpacing:.6},
 note:{...typography.body,color:C.muted,lineHeight:18},message:{paddingVertical:7,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.line},messageHead:{minHeight:24,flexDirection:'row',alignItems:'center',gap:6},nameButton:{flex:1,minWidth:0,alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:4},name:{color:C.info,fontWeight:'800'},profileMark:{fontSize:16,lineHeight:18,color:C.info,fontWeight:'900'},rolePill:{paddingHorizontal:5,paddingVertical:2,borderWidth:1,borderRadius:99},roleLeader:{borderColor:C.lineStrong,backgroundColor:C.warningSurface},roleOfficer:{borderColor:C.info,backgroundColor:C.infoSurface},roleMember:{borderColor:C.line,backgroundColor:C.panel2},role:{fontSize:6.5,fontWeight:'900',letterSpacing:.45},roleTextLeader:{color:C.accent},roleTextOfficer:{color:C.info},roleTextMember:{color:C.muted},time:{fontSize:8.5,color:C.muted},
errorCard:{gap:5,padding:spacing.sm,borderWidth:1,borderColor:C.bad,borderRadius:radii.md,backgroundColor:C.badSurface},errorLabel:{...typography.caption,color:C.bad,fontWeight:'900',letterSpacing:1},error:{...typography.caption,color:C.text},
 compose:{flexDirection:'row',alignItems:'center',gap:spacing.sm},input:{flex:1},send:{minWidth:72}
});}
