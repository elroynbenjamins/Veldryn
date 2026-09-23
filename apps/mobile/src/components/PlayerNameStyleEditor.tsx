import {useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {GameTextInput} from './GameTextInput';
import {Panel} from './Panel';
import {PlayerStyledName} from './PlayerStyledName';
import {SettingToggle} from './SettingToggle';
import type {GameState} from '../core/types';
import {
  DEFAULT_VIP_NAME_COLOR,SUPPORTER_NAME_PRESETS,effectivePlayerNameStyle,normalizeHexColor,normalizePlayerNameStyle,
  playerNameStyleEntitlements,savePlayerNameStyle,type PlayerNameStylePreference,
} from '../core/player-name-style';
import {updateOnlinePlayerNameStyle} from '../online/social';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

export function PlayerNameStyleEditor({state,onChange}:{state:GameState;onChange:(next:GameState)=>void}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),entitlements=playerNameStyleEntitlements(state),stored=normalizePlayerNameStyle(state.account.playerNameStyle);
 const [draft,setDraft]=useState<PlayerNameStylePreference>(stored),[solid,setSolid]=useState(stored.solidColor??state.account.vipPlusNameColor??DEFAULT_VIP_NAME_COLOR);
 const [a,setA]=useState(stored.gradientColors?.[0]??SUPPORTER_NAME_PRESETS[0].colors[0]),[b,setB]=useState(stored.gradientColors?.[1]??SUPPORTER_NAME_PRESETS[0].colors[1]),[c,setC]=useState(stored.gradientColors?.[2]??SUPPORTER_NAME_PRESETS[0].colors[2]);
 const [saving,setSaving]=useState(false),[message,setMessage]=useState('');
 const playerName=state.character?.name??'Adventurer';
 const canApply=draft.mode==='default'||draft.mode==='solid'&&entitlements.canUseSolidRgb||draft.mode==='gradient'&&entitlements.canUseAdvanced;
 const chooseSolid=()=>{const color=normalizeHexColor(solid);setSolid(color);setDraft({mode:'solid',solidColor:color,animation:'none'});};
 const choosePreset=(preset:(typeof SUPPORTER_NAME_PRESETS)[number])=>{const colors=[...preset.colors].slice(0,3);setA(colors[0]);setB(colors[1]);setC(colors[2]??colors[1]);setDraft({mode:'gradient',gradientColors:colors,animation:preset.animation});};
 const chooseCustom=()=>{const colors=[normalizeHexColor(a),normalizeHexColor(b),normalizeHexColor(c)];setA(colors[0]);setB(colors[1]);setC(colors[2]);setDraft({mode:'gradient',gradientColors:colors,animation:draft.mode==='gradient'?draft.animation??'none':'none'});};
 const save=async()=>{if(!canApply||saving)return;setSaving(true);setMessage('');try{const next=savePlayerNameStyle(state,draft);await updateOnlinePlayerNameStyle(effectivePlayerNameStyle(next));onChange(next);setMessage('Name style saved.');}catch(error){setMessage(error instanceof Error?error.message:'Could not save name style.');}finally{setSaving(false)}};
 return <Panel>
  <View style={s.head}><View style={s.flex}><Text style={s.eyebrow}>PLAYER NAME STYLE</Text><Text style={s.title}>Chat & social identity</Text></View><View style={[s.entitlement,entitlements.supporter&&s.supporter]}><Text style={[s.entitlementText,entitlements.supporter&&s.supporterText]}>{entitlements.supporter?'SUPPORTER':entitlements.vipPlus?'VIP+':'STANDARD'}</Text></View></View>
  <Text style={s.copy}>VIP+ permanently unlocks a solid RGB/HEX name color. Supporter stacks with VIP+ and unlocks multi-color gradients and slow motion styles while active.</Text>
  <View style={s.preview}><Text style={s.previewLabel}>LIVE PREVIEW</Text><PlayerStyledName name={playerName} nameStyle={draft} reduceMotion={state.settings.reduceMotion} style={s.previewName}/></View>
  <View style={s.section}><Text style={s.sectionTitle}>VIP+ · SOLID RGB</Text><Text style={s.meta}>{entitlements.vipPlus?'Permanent unlock active.':'Requires VIP+ for permanent use. Active Supporter can also use solid colors while subscribed.'}</Text><View style={s.inputRow}><GameTextInput accessibilityLabel="Solid player name color" value={solid} onChangeText={setSolid} autoCapitalize="characters" maxLength={7} placeholder="#8F7CFF"/><View style={s.action}><GameButton compact title="Preview solid" tone="secondary" disabled={!entitlements.canUseSolidRgb} onPress={chooseSolid}/></View></View></View>
  <View style={s.section}><Text style={s.sectionTitle}>SUPPORTER · ADVANCED STYLES</Text><Text style={s.meta}>{entitlements.supporter?'Subscription active · gradients and motion are available.':'Requires active Supporter. Your saved gradient remains stored and VIP+ falls back to its permanent solid color.'}</Text><View style={s.presets}>{SUPPORTER_NAME_PRESETS.map(preset=><Pressable key={preset.id} accessibilityRole="button" disabled={!entitlements.canUseAdvanced} onPress={()=>choosePreset(preset)} style={({pressed})=>[s.preset,pressed&&s.pressed,!entitlements.canUseAdvanced&&s.disabled]}><PlayerStyledName name={preset.name} nameStyle={{mode:'gradient',gradientColors:[...preset.colors],animation:preset.animation}} reduceMotion={state.settings.reduceMotion} style={s.presetName}/><Text style={s.presetMeta}>{preset.id==='prismatic'?'Spectrum flow':preset.colors.join(' → ')}</Text></Pressable>)}</View>
   <Text style={s.customTitle}>CUSTOM 3-COLOR GRADIENT</Text><View style={s.colorInputs}><GameTextInput accessibilityLabel="Gradient color one" value={a} onChangeText={setA} autoCapitalize="characters" maxLength={7}/><GameTextInput accessibilityLabel="Gradient color two" value={b} onChangeText={setB} autoCapitalize="characters" maxLength={7}/><GameTextInput accessibilityLabel="Gradient color three" value={c} onChangeText={setC} autoCapitalize="characters" maxLength={7}/></View><GameButton compact title="Preview custom gradient" tone="secondary" disabled={!entitlements.canUseAdvanced} onPress={chooseCustom}/>
   <SettingToggle label="Slow flowing gradient" description="Reduced Motion always renders this as a static gradient." value={draft.mode==='gradient'&&draft.animation==='flow'} disabled={!entitlements.canUseAdvanced||draft.mode!=='gradient'} onValueChange={value=>setDraft(current=>current.mode==='gradient'?{...current,animation:value?'flow':'none'}:current)}/>
  </View>
  <View style={s.footer}><GameButton compact title="Use default name" tone="secondary" onPress={()=>setDraft({mode:'default',animation:'none'})}/><View style={s.save}><GameButton title={saving?'Saving…':'Save name style'} disabled={!canApply||saving} onPress={()=>void save()}/></View></View>
  {message?<Text accessibilityRole="alert" style={s.message}>{message}</Text>:null}
 </Panel>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 head:{flexDirection:'row',alignItems:'center',gap:spacing.sm},flex:{flex:1,minWidth:0},eyebrow:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.9},title:{...typography.title,color:C.text},
 entitlement:{paddingHorizontal:7,paddingVertical:4,borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.panel2},entitlementText:{fontSize:8,color:C.muted,fontWeight:'900',letterSpacing:.6},supporter:{borderColor:C.info,backgroundColor:C.infoSurface},supporterText:{color:C.info},
 copy:{...typography.body,color:C.muted,lineHeight:20},preview:{minHeight:68,justifyContent:'center',alignItems:'center',gap:4,padding:10,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.bg},previewLabel:{fontSize:8,color:C.muted,fontWeight:'900',letterSpacing:.8},previewName:{fontSize:24,fontWeight:'900'},
 section:{gap:8,paddingTop:4},sectionTitle:{...typography.bodyStrong,color:C.text},meta:{...typography.caption,color:C.muted,lineHeight:17},inputRow:{flexDirection:'row',alignItems:'center',gap:8},action:{minWidth:118},presets:{flexDirection:'row',flexWrap:'wrap',gap:7},preset:{minWidth:112,flexGrow:1,padding:8,gap:2,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},presetName:{...typography.bodyStrong},presetMeta:{fontSize:8.5,lineHeight:12,color:C.muted},pressed:{opacity:.72},disabled:{opacity:.42},customTitle:{fontSize:9,color:C.accent,fontWeight:'900',letterSpacing:.65,marginTop:2},colorInputs:{gap:7},footer:{flexDirection:'row',alignItems:'center',gap:8},save:{flex:1},message:{...typography.caption,color:C.info,lineHeight:17},
});}