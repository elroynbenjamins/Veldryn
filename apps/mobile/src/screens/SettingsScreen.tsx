import {useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {GameButton} from '../components/GameButton';
import {SettingToggle} from '../components/SettingToggle';
import {Panel} from '../components/Panel';
import {DeveloperTools} from '../components/DeveloperTools';
import {OnlineAccountPanel} from '../components/OnlineAccountPanel';
import {SaveTransferPanel} from '../components/SaveTransferPanel';
import {GameState} from '../core/types';
import {C,equipmentColors,typography,UI_THEME_OPTIONS} from '../theme/theme';
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
type SettingsSection='gameplay'|'appearance'|'accessibility'|'account'|'data'|'guide'|'developer';
function SettingChip({label,selected,onPress}:{label:string;selected:boolean;onPress:()=>void}){return <Pressable accessibilityRole="button" accessibilityState={{selected}} onPress={onPress} style={({pressed})=>[s.chip,selected&&s.chipSelected,pressed&&s.pressed]}><Text style={[s.chipText,selected&&s.chipTextSelected]}>{selected?'✓ ':''}{label}</Text></Pressable>}

export function SettingsScreen({state,onLanguage,onReset,onChange,onExport,onImport,onOpenChatPilot,onOpenChatEmotes,onOpenCoopUiGallery,online=false}:Props){
  const [section,setSection]=useState<SettingsSection>('gameplay');
  const [guideId,setGuideId]=useState<GameGuideId>();
  const {fontScale}=useWindowDimensions();
  const update=(partial:Partial<GameState['settings']>)=>onChange({...state,settings:{...state.settings,...partial}});
  const restoreDefaults=()=>update({numberMode:'abbreviated',autoEatThresholdPct:40,stopCombatWhenOutOfFood:true});
  return <><ScrollView contentContainerStyle={s.root}>
    <Text accessibilityRole="header" style={s.h}>{t(state.settings.language,'settings.title')}</Text>
    <Text style={s.sub}>{t(state.settings.language,'settings.intro')}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>{(['gameplay','appearance','accessibility','account','data','guide',...(__DEV__&&!online?['developer' as const]:[])] as SettingsSection[]).map(value=><SettingChip key={value} label={value==='guide'?'Help & Guide':value.charAt(0).toUpperCase()+value.slice(1)} selected={section===value} onPress={()=>setSection(value)}/>)}</ScrollView><Text style={s.sectionHint}>{section==='gameplay'?'Tune combat, number display, and auto-eat behavior.':section==='appearance'?'Choose how VELDRYN presents contrast, surfaces, and interaction colors.':section==='accessibility'?'Make text, motion, and language fit your play style.':section==='account'?'Manage your connected account and profile preferences.':section==='data'?'Export, import, or recover your local progress.':section==='guide'?'Browse the interactive VELDRYN help guide.':'Development tools and visual QA controls.'}</Text>
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
    {section==='appearance'&&<><Panel>
      <Text style={s.title}>Interface theme</Text>
      <Text style={s.sub}>Themes change the complete UI palette while preserving gameplay colors, region identity, rarity colors, and pixel artwork.</Text>
      <View style={s.themeList}>{UI_THEME_OPTIONS.map(option=>{const selected=state.settings.uiTheme===option.id;return <Pressable key={option.id} accessibilityRole="button" accessibilityState={{selected}} onPress={()=>update({uiTheme:option.id})} style={({pressed})=>[s.themeCard,selected&&s.themeCardSelected,pressed&&s.pressed]}>
        <View style={s.themeCopy}><View style={s.themeTitleRow}><Text style={s.themeTitle}>{option.label}</Text>{option.id==='veldryn'?<Text style={s.recommended}>RECOMMENDED</Text>:null}{selected?<Text style={s.selectedMark}>✓ ACTIVE</Text>:null}</View><Text style={s.themeDescription}>{option.description}</Text></View>
        <View style={s.swatches}>{option.preview.map((color,index)=><View key={color+index} style={[s.swatch,{backgroundColor:color}]}/>)}</View>
      </Pressable>})}</View>
      <Text style={s.muted}>High-contrast themes increase separation between text, controls, borders, and surfaces. Theme choice is saved with your settings.</Text>
    </Panel></>}
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

const s=StyleSheet.create({root:{padding:16,gap:12},h:{...typography.hero,color:C.text},title:{...typography.title,color:C.text,marginBottom:5},sub:{color:C.muted,lineHeight:20,marginBottom:8},muted:{color:C.muted,lineHeight:19,opacity:.8},tabs:{gap:6,paddingRight:16},sectionHint:{...typography.caption,color:C.info,lineHeight:18},chip:{minHeight:40,paddingHorizontal:13,justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.bg},chipSelected:{borderColor:equipmentColors.selectedLine,backgroundColor:equipmentColors.selected},chipText:{fontSize:12,color:C.muted,fontWeight:'700'},chipTextSelected:{color:'#d9f3ff'},pressed:{opacity:.76},settingLabel:{...typography.bodyStrong,color:C.text,marginTop:8},choices:{flexDirection:'row',flexWrap:'wrap',gap:8},choice:{flexGrow:1,flexBasis:120,minWidth:120},largeChoice:{flexBasis:'100%' as const},languageGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},languageChoice:{minWidth:96,flexGrow:1},themeList:{gap:8},themeCard:{minHeight:96,gap:10,padding:12,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel2},themeCardSelected:{borderWidth:2,borderColor:equipmentColors.selectedLine,backgroundColor:equipmentColors.selected},themeCopy:{gap:4},themeTitleRow:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:7},themeTitle:{...typography.bodyStrong,color:C.text},themeDescription:{...typography.caption,color:C.muted,lineHeight:17},recommended:{fontSize:9,lineHeight:13,fontWeight:'900',letterSpacing:.7,color:equipmentColors.goldSoft},selectedMark:{fontSize:9,lineHeight:13,fontWeight:'900',letterSpacing:.7,color:C.info},swatches:{height:22,flexDirection:'row',overflow:'hidden',borderWidth:1,borderColor:C.line,borderRadius:6},swatch:{flex:1},flex:{flex:1}});
