import {useEffect,useMemo,useState} from 'react';
import {Alert,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {GameTextInput as TextInput} from './GameTextInput';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {ChatPlayerSheet} from './ChatPlayerSheet';
import {UiIcon} from './UiIcon';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {onlineConfigured} from '../online/supabase';
import {postWorldMessage,WORLD_CHANNELS,worldMessages,type WorldMessage} from '../online/social';
import {Language,ot} from '../i18n';
import {ChatEmotePicker} from './ChatEmotePicker';
import {CHAT_MAX_EMOTES_PER_MESSAGE,chatEmoteCount,chatUnavailableEmoteIds} from '../core/chat-emotes';
import {ChatMessageText} from './ChatMessageText';
import {GuildTaggedPlayerName} from './GuildTaggedPlayerName';
import {ChatLog} from './ChatLog';
import {ChatMentionSuggestions} from './ChatMentionSuggestions';

export function OnlineWorldChat({playerName,language,unlockedEmoteIds=[],trayIds=[],bodyPresentation='male',onTrayChange,embedded=false}:{playerName:string;language:Language;unlockedEmoteIds?:readonly string[];trayIds?:readonly string[];bodyPresentation?:'male'|'female';onTrayChange?:(ids:string[])=>void|Promise<void>;embedded?:boolean}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const [open,setOpen]=useState(embedded),[channel,setChannel]=useState(0),[text,setText]=useState(''),[rows,setRows]=useState<WorldMessage[]>([]),[selected,setSelected]=useState<WorldMessage|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const load=async()=>{try{setRows(await worldMessages(WORLD_CHANNELS[channel].id));setError('');}catch(reason){setError(reason instanceof Error?reason.message:'Unable to load chat.')}};
 useEffect(()=>{if(!open||!onlineConfigured)return;void load();const timer=setInterval(()=>void load(),6000);return()=>clearInterval(timer);},[open,channel]);
 if(!onlineConfigured)return null;
 if(!open&&!embedded)return <Panel><Text style={s.title}>{ot(language,'chat.world')}</Text><Text style={s.note}>{ot(language,'chat.closed')}</Text><GameButton title={ot(language,'chat.open')} onPress={()=>setOpen(true)}/></Panel>;
 const send=async()=>{const body=text.trim();if(!body||busy)return;if(chatEmoteCount(body)>CHAT_MAX_EMOTES_PER_MESSAGE){Alert.alert('World chat','Use at most 2 emotes in one message.');return}const locked=chatUnavailableEmoteIds(body,unlockedEmoteIds);if(locked.length){Alert.alert('World chat','One or more emotes in this message are still locked.');return}setBusy(true);try{await postWorldMessage(WORLD_CHANNELS[channel].id,body,playerName);setText('');await load();}catch(reason){Alert.alert('World chat',reason instanceof Error?reason.message:'Unable to send message.');}finally{setBusy(false)}};
 const mentionNames=[...new Map(rows.map(row=>[row.sender_name.toLocaleLowerCase(),row.sender_name])).values()];
 const content=<View style={s.root}>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.channels}>{WORLD_CHANNELS.map((item,index)=><Pressable key={item.id} accessibilityRole="tab" accessibilityState={{selected:channel===index}} onPress={()=>setChannel(index)} style={[s.channel,channel===index&&s.channelActive]}><Text style={[s.channelText,channel===index&&s.channelTextActive]}>{item.name}</Text><Text style={s.language}>{item.language}</Text></Pressable>)}</ScrollView>
  <ChatLog channelKey={WORLD_CHANNELS[channel].id} items={rows} emptyText={ot(language,'chat.none')} renderItem={row=><View style={s.messageRow}><Pressable accessibilityRole="button" accessibilityLabel={`Open ${row.sender_name}'s player profile`} onPress={()=>setSelected(row)} style={s.nameButton}><GuildTaggedPlayerName numberOfLines={1} style={s.name} name={row.sender_name} guildTag={row.guild_tag} tagColorId={row.guild_tag_color_id}/><Text style={s.profileMark}>›</Text></Pressable><Text style={s.time}>{new Date(row.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</Text><ChatMessageText body={row.body} mentionName={playerName}/></View>}/>
  {!!error&&<View accessibilityRole="alert" style={s.errorCard}><Text style={s.errorLabel}>CHAT UNAVAILABLE</Text><Text style={s.error}>{error}</Text></View>}
  <ChatMentionSuggestions value={text} names={mentionNames} currentName={playerName} onChange={setText}/>
  <View style={s.compose}><TextInput accessibilityLabel="World chat message" value={text} onChangeText={setText} onSubmitEditing={()=>void send()} placeholder={ot(language,'chat.placeholder')} maxLength={300} style={s.input}/><ChatEmotePicker unlockedIds={unlockedEmoteIds} trayIds={trayIds} bodyPresentation={bodyPresentation} usedCount={chatEmoteCount(text)} onTrayChange={onTrayChange} onPick={token=>setText(value=>(value+token).slice(0,300))}/><Pressable accessibilityRole="button" accessibilityLabel="Send message" accessibilityState={{disabled:busy||!text.trim()}} disabled={busy||!text.trim()} onPress={()=>void send()} style={({pressed})=>[s.send,(pressed||busy||!text.trim())&&s.sendDim]}><UiIcon name="next" size={24}/></Pressable></View>
  {!embedded&&<Pressable accessibilityRole="button" onPress={()=>setOpen(false)} style={s.closeInline}><Text style={s.closeText}>{ot(language,'chat.close')}</Text></Pressable>}
  <ChatPlayerSheet message={selected?{...selected,message_id:selected.id}:null} onClose={()=>setSelected(null)} onBlocked={accountId=>setRows(current=>current.filter(message=>message.account_id!==accountId))}/>
 </View>;
 return embedded?content:<Panel>{content}</Panel>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({root:{gap:spacing.sm},title:{...typography.title,color:C.text},note:{...typography.caption,color:C.muted},channels:{gap:5,paddingVertical:2},channel:{minHeight:42,minWidth:88,justifyContent:'center',paddingHorizontal:12,borderRadius:radii.md,backgroundColor:C.panel},channelActive:{backgroundColor:C.selection},channelText:{...typography.bodyStrong,color:C.muted},channelTextActive:{color:C.text},language:{fontSize:9,lineHeight:12,color:C.muted},messageRow:{paddingVertical:8,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.line},nameButton:{minHeight:24,alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:4,paddingRight:8},name:{...typography.bodyStrong,color:C.info},profileMark:{fontSize:16,lineHeight:18,color:C.info,fontWeight:'900'},time:{position:'absolute',right:2,top:10,...typography.caption,color:C.muted,fontSize:10},msg:{...typography.body,color:C.text,paddingRight:2},errorCard:{gap:4,padding:spacing.sm,borderWidth:1,borderColor:C.bad,borderRadius:8,backgroundColor:C.badSurface},errorLabel:{...typography.caption,color:C.bad,fontWeight:'900',letterSpacing:1},error:{...typography.caption,color:C.text},compose:{flexDirection:'row',alignItems:'flex-end',gap:spacing.sm,paddingTop:4},input:{flex:1,maxHeight:104},send:{width:48,height:48,alignItems:'center',justifyContent:'center',borderRadius:24,backgroundColor:C.primaryButton},sendDim:{opacity:.4},closeInline:{minHeight:44,alignItems:'center',justifyContent:'center'},closeText:{...typography.bodyStrong,color:C.muted}});}
