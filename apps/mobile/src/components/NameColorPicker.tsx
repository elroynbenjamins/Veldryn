import {profileT,profileText} from '../i18n/profile';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {useMemo} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {GameTextInput} from './GameTextInput';
import {
 NAME_COLOR_PALETTE,NAME_COLOR_TONES,NAME_COLOR_TONE_LABELS,isHexColor,nameColorPaletteMatch,normalizeHexColor,
} from '../core/player-name-style';
import {radii,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

/** Two ways to pick one colour: tap a curated swatch, or type an exact hex code.
 * The field keeps raw text so a half-typed code is not snapped to a fallback mid-edit. */
export function NameColorPicker({label,value,onChangeText,onPick,disabled=false,accessibilityLabel}:{
 label:string;value:string;onChangeText:(text:string)=>void;onPick:(hex:string)=>void;disabled?:boolean;accessibilityLabel?:string;
}){
 const language=useGameLanguage();
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const valid=isHexColor(value),resolved=normalizeHexColor(value),active=valid?nameColorPaletteMatch(value):undefined;
 return <View style={s.root}>
  <View style={s.head}>
   <Text style={s.label}>{profileText(language,label)}</Text>
   <Text style={[s.hint,!valid&&s.hintBad]}>{valid?resolved:profileT(language,"Needs a 3 or 6 digit hex code")}</Text>
  </View>
  <View style={s.row}>
   <View style={[s.preview,{backgroundColor:valid?resolved:C.panel2,borderColor:valid?resolved:C.line}]}/>
   <View style={s.field}>
    <GameTextInput accessibilityLabel={accessibilityLabel??profileText(language,label)} value={value} onChangeText={onChangeText}
     editable={!disabled} autoCapitalize="characters" autoCorrect={false} maxLength={7} placeholder="#8F7CFF"/>
   </View>
  </View>
  {NAME_COLOR_TONES.map(tone=><View key={tone} style={s.toneRow}>
   <Text style={s.tone}>{profileText(language,NAME_COLOR_TONE_LABELS[tone])}</Text>
   <View style={s.swatches}>
    {NAME_COLOR_PALETTE.filter(row=>row.tone===tone).map(row=><Pressable key={row.id} accessibilityRole="button"
      accessibilityLabel={profileText(language,row.name)+' '+row.color} accessibilityState={{selected:active===row.id,disabled}}
      disabled={disabled} onPress={()=>onPick(row.color)}
      style={({pressed})=>[s.swatchHit,pressed&&s.pressed,disabled&&s.disabled]}>
     <View style={[s.swatch,{backgroundColor:row.color},active===row.id&&s.swatchOn]}/>
    </Pressable>)}
   </View>
  </View>)}
 </View>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{gap:7},
 head:{flexDirection:'row',alignItems:'center',gap:8},
 label:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.7,flex:1,minWidth:0},
 hint:{fontSize:9.5,color:C.muted,fontWeight:'800',letterSpacing:.4},
 hintBad:{color:C.warning},
 row:{flexDirection:'row',alignItems:'center',gap:8},
 preview:{width:40,height:40,borderRadius:radii.sm,borderWidth:1},
 field:{flex:1,minWidth:120},
 toneRow:{flexDirection:'row',alignItems:'center',gap:8},
 tone:{width:54,fontSize:9,lineHeight:12,color:C.muted,fontWeight:'800'},
 swatches:{flex:1,flexDirection:'row',flexWrap:'wrap',gap:2},
 swatchHit:{width:44,height:36,alignItems:'center',justifyContent:'center'},
 swatch:{width:28,height:28,borderRadius:99,borderWidth:1,borderColor:C.dark?'rgba(255,255,255,.22)':'rgba(0,0,0,.18)'},
 swatchOn:{borderWidth:3,borderColor:C.text},
 pressed:{opacity:.7},
 disabled:{opacity:.42},
});}
