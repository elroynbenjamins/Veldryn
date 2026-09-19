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
exports.FaithPanel = FaithPanel;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const faith_1 = require("../content/faith");
const faith_2 = require("../core/faith");
const Panel_1 = require("./Panel");
const GameButton_1 = require("./GameButton");
const theme_1 = require("../theme/theme");
function FaithPanel({ state, onCommand }) {
    const [count, setCount] = (0, react_1.useState)(1);
    const c = state.character;
    if (!c)
        return null;
    const faith = (0, faith_2.normalizeFaith)(c.faith), level = (0, faith_2.faithLevel)(state);
    return <Panel_1.Panel><react_native_1.Text style={s.title}>Faith</react_native_1.Text><react_native_1.Text style={s.body}>Level {level}/100 · Holy Water is consumed only when a practice completes.</react_native_1.Text>
 {faith_1.FAITH_TIERS.filter(t => t.level <= level).map(t => <react_native_1.View key={t.id} style={s.row}><react_native_1.Text style={s.body}>{t.name} · {t.water} water · {t.xp} Faith XP</react_native_1.Text><GameButton_1.GameButton title={`Practice ${count}`} onPress={() => void onCommand({ type: 'faith_practice', args: { tierId: t.id, count } })} disabled={!!faith.practice}/></react_native_1.View>)}
 <react_native_1.Text style={s.body}>Active blessing</react_native_1.Text>{faith_1.FAITH_BLESSINGS.filter(b => b.level <= level).map(b => <GameButton_1.GameButton key={b.id} title={`${faith.selectedBlessingId === b.id ? '✓ ' : ''}${b.name} · +${Math.round(b.bonus * 100)}% ${b.family}`} onPress={() => void onCommand({ type: 'faith_blessing', args: { id: b.id } })}/>)}
 {faith.practice ? <react_native_1.Text style={s.body}>Practice in progress · {faith.practice.remaining} remaining</react_native_1.Text> : null}
 </Panel_1.Panel>;
}
const s = react_native_1.StyleSheet.create({ title: { ...theme_1.typography.title, color: theme_1.C.text }, body: { ...theme_1.typography.body, color: theme_1.C.muted }, row: { gap: 4, paddingVertical: 6 } });
