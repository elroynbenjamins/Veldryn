import {useState} from 'react';
import {ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {GameButton} from '../components/GameButton';
import {SettingToggle} from '../components/SettingToggle';
import {Panel} from '../components/Panel';
import {DeveloperTools} from '../components/DeveloperTools';
import {OnlineAccountPanel} from '../components/OnlineAccountPanel';
import {SaveTransferPanel} from '../components/SaveTransferPanel';
import {GameState} from '../core/types';
import {C,typography} from '../theme/theme';
import {LANGUAGE_NAMES,SUPPORTED_LANGUAGES,t} from '../i18n';

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
type SettingsSection='gameplay'|'accessibility'|'account'|'data'|'developer';

export function SettingsScreen({state,onLanguage,onReset,onChange,onExport,onImport,onOpenChatPilot,onOpenChatEmotes,onOpenCoopUiGallery,online=false}:Props){
  const [section,setSection]=useState<SettingsSection>('gameplay');
  const {fontScale}=useWindowDimensions();
  const choiceStyle=[s.choice,fontScale>1.2&&s.largeChoice];
  const update=(partial:Partial<GameState['settings']>)=>onChange({...state,settings:{...state.settings,...partial}});
  const restoreDefaults=()=>update({numberMode:'abbreviated',autoEatThresholdPct:40,stopCombatWhenOutOfFood:true});
  return <ScrollView contentContainerStyle={s.root}>
    <Text style={s.h}>{t(state.settings.language,'settings.title')}</Text>
    <Text style={s.sub}>{t(state.settings.language,'settings.intro')}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>{(['gameplay','accessibility','account','data',...(__DEV__&&!online?['developer' as const]:[])] as SettingsSection[]).map(value=><GameButton key={value} title={value.charAt(0).toUpperCase()+value.slice(1)} selected={section===value} tone={section===value?'primary':'secondary'} onPress={()=>setSection(value)}/>)}</ScrollView>
    {section==='account'&&<><Panel>
      <Text style={s.title}>{t(state.settings.language,'settings.account')}</Text>
      <Text style={s.sub}>Character: {state.character?.name??'Not created yet'} · {online?'Online save':'Local save'}</Text>
      <Text style={s.muted}>{online?'Your progress is saved after every successful action.':'Local progress is kept separately from online characters.'}</Text>
    </Panel>
    <OnlineAccountPanel state={state}/></>}
    {section==='gameplay'&&<><Panel>
      <Text style={s.title}>{t(state.settings.language,'settings.gameplay')}</Text>
      <Text style={s.sub}>Activities continue while closed up to your current AFK reserve.</Text>
      <Text style={s.settingLabel}>Number display</Text><View style={s.choices}>{(['abbreviated','exact'] as const).map(mode=><View style={choiceStyle} key={mode}><GameButton title={mode==='abbreviated'?'Abbreviated · 1.2K':'Exact · 1,200'} selected={state.settings.numberMode===mode} tone={state.settings.numberMode===mode?'primary':'secondary'} onPress={()=>update({numberMode:mode})}/></View>)}</View>
      <Text style={s.settingLabel}>Auto-eat threshold</Text><Text style={s.sub}>Eat equipped food when HP falls below the selected level.</Text><View style={s.choices}>{([20,40,60,80] as const).map(threshold=><View style={choiceStyle} key={threshold}><GameButton title={`${threshold}% HP`} selected={state.settings.autoEatThresholdPct===threshold} tone={state.settings.autoEatThresholdPct===threshold?'primary':'secondary'} onPress={()=>update({autoEatThresholdPct:threshold})}/></View>)}</View>
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
      <View style={s.choices}>{([1,1.15,1.3,1.5] as const).map(scale=><View style={choiceStyle} key={scale}><GameButton title={`${scale}× max`} selected={state.settings.textScale===scale} tone={state.settings.textScale===scale?'primary':'secondary'} onPress={()=>update({textScale:scale})}/></View>)}</View>
    </Panel>
    <Panel>
      <Text style={s.title}>{t(state.settings.language,'settings.language')}</Text>
      <Text style={s.sub}>{t(state.settings.language,'settings.languageStatus')}</Text>
      <View style={s.languageGrid}>{SUPPORTED_LANGUAGES.map(id=><View key={id} style={s.languageChoice}><GameButton title={LANGUAGE_NAMES[id]} selected={state.settings.language===id} tone={state.settings.language===id?'primary':'secondary'} onPress={()=>onLanguage(id)}/></View>)}</View>
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
  </ScrollView>;
}

const s=StyleSheet.create({root:{padding:16,gap:12},h:{...typography.hero,color:C.text},title:{...typography.title,color:C.text,marginBottom:5},sub:{color:C.muted,lineHeight:20,marginBottom:8},muted:{color:C.muted,lineHeight:19,opacity:.8},tabs:{gap:8,paddingRight:16},settingLabel:{...typography.bodyStrong,color:C.text,marginTop:8},choices:{flexDirection:'row',flexWrap:'wrap',gap:8},choice:{flexGrow:1,flexBasis:120,minWidth:120},largeChoice:{flexBasis:'100%' as const},languageGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},languageChoice:{minWidth:96,flexGrow:1},flex:{flex:1}});
