import {useEffect,useMemo,useState} from 'react';
import {Image,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {chatEmoteArtwork} from '../theme/chat-emote-assets';
import {availableChatEmotes,CHAT_EMOTE_TRAY_SIZE,defaultChatEmoteTray,resolvedChatEmoteTray,type ChatEmoteDef} from '../core/chat-emotes';

export function ChatEmotePicker({onPick,unlockedIds=[],trayIds=[],bodyPresentation='male',onTrayChange}:{onPick:(token:string)=>void;unlockedIds?:readonly string[];trayIds?:readonly string[];bodyPresentation?:'male'|'female';onTrayChange?:(ids:string[])=>void|Promise<void>}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const [open,setOpen]=useState(false),[editing,setEditing]=useState(false),[draft,setDraft]=useState<string[]>([]);
 const available=useMemo(()=>availableChatEmotes(unlockedIds),[unlockedIds]);
 const byId=useMemo(()=>new Map(available.map(row=>[row.id,row])),[available]);
 const resolved=useMemo(()=>resolvedChatEmoteTray(trayIds,unlockedIds,bodyPresentation),[trayIds,unlockedIds,bodyPresentation]);
 useEffect(()=>{if(!editing)setDraft(resolved)},[editing,resolved.join('|')]);
 const selected=editing?draft:resolved;
 const toggle=(id:string)=>setDraft(current=>current.includes(id)?current.filter(value=>value!==id):current.length<CHAT_EMOTE_TRAY_SIZE?[...current,id]:current);
 const reset=()=>setDraft(defaultChatEmoteTray(bodyPresentation));
 const save=async()=>{if(draft.length!==CHAT_EMOTE_TRAY_SIZE)return;await onTrayChange?.(draft);setEditing(false);};
 return <View>
  <Pressable accessibilityRole="button" accessibilityLabel="Open emote tray" accessibilityState={{expanded:open}} onPress={()=>{setOpen(value=>!value);setEditing(false)}} style={({pressed})=>[s.toggle,pressed&&s.pressed]}><Text style={s.toggleText}>☺ Emotes</Text></Pressable>
  {open&&<View style={s.picker}>
    <View style={s.headingRow}><View><Text style={s.heading}>{editing?'Choose your 8 emotes':'Quick emotes'}</Text><Text style={s.count}>{editing?draft.length+'/'+CHAT_EMOTE_TRAY_SIZE+' selected':'8 slots · max 2 per message'}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={editing?'Cancel emote tray editing':'Edit emote tray'} onPress={()=>{setDraft(resolved);setEditing(value=>!value)}} style={s.editButton}><Text style={s.editText}>{editing?'Cancel':'Edit 8'}</Text></Pressable></View>
    {!editing?<View style={s.quickGrid}>{selected.map(id=><EmoteButton key={id} emote={byId.get(id)} id={id} onPress={()=>{onPick(`:${id}:`);setOpen(false)}} selected={false}/>)}</View>:<>
      <View style={s.quickGrid}>{draft.map((id,index)=><EmoteButton key={id} emote={byId.get(id)} id={id} labelPrefix={'Slot '+(index+1)+': '} selected onPress={()=>toggle(id)}/>)}</View>
      <Text style={s.help}>Tap selected emotes to remove them, then choose replacements below. Save becomes available when all 8 slots are filled.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catalog}>{available.map(emote=><EmoteButton key={emote.id} emote={emote} id={emote.id} selected={draft.includes(emote.id)} disabled={!draft.includes(emote.id)&&draft.length>=CHAT_EMOTE_TRAY_SIZE} onPress={()=>toggle(emote.id)}/>)}</ScrollView>
      <View style={s.actions}><View style={s.action}><GameButton compact title="Reset" tone="secondary" onPress={reset}/></View><View style={s.action}><GameButton compact title="Save 8" disabled={draft.length!==CHAT_EMOTE_TRAY_SIZE} onPress={()=>void save()}/></View></View>
    </>}
  </View>}
 </View>;
}

function EmoteButton({emote,id,onPress,selected=false,disabled=false,labelPrefix=''}:{emote?:ChatEmoteDef;id:string;onPress:()=>void;selected?:boolean;disabled?:boolean;labelPrefix?:string}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),art=chatEmoteArtwork(id),label=emote?.label??id;
 return <Pressable accessibilityRole="button" accessibilityLabel={labelPrefix+label} accessibilityState={{selected,disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>[s.item,selected&&s.itemSelected,disabled&&s.disabled,pressed&&!disabled&&s.pressed]}>{art?<Image source={art} resizeMode="contain" style={s.art}/>:<Text style={s.face}>☺</Text>}<Text numberOfLines={1} style={s.label}>{label.replace(/\s+—\s+.*/, '')}</Text></Pressable>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 toggle:{minHeight:44,paddingHorizontal:10,justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},
 toggleText:{...typography.caption,color:C.accent,fontWeight:'800'},
 picker:{marginTop:spacing.xs,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.bg,gap:spacing.xs},
 headingRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 heading:{...typography.caption,color:C.text,fontWeight:'900'},
 count:{fontSize:9,color:C.muted,fontWeight:'800',marginTop:2},
 editButton:{minHeight:44,minWidth:62,alignItems:'center',justifyContent:'center',paddingHorizontal:8,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},
 editText:{...typography.caption,color:C.info,fontWeight:'900'},
 quickGrid:{flexDirection:'row',flexWrap:'wrap',gap:5},
 catalog:{gap:spacing.xs,paddingVertical:4},
 item:{width:58,minHeight:58,alignItems:'center',justifyContent:'center',padding:3,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel},
 itemSelected:{borderColor:C.selectionLine,backgroundColor:C.selection},
 art:{width:36,height:36},
 face:{fontSize:22,color:C.accent},
 label:{...typography.caption,color:C.text,textAlign:'center',fontSize:8,width:'100%'},
 help:{...typography.caption,color:C.muted,lineHeight:16},
 actions:{flexDirection:'row',gap:spacing.sm},
 action:{flex:1,minWidth:0},
 disabled:{opacity:.32},
 pressed:{opacity:.62},
});}
