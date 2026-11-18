import {useMemo} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {PublicProfileCharacterChoice} from '../online/profile-extension-v43';
import {radii,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

/** Compact hero switcher; current accounts create no more than three heroes. */
export function ProfileCharacterSelector({choices,selectedId,onSelect,disabled=false}:{
 choices?:PublicProfileCharacterChoice[];selectedId:string;onSelect:(characterId:string)=>void;disabled?:boolean;
}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 if(!choices||choices.length<2)return null;
 return <View style={s.root}>
  <Text style={s.kicker}>CHARACTER SHOWCASES</Text>
  <View style={s.row}>
   {choices.map(hero=>{
    const selected=hero.id===selectedId;
    return <Pressable key={hero.id} accessibilityRole="button" accessibilityLabel={'Show '+hero.name+' profile'}
     accessibilityState={{selected,disabled:disabled||selected}} disabled={disabled||selected}
     onPress={()=>onSelect(hero.id)} style={({pressed})=>[s.choice,selected&&s.chosen,pressed&&s.pressed]}>
      <Text numberOfLines={1} style={[s.name,selected&&s.nameChosen]}>{hero.name}</Text>
      <Text numberOfLines={1} style={s.meta}>Lv. {hero.level} · {hero.classId.replace(/_/g,' ')}</Text>
    </Pressable>;
   })}
  </View>
 </View>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 root:{gap:6},
 kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.6},
 row:{flexDirection:'row',flexWrap:'wrap',gap:6},
 choice:{flexGrow:1,flexBasis:'30%',minWidth:86,minHeight:53,borderWidth:1,borderColor:C.line,borderRadius:radii.md,
  backgroundColor:C.panel2,paddingHorizontal:7,paddingVertical:6,justifyContent:'center',gap:3},
 chosen:{borderColor:C.selectionLine,backgroundColor:C.selection},
 pressed:{opacity:.65},
 name:{...typography.caption,color:C.text,fontWeight:'800'},
 nameChosen:{color:C.accent},
 meta:{fontSize:9.5,lineHeight:12,color:C.muted},
});}
