import {useMemo,useState} from 'react';
import {Image,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import emoteData from '../features/chat-pilot/data/emotes.json';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {chatEmoteArtwork} from '../theme/chat-emote-assets';

type Emote={id:string;label:string;defaultAvailable?:boolean};
const catalog=emoteData as Emote[];

export function ChatEmotePicker({onPick,unlockedIds=[]}:{onPick:(token:string)=>void;unlockedIds?:readonly string[]}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const [open,setOpen]=useState(false);
 const available=useMemo(()=>{const unlocked=new Set(unlockedIds);return catalog.filter(row=>row.defaultAvailable!==false||unlocked.has(row.id));},[unlockedIds]);
 return <View>
  <Pressable accessibilityRole="button" accessibilityLabel="Open emote picker" accessibilityState={{expanded:open}} onPress={()=>setOpen(value=>!value)} style={({pressed})=>[s.toggle,pressed&&s.pressed]}><Text style={s.toggleText}>☺ Emotes</Text></Pressable>
  {open&&<View style={s.picker}><View style={s.headingRow}><Text style={s.heading}>Choose an emote</Text><Text style={s.count}>{available.length} available</Text></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.list}>{available.map(emote=>{const art=chatEmoteArtwork(emote.id);return <Pressable key={emote.id} accessibilityRole="button" accessibilityLabel={'Insert '+emote.label} onPress={()=>{onPick(`:${emote.id}:`);setOpen(false)}} style={({pressed})=>[s.item,pressed&&s.pressed]}>{art?<Image source={art} resizeMode="contain" style={s.art}/>:<Text style={s.face}>☺</Text>}<Text numberOfLines={1} style={s.label}>{emote.label.replace(/\s+—\s+.*/, '')}</Text></Pressable>})}</ScrollView></View>}
 </View>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 toggle:{minHeight:44,paddingHorizontal:10,justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},
 toggleText:{...typography.caption,color:C.accent,fontWeight:'800'},
 picker:{marginTop:spacing.xs,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.bg},
 headingRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,marginBottom:spacing.xs},
 heading:{...typography.caption,color:C.muted},
 count:{fontSize:9,color:C.muted,fontWeight:'800'},
 list:{gap:spacing.xs},
 item:{width:64,minHeight:62,alignItems:'center',justifyContent:'center',padding:4,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel},
 art:{width:38,height:38},
 face:{fontSize:24,color:C.accent},
 label:{...typography.caption,color:C.text,textAlign:'center',fontSize:8.5,width:'100%'},
 pressed:{opacity:.62},
});}
