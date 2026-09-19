"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsScreen = SettingsScreen;
const react_1 = require("react");
const react_native_1 = require("react-native");
const GameButton_1 = require("../components/GameButton");
const SettingToggle_1 = require("../components/SettingToggle");
const Panel_1 = require("../components/Panel");
const DeveloperTools_1 = require("../components/DeveloperTools");
const OnlineAccountPanel_1 = require("../components/OnlineAccountPanel");
const SaveTransferPanel_1 = require("../components/SaveTransferPanel");
const theme_1 = require("../theme/theme");
const i18n_1 = require("../i18n");
function SettingsScreen({ state, onLanguage, onReset, onChange, onExport, onImport, onOpenChatPilot, onOpenChatEmotes, onOpenCoopUiGallery, online = false }) {
    const [section, setSection] = (0, react_1.useState)('gameplay');
    const { fontScale } = (0, react_native_1.useWindowDimensions)();
    const choiceStyle = [s.choice, fontScale > 1.2 && s.largeChoice];
    const update = (partial) => onChange({ ...state, settings: { ...state.settings, ...partial } });
    const restoreDefaults = () => update({ numberMode: 'abbreviated', autoEatThresholdPct: 40, stopCombatWhenOutOfFood: true });
    return <react_native_1.ScrollView contentContainerStyle={s.root}>
    <react_native_1.Text style={s.h}>{(0, i18n_1.t)(state.settings.language, 'settings.title')}</react_native_1.Text>
    <react_native_1.Text style={s.sub}>{(0, i18n_1.t)(state.settings.language, 'settings.intro')}</react_native_1.Text>
    <react_native_1.ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>{['gameplay', 'accessibility', 'account', 'data', ...(__DEV__ && !online ? ['developer'] : [])].map(value => <GameButton_1.GameButton compact key={value} title={value.charAt(0).toUpperCase() + value.slice(1)} selected={section === value} tone={section === value ? 'primary' : 'secondary'} onPress={() => setSection(value)}/>)}</react_native_1.ScrollView>
    {section === 'account' && <><Panel_1.Panel>
      <react_native_1.Text style={s.title}>{(0, i18n_1.t)(state.settings.language, 'settings.account')}</react_native_1.Text>
      <react_native_1.Text style={s.sub}>Character: {state.character?.name ?? 'Not created yet'} · {online ? 'Online save' : 'Local save'}</react_native_1.Text>
      <react_native_1.Text style={s.muted}>{online ? 'Your progress is saved after every successful action.' : 'Local progress is kept separately from online characters.'}</react_native_1.Text>
    </Panel_1.Panel>
    <OnlineAccountPanel_1.OnlineAccountPanel state={state}/></>}
    {section === 'gameplay' && <><Panel_1.Panel>
      <react_native_1.Text style={s.title}>{(0, i18n_1.t)(state.settings.language, 'settings.gameplay')}</react_native_1.Text>
      <react_native_1.Text style={s.sub}>Activities continue while closed up to your current AFK reserve.</react_native_1.Text>
      <react_native_1.Text style={s.settingLabel}>Number display</react_native_1.Text><react_native_1.View style={s.choices}>{['abbreviated', 'exact'].map(mode => <react_native_1.View style={choiceStyle} key={mode}><GameButton_1.GameButton title={mode === 'abbreviated' ? 'Abbreviated · 1.2K' : 'Exact · 1,200'} selected={state.settings.numberMode === mode} tone={state.settings.numberMode === mode ? 'primary' : 'secondary'} onPress={() => update({ numberMode: mode })}/></react_native_1.View>)}</react_native_1.View>
      <react_native_1.Text style={s.settingLabel}>Auto-eat threshold</react_native_1.Text><react_native_1.Text style={s.sub}>Eat equipped food when HP falls below the selected level.</react_native_1.Text><react_native_1.View style={s.choices}>{[20, 40, 60, 80].map(threshold => <react_native_1.View style={choiceStyle} key={threshold}><GameButton_1.GameButton title={`${threshold}% HP`} selected={state.settings.autoEatThresholdPct === threshold} tone={state.settings.autoEatThresholdPct === threshold ? 'primary' : 'secondary'} onPress={() => update({ autoEatThresholdPct: threshold })}/></react_native_1.View>)}</react_native_1.View>
      <SettingToggle_1.SettingToggle label="Stop combat when out of food" value={state.settings.stopCombatWhenOutOfFood} onValueChange={value => update({ stopCombatWhenOutOfFood: value })}/>
      <GameButton_1.GameButton title="Restore gameplay defaults" tone="secondary" onPress={restoreDefaults}/>
    </Panel_1.Panel>
    {__DEV__ && onOpenChatEmotes ? <Panel_1.Panel>
      <react_native_1.Text style={s.title}>Chat</react_native_1.Text>
      <react_native_1.Text style={s.sub}>Development review only. Emote choices use the same account-scoped preference store as the Chat Pilot.</react_native_1.Text>
      <GameButton_1.GameButton title="Emote Tray · 20 slots" tone="secondary" onPress={onOpenChatEmotes}/>
    </Panel_1.Panel> : null}</>}
    {section === 'accessibility' && <><Panel_1.Panel>
      <react_native_1.Text style={s.title}>{(0, i18n_1.t)(state.settings.language, 'settings.notifications')}</react_native_1.Text>
      <react_native_1.Text style={s.sub}>Completion, inventory-full and quest-reset reminders.</react_native_1.Text>
      <react_native_1.Text style={s.muted}>Push notifications are not connected in this offline build.</react_native_1.Text>
      <GameButton_1.GameButton title="Notification preferences (coming soon)" tone="secondary" onPress={() => { }} disabled/>
    </Panel_1.Panel>
    <Panel_1.Panel>
      <react_native_1.Text style={s.title}>{(0, i18n_1.t)(state.settings.language, 'settings.accessibility')}</react_native_1.Text>
      <react_native_1.Text style={s.sub}>Text scaling follows your device setting up to the selected maximum. Reduced motion disables repeating combat and progress effects.</react_native_1.Text>
      <SettingToggle_1.SettingToggle label="Reduced motion" description="Turn off repeating combat and progress effects." value={state.settings.reduceMotion} onValueChange={value => update({ reduceMotion: value })}/><react_native_1.Text style={s.settingLabel}>Maximum text scale</react_native_1.Text>
      <react_native_1.View style={s.choices}>{[1, 1.15, 1.3, 1.5].map(scale => <react_native_1.View style={choiceStyle} key={scale}><GameButton_1.GameButton title={`${scale}× max`} selected={state.settings.textScale === scale} tone={state.settings.textScale === scale ? 'primary' : 'secondary'} onPress={() => update({ textScale: scale })}/></react_native_1.View>)}</react_native_1.View>
    </Panel_1.Panel>
    <Panel_1.Panel>
      <react_native_1.Text style={s.title}>{(0, i18n_1.t)(state.settings.language, 'settings.language')}</react_native_1.Text>
      <react_native_1.Text style={s.sub}>{(0, i18n_1.t)(state.settings.language, 'settings.languageStatus')}</react_native_1.Text>
      <react_native_1.View style={s.languageGrid}>{i18n_1.SUPPORTED_LANGUAGES.map(id => <react_native_1.View key={id} style={s.languageChoice}><GameButton_1.GameButton title={i18n_1.LANGUAGE_NAMES[id]} selected={state.settings.language === id} tone={state.settings.language === id ? 'primary' : 'secondary'} onPress={() => onLanguage(id)}/></react_native_1.View>)}</react_native_1.View>
    </Panel_1.Panel></>}
    {section === 'data' && <><Panel_1.Panel>
      <react_native_1.Text style={s.title}>{(0, i18n_1.t)(state.settings.language, 'settings.session')}</react_native_1.Text>
      <react_native_1.Text style={s.sub}>{state.activity ? `Active: ${state.activity.targetId} (${state.activity.kind})` : 'No activity running'}</react_native_1.Text>
      <GameButton_1.GameButton title="Stop current activity" tone="danger" disabled={!state.activity} onPress={() => onChange({ ...state, activity: null })}/>
    </Panel_1.Panel>
    <>{online ? <GameButton_1.GameButton title="Export a copy of my online save" tone="secondary" onPress={() => void onExport()}/> : <SaveTransferPanel_1.SaveTransferPanel onExport={onExport} onImport={onImport} reduceMotion={state.settings.reduceMotion}/>}</>
    <Panel_1.Panel>
      <react_native_1.Text style={s.title}>{(0, i18n_1.t)(state.settings.language, 'settings.privacy')}</react_native_1.Text>
      <react_native_1.Text style={s.sub}>{online ? 'Your account and gameplay progress are stored on VELDRYN servers. Your older local save stays on this device.' : 'Offline progress remains on this device. Local progress cannot be uploaded as online rewards.'}</react_native_1.Text>
      {!online && <GameButton_1.GameButton title="Delete local save" tone="danger" onPress={onReset}/>}
    </Panel_1.Panel></>}
    {section === 'developer' && __DEV__ && !online && <DeveloperTools_1.DeveloperTools state={state} onChange={onChange} onOpenChatPilot={onOpenChatPilot} onOpenCoopUiGallery={onOpenCoopUiGallery}/>}
  </react_native_1.ScrollView>;
}
const s = react_native_1.StyleSheet.create({ root: { padding: 16, gap: 12 }, h: { ...theme_1.typography.hero, color: theme_1.C.text }, title: { ...theme_1.typography.title, color: theme_1.C.text, marginBottom: 5 }, sub: { color: theme_1.C.muted, lineHeight: 20, marginBottom: 8 }, muted: { color: theme_1.C.muted, lineHeight: 19, opacity: .8 }, tabs: { gap: 8, paddingRight: 16 }, settingLabel: { ...theme_1.typography.bodyStrong, color: theme_1.C.text, marginTop: 8 }, choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, choice: { flexGrow: 1, flexBasis: 120, minWidth: 120 }, largeChoice: { flexBasis: '100%' }, languageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, languageChoice: { minWidth: 96, flexGrow: 1 }, flex: { flex: 1 } });
