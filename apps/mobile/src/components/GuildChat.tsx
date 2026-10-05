import {useSocialText} from '../i18n/social';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Alert,AppState,StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {ChatComposer} from './ChatComposer';
import {ChatMessageRow} from './ChatMessageRow';
import {ChatPlayerSheet} from './ChatPlayerSheet';
import {GuildTaggedPlayerName} from './GuildTaggedPlayerName';
import {ChatLog} from './ChatLog';
import {ChatMentionSuggestions} from './ChatMentionSuggestions';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {Language,ot} from '../i18n';
import {onlineConfigured} from '../online/supabase';
import {useChatFeed} from '../online/useChatFeed';
import {CHAT_MAX_EMOTES_PER_MESSAGE,chatEmoteCount,chatUnavailableEmoteIds} from '../core/chat-emotes';
import {guildChatCommandKey,guildChatState,guildRoster,markSocialChatRead,sendGuildChat,type GuildChatMessage,type GuildChatState} from '../online/social';

export function GuildChat({language,currentPlayerName,unlockedEmoteIds=[],trayIds=[],bodyPresentation='male',onTrayChange,firstUnreadMessageId,onRead,reduceMotion=false,active=true}:{language:Language;currentPlayerName?:string;unlockedEmoteIds?:readonly string[];trayIds?:readonly string[];bodyPresentation?:'male'|'female';onTrayChange?:(ids:string[])=>void|Promise<void>;firstUnreadMessageId?:string;onRead?:()=>void;reduceMotion?:boolean;active?:boolean}){
 const st=useSocialText();
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const {value:snapshot,error:loadError,accountId,refresh:load,setValue:setSnapshot}=useChatFeed<GuildChatState|null>({key:'guild:current',read:()=>guildChatState(),initial:null,active});
 const [selected,setSelected]=useState<GuildChatMessage|null>(null),[body,setBody]=useState(''),[mentionNames,setMentionNames]=useState<string[]>([]),[busy,setBusy]=useState(false),[sendError,setError]=useState('');
 const pending=useRef<{body:string;key:string}|null>(null),sending=useRef(false),activeRef=useRef(active),onReadRef=useRef(onRead);activeRef.current=active;onReadRef.current=onRead;
 const guild=snapshot?.guild??null,messages=snapshot?.messages??[],error=sendError||loadError,scope=`${accountId}:${guild?.id??''}`,currentScope=useRef(scope);currentScope.current=scope;
 useEffect(()=>{setSelected(null);setBody('');setError('');pending.current=null;},[scope]);
 useEffect(()=>{const guildId=guild?.id;if(!guildId){setMentionNames([]);return;}if(!active)return;let alive=true;const loadRoster=()=>{if(AppState.currentState==='active'||AppState.currentState===null)void guildRoster(guildId).then(rows=>{if(alive)setMentionNames(rows.map(row=>row.display_name))}).catch(()=>{});};loadRoster();const timer=setInterval(loadRoster,60000);return()=>{alive=false;clearInterval(timer)};},[guild?.id,accountId,active]);

 if(!onlineConfigured)return <View style={s.unavailable}><Text style={s.title}>{ot(language,'chat.guild')}</Text><Text style={s.note}>{st("Guild Chat requires online services. No simulated chat is shown.")}</Text></View>;
 const send=async()=>{
  const clean=body.trim();if(!clean||sending.current||!guild)return;
  if(chatEmoteCount(clean)>CHAT_MAX_EMOTES_PER_MESSAGE){Alert.alert(st("Guild chat"),st("Use at most 2 emotes in one message."));return}const locked=chatUnavailableEmoteIds(clean,unlockedEmoteIds);if(locked.length){Alert.alert(st("Guild chat"),st("One or more emotes in this message are still locked."));return}
  if(pending.current?.body!==clean)pending.current={body:clean,key:guildChatCommandKey()};
  sending.current=true;setBusy(true);setError('');
  try{await sendGuildChat(clean,pending.current.key);if(currentScope.current!==scope)return;setBody(previous=>previous.trim()===clean?'':previous);pending.current=null;await load();}
  catch(reason){if(currentScope.current===scope)setError(reason instanceof Error?reason.message:st("Message failed. Try again."))}
  finally{sending.current=false;setBusy(false)}
 };

 if(snapshot&&!guild)return <View style={s.unavailable}><Text style={s.title}>{ot(language,'chat.guild')}</Text><Text style={s.note}>{st("Join an online Guild to use Guild Chat.")}</Text></View>;

 return <><GuildChatView active={active} language={language} currentPlayerName={currentPlayerName} unlockedEmoteIds={unlockedEmoteIds} trayIds={trayIds} bodyPresentation={bodyPresentation} onTrayChange={onTrayChange} firstUnreadMessageId={firstUnreadMessageId} reduceMotion={reduceMotion} guild={guild} messages={messages} body={body} onBodyChange={setBody} mentionNames={mentionNames} busy={busy} error={error} onSend={()=>void send()} onRetry={()=>{setError('');void load();}} onSelectMessage={setSelected} onCaughtUp={()=>{if(activeRef.current)void markSocialChatRead('guild').then(()=>onReadRef.current?.()).catch(()=>{});}}/>
  <ChatPlayerSheet reduceMotion={reduceMotion} message={selected?{...selected,message_id:selected.id}:null} onClose={()=>setSelected(null)} onBlocked={blockedId=>setSnapshot(current=>current?{...current,messages:current.messages.filter(message=>message.account_id!==blockedId)}:current)}/>
 </>;
}

/** Shared presentation only: the live wrapper above owns network and account actions. */
export function GuildChatView({active=true,language,currentPlayerName,unlockedEmoteIds=[],trayIds=[],bodyPresentation='male',onTrayChange,firstUnreadMessageId,reduceMotion=false,guild,messages,body,onBodyChange,mentionNames=[],busy=false,error='',onSend,onRetry=()=>{},onSelectMessage,onCaughtUp}:{
 active?:boolean;language:Language;currentPlayerName?:string;unlockedEmoteIds?:readonly string[];trayIds?:readonly string[];bodyPresentation?:'male'|'female';onTrayChange?:(ids:string[])=>void|Promise<void>;firstUnreadMessageId?:string;reduceMotion?:boolean;
 guild:GuildChatState['guild'];messages:readonly GuildChatMessage[];body:string;onBodyChange:(value:string)=>void;mentionNames?:string[];busy?:boolean;error?:string;onSend:()=>void;onRetry?:()=>void;onSelectMessage?:(message:GuildChatMessage)=>void;onCaughtUp?:()=>void;
}){
 const st=useSocialText();
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 return <View style={s.root}>
  <View style={s.header}><View style={s.grow}><Text style={s.eyebrow}>{st("GUILD CHANNEL")}</Text>{guild?<GuildTaggedPlayerName name={guild.name} guildTag={guild.tag} tagColorId={guild.tagColorId} style={s.title}/>:<Text numberOfLines={1} style={s.title}>{ot(language,'chat.guild')}</Text>}</View><View style={s.securePill}><Text style={s.secure}>{st("MEMBERS ONLY")}</Text></View></View>
  <ChatLog active={active} channelKey={guild?.id??'guild:none'} items={messages} firstUnreadMessageId={firstUnreadMessageId} emptyText={st("No Guild messages yet. Start the conversation.")} onCaughtUp={onCaughtUp} renderItem={message=><ChatMessageRow accountId={message.account_id} name={message.sender_name} body={message.body} createdAt={message.created_at} guildTag={message.guild_tag} tagColorId={message.guild_tag_color_id} nameStyle={message.player_name_style} badges={message.player_badges} role={message.guild_role} mentionName={currentPlayerName} onPress={()=>onSelectMessage?.(message)} reduceMotion={reduceMotion}/>} />
  {!!error&&<View accessibilityRole="alert" style={s.errorCard}><Text style={s.errorLabel}>{st("GUILD CHAT UNAVAILABLE")}</Text><Text style={s.error}>{error}</Text><GameButton compact title={st("Retry")} tone="secondary" disabled={busy} onPress={onRetry}/></View>}
  <ChatMentionSuggestions value={body} names={mentionNames} currentName={currentPlayerName} onChange={onBodyChange}/>
  <ChatComposer accessibilityLabel={st("Guild message")} value={body} onChangeText={onBodyChange} onSend={onSend} placeholder={st("Guild message")} busy={busy} disabled={!guild} emotes={{unlockedIds:unlockedEmoteIds,trayIds,bodyPresentation,onTrayChange,onPick:token=>onBodyChange((body+token).slice(0,300))}}/>
 </View>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{gap:spacing.sm},unavailable:{gap:4,padding:spacing.md,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},
 header:{minHeight:40,flexDirection:'row',alignItems:'center',gap:8},grow:{flex:1,minWidth:0},eyebrow:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.8},title:{...typography.title,color:C.text},securePill:{paddingHorizontal:6,paddingVertical:3,borderWidth:1,borderColor:C.good,borderRadius:99,backgroundColor:C.goodSurface},secure:{fontSize:7,color:C.good,fontWeight:'900',letterSpacing:.6},
 note:{...typography.body,color:C.muted,lineHeight:18},
errorCard:{gap:5,padding:spacing.sm,borderWidth:1,borderColor:C.bad,borderRadius:radii.md,backgroundColor:C.badSurface},errorLabel:{...typography.caption,color:C.bad,fontWeight:'900',letterSpacing:1},error:{...typography.caption,color:C.text},
});}
