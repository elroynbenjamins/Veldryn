import React from 'react';
import {ScrollView,StyleSheet,Text,View} from 'react-native';
import {GameButton} from '../components/GameButton';
import {Panel} from '../components/Panel';
import {DeveloperTools} from '../components/DeveloperTools';
import {OnlineAccountPanel} from '../components/OnlineAccountPanel';
import {SaveTransferPanel} from '../components/SaveTransferPanel';
import {GameState} from '../core/types';
import {C} from '../theme/theme';
import {LANGUAGE_NAMES,SUPPORTED_LANGUAGES,t} from '../i18n';

type Props={
  state:GameState;
  onLanguage:(language:GameState['settings']['language'])=>void;
  onReset:()=>void;
  onChange:(next:GameState)=>void;
  onExport:()=>Promise<void>;
  onImport:(raw:string)=>Promise<void>;
  onOpenChatPilot?:()=>void;
  onOpenChatEmotes?:()=>void;
};

export function SettingsScreen({state,onLanguage,onReset,onChange,onExport,onImport,onOpenChatPilot,onOpenChatEmotes}:Props){
  const update=(partial:Partial<GameState['settings']>)=>onChange({...state,settings:{...state.settings,...partial}});
  const restoreDefaults=()=>update({numberMode:'abbreviated',reduceMotion:false,textScale:1,autoEatThresholdPct:40,stopCombatWhenOutOfFood:true});
  return <ScrollView contentContainerStyle={s.root}>
    <Text style={s.h}>{t(state.settings.language,'settings.title')}</Text>
    <Text style={s.sub}>{t(state.settings.language,'settings.intro')}</Text>
    <Panel>
      <Text style={s.title}>{t(state.settings.language,'settings.account')}</Text>
      <Text style={s.sub}>Character: {state.character?.name??'Not created yet'} · Local save · schema v{state.version}</Text>
      <Text style={s.muted}>Cloud sync is optional while the online game systems are introduced.</Text>
    </Panel>
    <OnlineAccountPanel state={state}/>
    <Panel>
      <Text style={s.title}>{t(state.settings.language,'settings.gameplay')}</Text>
      <Text style={s.sub}>Activities continue while closed up to your current AFK reserve.</Text>
      <GameButton title={`Numbers: ${state.settings.numberMode==='abbreviated'?'Abbreviated':'Exact'}`} tone="secondary" onPress={()=>update({numberMode:state.settings.numberMode==='abbreviated'?'exact':'abbreviated'})}/>
      <GameButton title={`Auto-eat below ${state.settings.autoEatThresholdPct}% HP`} tone="secondary" onPress={()=>update({autoEatThresholdPct:state.settings.autoEatThresholdPct>=80?20:state.settings.autoEatThresholdPct+20})}/>
      <GameButton title={`Stop combat when out of food: ${state.settings.stopCombatWhenOutOfFood?'On':'Off'}`} tone="secondary" onPress={()=>update({stopCombatWhenOutOfFood:!state.settings.stopCombatWhenOutOfFood})}/>
      <GameButton title="Restore gameplay defaults" tone="secondary" onPress={restoreDefaults}/>
    </Panel>
    {__DEV__&&onOpenChatEmotes?<Panel>
      <Text style={s.title}>Chat</Text>
      <Text style={s.sub}>Development review only. Emote choices use the same account-scoped preference store as the Chat Pilot.</Text>
      <GameButton title="Emote Tray · 20 slots" tone="secondary" onPress={onOpenChatEmotes}/>
    </Panel>:null}
    <Panel>
      <Text style={s.title}>{t(state.settings.language,'settings.notifications')}</Text>
      <Text style={s.sub}>Completion, inventory-full and quest-reset reminders.</Text>
      <Text style={s.muted}>Push notifications are not connected in this offline build.</Text>
      <GameButton title="Notification preferences (coming soon)" tone="secondary" onPress={()=>{}} disabled/>
    </Panel>
    <Panel>
      <Text style={s.title}>{t(state.settings.language,'settings.accessibility')}</Text>
      <Text style={s.sub}>Text scaling follows your device setting up to the selected maximum. Reduced motion disables repeating combat and progress effects.</Text>
      <GameButton title={`Reduced motion: ${state.settings.reduceMotion?'On':'Off'}`} tone="secondary" onPress={()=>update({reduceMotion:!state.settings.reduceMotion})}/>
      <View style={s.row}>{([1,1.15,1.3,1.5] as const).map(scale=><View style={s.flex} key={scale}><GameButton title={`${scale}× max`} tone={state.settings.textScale===scale?'primary':'secondary'} onPress={()=>update({textScale:scale})}/></View>)}</View>
    </Panel>
    <Panel>
      <Text style={s.title}>{t(state.settings.language,'settings.language')}</Text>
      <Text style={s.sub}>{t(state.settings.language,'settings.languageStatus')}</Text>
      <View style={s.languageGrid}>{SUPPORTED_LANGUAGES.map(id=><View key={id} style={s.languageChoice}><GameButton title={LANGUAGE_NAMES[id]} tone={state.settings.language===id?'primary':'secondary'} onPress={()=>onLanguage(id)}/></View>)}</View>
    </Panel>
    <Panel>
      <Text style={s.title}>{t(state.settings.language,'settings.session')}</Text>
      <Text style={s.sub}>{state.activity?`Active: ${state.activity.targetId} (${state.activity.kind})`:'No activity running'}</Text>
      <GameButton title="Stop current activity" tone="danger" disabled={!state.activity} onPress={()=>onChange({...state,activity:null})}/>
    </Panel>
    <SaveTransferPanel onExport={onExport} onImport={onImport} reduceMotion={state.settings.reduceMotion}/>
    <Panel>
      <Text style={s.title}>{t(state.settings.language,'settings.privacy')}</Text>
      <Text style={s.sub}>Offline progress remains on this device until you explicitly sign in and sync a profile. No service-role or private key is ever stored in the app.</Text>
      <GameButton title="Delete local save" tone="danger" onPress={onReset}/>
    </Panel>
    <DeveloperTools state={state} onChange={onChange} onOpenChatPilot={onOpenChatPilot}/>
  </ScrollView>;
}

const s=StyleSheet.create({root:{padding:16,gap:12},h:{color:C.text,fontSize:25,fontWeight:'900'},title:{color:C.text,fontSize:18,fontWeight:'900',marginBottom:5},sub:{color:C.muted,lineHeight:20,marginBottom:8},muted:{color:C.muted,lineHeight:19,opacity:.8},row:{flexDirection:'row',gap:8},languageGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},languageChoice:{minWidth:96,flexGrow:1},flex:{flex:1}});
