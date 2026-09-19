"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recruitmentTags = void 0;
exports.RecruitmentFiltersPanel = RecruitmentFiltersPanel;
const react_1 = require("react");
const SearchField_1 = require("./SearchField");
const GameTextInput_1 = require("./GameTextInput");
const react_native_1 = require("react-native");
const GameButton_1 = require("./GameButton");
const theme_1 = require("../theme/theme");
const party_social_1 = require("../core/party-social");
const recruitmentTags = (text) => text.split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
exports.recruitmentTags = recruitmentTags;
function RecruitmentFiltersPanel({ value, onChange }) {
    const [expanded, setExpanded] = (0, react_1.useState)(false);
    const count = Object.entries(value).filter(([key, v]) => key !== 'query' && (Array.isArray(v) ? v.length > 0 : !!v)).length;
    const update = (patch) => onChange({ ...value, ...patch });
    const toggle = (items, item) => items.includes(item) ? items.filter(x => x !== item) : [...items, item];
    return <react_native_1.View style={s.root}>
  <SearchField_1.SearchField accessibilityLabel="Search recruitment" placeholder="Search adverts" placeholderTextColor={theme_1.C.muted} value={value.query} onChangeText={query => update({ query })}/><GameButton_1.GameButton title={(expanded ? 'Hide filters' : 'Filters') + (count ? ' · ' + count + ' active' : '')} tone="secondary" onPress={() => setExpanded(v => !v)}/>{expanded && <>
  <react_native_1.View style={s.row}>{['looking_for_party', 'party_recruiting', 'looking_for_guild', 'guild_recruiting'].map(type => <GameButton_1.GameButton key={type} title={`${value.postTypes.includes(type) ? '✓ ' : ''}${type.replaceAll('_', ' ')}`} tone="secondary" onPress={() => update({ postTypes: toggle(value.postTypes, type) })}/>)}</react_native_1.View>
  <react_native_1.View style={s.row}>{['combat', 'skilling', 'mixed'].map(focus => <GameButton_1.GameButton key={focus} title={`${value.focuses.includes(focus) ? '✓ ' : ''}${focus}`} tone="secondary" onPress={() => update({ focuses: toggle(value.focuses, focus) })}/>)}</react_native_1.View>
  <react_native_1.View style={s.row}>{['tank', 'damage', 'support'].map(role => <GameButton_1.GameButton key={role} title={`${value.roles.includes(role) ? '✓ ' : ''}${role}`} tone="secondary" onPress={() => update({ roles: toggle(value.roles, role) })}/>)}</react_native_1.View>
  {['activityTags', 'playstyleTags', 'availabilityTags', 'guildInterestTags'].map(key => <GameTextInput_1.GameTextInput key={key} accessibilityLabel={key} placeholder={`${key.replace('Tags', '')} (comma separated)`} placeholderTextColor={theme_1.C.muted} style={s.input} defaultValue={value[key]?.join(', ')} onEndEditing={event => update({ [key]: (0, exports.recruitmentTags)(event.nativeEvent.text) })}/>)}
  <react_native_1.View style={s.row}>{['casual', 'regular', 'active', 'hardcore'].map(level => <GameButton_1.GameButton key={level} title={`${value.activityLevels?.includes(level) ? '✓ ' : ''}${level}`} tone="secondary" onPress={() => update({ activityLevels: toggle(value.activityLevels ?? [], level) })}/>)}</react_native_1.View>
  <react_native_1.View style={s.row}>{['language', 'region'].map(key => <GameTextInput_1.GameTextInput key={key} accessibilityLabel={key} placeholder={key} placeholderTextColor={theme_1.C.muted} style={[s.input, s.grow]} value={value[key] ?? ''} maxLength={40} onChangeText={text => update({ [key]: text })}/>)}</react_native_1.View>
  <react_native_1.View style={s.row}>{['maxMinCombatLevel', 'maxMinTotalLevel'].map(key => <GameTextInput_1.GameTextInput key={key} accessibilityLabel={key} placeholder={key === 'maxMinCombatLevel' ? 'My Combat level' : 'My Total level'} placeholderTextColor={theme_1.C.muted} style={[s.input, s.grow]} keyboardType="number-pad" value={value[key]?.toString() ?? ''} onChangeText={text => update({ [key]: text ? Math.max(0, parseInt(text, 10) || 0) : undefined })}/>)}</react_native_1.View>
  <react_native_1.View style={s.row}><react_native_1.Switch accessibilityLabel="Only Parties with open spots" value={value.requireOpenPartySpot ?? false} onValueChange={requireOpenPartySpot => update({ requireOpenPartySpot })}/><react_native_1.Text style={s.text}>Only Parties with open spots</react_native_1.Text></react_native_1.View><GameButton_1.GameButton title="Clear filters" tone="secondary" onPress={() => onChange({ ...party_social_1.EMPTY_RECRUITMENT_FILTERS, query: value.query })}/></>}
 </react_native_1.View>;
}
const s = react_native_1.StyleSheet.create({ root: { gap: theme_1.spacing.sm }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme_1.spacing.sm, alignItems: 'center' }, grow: { flex: 1, minWidth: 100 }, input: { minHeight: theme_1.touchTargetMin, borderWidth: 1, borderColor: theme_1.C.line, padding: theme_1.spacing.sm, color: theme_1.C.text, backgroundColor: theme_1.C.bg }, text: { color: theme_1.C.text } });
