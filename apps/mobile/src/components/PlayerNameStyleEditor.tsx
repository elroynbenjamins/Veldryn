import {useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {GameTextInput} from './GameTextInput';
import {Panel} from './Panel';
import {PlayerNameText} from './PlayerNameText';
import {SettingToggle} from './SettingToggle';
import type {GameState} from '../core/types';
import {
  DEFAULT_PLAYER_NAME_GRADIENT,DEFAULT_PLAYER_NAME_SOLID,SUPPORTER_NAME_PRESETS,
  normalizeNameHexColor,normalizePlayerNameStyle,playerNameStyleEntitlements,
  supporterPresetStyle,withPlayerNameStyle,type PlayerNameStyleSelection,
} from '../core/player-name-style';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

export function PlayerNameStyleEditor({state,onChange}:{state:GameState;onChange:(next:GameState)=>void}){
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),entitlements=playerNameStyleEntitlements(state);
  const stored=normalizePlayerNameStyle(state.account.playerNameStyle);
  const [draft,setDraft]=useState<PlayerNameStyleSelection>(stored);
  const [solidInput,setSolidInput]=useState(stored.solidColor);
  const [gradientA,setGradientA]=useState(stored.gradientColors[0]??DEFAULT_PLAYER_NAME_GRADIENT[0]);
  const [gradientB,setGradientB]=useState(stored.gradientColors[1]??DEFAULT_PLAYER_NAME_GRADIENT[1]);
  const [gradientC,setGradientC]=useState(stored.gradientColors[2]??DEFAULT_PLAYER_NAME_GRADIENT[2]);
  const playerName=state.character?.name??'Adventurer';
  const canApply=draft.mode==='default'||(draft.mode==='solid'&&entitlements.canSolid)||(draft.mode==='gradient'&&entitlements.canGradient);
  const save=()=>{if(!canApply)return;onChange(withPlayerNameStyle(state,draft));};
  const chooseSolid=()=>{
    const color=normalizeNameHexColor(solidInput,DEFAULT_PLAYER_NAME_SOLID);
    setSolidInput(color);setDraft(current=>({...current,mode:'solid',solidColor:color,animated:false}));
  };
  const chooseGradient=()=>{
    const colors=[normalizeNameHexColor(gradientA,DEFAULT_PLAYER_NAME_GRADIENT[0]),normalizeNameHexColor(gradientB,DEFAULT_PLAYER_NAME_GRADIENT[1]),normalizeNameHexColor(gradientC,DEFAULT_PLAYER_NAME_GRADIENT[2])];
    setGradientA(colors[0]);setGradientB(colors[1]);setGradientC(colors[2]);
    setDraft(current=>({...current,mode:'gradient',gradientColors:colors,presetId:'custom',animated:entitlements.canAnimated&&current.animated}));
  };
  const choosePreset=(id:(typeof SUPPORTER_NAME_PRESETS)[number]['id'])=>{
    const next=supporterPresetStyle(id,solidInput);setDraft(next);
    setGradientA(next.gradientColors[0]);setGradientB(next.gradientColors[1]);setGradientC(next.gradientColors[2]??next.gradientColors[1]);
  };
  return <Panel>
    <View style={s.head}><View style={s.flex}><Text style={s.eyebrow}>PLAYER NAME STYLE</Text><Text style={s.title}>Chat & social identity</Text></View><View style={[s.entitlement,entitlements.supporter&&s.supporter]}><Text style={[s.entitlementText,entitlements.supporter&&s.supporterText]}>{entitlements.supporter?'SUPPORTER':entitlements.vipPlus?'VIP+':'STANDARD'}</Text></View></View>
    <Text style={s.copy}>VIP+ permanently unlocks a custom solid RGB/HEX name color. Supporter stacks with VIP+ and unlocks two- or three-color gradients plus slow flowing styles while the subscription is active.</Text>
    <View style={s.preview}><Text style={s.previewLabel}>LIVE PREVIEW</Text><PlayerNameText name={playerName} nameStyle={draft} reduceMotion={state.settings.reduceMotion} style={s.previewName}/></View>

    <View style={s.section}><Text style={s.sectionTitle}>VIP+ · SOLID RGB</Text><Text style={s.meta}>{entitlements.vipPlus?'Permanent unlock active.':'Requires VIP+ for permanent use. Active Supporter can also use a solid style while subscribed.'}</Text>
      <View style={s.inputRow}><GameTextInput accessibilityLabel="Solid player name color" value={solidInput} onChangeText={setSolidInput} autoCapitalize="characters" maxLength={7} placeholder="#7BD7FF"/><View style={s.action}><GameButton compact title="Preview solid" tone="secondary" disabled={!entitlements.canSolid} onPress={chooseSolid}/></View></View>
    </View>

    <View style={s.section}><Text style={s.sectionTitle}>SUPPORTER · ADVANCED STYLES</Text><Text style={s.meta}>{entitlements.supporter?'Subscription active · gradients and motion are available.':'Requires an active Supporter subscription. Your saved design remains stored if the subscription ends.'}</Text>
      <View style={s.presets}>{SUPPORTER_NAME_PRESETS.map(preset=><Pressable key={preset.id} accessibilityRole="button" disabled={!entitlements.canGradient} accessibilityState={{selected:draft.presetId===preset.id,disabled:!entitlements.canGradient}} onPress={()=>choosePreset(preset.id)} style={({pressed})=>[s.preset,draft.presetId===preset.id&&s.presetOn,pressed&&s.pressed,!entitlements.canGradient&&s.disabled]}><PlayerNameText name={preset.name} nameStyle={supporterPresetStyle(preset.id,solidInput)} reduceMotion={state.settings.reduceMotion} style={s.presetName}/><Text style={s.presetMeta}>{preset.description}</Text></Pressable>)}</View>
      <Text style={s.customTitle}>CUSTOM 3-COLOR GRADIENT</Text>
      <View style={s.colorInputs}><GameTextInput accessibilityLabel="Gradient color one" value={gradientA} onChangeText={setGradientA} autoCapitalize="characters" maxLength={7} placeholder="#42D9FF"/><GameTextInput accessibilityLabel="Gradient color two" value={gradientB} onChangeText={setGradientB} autoCapitalize="characters" maxLength={7} placeholder="#8B5CFF"/><GameTextInput accessibilityLabel="Gradient color three" value={gradientC} onChangeText={setGradientC} autoCapitalize="characters" maxLength={7} placeholder="#FF65C8"/></View>
      <GameButton compact title="Preview custom gradient" tone="secondary" disabled={!entitlements.canGradient} onPress={chooseGradient}/>
      <SettingToggle label="Slow flowing gradient" description="Subtle movement only. Reduced Motion always renders the same style as a static gradient." value={draft.animated===true} disabled={!entitlements.canAnimated||draft.mode!=='gradient'} onValueChange={value=>setDraft(current=>({...current,animated:value}))}/>
    </View>

    <View style={s.footer}><GameButton compact title="Use default name" tone="secondary" onPress={()=>setDraft(current=>({...current,mode:'default',animated:false}))}/><View style={s.save}><GameButton title="Save name style" disabled={!canApply} onPress={save}/></View></View>
    {draft.mode==='gradient'&&!entitlements.supporter&&entitlements.vipPlus?<Text style={s.fallback}>Supporter is inactive, so this saved gradient will display as your VIP+ solid color until Supporter is active again.</Text>:null}
    {draft.mode!=='default'&&!entitlements.supporter&&!entitlements.vipPlus?<Text style={s.fallback}>No name-style entitlement is active. The saved design is kept, but other players see the standard name style.</Text>:null}
  </Panel>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
  head:{flexDirection:'row',alignItems:'center',gap:spacing.sm},flex:{flex:1,minWidth:0},eyebrow:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.9},title:{...typography.title,color:C.text},
  entitlement:{paddingHorizontal:7,paddingVertical:4,borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.panel2},entitlementText:{fontSize:8,color:C.muted,fontWeight:'900',letterSpacing:.6},supporter:{borderColor:C.info,backgroundColor:C.infoSurface},supporterText:{color:C.info},
  copy:{...typography.body,color:C.muted,lineHeight:20},preview:{minHeight:68,justifyContent:'center',alignItems:'center',gap:4,padding:10,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.bg},previewLabel:{fontSize:8,color:C.muted,fontWeight:'900',letterSpacing:.8},previewName:{fontSize:24,fontWeight:'900'},
  section:{gap:8,paddingTop:4},sectionTitle:{...typography.bodyStrong,color:C.text},meta:{...typography.caption,color:C.muted,lineHeight:17},inputRow:{flexDirection:'row',alignItems:'center',gap:8},action:{minWidth:118},presets:{flexDirection:'row',flexWrap:'wrap',gap:7},preset:{minWidth:112,flexGrow:1,padding:8,gap:2,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},presetOn:{borderColor:C.selectionLine,backgroundColor:C.selection},presetName:{...typography.bodyStrong},presetMeta:{fontSize:8.5,lineHeight:12,color:C.muted},pressed:{opacity:.72},disabled:{opacity:.42},
  customTitle:{fontSize:9,color:C.accent,fontWeight:'900',letterSpacing:.65,marginTop:2},colorInputs:{gap:7},footer:{flexDirection:'row',alignItems:'center',gap:8},save:{flex:1},fallback:{...typography.caption,color:C.info,lineHeight:17},
});}
