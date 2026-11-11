import {profileT,profileText} from '../../i18n/profile';
import {useGameLanguage} from '../../i18n/GameLanguageProvider';
import {useMemo} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {WardrobeCategory} from '../../core/profile-wardrobe';
import type {ChipKind} from './ProfileLookPanel';
import {radii,typography,type ThemeColors} from '../../theme/theme';
import {useGameTheme} from '../../theme/ThemeContext';

/** Category chips sit in the pinned header beside the stage, and wrap rather than scroll:
 * Pets, Titles and Badges stopped being reachable once they ran off the right edge. */
export function ProfileWardrobeChips({categories,chip,onChange}:{categories:readonly WardrobeCategory[];chip:ChipKind;onChange:(next:ChipKind)=>void}){
 const language=useGameLanguage();
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const selected=categories.find(row=>row.kind===chip);
 return <View style={s.root}>
  <View accessibilityRole="tablist" style={s.chips}>
  {categories.map(row=><Pressable key={row.kind} accessibilityRole="tab" accessibilityState={{selected:chip===row.kind}}
    accessibilityLabel={profileText(language,row.label)+', '+profileT(language,'{owned} of {total} unlocked',{owned:row.owned,total:row.total})}
    onPress={()=>onChange(row.kind)} style={({pressed})=>[s.chip,chip===row.kind&&s.chipOn,pressed&&s.pressed]}>
   <Text style={[s.chipText,chip===row.kind&&s.chipTextOn]}>{profileText(language,row.label)}</Text>
   <Text style={[s.chipCount,chip===row.kind&&s.chipCountOn]}>{row.owned}/{row.total}</Text>
  </Pressable>)}
  <Pressable accessibilityRole="tab" accessibilityState={{selected:chip==='badge'}} accessibilityLabel={profileT(language,"Badges")}
    onPress={()=>onChange('badge')} style={({pressed})=>[s.chip,chip==='badge'&&s.chipOn,pressed&&s.pressed]}>
   <Text style={[s.chipText,chip==='badge'&&s.chipTextOn]}>{profileT(language,"Badges")}</Text>
  </Pressable>
  </View>
  {selected?<View accessibilityLabel={profileT(language,'{owned} of {total} unlocked',{owned:selected.owned,total:selected.total})} style={s.bar}>
   <View style={[s.barFill,{width:`${selected.total?Math.round(selected.owned/selected.total*100):0}%`}]}/>
  </View>:null}
 </View>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{gap:7},
 chips:{flexDirection:'row',flexWrap:'wrap',gap:6},
 bar:{height:4,borderRadius:99,overflow:'hidden',backgroundColor:C.panel2},
 barFill:{height:'100%',borderRadius:99,backgroundColor:C.info},
 chip:{minHeight:34,flexDirection:'row',alignItems:'center',gap:5,paddingHorizontal:10,borderRadius:99,borderWidth:1,borderColor:C.line,backgroundColor:C.panel},
 chipOn:{borderColor:C.selectionLine,backgroundColor:C.selection},
 chipText:{...typography.caption,color:C.muted,fontWeight:'800'},
 chipTextOn:{color:C.text},
 chipCount:{fontSize:9,color:C.disabled,fontWeight:'900'},
 chipCountOn:{color:C.info},
 pressed:{opacity:.74},
});}
