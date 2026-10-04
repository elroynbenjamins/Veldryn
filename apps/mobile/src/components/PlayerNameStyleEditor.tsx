import {profileT,profileText,profileError} from '../i18n/profile';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {GameTextInput} from './GameTextInput';
import {PlayerStyledName} from './PlayerStyledName';
import {SettingToggle} from './SettingToggle';
import type {GameState} from '../core/types';
import {
  DEFAULT_VIP_NAME_COLOR,SUPPORTER_NAME_PRESETS,normalizeHexColor,normalizePlayerNameStyle,
  playerNameStyleEntitlements,type PlayerNameStylePreference,
} from '../core/player-name-style';
import type {SavePlayerNameStyle} from '../core/player-name-style-save';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

type ColorFields={solid:string;a:string;b:string;c:string};
function colorFields(draft:PlayerNameStylePreference,fallback:string|undefined):ColorFields{
 const stored=normalizePlayerNameStyle(draft);
 return {solid:stored.solidColor??fallback??DEFAULT_VIP_NAME_COLOR,
  a:stored.gradientColors?.[0]??SUPPORTER_NAME_PRESETS[0].colors[0],
  b:stored.gradientColors?.[1]??SUPPORTER_NAME_PRESETS[0].colors[1],
  c:stored.gradientColors?.[2]??stored.gradientColors?.[1]??SUPPORTER_NAME_PRESETS[0].colors[2]};
}

export function PlayerNameStyleEditor({state,draft,onDraftChange,onSaveNameStyle,onInputDirtyChange,resetVersion=0,active=true}:{
 state:GameState;draft:PlayerNameStylePreference;onDraftChange:(style:PlayerNameStylePreference)=>void;
 onSaveNameStyle:SavePlayerNameStyle;onInputDirtyChange?:(dirty:boolean)=>void;resetVersion?:number;active?:boolean;
}){
 const language=useGameLanguage();
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),entitlements=playerNameStyleEntitlements(state);
 const fieldKey=JSON.stringify(colorFields(draft,state.account.vipPlusNameColor));
 const [fields,setFields]=useState<ColorFields>(()=>JSON.parse(fieldKey)),[saving,setSaving]=useState(false),[message,setMessage]=useState('');
 const savingRef=useRef(false),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 useEffect(()=>{setFields(JSON.parse(fieldKey) as ColorFields);},[fieldKey,resetVersion]);
 useEffect(()=>{setMessage('');},[resetVersion]);
 const inputDirty=JSON.stringify(fields)!==fieldKey;
 useEffect(()=>{onInputDirtyChange?.(inputDirty);},[inputDirty,onInputDirtyChange]);
 useEffect(()=>()=>onInputDirtyChange?.(false),[onInputDirtyChange]);
 const playerName=state.character?.name??'Adventurer';
 const canApply=draft.mode==='default'||draft.mode==='solid'&&entitlements.canUseSolidRgb||draft.mode==='gradient'&&entitlements.canUseAdvanced;
 const editField=(key:keyof ColorFields,value:string)=>{setFields(current=>({...current,[key]:value}));setMessage('');};
 const previewStyle=(style:PlayerNameStylePreference)=>{const normalized=normalizePlayerNameStyle(style);setFields(colorFields(normalized,state.account.vipPlusNameColor));onDraftChange(normalized);setMessage('');};
 const chooseSolid=()=>previewStyle({mode:'solid',solidColor:normalizeHexColor(fields.solid),animation:'none'});
 const choosePreset=(preset:(typeof SUPPORTER_NAME_PRESETS)[number])=>previewStyle({mode:'gradient',gradientColors:[...preset.colors],animation:preset.animation});
 const chooseCustom=()=>previewStyle({mode:'gradient',gradientColors:[normalizeHexColor(fields.a),normalizeHexColor(fields.b),normalizeHexColor(fields.c)],animation:draft.mode==='gradient'?draft.animation??'none':'none'});
 const save=async()=>{
  if(!canApply||inputDirty||savingRef.current)return;
  savingRef.current=true;setSaving(true);setMessage('');
  try{await onSaveNameStyle(draft);if(mounted.current)setMessage('Name style saved.');}
  catch(error){if(mounted.current)setMessage(profileError(language,error,'Could not save name style.'));}
  finally{savingRef.current=false;if(mounted.current)setSaving(false);}
 };
 return <View style={s.root}>
  <View style={s.head}><View style={s.flex}><Text style={s.eyebrow}>{profileT(language,"PLAYER NAME STYLE")}</Text><Text style={s.title}>{profileT(language,"Chat & social identity")}</Text></View><View style={[s.entitlement,entitlements.supporter&&s.supporter]}><Text style={[s.entitlementText,entitlements.supporter&&s.supporterText]}>{entitlements.supporter?'SUPPORTER':entitlements.vipPlus?'VIP+':profileT(language,"LOCKED")}</Text></View></View>
  <Text style={s.copy}>{profileT(language,"VIP+ permanently unlocks a solid RGB/HEX name color. Supporter stacks with VIP+ and unlocks multi-color gradients and slow motion styles while active.")}</Text>
  <View style={s.preview}><Text style={s.previewLabel}>{profileT(language,"LIVE PREVIEW")}</Text><PlayerStyledName name={playerName} nameStyle={draft} reduceMotion={state.settings.reduceMotion||!active} style={s.previewName}/></View>
  <View style={s.section}>
   <Text style={s.sectionTitle}>{profileT(language,"VIP+ · SOLID RGB")}</Text>
   <Text style={s.meta}>{entitlements.vipPlus?profileT(language,"Permanent unlock active."):profileT(language,"Requires VIP+ for permanent use. Active Supporter can also use solid colors while subscribed.")}</Text>
   <View style={s.inputRow}><View style={s.colorField}><GameTextInput accessibilityLabel={profileT(language,"Solid player name color")} value={fields.solid} onChangeText={value=>editField('solid',value)} editable={entitlements.canUseSolidRgb&&!saving} autoCapitalize="characters" maxLength={7} placeholder="#8F7CFF"/></View><View style={s.action}><GameButton compact title={profileT(language,"Preview solid")} tone="secondary" disabled={!entitlements.canUseSolidRgb||saving} onPress={chooseSolid}/></View></View>
  </View>
  <View style={s.section}>
   <Text style={s.sectionTitle}>{profileT(language,"SUPPORTER · ADVANCED STYLES")}</Text>
   <Text style={s.meta}>{entitlements.supporter?profileT(language,"Subscription active · gradients and motion are available."):profileT(language,"Requires active Supporter. Your saved gradient remains stored and VIP+ falls back to its permanent solid color.")}</Text>
   <View style={s.presets}>{SUPPORTER_NAME_PRESETS.map(preset=><Pressable key={preset.id} accessibilityRole="button" accessibilityState={{disabled:!entitlements.canUseAdvanced||saving}} disabled={!entitlements.canUseAdvanced||saving} onPress={()=>choosePreset(preset)} style={({pressed})=>[s.preset,pressed&&s.pressed,(!entitlements.canUseAdvanced||saving)&&s.disabled]}><PlayerStyledName name={preset.name} nameStyle={{mode:'gradient',gradientColors:[...preset.colors],animation:preset.animation}} reduceMotion={state.settings.reduceMotion||!active} style={s.presetName}/><Text style={s.presetMeta}>{preset.id==='prismatic'?profileT(language,"Spectrum flow"):preset.colors.join(' → ')}</Text></Pressable>)}</View>
   <Text style={s.customTitle}>{profileT(language,"CUSTOM 3-COLOR GRADIENT")}</Text>
   <View style={s.colorInputs}>
    <GameTextInput accessibilityLabel={profileT(language,"Gradient color one")} value={fields.a} onChangeText={value=>editField('a',value)} editable={entitlements.canUseAdvanced&&!saving} autoCapitalize="characters" maxLength={7}/>
    <GameTextInput accessibilityLabel={profileT(language,"Gradient color two")} value={fields.b} onChangeText={value=>editField('b',value)} editable={entitlements.canUseAdvanced&&!saving} autoCapitalize="characters" maxLength={7}/>
    <GameTextInput accessibilityLabel={profileT(language,"Gradient color three")} value={fields.c} onChangeText={value=>editField('c',value)} editable={entitlements.canUseAdvanced&&!saving} autoCapitalize="characters" maxLength={7}/>
   </View>
   <GameButton compact title={profileT(language,"Preview custom gradient")} tone="secondary" disabled={!entitlements.canUseAdvanced||saving} onPress={chooseCustom}/>
   <SettingToggle label={profileT(language,"Slow flowing gradient")} description={profileT(language,"Reduced Motion always renders this as a static gradient.")} value={draft.mode==='gradient'&&draft.animation==='flow'} disabled={!entitlements.canUseAdvanced||draft.mode!=='gradient'||saving} onValueChange={value=>{if(draft.mode==='gradient'){onDraftChange({...draft,animation:value?'flow':'none'});setMessage('');}}}/>
  </View>
  {inputDirty?<Text style={s.meta}>{profileT(language,"Preview your color changes before saving.")}</Text>:null}
  <View style={s.footer}><GameButton compact title={profileT(language,"Use default name")} tone="secondary" disabled={saving} onPress={()=>previewStyle({mode:'default',animation:'none'})}/><View style={s.save}><GameButton title={saving?profileT(language,"Saving…"):profileT(language,"Save name style")} loading={saving} disabled={!canApply||inputDirty||saving} onPress={()=>void save()}/></View></View>
  {message?<Text accessibilityRole="alert" style={s.message}>{profileText(language,message)}</Text>:null}
 </View>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{gap:spacing.md},head:{flexDirection:'row',alignItems:'center',gap:spacing.sm},flex:{flex:1,minWidth:0},eyebrow:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.9},title:{...typography.title,color:C.text},
 entitlement:{paddingHorizontal:7,paddingVertical:4,borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.panel2},entitlementText:{fontSize:8,color:C.muted,fontWeight:'900',letterSpacing:.6},supporter:{borderColor:C.info,backgroundColor:C.infoSurface},supporterText:{color:C.info},
 copy:{...typography.body,color:C.muted,lineHeight:20},preview:{minHeight:68,justifyContent:'center',alignItems:'center',gap:4,padding:10,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.bg},previewLabel:{fontSize:8,color:C.muted,fontWeight:'900',letterSpacing:.8},previewName:{fontSize:24,fontWeight:'900'},
 section:{gap:8,paddingTop:4},sectionTitle:{...typography.bodyStrong,color:C.text},meta:{...typography.caption,color:C.muted,lineHeight:17},inputRow:{flexWrap:'wrap',flexDirection:'row',alignItems:'center',gap:8},colorField:{flex:1,minWidth:140},action:{minWidth:118},presets:{flexDirection:'row',flexWrap:'wrap',gap:7},preset:{minHeight:48,minWidth:112,flexGrow:1,padding:8,gap:2,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},presetName:{...typography.bodyStrong},presetMeta:{fontSize:8.5,lineHeight:12,color:C.muted},pressed:{opacity:.72},disabled:{opacity:.42},customTitle:{fontSize:9,color:C.accent,fontWeight:'900',letterSpacing:.65,marginTop:2},colorInputs:{gap:7},footer:{flexWrap:'wrap',flexDirection:'row',alignItems:'center',gap:8},save:{flex:1},message:{...typography.caption,color:C.info,lineHeight:17},
});}
