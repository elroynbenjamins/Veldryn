"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MoreScreen = MoreScreen;
const UiIcon_1 = require("../components/UiIcon");
const ui_icons_1 = require("../theme/ui-icons");
const react_native_1 = require("react-native");
const theme_1 = require("../theme/theme");
const i18n_1 = require("../i18n");
const destinations = [
    { id: 'Arena', labelKey: 'more.guild', descriptionKey: 'more.guildDescription' },
    { id: 'Quests', labelKey: 'more.quests', descriptionKey: 'more.questsDescription' },
    { id: 'Skills', labelKey: 'more.skills', descriptionKey: 'more.skillsDescription' },
    { id: 'Events', labelKey: 'more.events', descriptionKey: 'more.eventsDescription' },
    { id: 'Friends', labelKey: 'more.friends', descriptionKey: 'more.friendsDescription' },
    { id: 'Guild', labelKey: 'more.guild', descriptionKey: 'more.guildDescription' },
    { id: 'Settings', labelKey: 'more.settings', descriptionKey: 'more.settingsDescription' },
];
function MoreScreen({ language, onNavigate, onOpenChatPilot }) {
    return <react_native_1.ScrollView contentContainerStyle={s.root}>
    <react_native_1.Text style={s.heading}>Account</react_native_1.Text>
    <react_native_1.Text style={s.sub}>{(0, i18n_1.t)(language, 'more.intro')}</react_native_1.Text>
    <react_native_1.View style={s.list}>{[{ id: 'Social', title: 'Social', description: 'Party, contracts and recruitment' }, { id: 'Home', title: 'Home', description: 'Your activity overview' }, { id: 'Companions', title: 'Companions', description: 'Train, equip, and master your companion roster' }].map(item => <react_native_1.Pressable key={item.id} accessibilityRole="button" onPress={() => onNavigate(item.id)} style={({ pressed }) => [s.card, pressed && s.pressed]}><react_native_1.View style={s.iconFrame}><react_native_1.Image accessible={false} source={ui_icons_1.navigationIcons[item.id]} resizeMode="contain" style={s.icon}/></react_native_1.View><react_native_1.View style={s.copy}><react_native_1.Text style={s.title}>{item.title}</react_native_1.Text><react_native_1.Text style={s.description}>{item.description}</react_native_1.Text></react_native_1.View><UiIcon_1.UiIcon name="next" size={24}/></react_native_1.Pressable>)}{destinations.map(item => <react_native_1.Pressable key={item.id} accessibilityRole="button" accessibilityLabel={(0, i18n_1.t)(language, item.labelKey)} onPress={() => onNavigate(item.id)} style={({ pressed }) => [s.card, pressed && s.pressed]}>
      <react_native_1.View style={s.iconFrame}><react_native_1.Image accessible={false} source={ui_icons_1.navigationIcons[item.id === 'Arena' ? 'Social' : item.id]} resizeMode="contain" style={s.icon}/></react_native_1.View>
      <react_native_1.View style={s.copy}><react_native_1.Text style={s.title}>{item.id === 'Arena' ? 'Arena' : (0, i18n_1.t)(language, item.labelKey)}</react_native_1.Text><react_native_1.Text style={s.description}>{item.id === 'Arena' ? 'Three-character ranked squad' : (0, i18n_1.t)(language, item.descriptionKey)}</react_native_1.Text></react_native_1.View>
      <UiIcon_1.UiIcon name="next" size={24}/>
    </react_native_1.Pressable>)}{onOpenChatPilot ? <react_native_1.Pressable accessibilityRole="button" accessibilityLabel="Open Chat Pilot development screen" onPress={onOpenChatPilot} style={({ pressed }) => [s.card, s.devCard, pressed && s.pressed]}><react_native_1.View style={s.iconFrame}><react_native_1.Image source={ui_icons_1.navigationIcons.Social} resizeMode="contain" style={s.icon}/></react_native_1.View><react_native_1.View style={s.copy}><react_native_1.Text style={s.title}>Chat Pilot</react_native_1.Text><react_native_1.Text style={s.description}>Development-only interactive chat review</react_native_1.Text></react_native_1.View><UiIcon_1.UiIcon name="next" size={24}/></react_native_1.Pressable> : null}</react_native_1.View>
  </react_native_1.ScrollView>;
}
const s = react_native_1.StyleSheet.create({ root: { padding: theme_1.spacing.lg, gap: theme_1.spacing.sm }, heading: { ...theme_1.typography.hero, color: theme_1.C.text }, sub: { ...theme_1.typography.body, color: theme_1.C.muted, marginBottom: theme_1.spacing.sm }, list: { gap: theme_1.spacing.sm }, card: { width: '100%', minHeight: 80, flexDirection: 'row', alignItems: 'center', gap: theme_1.spacing.md, padding: theme_1.spacing.md, borderWidth: react_native_1.StyleSheet.hairlineWidth, borderColor: theme_1.C.line, borderRadius: theme_1.radii.lg, backgroundColor: theme_1.C.panel }, devCard: { borderStyle: 'dashed' }, pressed: { opacity: .76 }, iconFrame: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }, icon: { width: 32, height: 32 }, copy: { flex: 1, minWidth: 0, gap: 4 }, title: { ...theme_1.typography.bodyStrong, color: theme_1.C.text }, description: { ...theme_1.typography.caption, color: theme_1.C.muted }, chevron: { color: theme_1.C.muted, fontSize: 26 } });
