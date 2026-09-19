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
exports.MonsterMasteryPanel = MonsterMasteryPanel;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const monsters_1 = require("../content/monsters");
const items_1 = require("../content/items");
const monster_mastery_1 = require("../core/monster-mastery");
const Panel_1 = require("./Panel");
const GameButton_1 = require("./GameButton");
const theme_1 = require("../theme/theme");
function MonsterMasteryPanel({ state }) {
    const [open, setOpen] = (0, react_1.useState)(false);
    const available = monsters_1.MONSTERS.filter(m => !m.boss && (state.unlockedMonsterIds.includes(m.id) || (0, monster_mastery_1.monsterMastery)(state, m.id).points > 0));
    return <Panel_1.Panel><react_native_1.Text style={s.title}>Monster mastery</react_native_1.Text><react_native_1.Text style={s.body}>Each defeated monster grants one point toward its own mastery. Every 25 points earns a rank, up to rank 30.</react_native_1.Text><GameButton_1.GameButton title={open ? 'Hide mastery' : 'View species mastery'} onPress={() => setOpen(!open)}/>
 {open && available.map(m => {
            const p = (0, monster_mastery_1.monsterMastery)(state, m.id);
            return <react_native_1.View key={m.id} style={s.entry}><react_native_1.Text style={s.name}>{p.badgeUnlocked ? '◆ ' : ''}{m.name} · Rank {p.rank}/30</react_native_1.Text><react_native_1.Text style={s.body}>{p.points}/{p.nextRankPoints} points · +{Math.round(p.damageBonus * 100)}% damage · +{Math.round(p.materialBonus * 100)}% normal materials</react_native_1.Text><react_native_1.Text style={s.body}>Rank 5: damage · Rank 10: drop knowledge · Rank 15: materials · Rank 25: mastery badge · Rank 30: maximum bonuses</react_native_1.Text>
 {m.id === 'FOREST_TROLL' && <react_native_1.Text style={s.body}>Rank 20 unlocks Briarhorn Cub.</react_native_1.Text>}
 {p.dropKnowledge ? <><react_native_1.Text style={s.name}>Base drop table</react_native_1.Text>{m.drops.map(d => <react_native_1.Text key={d.itemId} style={s.body}>{(0, items_1.itemDef)(d.itemId).name} · {(d.chance * 100).toFixed(2)}% · {d.min}–{d.max}</react_native_1.Text>)}</> : <react_native_1.Text style={s.body}>Drop knowledge unlocks at rank 10.</react_native_1.Text>}</react_native_1.View>;
        })}</Panel_1.Panel>;
}
const s = react_native_1.StyleSheet.create({ title: { ...theme_1.typography.title, color: theme_1.C.text }, name: { ...theme_1.typography.bodyStrong, color: theme_1.C.text }, body: { ...theme_1.typography.body, color: theme_1.C.muted }, entry: { gap: 6, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme_1.C.line } });
