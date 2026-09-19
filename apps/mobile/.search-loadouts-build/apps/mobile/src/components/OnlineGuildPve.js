"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnlineGuildPve = OnlineGuildPve;
const react_1 = require("react");
const react_native_1 = require("react-native");
const GameButton_1 = require("./GameButton");
const Panel_1 = require("./Panel");
const theme_1 = require("../theme/theme");
const supabase_1 = require("../online/supabase");
const social_1 = require("../online/social");
const number_format_1 = require("../core/number-format");
function OnlineGuildPve({ numberMode = 'abbreviated', authoritative = false }) { const [state, setState] = (0, react_1.useState)(null), [busy, setBusy] = (0, react_1.useState)(false); const load = async () => { if (!supabase_1.onlineConfigured)
    return; setBusy(true); try {
    setState(await (0, social_1.guildWeeklyState)());
}
catch (error) {
    react_native_1.Alert.alert('Guild PvE', error instanceof Error ? error.message : 'Unable to load weekly guild state.');
}
finally {
    setBusy(false);
} }; (0, react_1.useEffect)(() => { load(); }, []); if (!supabase_1.onlineConfigured || !state)
    return null; const doContribution = async (kind, amount) => { setBusy(true); try {
    await (0, social_1.guildContribute)(kind, amount);
    await load();
}
catch (error) {
    react_native_1.Alert.alert('Guild PvE', error instanceof Error ? error.message : 'Unable to record contribution.');
}
finally {
    setBusy(false);
} }; return <Panel_1.Panel><react_native_1.Text style={s.title}>Weekly guild PvE · online</react_native_1.Text><react_native_1.Text style={s.sub}>Project {(0, number_format_1.formatGameNumber)(state.project_progress, numberMode)} / {(0, number_format_1.formatGameNumber)(state.project_goal, numberMode)}</react_native_1.Text><react_native_1.View style={s.track}><react_native_1.View style={[s.fill, { width: `${Math.min(100, state.project_progress / state.project_goal * 100)}%` }]}/></react_native_1.View>{authoritative ? <react_native_1.Text style={s.sub}>Verified gathering and crafting advance your weekly project.</react_native_1.Text> : <GameButton_1.GameButton title="Contribute 100 points" disabled={busy} onPress={() => doContribution('project', 100)}/>}<react_native_1.Text style={[s.sub, { marginTop: 10 }]}>Guild boss: {(0, number_format_1.formatGameNumber)(state.boss_hp, numberMode)} / {(0, number_format_1.formatGameNumber)(state.boss_max_hp, numberMode)} HP</react_native_1.Text><react_native_1.View style={s.track}><react_native_1.View style={[s.boss, { width: `${Math.max(0, state.boss_hp / state.boss_max_hp * 100)}%` }]}/></react_native_1.View>{authoritative ? <react_native_1.Text style={s.sub}>Verified combat contributes to the Guild boss within your weekly allowance.</react_native_1.Text> : <GameButton_1.GameButton title="Deal 1,000 boss damage" disabled={busy || state.boss_hp === 0} onPress={() => doContribution('boss', 1000)}/>}<GameButton_1.GameButton title="Refresh weekly state" tone="secondary" disabled={busy} onPress={load}/></Panel_1.Panel>; }
const s = react_native_1.StyleSheet.create({ title: { color: theme_1.C.text, fontSize: 18, fontWeight: '900', marginBottom: 5 }, sub: { color: theme_1.C.muted, lineHeight: 19 }, track: { height: 10, backgroundColor: theme_1.C.panel2, borderRadius: 5, overflow: 'hidden', marginVertical: 8 }, fill: { height: 10, backgroundColor: theme_1.C.accent }, boss: { height: 10, backgroundColor: '#b85c68' } });
