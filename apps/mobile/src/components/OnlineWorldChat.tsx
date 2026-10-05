import {useSocialText} from '../i18n/social';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Alert,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {ChatPlayerSheet} from './ChatPlayerSheet';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {onlineConfigured} from '../online/supabase';
import {useChatFeed} from '../online/useChatFeed';
import {postWorldMessage,WORLD_CHANNELS,worldMessages,type WorldMessage} from '../online/social';
import {Language,ot} from '../i18n';
import {ChatComposer} from './ChatComposer';
import {CHAT_MAX_EMOTES_PER_MESSAGE,chatEmoteCount,chatUnavailableEmoteIds} from '../core/chat-emotes';
import {ChatMessageRow} from './ChatMessageRow';
import {ChatLog} from './ChatLog';
import {ChatMentionSuggestions} from './ChatMentionSuggestions';

export function OnlineWorldChat({playerName,language,unlockedEmoteIds=[],trayIds=[],bodyPresentation='male',onTrayChange,embedded=false,reduceMotion=false,selectedChannel,active=true}:{playerName:string;language:Language;unlockedEmoteIds?:readonly string[];trayIds?:readonly string[];bodyPresentation?:'male'|'female';onTrayChange?:(ids:string[])=>void|Promise<void>;embedded?:boolean;reduceMotion?:boolean;selectedChannel?:number;active?:boolean}){
 const st=useSocialText();
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const [open,setOpen]=useState(embedded),[localChannel,setChannel]=useState(0),[drafts,setDrafts]=useState<Record<string,string>>({}),[selected,setSelected]=useState<WorldMessage|null>(null),[busy,setBusy]=useState(false);
 const channel=Math.max(0,Math.min(WORLD_CHANNELS.length-1,selectedChannel??localChannel)),channelId=WORLD_CHANNELS[channel].id;
 const {value:rows,error,accountId,refresh,setValue:setRows}=useChatFeed<WorldMessage[]>({key:`world:${channelId}`,read:()=>worldMessages(channelId),initial:[],active:active&&(open||embedded),channelType:'world',channelId});
 const draftKey=`${accountId}:${channelId}`,text=drafts[draftKey]??'',currentAccount=useRef(accountId),sending=useRef(false);currentAccount.current=accountId;
 const setText=(update:string|((previous:string)=>string))=>setDrafts(previous=>({...previous,[draftKey]:typeof update==='function'?update(previous[draftKey]??''):update}));
 useEffect(()=>{setDrafts({});setSelected(null);},[accountId]);
 useEffect(()=>setSelected(null),[channelId]);
 if(!onlineConfigured)return null;
 if(!open&&!embedded)return <Panel><Text style={s.title}>{ot(language,'chat.world')}</Text><Text style={s.note}>{ot(language,'chat.closed')}</Text><GameButton title={ot(language,'chat.open')} onPress={()=>setOpen(true)}/></Panel>;
 const send=async()=>{
  const body=text.trim();if(!body||sending.current||!accountId)return;
  if(chatEmoteCount(body)>CHAT_MAX_EMOTES_PER_MESSAGE){Alert.alert(st("World chat"),st("Use at most 2 emotes in one message."));return}
  if(chatUnavailableEmoteIds(body,unlockedEmoteIds).length){Alert.alert(st("World chat"),st("One or more emotes in this message are still locked."));return}
  sending.current=true;setBusy(true);
  try{
   await postWorldMessage(channelId,body,playerName);
   if(currentAccount.current!==accountId)return;
   // Clear only the draft actually acknowledged by the server. Switching
   // channels or editing while sending must not erase a different draft.
   setDrafts(previous=>previous[draftKey]?.trim()===body?{...previous,[draftKey]:''}:previous);
   await refresh();
  }catch(reason){if(currentAccount.current===accountId)Alert.alert(st("World chat"),reason instanceof Error?reason.message:st("Unable to send message."));}
  finally{sending.current=false;setBusy(false);}
 };
 const mentionNames=[...new Map(rows.map(row=>[row.sender_name.toLocaleLowerCase(),row.sender_name])).values()];
 const content=<View style={s.root}>
  {selectedChannel===undefined&&<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.channels} showsVerticalScrollIndicator={false}>{WORLD_CHANNELS.map((item,index)=><Pressable key={item.id} accessibilityRole="tab" accessibilityState={{selected:channel===index}} onPress={()=>setChannel(index)} style={[s.channel,channel===index&&s.channelActive]}><Text style={[s.channelText,channel===index&&s.channelTextActive]}>{item.name}</Text><Text style={s.language}>{item.language}</Text></Pressable>)}</ScrollView>}
  <ChatLog active={active&&(open||embedded)} channelKey={WORLD_CHANNELS[channel].id} items={rows} emptyText={ot(language,'chat.none')} renderItem={row=><ChatMessageRow accountId={row.account_id} name={row.sender_name} body={row.body} createdAt={row.created_at} guildTag={row.guild_tag} tagColorId={row.guild_tag_color_id} nameStyle={row.player_name_style} badges={row.player_badges} mentionName={playerName} onPress={()=>setSelected(row)} reduceMotion={reduceMotion}/>} />
  {!!error&&<View accessibilityRole="alert" style={s.errorCard}><Text style={s.errorLabel}>{st("CHAT UNAVAILABLE")}</Text><Text style={s.error}>{error}</Text><GameButton compact title={st("Retry")} tone="secondary" onPress={()=>void refresh()}/></View>}
  <ChatMentionSuggestions value={text} names={mentionNames} currentName={playerName} onChange={setText}/>
  <ChatComposer accessibilityLabel={st("World chat message")} value={text} onChangeText={setText} onSend={()=>void send()} placeholder={ot(language,'chat.placeholder')} busy={busy} disabled={!accountId} emotes={{unlockedIds:unlockedEmoteIds,trayIds,bodyPresentation,onTrayChange,onPick:token=>setText(value=>(value+token).slice(0,300))}}/>
  {!embedded&&<Pressable accessibilityRole="button" onPress={()=>setOpen(false)} style={s.closeInline}><Text style={s.closeText}>{ot(language,'chat.close')}</Text></Pressable>}
  <ChatPlayerSheet reduceMotion={reduceMotion} message={selected?{...selected,message_id:selected.id}:null} onClose={()=>setSelected(null)} onBlocked={accountId=>setRows(current=>current.filter(message=>message.account_id!==accountId))}/>
 </View>;
 return embedded?content:<Panel>{content}</Panel>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({root:{gap:spacing.sm},title:{...typography.title,color:C.text},note:{...typography.caption,color:C.muted},channels:{gap:7,paddingVertical:2},channel:{minHeight:44,minWidth:92,justifyContent:'center',paddingHorizontal:13,borderWidth:1,borderColor:C.line,borderRadius:14,backgroundColor:C.bg},channelActive:{backgroundColor:C.selection,borderColor:C.selectionLine},channelText:{...typography.bodyStrong,color:C.muted},channelTextActive:{color:C.text},language:{fontSize:9,lineHeight:12,color:C.muted},errorCard:{gap:4,padding:spacing.sm,borderWidth:1,borderColor:C.bad,borderRadius:12,backgroundColor:C.badSurface},errorLabel:{...typography.caption,color:C.bad,fontWeight:'900',letterSpacing:1},error:{...typography.caption,color:C.text},closeInline:{minHeight:44,alignItems:'center',justifyContent:'center'},closeText:{...typography.bodyStrong,color:C.muted}});}
