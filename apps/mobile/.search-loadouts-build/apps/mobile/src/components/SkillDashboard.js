"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillDashboard = SkillDashboard;
const react_native_1 = require("react-native");
const progression_1 = require("../core/progression");
const theme_1 = require("../theme/theme");
const ActivityArtwork_1 = require("./ActivityArtwork");
const StatBar_1 = require("./StatBar");
const skillMeta = {
    woodcutting: { label: 'Woodcutting', category: 'Gathering' }, mining: { label: 'Mining', category: 'Gathering' },
    fishing: { label: 'Fishing', category: 'Gathering' }, smithing: { label: 'Smithing', category: 'Crafting' }, cooking: { label: 'Cooking', category: 'Crafting' },
};
function SkillDashboard({ state, onCombat, onSkill }) {
    const character = state.character, combat = (0, progression_1.characterProgressWithinLevel)(character.xp, character.level), { width, fontScale } = (0, react_native_1.useWindowDimensions)();
    const cardWidth = width < 360 && fontScale > 1.25 ? '100%' : width >= 430 && fontScale <= 1.15 ? '31%' : '48%';
    const totalLevel = character.level + state.skills.reduce((sum, skill) => sum + skill.level, 0);
    const card = (id, label, category, level, current, need, onPress) => <react_native_1.Pressable key={id} accessibilityRole="button" accessibilityLabel={`${label}, level ${level}`} accessibilityHint={`Open ${label}`} onPress={onPress} style={({ pressed }) => [s.card, { width: cardWidth }, pressed && s.pressed]}>
  <react_native_1.View style={s.cardTop}><ActivityArtwork_1.ActivityArtwork id={id}/><react_native_1.Text style={s.level}>{level}</react_native_1.Text></react_native_1.View>
  <react_native_1.Text style={s.label}>{label}</react_native_1.Text><react_native_1.Text style={s.category}>{category}</react_native_1.Text>
  <StatBar_1.StatBar label="XP" current={current} max={need} reduceMotion={state.settings.reduceMotion}/>
 </react_native_1.Pressable>;
    return <react_native_1.View style={s.root}><react_native_1.View style={s.heading}><react_native_1.Text accessibilityRole="header" style={s.title}>Skills & activities</react_native_1.Text><react_native_1.Text style={s.total}>Total level {totalLevel}</react_native_1.Text></react_native_1.View><react_native_1.View style={s.grid}>
  {card('combat', 'Combat', 'Fighting', character.level, combat.current, combat.need, onCombat)}
  {state.skills.map(skill => { const meta = skillMeta[skill.skillId] ?? { label: skill.skillId, category: 'Progression' }, p = (0, progression_1.progressWithinLevel)(skill.xp, skill.level); return card(skill.skillId, meta.label, meta.category, skill.level, p.current, p.need, () => onSkill(skill.skillId)); })}
 </react_native_1.View></react_native_1.View>;
}
const s = react_native_1.StyleSheet.create({ root: { gap: theme_1.spacing.md }, heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }, title: { ...theme_1.typography.title, color: theme_1.C.text }, total: { ...theme_1.typography.caption, color: theme_1.C.muted }, grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: theme_1.spacing.sm }, card: { minHeight: 150, padding: 12, gap: 5, backgroundColor: theme_1.C.panel, borderWidth: 1, borderColor: theme_1.C.line, borderRadius: theme_1.radii.md }, cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, pressed: { opacity: .76 }, label: { ...theme_1.typography.bodyStrong, color: theme_1.C.text }, category: { ...theme_1.typography.caption, color: theme_1.C.muted }, level: { ...theme_1.typography.title, color: theme_1.C.accent } });
