import {useMemo} from 'react';
import {Pressable,ScrollView,StyleSheet,Text} from 'react-native';
import {applyChatMentionSuggestion,chatMentionSuggestions} from '../core/chat-mentions';
import {useGameTheme} from '../theme/ThemeContext';

export function ChatMentionSuggestions({value,names,currentName,onChange}:{value:string;names:readonly string[];currentName?:string;onChange:(value:string)=>void}){
 const C=useGameTheme();
 const suggestions=useMemo(()=>chatMentionSuggestions(value,names,currentName),[value,names,currentName]);
 if(!suggestions.length)return null;
 return <ScrollView horizontal keyboardShouldPersistTaps="always" showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
  {suggestions.map(name=><Pressable key={name.toLocaleLowerCase()} accessibilityRole="button" accessibilityLabel={'Mention '+name} onPress={()=>onChange(applyChatMentionSuggestion(value,name))} style={({pressed})=>[s.chip,{backgroundColor:C.panel2,borderColor:C.line},pressed&&s.pressed]}><Text numberOfLines={1} style={[s.text,{color:C.info}]}>@{name}</Text></Pressable>)}
 </ScrollView>;
}
const s=StyleSheet.create({row:{gap:6,paddingVertical:2},chip:{minHeight:32,maxWidth:150,justifyContent:'center',paddingHorizontal:9,borderWidth:1,borderRadius:16},text:{fontSize:10,fontWeight:'900'},pressed:{opacity:.68}});
