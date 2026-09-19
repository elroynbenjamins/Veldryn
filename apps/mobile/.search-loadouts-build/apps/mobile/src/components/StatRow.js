"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatRow = StatRow;
const react_native_1 = require("react-native");
const theme_1 = require("../theme/theme");
function StatRow({ symbol, label, value, secondary = false }) { return <react_native_1.View style={[s.row, secondary && s.secondary]}><react_native_1.View style={s.icon}><react_native_1.Text style={s.iconText}>{symbol}</react_native_1.Text></react_native_1.View><react_native_1.Text style={s.label}>{label}</react_native_1.Text><react_native_1.Text style={s.value}>{value}</react_native_1.Text></react_native_1.View>; }
const s = react_native_1.StyleSheet.create({ row: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: theme_1.spacing.sm, borderBottomWidth: 1, borderBottomColor: 'rgba(114,90,43,.55)', paddingVertical: theme_1.spacing.xs }, secondary: { minHeight: 38 }, icon: { width: 28, height: 28, borderWidth: 1, borderColor: theme_1.equipmentColors.line, borderRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: theme_1.equipmentColors.stage }, iconText: { fontSize: 14, color: theme_1.equipmentColors.gold }, label: { ...theme_1.typography.body, color: theme_1.C.muted, flex: 1 }, value: { ...theme_1.typography.bodyStrong, color: theme_1.C.text, fontVariant: ['tabular-nums'] } });
