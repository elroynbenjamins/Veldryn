import {useMemo} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../../core/types';
import {
 ASCENDANT_BACKGROUND_BLESSING_BPS,ASCENDANT_BLESSING_CHOICES,ASCENDANT_PET_BLESSING_BPS,
 ASCENDANT_PROGRESSION_BLESSINGS_ENABLED,ascendantBlessingLabel,type AscendantBlessing,
} from '../../core/ascendant-blessings';
import {ascendantBlessingInputFromState,selectAscendantBlessing,type AscendantBlessingEquipSlot} from '../../core/ascendant-blessing-state';
import {radii,typography,type ThemeColors} from '../../theme/theme';
import {useGameTheme} from '../../theme/ThemeContext';

export function AscendantBlessingPicker({state,slot,onChange}:{state:GameState;slot:AscendantBlessingEquipSlot;onChange:(next:GameState)=>void|Promise<void>}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 if(!ASCENDANT_PROGRESSION_BLESSINGS_ENABLED||!state.character)return null;
 const input=ascendantBlessingInputFromState(state),row=input[slot];
 if(!row?.equipped||!row.owned||!row.eligible)return null;
 const selected=slot==='pet'?state.character.ascendantPetBlessing:state.character.ascendantBackgroundBlessing;
 const bps=slot==='pet'?ASCENDANT_PET_BLESSING_BPS:ASCENDANT_BACKGROUND_BLESSING_BPS;
 const choose=(blessing:AscendantBlessing)=>{void Promise.resolve(onChange(selectAscendantBlessing(state,slot,blessing)))};
 return <View style={s.root}>
  <View style={s.head}>
   <View style={s.flex}><Text style={s.eyebrow}>ASCENDANT BLESSING</Text><Text style={s.copy}>Choose one equipped bonus. You can change it freely.</Text></View>
   <View style={s.value}><Text style={s.valueText}>+{bps/100}%</Text></View>
  </View>
  <View accessibilityRole="radiogroup" style={s.choices}>
   {ASCENDANT_BLESSING_CHOICES.map(blessing=>{
    const active=selected===blessing;
    return <Pressable key={blessing} accessibilityRole="radio" accessibilityState={{checked:active}} onPress={()=>choose(blessing)}
      style={({pressed})=>[s.choice,active&&s.choiceOn,pressed&&s.pressed]}>
     <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.82} style={[s.choiceText,active&&s.choiceTextOn]}>{ascendantBlessingLabel(blessing)}</Text>
     <Text style={[s.amount,active&&s.amountOn]}>+{bps/100}%</Text>
    </Pressable>;
   })}
  </View>
 </View>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{gap:8,padding:10,borderWidth:1,borderColor:C.warning,borderRadius:radii.md,backgroundColor:C.warningSurface},
 head:{flexDirection:'row',alignItems:'center',gap:8},flex:{flex:1,minWidth:0},
 eyebrow:{...typography.caption,color:C.warning,fontWeight:'900',letterSpacing:.7},
 copy:{fontSize:9.5,lineHeight:13,color:C.muted,marginTop:2},
 value:{paddingHorizontal:7,paddingVertical:4,borderRadius:99,borderWidth:1,borderColor:C.warning},
 valueText:{fontSize:10,color:C.warning,fontWeight:'900'},
 choices:{flexDirection:'row',gap:5},
 choice:{flex:1,minWidth:0,minHeight:44,paddingHorizontal:5,paddingVertical:5,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel},
 choiceOn:{borderColor:C.selectionLine,backgroundColor:C.selection},
 choiceText:{fontSize:9,color:C.muted,fontWeight:'800',textAlign:'center'},
 choiceTextOn:{color:C.text},amount:{fontSize:8,color:C.disabled,fontWeight:'900',marginTop:1},amountOn:{color:C.good},
 pressed:{opacity:.7},
});}
