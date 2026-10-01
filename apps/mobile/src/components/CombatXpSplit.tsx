import {useGameplayText} from '../i18n/gameplay';
import {useMemo,useRef,useState} from 'react';
import {Image,Pressable,StyleSheet,Text,View} from 'react-native';
import {classSkillsFor} from '../content/class-skills';
import {normalizeTrainingFocus,type TrainingFocus} from '../core/class-skills';
import type {GameCommand} from '../core/game-commands';
import type {GameState} from '../core/types';
import {radii,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {classSkillIcon} from '../theme/class-skill-assets';

const splits:ReadonlyArray<{focus:TrainingFocus;primary:number;secondary:number}>=[
  {focus:'secondary',primary:25,secondary:75},
  {focus:'balanced',primary:50,secondary:50},
  {focus:'primary',primary:75,secondary:25},
];

export function CombatXpSplit({state,onCommand}:{state:GameState;onCommand:(command:GameCommand)=>Promise<void>}){
 const {gt,gl,language}=useGameplayText();
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),lock=useRef(false);
  if(!state.character)return null;
  const [primary,secondary]=classSkillsFor(state.character.classId),focus=normalizeTrainingFocus(state.character.trainingFocus);
  const selected=splits.find(split=>split.focus===focus)!;
  async function choose(next:TrainingFocus){
    if(lock.current||next===focus)return;
    lock.current=true;setBusy(true);setError('');
    try{await onCommand({type:'class_focus',args:{focus:next}});}
    catch(error){setError(error instanceof Error?error.message:'Could not save the XP split. Try again.');}
    finally{lock.current=false;setBusy(false);}
  }
  return <View style={s.panel}>
    <Text accessibilityRole="header" style={s.heading}>{gt("COMBAT SKILL XP SPLIT")}</Text>
    <View style={s.skills}>
      <View style={s.skillIdentity}><Image accessible={false} source={classSkillIcon(primary.id)} resizeMode="contain" style={s.skillIcon}/><Text style={s.skill}>{primary.name} <Text style={s.percent}>{selected.primary}%</Text></Text></View>
      <View style={[s.skillIdentity,s.skillIdentityRight]}><Image accessible={false} source={classSkillIcon(secondary.id)} resizeMode="contain" style={s.skillIcon}/><Text style={[s.skill,s.right]}>{secondary.name} <Text style={s.percent}>{selected.secondary}%</Text></Text></View>
    </View>
    <View accessibilityRole="radiogroup" accessibilityLabel={gt("{primary} / {secondary} XP split",{primary:primary.name,secondary:secondary.name})} style={s.options}>
      {splits.map(split=><Pressable key={split.focus} accessibilityRole="radio" accessibilityLabel={`${primary.name} ${split.primary}%, ${secondary.name} ${split.secondary}%`} aria-checked={focus===split.focus} accessibilityState={{checked:focus===split.focus,disabled:busy}} disabled={busy} onPress={()=>void choose(split.focus)} style={({pressed})=>[s.option,focus===split.focus&&s.selected,pressed&&s.pressed,busy&&s.busy]}>
        <Text style={[s.ratio,focus===split.focus&&s.selectedText]}>{split.primary} / {split.secondary}</Text>
      </Pressable>)}
    </View>
    <Text accessibilityLiveRegion="polite" style={s.hint}>{busy?gt("Saving XP split…"):gt("Applies to new fights and drills. The one in progress keeps its split.")}</Text>
    {error?<Text accessibilityRole="alert" style={s.error}>{gl(error)}</Text>:null}
  </View>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
  panel:{padding:12,gap:8,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},
  heading:{...typography.caption,color:C.muted,fontWeight:'800',letterSpacing:.7},
  skills:{flexDirection:'row',gap:12},skillIdentity:{flex:1,minWidth:0,gap:4,alignItems:'flex-start'},skillIdentityRight:{alignItems:'flex-end'},skillIcon:{width:32,height:32},skill:{...typography.bodyStrong,color:C.text,flexShrink:1},right:{textAlign:'right'},percent:{color:C.selectionLine},
  options:{flexDirection:'row',gap:8},option:{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',paddingVertical:8,paddingHorizontal:4,borderWidth:1,borderColor:C.secondaryButtonBorder,borderRadius:radii.sm,backgroundColor:C.inputBg},
  selected:{borderColor:C.selectionLine,backgroundColor:C.selection},ratio:{...typography.bodyStrong,color:C.muted},selectedText:{color:C.selectionLine},
  pressed:{opacity:.76},busy:{opacity:.6},hint:{...typography.caption,color:C.muted},error:{...typography.caption,color:C.bad},
});}
