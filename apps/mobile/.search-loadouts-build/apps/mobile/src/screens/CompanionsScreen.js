"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanionsScreen = CompanionsScreen;
const react_native_1 = require("react-native");
const CombatCompanionPanel_1 = require("../components/CombatCompanionPanel");
const ClassSkillsPanel_1 = require("../components/ClassSkillsPanel");
const MonsterMasteryPanel_1 = require("../components/MonsterMasteryPanel");
const ExplorationPanel_1 = require("../components/ExplorationPanel");
const AccountRosterPanel_1 = require("../components/AccountRosterPanel");
const theme_1 = require("../theme/theme");
function CompanionsScreen({ state, language, now, onCommand, onCreate }) {
    return <react_native_1.ScrollView contentContainerStyle={s.root}><react_native_1.Text style={s.kicker}>COMPANION SANCTUARY</react_native_1.Text><react_native_1.Text style={s.heading}>Companions</react_native_1.Text><react_native_1.Text style={s.intro}>Build your roster, train class techniques, and track the mastery that makes each companion stronger.</react_native_1.Text><AccountRosterPanel_1.AccountRosterPanel state={state} language={language} onCommand={onCommand} onCreate={onCreate}/><CombatCompanionPanel_1.CombatCompanionPanel state={state} now={now} onCommand={onCommand}/><ExplorationPanel_1.ExplorationPanel state={state} onCommand={onCommand}/><ClassSkillsPanel_1.ClassSkillsPanel state={state} now={now} onCommand={onCommand}/><MonsterMasteryPanel_1.MonsterMasteryPanel state={state}/></react_native_1.ScrollView>;
}
const s = react_native_1.StyleSheet.create({ root: { padding: theme_1.spacing.md, gap: theme_1.spacing.md, paddingBottom: theme_1.spacing.xl }, kicker: { ...theme_1.typography.caption, color: theme_1.C.accent, fontWeight: '900', letterSpacing: 1.4 }, heading: { ...theme_1.typography.hero, color: theme_1.C.text, marginTop: -6 }, intro: { ...theme_1.typography.body, color: theme_1.C.muted, maxWidth: 420, marginBottom: theme_1.spacing.xs } });
