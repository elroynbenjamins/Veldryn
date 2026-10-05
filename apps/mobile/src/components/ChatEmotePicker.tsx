import {useSocialText} from '../i18n/social';
import {useEffect,useMemo,useState,type ReactNode} from 'react';
import {Image,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {GameButton} from './GameButton';
import {radii,spacing,touchTargetPreferred,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {chatEmoteArtwork} from '../theme/chat-emote-assets';
import {availableChatEmotes,CHAT_EMOTE_TRAY_SIZE,CHAT_MAX_EMOTES_PER_MESSAGE,defaultChatEmoteTray,resolvedChatEmoteTray,type ChatEmoteDef} from '../core/chat-emotes';

export function ChatEmotePicker({onPick,unlockedIds=[],trayIds=[],bodyPresentation='male',usedCount=0,onTrayChange,settingsMode=false,compact=false,renderTrigger}:{onPick:(token:string)=>void;unlockedIds?:readonly string[];trayIds?:readonly string[];bodyPresentation?:'male'|'female';usedCount?:number;onTrayChange?:(ids:string[])=>void|Promise<void>;settingsMode?:boolean;compact?:boolean;renderTrigger?:(trigger:ReactNode)=>ReactNode}){
 const st=useSocialText();
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),{width,fontScale}=useWindowDimensions(),stackControls=width<360||fontScale>=1.25;
 const [open,setOpen]=useState(false),[editing,setEditing]=useState(false),[draft,setDraft]=useState<string[]>([]),[focused,setFocused]=useState(false);
 const available=useMemo(()=>availableChatEmotes(unlockedIds,bodyPresentation),[unlockedIds,bodyPresentation]);
 const byId=useMemo(()=>new Map(available.map(row=>[row.id,row])),[available]);
 const resolved=useMemo(()=>resolvedChatEmoteTray(trayIds,unlockedIds,bodyPresentation),[trayIds,unlockedIds,bodyPresentation]);
 useEffect(()=>{if(!editing)setDraft(resolved)},[editing,resolved.join('|')]);
 const selected=editing?draft:resolved;
 const toggle=(id:string)=>setDraft(current=>current.includes(id)?current.filter(value=>value!==id):current.length<CHAT_EMOTE_TRAY_SIZE?[...current,id]:current);
 const reset=()=>setDraft(defaultChatEmoteTray(bodyPresentation));
 const save=async()=>{if(draft.length!==CHAT_EMOTE_TRAY_SIZE)return;await onTrayChange?.(draft);setEditing(false);};
 const compactTrigger=compact&&!settingsMode;
 const trigger=<Pressable accessibilityRole="button" accessibilityLabel={st("Open emote tray")} accessibilityState={{expanded:open}} onPress={()=>{setOpen(value=>!value);setEditing(settingsMode)}} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} style={({pressed})=>[s.toggle,settingsMode&&s.settingsToggle,compactTrigger&&s.compactToggle,focused&&s.focused,pressed&&s.pressed]}><Text allowFontScaling={!compactTrigger} style={compactTrigger?s.compactIcon:s.toggleText}>{settingsMode?st("Edit emote tray"):compactTrigger?'☺':st("☺ Emotes")}</Text>{settingsMode&&<Text style={s.toggleMeta}>{st('{count}/{total} selected',{count:resolved.length,total:8})}</Text>}</Pressable>;
 return <View style={s.root}>
  {renderTrigger?renderTrigger(trigger):trigger}
  {open&&<View style={s.picker}>
    <View style={[s.headingRow,stackControls&&s.headingRowStack]}><View><Text style={s.heading}>{editing?st("Choose your 5 emotes"):st("Quick emotes")}</Text><Text style={s.count}>{editing?st('{count}/{total} selected',{count:draft.length,total:CHAT_EMOTE_TRAY_SIZE}):st('5 slots · {count}/{total} used',{count:Math.min(usedCount,CHAT_MAX_EMOTES_PER_MESSAGE),total:CHAT_MAX_EMOTES_PER_MESSAGE})}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={editing?st("Cancel emote tray editing"):st("Edit emote tray")} onPress={()=>{setDraft(resolved);setEditing(value=>!value)}} style={[s.editButton,stackControls&&s.editButtonStack]}><Text style={s.editText}>{editing?st("Cancel"):st("Edit 5")}</Text></Pressable></View>
    {!editing?<View style={s.quickGrid}>{selected.map(id=><EmoteButton key={id} emote={byId.get(id)} id={id} disabled={usedCount>=CHAT_MAX_EMOTES_PER_MESSAGE} onPress={()=>{onPick(`:${id}:`);setOpen(false)}} selected={false}/>)}</View>:<>
      <View style={s.quickGrid}>{draft.map((id,index)=><EmoteButton key={id} emote={byId.get(id)} id={id} labelPrefix={st('Slot {slot}: ',{slot:index+1})} selected onPress={()=>toggle(id)}/>)}</View>
      <Text style={s.help}>{st("Tap selected emotes to remove them, then choose replacements below. Save becomes available when all 5 slots are filled.")}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catalog} showsVerticalScrollIndicator={false}>{available.map(emote=><EmoteButton key={emote.id} emote={emote} id={emote.id} selected={draft.includes(emote.id)} disabled={!draft.includes(emote.id)&&draft.length>=CHAT_EMOTE_TRAY_SIZE} onPress={()=>toggle(emote.id)}/>)}</ScrollView>
      <View style={[s.actions,stackControls&&s.actionsStack]}><View style={[s.action,stackControls&&s.actionStack]}><GameButton compact title={st("Reset")} tone="secondary" onPress={reset}/></View><View style={[s.action,stackControls&&s.actionStack]}><GameButton compact title={st("Save 5")} disabled={draft.length!==CHAT_EMOTE_TRAY_SIZE} onPress={()=>void save()}/></View></View>
    </>}
  </View>}
 </View>;
}

function EmoteButton({emote,id,onPress,selected=false,disabled=false,labelPrefix=''}:{emote?:ChatEmoteDef;id:string;onPress:()=>void;selected?:boolean;disabled?:boolean;labelPrefix?:string}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),art=chatEmoteArtwork(id),label=emote?.label??id;
 return <Pressable accessibilityRole="button" accessibilityLabel={labelPrefix+label} accessibilityState={{selected,disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>[s.item,selected&&s.itemSelected,disabled&&s.disabled,pressed&&!disabled&&s.pressed]}>{art?<Image source={art} resizeMode="contain" style={s.art}/>:<Text style={s.face}>☺</Text>}<Text numberOfLines={1} style={s.label}>{label.replace(/\s+—\s+.*/, '')}</Text></Pressable>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{width:'100%',minWidth:0},
 toggle:{minHeight:44,paddingHorizontal:10,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},settingsToggle:{minHeight:52,paddingHorizontal:12,borderColor:C.selectionLine,backgroundColor:C.selection},
 compactToggle:{width:touchTargetPreferred,minHeight:touchTargetPreferred,flexShrink:0,paddingHorizontal:0,justifyContent:'center'},
 compactIcon:{...typography.title,color:C.accent,textAlign:'center'},focused:{borderWidth:2},
 toggleText:{...typography.caption,color:C.accent,fontWeight:'800'},
 toggleMeta:{...typography.caption,color:C.info,fontWeight:'900'},
 picker:{marginTop:spacing.xs,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2,gap:spacing.xs},
 headingRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},headingRowStack:{alignItems:'stretch',flexDirection:'column'},
 heading:{...typography.caption,color:C.text,fontWeight:'900'},
 count:{fontSize:9,color:C.muted,fontWeight:'800',marginTop:2},
 editButton:{minHeight:44,minWidth:62,alignItems:'center',justifyContent:'center',paddingHorizontal:8,borderWidth:1,borderColor:C.selectionLine,borderRadius:radii.md,backgroundColor:C.selection},editButtonStack:{width:'100%'},
 editText:{...typography.caption,color:C.info,fontWeight:'900'},
 quickGrid:{flexDirection:'row',flexWrap:'wrap',gap:5},
 catalog:{gap:spacing.xs,paddingVertical:4},
 item:{width:58,minHeight:58,alignItems:'center',justifyContent:'center',padding:3,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panelRaised},
 itemSelected:{borderColor:C.selectionLine,backgroundColor:C.selection},
 art:{width:36,height:36},
 face:{fontSize:22,color:C.accent},
 label:{...typography.caption,color:C.text,textAlign:'center',fontSize:8,width:'100%'},
 help:{...typography.caption,color:C.muted,lineHeight:16},
 actions:{flexDirection:'row',gap:spacing.sm},actionsStack:{flexDirection:'column'},
 action:{flex:1,minWidth:0},actionStack:{flex:0,width:'100%'},
 disabled:{opacity:.32},
 pressed:{opacity:.62},
});}
