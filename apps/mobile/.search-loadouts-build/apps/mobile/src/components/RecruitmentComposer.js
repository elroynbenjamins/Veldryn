"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecruitmentComposer = RecruitmentComposer;
const GameTextInput_1 = require("./GameTextInput");
const react_1 = require("react");
const react_native_1 = require("react-native");
const GameButton_1 = require("./GameButton");
const Panel_1 = require("./Panel");
const theme_1 = require("../theme/theme");
const RecruitmentFiltersPanel_1 = require("./RecruitmentFiltersPanel");
function RecruitmentComposer({ initial, busy, onPublish, onCancel }) {
    const [draft, setDraft] = (0, react_1.useState)(initial);
    const patch = (value) => setDraft(previous => ({ ...previous, ...value }));
    const guild = draft.postType === 'looking_for_guild' || draft.postType === 'guild_recruiting';
    return <Panel_1.Panel><react_native_1.Text style={s.title}>{draft.postType.replaceAll('_', ' ')}</react_native_1.Text><react_native_1.Text style={s.text}>One active advert. Refresh or replacement is available every 6 hours.</react_native_1.Text>
  <GameTextInput_1.GameTextInput accessibilityLabel="Advert title" placeholder="Title" placeholderTextColor={theme_1.C.muted} style={s.input} value={draft.title} maxLength={80} onChangeText={title => patch({ title })}/>
  <GameTextInput_1.GameTextInput accessibilityLabel="Advert description" placeholder="Activities, availability and what you enjoy" placeholderTextColor={theme_1.C.muted} style={s.input} multiline value={draft.body} maxLength={600} onChangeText={body => patch({ body })}/>
  <react_native_1.View style={s.row}>{['combat', 'skilling', 'mixed'].map(focus => <GameButton_1.GameButton key={focus} title={`${draft.focus === focus ? '✓ ' : ''}${focus}`} tone="secondary" onPress={() => patch({ focus })}/>)}</react_native_1.View>
  <react_native_1.View style={s.row}>{['tank', 'damage', 'support'].map(role => <GameButton_1.GameButton key={role} title={`${draft.roles?.includes(role) ? '✓ ' : ''}${role}`} tone="secondary" onPress={() => patch({ roles: draft.roles?.includes(role) ? draft.roles.filter(r => r !== role) : [...draft.roles ?? [], role] })}/>)}</react_native_1.View>
  {['activityTags', 'playstyleTags', 'availabilityTags', 'guildInterestTags'].map(key => <GameTextInput_1.GameTextInput key={key} accessibilityLabel={key} placeholder={`${key.replace('Tags', '')} (comma separated)`} placeholderTextColor={theme_1.C.muted} style={s.input} onChangeText={text => patch({ [key]: (0, RecruitmentFiltersPanel_1.recruitmentTags)(text) })}/>)}
  <react_native_1.View style={s.row}>{['casual', 'regular', 'active', 'hardcore'].map(activityLevel => <GameButton_1.GameButton key={activityLevel} title={`${draft.activityLevel === activityLevel ? '✓ ' : ''}${activityLevel}`} tone="secondary" onPress={() => patch({ activityLevel })}/>)}</react_native_1.View>
  {['language', 'region', 'currentObjective'].map(key => <GameTextInput_1.GameTextInput key={key} accessibilityLabel={key} placeholder={`${key} (optional)`} placeholderTextColor={theme_1.C.muted} style={s.input} maxLength={key === 'currentObjective' ? 120 : 40} onChangeText={text => patch({ [key]: text || undefined })}/>)}
  <react_native_1.View style={s.row}>{['minCombatLevel', 'minTotalLevel'].map(key => <GameTextInput_1.GameTextInput key={key} accessibilityLabel={key} placeholder={key === 'minCombatLevel' ? 'Minimum Combat level' : 'Minimum Total level'} placeholderTextColor={theme_1.C.muted} style={[s.input, s.grow]} keyboardType="number-pad" onChangeText={text => patch({ [key]: text ? Math.max(0, parseInt(text, 10) || 0) : undefined })}/>)}</react_native_1.View>
  <react_native_1.Text style={s.text}>Expires after {draft.durationDays ?? (guild ? 3 : 1)} day(s). Party open spots are calculated from the current roster.</react_native_1.Text>
  {guild && <react_native_1.View style={s.row}>{[1, 3].map(durationDays => <GameButton_1.GameButton key={durationDays} title={`${draft.durationDays === durationDays ? '✓ ' : ''}${durationDays} day(s)`} tone="secondary" onPress={() => patch({ durationDays })}/>)}</react_native_1.View>}
  <GameButton_1.GameButton title={busy ? 'Publishing…' : 'Publish advert'} disabled={busy || draft.title.trim().length < 3} onPress={() => onPublish(draft)}/><GameButton_1.GameButton title="Cancel" tone="secondary" onPress={onCancel}/>
 </Panel_1.Panel>;
}
const s = react_native_1.StyleSheet.create({ title: { color: theme_1.C.accent, fontSize: 18, fontWeight: '800' }, text: { color: theme_1.C.muted }, input: { minHeight: theme_1.touchTargetMin, borderWidth: 1, borderColor: theme_1.C.line, padding: theme_1.spacing.sm, color: theme_1.C.text }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme_1.spacing.sm }, grow: { flex: 1, minWidth: 120 } });
