import {useSocialText} from '../i18n/social';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Alert,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {GameTextInput as TextInput} from './GameTextInput';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {ChatPlayerSheet} from './ChatPlayerSheet';
import {UiIcon} from './UiIcon';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {onlineConfigured} from '../online/supabase';
import {useChatFeed} from '../online/useChatFeed';
import {postWorldMessage,WORLD_CHANNELS,worldMessages,type WorldMessage} from '../online/social';
import {Language,ot} from '../i18n';
import {ChatEmotePicker} from './ChatEmotePicker';
import {CHAT_MAX_EMOTES_PER_MESSAGE,chatEmoteCount,chatUnavailableEmoteIds} from '../core/chat-emotes';
import {ChatMessageRow} from './ChatMessageRow';
import {ChatLog} from './ChatLog';
import {ChatMentionSuggestions} from './ChatMentionSuggestions';

export function OnlineWorldChat({playerName,language,unlockedEmoteIds=[],trayIds=[],bodyPresentation='male',onTrayChange,embedded=false,reduceMotion=false,selectedChannel,active=true}:{playerName:string;language:Language;unlockedEmoteIds?:readonly string[];trayIds?:readonly string[];bodyPresentation?:'male'|'female';onTrayChange?:(ids:string[])=>void|Promise<void>;embedded?:boolean;reduceMotion?:boolean;selectedChannel?:number;active?:boolean}){
 const st=useSocialText();
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),{width:windowWidth,fontScale}=useWindowDimensions();
 const [width,setContentWidth]=useState(windowWidth),stackCompose=width<360||fontScale>=1.25;
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
 const content=<View style={s.root} onLayout={event=>setContentWidth(event.nativeEvent.layout.width)}>
  {selectedChannel===undefined&&<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.channels} showsVerticalScrollIndicator={false}>{WORLD_CHANNELS.map((item,index)=><Pressable key={item.id} accessibilityRole="tab" accessibilityState={{selected:channel===index}} onPress={()=>setChannel(index)} style={[s.channel,channel===index&&s.channelActive]}><Text style={[s.channelText,channel===index&&s.channelTextActive]}>{item.name}</Text><Text style={s.language}>{item.language}</Text></Pressable>)}</ScrollView>}
  <ChatLog active={active&&(open||embedded)} channelKey={WORLD_CHANNELS[channel].id} items={rows} emptyText={ot(language,'chat.none')} renderItem={row=><ChatMessageRow accountId={row.account_id} name={row.sender_name} body={row.body} createdAt={row.created_at} guildTag={row.guild_tag} tagColorId={row.guild_tag_color_id} nameStyle={row.player_name_style} badges={row.player_badges} mentionName={playerName} onPress={()=>setSelected(row)} reduceMotion={reduceMotion}/>} />
  {!!error&&<View accessibilityRole="alert" style={s.errorCard}><Text style={s.errorLabel}>{st("CHAT UNAVAILABLE")}</Text><Text style={s.error}>{error}</Text><GameButton compact title={st("Retry")} tone="secondary" onPress={()=>void refresh()}/></View>}
  <ChatMentionSuggestions value={text} names={mentionNames} currentName={playerName} onChange={setText}/>
  <View style={[s.compose,stackCompose&&s.composeStack]}><TextInput accessibilityLabel={st("World chat message")} value={text} onChangeText={setText} onSubmitEditing={()=>void send()} placeholder={ot(language,'chat.placeholder')} maxLength={300} style={s.input}/><View style={[s.composeActions,stackCompose&&s.composeActionsStack]}><ChatEmotePicker unlockedIds={unlockedEmoteIds} trayIds={trayIds} bodyPresentation={bodyPresentation} usedCount={chatEmoteCount(text)} onTrayChange={onTrayChange} onPick={token=>setText(value=>(value+token).slice(0,300))}/><Pressable accessibilityRole="button" accessibilityLabel={st("Send message")} accessibilityState={{disabled:busy||!text.trim()}} disabled={busy||!text.trim()} onPress={()=>void send()} style={({pressed})=>[s.send,(pressed||busy||!text.trim())&&s.sendDim]}><UiIcon name="next" size={24}/></Pressable></View></View>
  {!embedded&&<Pressable accessibilityRole="button" onPress={()=>setOpen(false)} style={s.closeInline}><Text style={s.closeText}>{ot(language,'chat.close')}</Text></Pressable>}
  <ChatPlayerSheet reduceMotion={reduceMotion} message={selected?{...selected,message_id:selected.id}:null} onClose={()=>setSelected(null)} onBlocked={accountId=>setRows(current=>current.filter(message=>message.account_id!==accountId))}/>
 </View>;
 return embedded?content:<Panel>{content}</Panel>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({root:{gap:spacing.sm},title:{...typography.title,color:C.text},note:{...typography.caption,color:C.muted},channels:{gap:7,paddingVertical:2},channel:{minHeight:44,minWidth:92,justifyContent:'center',paddingHorizontal:13,borderWidth:1,borderColor:C.line,borderRadius:14,backgroundColor:C.bg},channelActive:{backgroundColor:C.selection,borderColor:C.selectionLine},channelText:{...typography.bodyStrong,color:C.muted},channelTextActive:{color:C.text},language:{fontSize:9,lineHeight:12,color:C.muted},errorCard:{gap:4,padding:spacing.sm,borderWidth:1,borderColor:C.bad,borderRadius:12,backgroundColor:C.badSurface},errorLabel:{...typography.caption,color:C.bad,fontWeight:'900',letterSpacing:1},error:{...typography.caption,color:C.text},compose:{flexDirection:'row',alignItems:'flex-end',gap:spacing.sm,paddingTop:4},composeStack:{flexDirection:'column',alignItems:'stretch'},composeActions:{flexDirection:'row',alignItems:'center',gap:spacing.sm},composeActionsStack:{width:'100%',justifyContent:'flex-end'},input:{flex:1,maxHeight:104,borderWidth:1,borderColor:C.line,borderRadius:16,backgroundColor:C.inputBg,paddingHorizontal:12},send:{width:48,height:48,alignItems:'center',justifyContent:'center',borderRadius:16,backgroundColor:C.primaryButton,borderWidth:1,borderColor:C.selectionLine},sendDim:{opacity:.4},closeInline:{minHeight:44,alignItems:'center',justifyContent:'center'},closeText:{...typography.bodyStrong,color:C.muted}});}
