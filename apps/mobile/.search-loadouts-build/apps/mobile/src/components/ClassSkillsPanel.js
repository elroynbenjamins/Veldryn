"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassSkillsPanel = ClassSkillsPanel;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const class_skills_1 = require("../content/class-skills");
const class_skills_2 = require("../core/class-skills");
const progression_1 = require("../core/progression");
const game_1 = require("../core/game");
const Panel_1 = require("./Panel");
const GameButton_1 = require("./GameButton");
const theme_1 = require("../theme/theme");
function ClassSkillsPanel({ state, now, onCommand }) {
    const [busy, setBusy] = (0, react_1.useState)(false), [error, setError] = (0, react_1.useState)('');
    const lock = (0, react_1.useRef)(false), c = state.character;
    if (!c)
        return null;
    const skills = (0, class_skills_2.characterClassSkills)(c), definitions = (0, class_skills_1.classSkillsFor)(c.classId), focus = (0, class_skills_2.normalizeTrainingFocus)(c.trainingFocus), drill = c.classTraining;
    const run = async (command) => { if (lock.current)
        return; lock.current = true; setBusy(true); setError(''); try {
        await onCommand(command);
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Action failed.');
    }
    finally {
        lock.current = false;
        setBusy(false);
    } };
    const act = (title, command, disabled = false) => <GameButton_1.GameButton title={title} disabled={busy || disabled} onPress={() => void run(command)}/>;
    const available = drill ? Math.floor((Math.min((0, game_1.offlineCapSeconds)(state) * 1000, Math.max(0, now - drill.lastClaimAtMs)) + drill.progressMs) / 60000) : 0;
    return <Panel_1.Panel><react_native_1.Text style={s.title}>Class skills</react_native_1.Text><react_native_1.Text style={s.body}>Completed fights train both class skills. Their levels improve your combat stats and count toward companion requirements.</react_native_1.Text>
 {skills.map((skill, i) => { const p = (0, progression_1.progressWithinLevel)(skill.xp, skill.level); return <react_native_1.View key={skill.skillId} style={s.group}><react_native_1.Text style={s.name}>{definitions[i].name} · Level {skill.level}/100</react_native_1.Text><react_native_1.Text style={s.body}>{definitions[i].theme} · {skill.level === 100 ? 'Maximum level' : `${p.current.toLocaleString()} / ${p.need.toLocaleString()} XP`}</react_native_1.Text></react_native_1.View>; })}
 <react_native_1.Text style={s.name}>Training focus</react_native_1.Text>{['balanced', 'primary', 'secondary'].map(f => <react_native_1.View key={f}>{act(f === 'balanced' ? 'Balanced · 50% / 50%' : `${f === 'primary' ? definitions[0].name : definitions[1].name} · 75% / 25%`, { type: 'class_focus', args: { focus: f } }, focus === f)}</react_native_1.View>)}
 <react_native_1.Text style={s.body}>Changing focus preserves the split for a drill or fight already started. Both skills retain their full combat benefits.</react_native_1.Text>
 <react_native_1.Text style={s.name}>Safe training</react_native_1.Text><react_native_1.Text style={s.body}>One drill per minute, sharing 8 base class XP. Uses your {(0, game_1.offlineCapSeconds)(state) / 3600}-hour offline cap. No character XP, Gold, drops, food use, or healing.</react_native_1.Text>
 {drill ? <><react_native_1.Text style={s.body}>{available} completed drills ready to claim.</react_native_1.Text>{act('Claim training XP', { type: 'claim' })}{act('Stop and claim', { type: 'stop' })}</> : act('Start drills · replaces current activity', { type: 'class_training' }, skills.every(s => s.level === 100))}
 {error ? <react_native_1.Text accessibilityLiveRegion="polite" style={s.error}>{error}</react_native_1.Text> : null}</Panel_1.Panel>;
}
const s = react_native_1.StyleSheet.create({ title: { ...theme_1.typography.title, color: theme_1.C.text }, name: { ...theme_1.typography.bodyStrong, color: theme_1.C.text }, body: { ...theme_1.typography.body, color: theme_1.C.muted }, group: { gap: 5, paddingVertical: 8 }, error: { ...theme_1.typography.body, color: theme_1.C.info } });
