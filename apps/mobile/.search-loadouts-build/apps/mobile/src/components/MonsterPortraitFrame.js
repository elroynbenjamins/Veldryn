"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonsterPortraitFrame = MonsterPortraitFrame;
const react_native_1 = require("react-native");
const monster_assets_1 = require("../theme/monster-assets");
const theme_1 = require("../theme/theme");
function MonsterPortraitFrame({ monster, size = 96, active = false, framed = true }) {
    const accent = monster.boss ? '#e2ad52' : monster.level >= 20 ? '#a783d8' : monster.level >= 10 ? '#5ea3c7' : theme_1.C.good;
    return <react_native_1.View accessibilityLabel={`${monster.name} pixel portrait`} style={[s.frame, !framed && s.unframed, { width: size, height: size, borderColor: active ? theme_1.C.accent : accent }, active && framed && s.active]}>
    {framed && <><react_native_1.View style={[s.corner, s.topLeft, { borderColor: accent }]}/><react_native_1.View style={[s.corner, s.topRight, { borderColor: accent }]}/><react_native_1.View style={[s.corner, s.bottomLeft, { borderColor: accent }]}/><react_native_1.View style={[s.corner, s.bottomRight, { borderColor: accent }]}/></>}
    <react_native_1.Image source={monster_assets_1.monsterPortraits[monster.id]} resizeMode="contain" style={{ width: size - 10, height: size - 10 }}/>
    {framed && <react_native_1.View style={[s.level, { backgroundColor: accent }]}><react_native_1.Text style={s.levelText}>{monster.boss ? 'BOSS' : `LV ${monster.level}`}</react_native_1.Text></react_native_1.View>}
  </react_native_1.View>;
}
const s = react_native_1.StyleSheet.create({ unframed: { borderWidth: 0, backgroundColor: 'transparent' }, frame: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 2, borderRadius: theme_1.radii.md, backgroundColor: '#09121a' }, active: { borderWidth: 3 }, corner: { position: 'absolute', width: 9, height: 9, borderWidth: 1 }, topLeft: { left: 3, top: 3, borderRightWidth: 0, borderBottomWidth: 0 }, topRight: { right: 3, top: 3, borderLeftWidth: 0, borderBottomWidth: 0 }, bottomLeft: { left: 3, bottom: 3, borderRightWidth: 0, borderTopWidth: 0 }, bottomRight: { right: 3, bottom: 3, borderLeftWidth: 0, borderTopWidth: 0 }, level: { position: 'absolute', right: 3, bottom: 3, borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 }, levelText: { fontSize: 8, color: '#071018', fontWeight: '900' } });
