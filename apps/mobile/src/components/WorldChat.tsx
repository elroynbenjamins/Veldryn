import {useSocialText} from '../i18n/social';
import {useMemo,useState} from 'react';
import {Alert,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {equipmentTheme,spacing,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {Language,ot} from '../i18n';
import {ChatComposer} from './ChatComposer';
import {CHAT_RECENT_MESSAGE_LIMIT} from '../online/chat-history';
import {ChatMessageText} from './ChatMessageText';
import {CHAT_MAX_EMOTES_PER_MESSAGE,chatEmoteCount,chatUnavailableEmoteIds} from '../core/chat-emotes';

const channels=[['English','English'],['Spanish','Spanish'],['Global 1','Global'],['Global 2','Global']];
const profile=(name:string)=>Alert.alert(name+' · Player profile','Level 28 Dawnkeeper\nGuild: The Bloomwardens\nCrafted set: Sunlamp Acolyte',[{text:'Close'},{text:'Block (coming soon)',onPress:()=>{}},{text:'Report (coming soon)',onPress:()=>{}}]);

export function WorldChat({language,unlockedEmoteIds=[],trayIds=[],bodyPresentation='male',onTrayChange,embedded=false,selectedChannel}:{language:Language;unlockedEmoteIds?:readonly string[];trayIds?:readonly string[];bodyPresentation?:'male'|'female';onTrayChange?:(ids:string[])=>void|Promise<void>;embedded?:boolean;selectedChannel?:number}){
 const st=useSocialText();
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const [open,setOpen]=useState(embedded),[localChannel,setChannel]=useState(0),[text,setText]=useState('');
 const channel=selectedChannel??localChannel;
 const [messages,setMessages]=useState<Record<number,string[]>>({0:['Elowen: Welcome to English!'],1:['Mira: ¡Bienvenido al chat de Spanish!'],2:['Brann: Welcome to Global 1!'],3:['Sera: Welcome to Global 2!']});
 const send=()=>{const clean=text.trim();if(!clean)return;if(chatEmoteCount(clean)>CHAT_MAX_EMOTES_PER_MESSAGE){Alert.alert(st("World chat"),st("Use at most 2 emotes in one message."));return}if(chatUnavailableEmoteIds(clean,unlockedEmoteIds).length){Alert.alert(st("World chat"),st("One or more emotes in this message are still locked."));return}setMessages(previous=>({...previous,[channel]:[...(previous[channel]||[]),`You: ${clean}`].slice(-CHAT_RECENT_MESSAGE_LIMIT)}));setText('')};
 if(!open&&!embedded)return <Panel><Text style={s.title}>{ot(language,'chat.world')}</Text><Text style={s.note}>{ot(language,'chat.closed')}</Text><GameButton title={ot(language,'chat.open')} onPress={()=>setOpen(true)}/></Panel>;
 const content=<>{!embedded&&<><Text style={s.title}>{ot(language,'chat.world')}</Text><Text style={s.note}>{ot(language,'chat.tap')}</Text></>}{selectedChannel===undefined&&<ScrollView accessibilityRole="tablist" horizontal showsHorizontalScrollIndicator={false} style={s.channels} showsVerticalScrollIndicator={false}>{channels.map(([name,channelLanguage],i)=><View key={name} style={s.channel}><ChannelChip label={`${name} · ${channelLanguage}`} selected={channel===i} onPress={()=>setChannel(i)}/></View>)}</ScrollView>}<ScrollView style={s.log} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>{(messages[channel]||[]).map((m,i)=>{const [name,...rest]=m.split(':');return <View key={i} style={s.messageRow}><Text style={s.msg}><Text style={s.name} onPress={()=>profile(name)}>{name}</Text>: </Text><View style={s.messageBody}><ChatMessageText body={rest.join(':').trim()}/></View></View>})}</ScrollView><View style={s.composer}><ChatComposer accessibilityLabel={st("World chat message")} value={text} onChangeText={setText} onSend={send} placeholder={ot(language,'chat.placeholder')} maxLength={180} emotes={{unlockedIds:unlockedEmoteIds,trayIds,bodyPresentation,onTrayChange,onPick:token=>setText(value=>(value+token).slice(0,180))}}/></View>{!embedded&&<GameButton title={ot(language,'chat.close')} tone="secondary" onPress={()=>setOpen(false)}/>}</>;
 return embedded?<View>{content}</View>:<Panel>{content}</Panel>;
}

function ChannelChip({label,selected,onPress}:{label:string;selected:boolean;onPress:()=>void}){const C=useGameTheme(),equipmentColors=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);return <Pressable accessibilityRole="tab" accessibilityState={{selected}} onPress={onPress} style={({pressed})=>[s.chip,selected&&s.chipSelected,pressed&&s.pressed]}><Text style={[s.chipText,selected&&s.chipTextSelected]}>{label}</Text></Pressable>}
function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({title:{color:C.text,fontSize:18,fontWeight:'900'},note:{color:C.muted,fontSize:12,marginTop:3},channels:{marginTop:8},channel:{marginRight:6},chip:{minHeight:44,paddingHorizontal:12,justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:14,backgroundColor:C.bg},chipSelected:{borderColor:equipmentColors.selectedLine,backgroundColor:equipmentColors.selected},chipText:{fontSize:12,color:C.muted,fontWeight:'700'},chipTextSelected:{color:C.text,fontWeight:'800'},pressed:{opacity:.76},log:{maxHeight:180,marginTop:7},messageRow:{flexDirection:'row',alignItems:'flex-start',gap:5,marginBottom:6,paddingHorizontal:10,paddingVertical:8,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel2},messageBody:{flex:1,minWidth:0},msg:{color:C.text,paddingVertical:2},name:{color:C.info,fontWeight:'900'},composer:{marginTop:spacing.sm}});}
