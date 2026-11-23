import {useSocialText} from '../i18n/social';
import {useChatViewportStyle} from './ChatViewport';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Text,View,StyleSheet} from 'react-native';
import {usePartySocial} from '../online/PartySocialProvider';
import {partyChatMessages,sendPartyChat,partyCommandKey} from '../online/party-social';
import {markSocialChatRead} from '../online/social';
import {useChatFeed} from '../online/useChatFeed';
import {PartyChatGate} from './PartyChatGate';
import {GameButton} from './GameButton';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {ChatPlayerSheet} from './ChatPlayerSheet';
import {useOwnChatSocialName} from '../online/useOwnChatSocialName';
import type {PartyChatMessage} from '../online/party-social';
import {ChatComposer} from './ChatComposer';
import {ChatMessageRow} from './ChatMessageRow';
import {ChatLog} from './ChatLog';
import {ChatMentionSuggestions} from './ChatMentionSuggestions';
import {CHAT_MAX_EMOTES_PER_MESSAGE,chatEmoteCount,chatUnavailableEmoteIds} from '../core/chat-emotes';
export function OnlinePartyChat({unlockedEmoteIds=[],trayIds=[],bodyPresentation='male',onTrayChange,onManageEmotes,firstUnreadMessageId,onRead,reduceMotion=false,active=true,expanded=false}:{unlockedEmoteIds?:readonly string[];trayIds?:readonly string[];bodyPresentation?:'male'|'female';onTrayChange?:(ids:string[])=>void|Promise<void>;onManageEmotes?:()=>void;firstUnreadMessageId?:string;onRead?:()=>void;reduceMotion?:boolean;active?:boolean;expanded?:boolean}={}){
 const st=useSocialText(),viewportStyle=useChatViewportStyle();
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const {party,accountId,refresh}=usePartySocial();const id=party?.id;
 const {value:messages,error:loadError,refresh:load,setValue:setMessages}=useChatFeed<PartyChatMessage[]>({key:`party:${id??'none'}`,read:()=>partyChatMessages(id!),initial:[],active:active&&Boolean(id),channelType:'party',channelId:id});
 const scope=`${accountId}:${id??''}`,activeId=useRef(scope),activeRef=useRef(active),onReadRef=useRef(onRead);activeId.current=scope;activeRef.current=active;onReadRef.current=onRead;
 const [selected,setSelected]=useState<PartyChatMessage|null>(null),[body,setBody]=useState(''),[sendError,setError]=useState(''),[busy,setBusy]=useState(false),error=sendError||loadError;
 const pending=useRef<{body:string;key:string}|null>(null),sending=useRef(false);
 useEffect(()=>{setBody('');setSelected(null);setError('');pending.current=null;},[scope]);
 const send=async()=>{if(!id||sending.current||!body.trim())return;const clean=body.trim();if(chatEmoteCount(clean)>CHAT_MAX_EMOTES_PER_MESSAGE){setError(st("Use at most 2 emotes in one message."));return}const locked=chatUnavailableEmoteIds(clean,unlockedEmoteIds);if(locked.length){setError(st("One or more emotes in this message are still locked."));return}sending.current=true;setBusy(true);setError('');
  if(!pending.current||pending.current.body!==clean)pending.current={body:clean,key:partyCommandKey()};
  const request=pending.current;
  try{await sendPartyChat(id,clean,request.key);if(activeId.current!==scope||pending.current!==request)return;setBody(previous=>previous.trim()===clean?'':previous);pending.current=null;await load();}
  catch(e){if(activeId.current===scope&&pending.current===request){setError(e instanceof Error?e.message:st("Message failed. Try again."));void refresh();}}finally{sending.current=false;setBusy(false);}
 };
 const currentSocialName=useOwnChatSocialName(accountId,active&&Boolean(id));
 const mentionName=currentSocialName??party?.members.find(member=>member.accountId===accountId)?.socialName??party?.members.find(member=>member.accountId===accountId)?.characterName??'';
 const chatNames=new Map(messages.filter(message=>message.account_id&&!message.is_system).map(message=>[message.account_id!,message.sender_name]));
 const mentionNames=party?.members.map(member=>member.accountId===accountId?mentionName:chatNames.get(member.accountId)??member.socialName??member.characterName)??[];
 const caughtUp=async(messageId:string)=>{if(!activeRef.current||activeId.current!==scope||!id)throw new Error('Chat scope changed.');await markSocialChatRead('party',id,messageId);if(activeRef.current&&activeId.current===scope)onReadRef.current?.();};
 return <PartyChatGate party={party} accountId={accountId}><View style={[s.root,expanded&&s.expanded,viewportStyle]}><ChatLog expanded={expanded} active={active} channelKey={scope} items={messages} firstUnreadMessageId={firstUnreadMessageId} emptyText={st("Party Chat is quiet.")} onCaughtUp={caughtUp} renderItem={message=>message.is_system&&message.account_id===null?<View style={s.heraldRow}><Text style={s.heraldText}>✦ {message.body}</Text>{message.created_at?<Text style={s.heraldTime}>{new Date(message.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</Text>:null}</View>:<ChatMessageRow accountId={message.account_id??undefined} name={message.sender_name} body={message.body} createdAt={message.created_at} guildTag={message.guild_tag} tagColorId={message.guild_tag_color_id} nameStyle={message.player_name_style} badges={message.player_badges} mentionName={mentionName} onPress={message.account_id?()=>setSelected(message):undefined} reduceMotion={reduceMotion} compact={expanded} messageId={message.id}/>} />
 {!!error&&<View accessibilityRole="alert" style={s.errorCard}><Text style={s.errorLabel}>{st("CHAT UNAVAILABLE")}</Text><Text style={s.error}>{error}</Text><GameButton compact title={st("Retry")} tone="secondary" onPress={()=>{setError('');return load();}}/></View>}<ChatMentionSuggestions value={body} names={mentionNames} currentName={mentionName} onChange={setBody}/><ChatComposer accessibilityLabel={st("Party message")} value={body} onChangeText={setBody} onSend={()=>send()} placeholder={st("Message your Party")} busy={busy} disabled={!id||!accountId} emotes={{unlockedIds:unlockedEmoteIds,trayIds,bodyPresentation,onTrayChange,onManageEmotes,onPick:token=>setBody(value=>(value+token).slice(0,300))}}/><ChatPlayerSheet reduceMotion={reduceMotion} message={selected?.account_id?{...selected,account_id:selected.account_id,message_id:selected.id}:null} onClose={()=>setSelected(null)} onBlocked={blockedId=>setMessages(current=>current.filter(message=>message.account_id!==blockedId))}/></View></PartyChatGate>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({root:{gap:spacing.sm,flexShrink:1,minHeight:0},expanded:{flex:1,minHeight:0},heraldRow:{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:10,paddingVertical:7,borderRadius:8,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},heraldText:{...typography.caption,color:C.text,flex:1,lineHeight:18},heraldTime:{...typography.caption,color:C.muted,fontSize:10},errorCard:{gap:4,padding:spacing.sm,borderWidth:1,borderColor:C.bad,borderRadius:8,backgroundColor:C.badSurface},errorLabel:{...typography.caption,color:C.bad,fontWeight:'900',letterSpacing:1},error:{color:C.text}});}
