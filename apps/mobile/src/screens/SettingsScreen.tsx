import {useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {GameButton} from '../components/GameButton';
import {SettingToggle} from '../components/SettingToggle';
import {Panel} from '../components/Panel';
import {DeveloperTools} from '../components/DeveloperTools';
import {OnlineAccountPanel} from '../components/OnlineAccountPanel';
import {SaveTransferPanel} from '../components/SaveTransferPanel';
import {GameState} from '../core/types';
import {C,equipmentColors,THEMES,type ThemeId,typography} from '../theme/theme';
import {useTheme} from '../theme/ThemeProvider';
import {LANGUAGE_NAMES,SUPPORTED_LANGUAGES,t} from '../i18n';
import {GameGuidePanel} from '../components/GameGuidePanel';
import {GuideTopicModal} from '../components/GuideTopicModal';
import {acknowledgeGameGuide,guideDefinition} from '../core/onboarding';
import type {GameGuideId} from '../core/onboarding';

type Props={
  online?:boolean;
  state:GameState;
  onLanguage:(language:GameState['settings']['language'])=>void;
  onReset:()=>void;
  onChange:(next:GameState)=>void;
  onExport:()=>Promise<void>;
  onImport:(raw:string)=>Promise<void>;
  onOpenChatPilot?:()=>void;
  onOpenChatEmotes?:()=>void;
  onOpenCoopUiGallery?:()=>void;
};
type SettingsSection='appearance'|'gameplay'|'accessibility'|'account'|'data'|'guide'|'developer';
function SettingChip({label,selected,onPress}:{label:string;selected:boolean;onPress:()=>void}){return <Pressable accessibilityRole="button" accessibilityState={{selected}} onPress={onPress} style={({pressed})=>[s.chip,selected&&s.chipSelected,pressed&&s.pressed]}><Text style={[s.chipText,selected&&s.chipTextSelected]}>{selected?'✓ ':''}{label}</Text></Pressable>}

export function SettingsScreen({state,onLanguage,onReset,onChange,onExport,onImport,onOpenChatPilot,onOpenChatEmotes,onOpenCoopUiGallery,online=false}:Props){
  const [section,setSection]=useState<SettingsSection>('appearance');
  const {colors}=useTheme();
  const [guideId,setGuideId]=useState<GameGuideId>();
  const {fontScale}=useWindowDimensions();
  const update=(partial:Partial<GameState['settings']>)=>onChange({...state,settings:{...state.settings,...partial}});
  const restoreDefaults=()=>update({numberMode:'abbreviated',autoEatThresholdPct:40,stopCombatWhenOutOfFood:true});
  return <><ScrollView contentContainerStyle={s.root}>
    <Text accessibilityRole="header" style={[s.h,{color:colors.text}]}>{t(state.settings.language,'settings.title')}</Text>
    <Text style={[s.sub,{color:colors.muted}]}>{t(state.settings.language,'settings.intro')}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>{(['appearance','gameplay','accessibility','account','data','guide',...(__DEV__&&!online?['developer' as const]:[])] as SettingsSection[]).map(value=><SettingChip key={value} label={value==='guide'?'Help & Guide':value.charAt(0).toUpperCase()+value.slice(1)} selected={section===value} onPress={()=>setSection(value)}/>)}</ScrollView><Text style={[s.sectionHint,{color:colors.info}]}>{section==='appearance'?'Choose a complete UI theme. Every theme keeps the same semantic states and touch hierarchy.':section==='gameplay'?'Tune combat, number display, and auto-eat behavior.':section==='accessibility'?'Make text, motion, and language fit your play style.':section==='account'?'Manage your connected account and profile preferences.':section==='data'?'Export, import, or recover your local progress.':section==='guide'?'Browse the interactive VELDRYN help guide.':'Development tools and visual QA controls.'}</Text>
    {section==='appearance'&&<Panel>
      <Text style={[s.title,{color:colors.text}]}>Interface theme</Text>
      <Text style={[s.sub,{color:colors.muted}]}>Three complete palettes share the same semantic roles for actions, rewards, warnings, status and selection. The VELDRYN theme is the recommended default.</Text>
      <View style={s.themeList}>{(Object.keys(THEMES) as ThemeId[]).map(id=>{const theme=THEMES[id],selected=(state.settings.themeId??'veldryn')===id;return <Pressable key={id} accessibilityRole="button" accessibilityState={{selected}} onPress={()=>update({themeId:id})} style={({pressed})=>[s.themeCard,{backgroundColor:theme.colors.panel,borderColor:selected?theme.colors.selectionLine:theme.colors.line},selected&&s.themeCardSelected,pressed&&s.pressed]}>
        <View style={s.themeTop}><View style={s.flex}><Text style={[s.themeName,{color:theme.colors.text}]}>{theme.name}{id==='veldryn'?' · Recommended':''}</Text><Text style={[s.themeDescription,{color:theme.colors.muted}]}>{theme.description}</Text></View><Text style={[s.themeCheck,{color:selected?theme.colors.selectionLine:theme.colors.muted}]}>{selected?'✓':'○'}</Text></View>
        <View style={s.swatches}><View style={[s.swatch,{backgroundColor:theme.colors.bg}]}/><View style={[s.swatch,{backgroundColor:theme.colors.panel2}]}/><View style={[s.swatch,{backgroundColor:theme.colors.accent}]}/><View style={[s.swatch,{backgroundColor:theme.colors.action}]}/><View style={[s.swatch,{backgroundColor:theme.colors.good}]}/><View style={[s.swatch,{backgroundColor:theme.colors.bad}]}/></View>
      </Pressable>})}</View>
    </Panel>}
    {section==='guide'&&<GameGuidePanel state={state} onOpen={id=>{onChange(acknowledgeGameGuide(state,id,true));setGuideId(id)}}/>}
    {section==='account'&&<><Panel>
      <Text style={s.title}>{t(state.settings.language,'settings.account')}</Text>
      <Text style={s.sub}>Character: {state.character?.name??'Not created yet'} · {online?'Online save':'Local save'}</Text>
      <Text style={s.muted}>{online?'Your progress is saved after every successful action.':'Local progress is kept separately from online characters.'}</Text>
    </Panel>
    <OnlineAccountPanel state={state}/></>}
    {section==='gameplay'&&<><Panel>
      <Text style={s.title}>{t(state.settings.language,'settings.gameplay')}</Text>
      <Text style={s.sub}>Activities continue while closed up to your current AFK reserve.</Text>
      <Text style={s.settingLabel}>Number display</Text><View style={s.choices}>{(['abbreviated','exact'] as const).map(mode=><SettingChip key={mode} label={mode==='abbreviated'?'Abbreviated · 1.2K':'Exact · 1,200'} selected={state.settings.numberMode===mode} onPress={()=>update({numberMode:mode})}/>)}</View>
      <Text style={s.settingLabel}>Auto-eat threshold</Text><Text style={s.sub}>Eat equipped food when HP falls below the selected level.</Text><View style={s.choices}>{([20,40,60,80] as const).map(threshold=><SettingChip key={threshold} label={`${threshold}% HP`} selected={state.settings.autoEatThresholdPct===threshold} onPress={()=>update({autoEatThresholdPct:threshold})}/>)}</View>
      <SettingToggle label="Stop combat when out of food" value={state.settings.stopCombatWhenOutOfFood} onValueChange={value=>update({stopCombatWhenOutOfFood:value})}/>
      <GameButton title="Restore gameplay defaults" tone="secondary" onPress={restoreDefaults}/>
    </Panel>
    {__DEV__&&onOpenChatEmotes?<Panel>
      <Text style={s.title}>Chat</Text>
      <Text style={s.sub}>Development review only. Emote choices use the same account-scoped preference store as the Chat Pilot.</Text>
      <GameButton title="Emote Tray · 20 slots" tone="secondary" onPress={onOpenChatEmotes}/>
    </Panel>:null}</>}
    {section==='accessibility'&&<><Panel>
      <Text style={s.title}>{t(state.settings.language,'settings.notifications')}</Text>
      <Text style={s.sub}>Completion, inventory-full and quest-reset reminders.</Text>
      <Text style={s.muted}>Push notifications are not connected in this offline build.</Text>
      <GameButton title="Notification preferences (coming soon)" tone="secondary" onPress={()=>{}} disabled/>
    </Panel>
    <Panel>
      <Text style={s.title}>{t(state.settings.language,'settings.accessibility')}</Text>
      <Text style={s.sub}>Text scaling follows your device setting up to the selected maximum. Reduced motion disables repeating combat and progress effects.</Text>
      <SettingToggle label="Reduced motion" description="Turn off repeating combat and progress effects." value={state.settings.reduceMotion} onValueChange={value=>update({reduceMotion:value})}/><Text style={s.settingLabel}>Maximum text scale</Text>
      <View style={s.choices}>{([1,1.15,1.3,1.5] as const).map(scale=><SettingChip key={scale} label={`${scale}× max`} selected={state.settings.textScale===scale} onPress={()=>update({textScale:scale})}/>)}</View>
    </Panel>
    <Panel>
      <Text style={s.title}>{t(state.settings.language,'settings.language')}</Text>
      <Text style={s.sub}>{t(state.settings.language,'settings.languageStatus')}</Text>
      <View style={s.languageGrid}>{SUPPORTED_LANGUAGES.map(id=><SettingChip key={id} label={LANGUAGE_NAMES[id]} selected={state.settings.language===id} onPress={()=>onLanguage(id)}/>)}</View>
    </Panel></>}
    {section==='data'&&<><Panel>
      <Text style={s.title}>{t(state.settings.language,'settings.session')}</Text>
      <Text style={s.sub}>{state.activity?`Active: ${state.activity.targetId} (${state.activity.kind})`:'No activity running'}</Text>
      <GameButton title="Stop current activity" tone="danger" disabled={!state.activity} onPress={()=>onChange({...state,activity:null})}/>
    </Panel>
    <>{online?<GameButton title="Export a copy of my online save" tone="secondary" onPress={()=>void onExport()}/>:<SaveTransferPanel onExport={onExport} onImport={onImport} reduceMotion={state.settings.reduceMotion}/>}</>
    <Panel>
      <Text style={s.title}>{t(state.settings.language,'settings.privacy')}</Text>
      <Text style={s.sub}>{online?'Your account and gameplay progress are stored on VELDRYN servers. Your older local save stays on this device.':'Offline progress remains on this device. Local progress cannot be uploaded as online rewards.'}</Text>
      {!online&&<GameButton title="Delete local save" tone="danger" onPress={onReset}/>}
    </Panel></>}
    {section==='developer'&&__DEV__&&!online&&<DeveloperTools state={state} onChange={onChange} onOpenChatPilot={onOpenChatPilot} onOpenCoopUiGallery={onOpenCoopUiGallery}/>}
  </ScrollView><GuideTopicModal definition={guideId?guideDefinition(guideId):undefined} visible={!!guideId} onClose={()=>setGuideId(undefined)}/></>;
}

const s=StyleSheet.create({root:{padding:16,gap:12},themeList:{gap:10},themeCard:{minHeight:112,borderWidth:2,borderRadius:14,padding:12,gap:10},themeCardSelected:{transform:[{scale:1.005}]},themeTop:{flexDirection:'row',alignItems:'flex-start',gap:8},themeName:{...typography.bodyStrong,fontSize:15},themeDescription:{...typography.caption,lineHeight:18,marginTop:3},themeCheck:{fontSize:22,fontWeight:'900'},swatches:{flexDirection:'row',gap:6},swatch:{flex:1,height:22,borderRadius:5,borderWidth:StyleSheet.hairlineWidth,borderColor:'#80808055'},h:{...typography.hero,color:C.text},title:{...typography.title,color:C.text,marginBottom:5},sub:{color:C.muted,lineHeight:20,marginBottom:8},muted:{color:C.muted,lineHeight:19,opacity:.8},tabs:{gap:6,paddingRight:16},sectionHint:{...typography.caption,color:C.info,lineHeight:18},chip:{minHeight:40,paddingHorizontal:13,justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.bg},chipSelected:{borderColor:equipmentColors.selectedLine,backgroundColor:equipmentColors.selected},chipText:{fontSize:12,color:C.muted,fontWeight:'700'},chipTextSelected:{color:'#d9f3ff'},pressed:{opacity:.76},settingLabel:{...typography.bodyStrong,color:C.text,marginTop:8},choices:{flexDirection:'row',flexWrap:'wrap',gap:8},choice:{flexGrow:1,flexBasis:120,minWidth:120},largeChoice:{flexBasis:'100%' as const},languageGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},languageChoice:{minWidth:96,flexGrow:1},flex:{flex:1}});
