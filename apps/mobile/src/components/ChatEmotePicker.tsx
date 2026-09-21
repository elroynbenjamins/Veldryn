import {useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import emoteData from '../features/chat-pilot/data/emotes.json';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

type Emote={id:string;label:string;defaultAvailable?:boolean};
const catalog=(emoteData as Emote[]).filter(row=>row.defaultAvailable!==false).slice(0,20);

export function ChatEmotePicker({onPick}:{onPick:(token:string)=>void}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const [open,setOpen]=useState(false);
 return <View>
  <Pressable accessibilityRole="button" accessibilityLabel="Open emote picker" accessibilityState={{expanded:open}} onPress={()=>setOpen(value=>!value)} style={({pressed})=>[s.toggle,pressed&&s.pressed]}><Text style={s.toggleText}>☺ Emotes</Text></Pressable>
  {open&&<View style={s.picker}><Text style={s.heading}>Choose an emote</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.list}>{catalog.map(emote=><Pressable key={emote.id} accessibilityRole="button" accessibilityLabel={emote.label} onPress={()=>{onPick(`:${emote.id}:`);setOpen(false)}} style={({pressed})=>[s.item,pressed&&s.pressed]}><Text style={s.face}>☺</Text><Text numberOfLines={1} style={s.label}>{emote.label.replace(/\s+—\s+.*/, '')}</Text></Pressable>)}</ScrollView></View>}
 </View>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 toggle:{minHeight:38,paddingHorizontal:10,justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},
 toggleText:{...typography.caption,color:C.accent,fontWeight:'800'},
 picker:{marginTop:spacing.xs,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.bg},
 heading:{...typography.caption,color:C.muted,marginBottom:spacing.xs},
 list:{gap:spacing.xs},
 item:{width:74,minHeight:60,alignItems:'center',justifyContent:'center',padding:4,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel},
 face:{fontSize:24,color:C.accent},
 label:{...typography.caption,color:C.text,textAlign:'center',fontSize:9},
 pressed:{opacity:.62},
});}
