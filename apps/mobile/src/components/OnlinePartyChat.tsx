import {GameTextInput as TextInput} from './GameTextInput';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Text,View,StyleSheet,Pressable} from 'react-native';
import {usePartySocial} from '../online/PartySocialProvider';
import {partyChatMessages,sendPartyChat,partyCommandKey} from '../online/party-social';
import {markSocialChatRead} from '../online/social';
import {PartyChatGate} from './PartyChatGate';
import {GameButton} from './GameButton';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {ChatPlayerSheet} from './ChatPlayerSheet';
import type {PartyChatMessage} from '../online/party-social';
import {ChatEmotePicker} from './ChatEmotePicker';
import {ChatMessageText} from './ChatMessageText';
import {GuildTaggedPlayerName} from './GuildTaggedPlayerName';
import {ChatLog} from './ChatLog';
import {ChatMentionSuggestions} from './ChatMentionSuggestions';
import {CHAT_MAX_EMOTES_PER_MESSAGE,chatEmoteCount,chatUnavailableEmoteIds} from '../core/chat-emotes';
export function OnlinePartyChat({unlockedEmoteIds=[],trayIds=[],bodyPresentation='male',onTrayChange,firstUnreadMessageId,onRead}:{unlockedEmoteIds?:readonly string[];trayIds?:readonly string[];bodyPresentation?:'male'|'female';onTrayChange?:(ids:string[])=>void|Promise<void>;firstUnreadMessageId?:string;onRead?:()=>void}={}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const {party,accountId,refresh}=usePartySocial();const id=party?.id;
 const activeId=useRef(id),onReadRef=useRef(onRead);activeId.current=id;onReadRef.current=onRead;
 const [messages,setMessages]=useState<Awaited<ReturnType<typeof partyChatMessages>>>([]),[selected,setSelected]=useState<PartyChatMessage|null>(null),[body,setBody]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const pending=useRef<{body:string;key:string}|null>(null);
 useEffect(()=>{let active=true;setMessages([]);setBody('');pending.current=null;
  const load=async()=>{if(!id)return;try{const next=await partyChatMessages(id);if(active)setMessages(next);}catch(e){if(active){setMessages([]);setError(e instanceof Error?e.message:'Chat unavailable.');void refresh();}}};
  void load();const timer=setInterval(()=>void load(),5000);return()=>{active=false;clearInterval(timer);};
 },[id,accountId,refresh]);
 const send=async()=>{if(!id||busy||!body.trim())return;const clean=body.trim();if(chatEmoteCount(clean)>CHAT_MAX_EMOTES_PER_MESSAGE){setError('Use at most 2 emotes in one message.');return}const locked=chatUnavailableEmoteIds(clean,unlockedEmoteIds);if(locked.length){setError('One or more emotes in this message are still locked.');return}setBusy(true);setError('');
  if(pending.current?.body!==clean)pending.current={body:clean,key:partyCommandKey()};
  try{await sendPartyChat(id,clean,pending.current.key);const next=await partyChatMessages(id);if(activeId.current===id){setBody('');pending.current=null;setMessages(next);}}
  catch(e){setError(e instanceof Error?e.message:'Message failed. Try again.');await refresh();}finally{setBusy(false);}
 };
 const mentionName=party?.members.find(member=>member.accountId===accountId)?.characterName??'',mentionNames=party?.members.map(member=>member.characterName)??[];
 const caughtUp=async()=>{try{await markSocialChatRead('party');onReadRef.current?.()}catch{}};
 return <PartyChatGate party={party} accountId={accountId}><View style={s.root}><ChatLog channelKey={id??'party:none'} items={messages} firstUnreadMessageId={firstUnreadMessageId} emptyText="Party Chat is quiet." onCaughtUp={()=>void caughtUp()} renderItem={message=><View style={s.message}><Pressable accessibilityRole="button" accessibilityLabel={`Open ${message.sender_name}'s player profile`} onPress={()=>setSelected(message)} style={s.nameButton}><GuildTaggedPlayerName style={s.name} name={message.sender_name} guildTag={message.guild_tag} tagColorId={message.guild_tag_color_id}/><Text style={s.profileMark}>›</Text></Pressable><ChatMessageText body={message.body} mentionName={mentionName}/></View>}/>
 {!!error&&<View accessibilityRole="alert" style={s.errorCard}><Text style={s.errorLabel}>CHAT UNAVAILABLE</Text><Text style={s.error}>{error}</Text></View>}<ChatMentionSuggestions value={body} names={mentionNames} currentName={mentionName} onChange={setBody}/><View style={s.compose}><TextInput accessibilityLabel="Party message" value={body} onChangeText={setBody} maxLength={300} placeholder="Message your Party" placeholderTextColor={C.muted} style={s.input}/><ChatEmotePicker unlockedIds={unlockedEmoteIds} trayIds={trayIds} bodyPresentation={bodyPresentation} usedCount={chatEmoteCount(body)} onTrayChange={onTrayChange} onPick={token=>setBody(value=>(value+token).slice(0,300))}/><View style={s.send}><GameButton title={busy?'…':'Send'} disabled={busy||!body.trim()} onPress={()=>void send()}/></View></View><ChatPlayerSheet message={selected?{...selected,message_id:selected.id}:null} onClose={()=>setSelected(null)} onBlocked={blockedId=>setMessages(current=>current.filter(message=>message.account_id!==blockedId))}/></View></PartyChatGate>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({root:{gap:spacing.sm},message:{paddingVertical:7,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.line},text:{color:C.text,marginTop:2},nameButton:{alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:4,minHeight:24},name:{color:C.info,fontWeight:'800'},profileMark:{fontSize:16,lineHeight:18,color:C.info,fontWeight:'900'},errorCard:{gap:4,padding:spacing.sm,borderWidth:1,borderColor:C.bad,borderRadius:8,backgroundColor:C.badSurface},errorLabel:{...typography.caption,color:C.bad,fontWeight:'900',letterSpacing:1},error:{color:C.text},compose:{flexDirection:'row',alignItems:'center',gap:spacing.sm},input:{flex:1},send:{minWidth:72}});}
