"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExplorationPanel = ExplorationPanel;
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const exploration_1 = require("../content/exploration");
const world_map_1 = require("../content/world-map");
const combat_region_1 = require("../core/combat-region");
const Panel_1 = require("./Panel");
const GameButton_1 = require("./GameButton");
const theme_1 = require("../theme/theme");
function ExplorationPanel({ state, onCommand }) { const c = state.character; if (!c)
    return null; const regionId = (0, combat_region_1.currentRegionId)(state); return <Panel_1.Panel><react_native_1.Text style={s.title}>Exploration</react_native_1.Text><react_native_1.Text style={s.body}>Scout a region to earn Exploration XP and reveal its next encounter.</react_native_1.Text>{exploration_1.EXPLORATION_ROUTES.map(route => { const zone = world_map_1.WORLD_ZONES.find(item => item.id === route.zoneId); const ready = c.level >= route.requiredLevel && regionId === route.zoneId; const found = !!route.unlockMonsterId && state.unlockedMonsterIds.includes(route.unlockMonsterId); return <react_native_1.View key={route.id} style={s.row}><react_native_1.Text style={s.body}>{zone?.name ?? route.zoneId} · {route.name} · {route.seconds}s · {route.xp} XP{found ? ' · discovered' : ''}</react_native_1.Text><GameButton_1.GameButton compact title={found ? 'Scout again' : 'Scout'} disabled={!ready} onPress={() => void onCommand({ type: 'explore', args: { id: route.id } })}/></react_native_1.View>; })}</Panel_1.Panel>; }
const s = react_native_1.StyleSheet.create({ title: { ...theme_1.typography.title, color: theme_1.C.text }, body: { ...theme_1.typography.body, color: theme_1.C.muted }, row: { gap: 4, paddingVertical: 4 } });
