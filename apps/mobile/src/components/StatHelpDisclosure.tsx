import {useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {statHelpText,type StatHelpId} from '../i18n/stat-help';
import {useGameTheme} from '../theme/ThemeContext';
import {spacing,typography,type ThemeColors} from '../theme/theme';

export type StatHelpEntry={id:StatHelpId;label:string};
export function StatHelpDisclosure({label,entries}:{label:string;entries:readonly StatHelpEntry[]}){
 const language=useGameLanguage(),C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const [expanded,setExpanded]=useState(false);
 if(!entries.length)return null;
 return <View style={s.wrap}>
  <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{expanded}} onPress={()=>setExpanded(v=>!v)} style={({pressed})=>[s.trigger,pressed&&s.pressed]}>
   <Text style={s.label}>{label}</Text><Text accessible={false} style={s.icon}>{expanded?'ⓘ −':'ⓘ'}</Text>
  </Pressable>
  {expanded?<View style={s.content}>{entries.map(entry=><View key={entry.id} style={s.entry}><Text style={s.name}>{entry.label}</Text><Text style={s.copy}>{statHelpText(language,entry.id)}</Text></View>)}</View>:null}
 </View>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 wrap:{borderColor:C.line,borderBottomWidth:StyleSheet.hairlineWidth},
 trigger:{minHeight:44,flexDirection:'row',alignItems:'center',gap:spacing.sm,paddingHorizontal:spacing.sm,paddingVertical:spacing.xs},
 label:{...typography.caption,color:C.text,flex:1,fontWeight:'700'},icon:{color:C.accent,fontSize:18},
 pressed:{backgroundColor:C.panel2},content:{padding:spacing.sm,gap:spacing.sm,backgroundColor:C.panel2},entry:{gap:2},
 name:{...typography.bodyStrong,color:C.text},copy:{...typography.body,color:C.muted}
});}
