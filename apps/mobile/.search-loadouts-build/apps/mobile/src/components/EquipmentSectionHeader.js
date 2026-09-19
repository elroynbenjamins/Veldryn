"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EquipmentSectionHeader = EquipmentSectionHeader;
const react_native_1 = require("react-native");
const theme_1 = require("../theme/theme");
/** Ornamental live heading shared by Equipment, Inventory and Upgrade surfaces. */
function EquipmentSectionHeader({ title }) {
    return <react_native_1.View accessibilityRole="header" style={s.root}>
    <react_native_1.View style={s.rule}/><react_native_1.Text pointerEvents="none" style={s.diamond}>◆</react_native_1.Text>
    <react_native_1.Text style={s.title}>{title.toUpperCase()}</react_native_1.Text>
    <react_native_1.Text pointerEvents="none" style={s.diamond}>◆</react_native_1.Text><react_native_1.View style={s.rule}/>
  </react_native_1.View>;
}
const s = react_native_1.StyleSheet.create({
    root: { minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme_1.spacing.xs },
    rule: { height: 1, flex: 1, backgroundColor: theme_1.equipmentColors.line, opacity: .85 },
    diamond: { fontSize: 8, lineHeight: 12, color: theme_1.equipmentColors.gold },
    title: { ...theme_1.typography.title, color: theme_1.equipmentColors.goldSoft, textAlign: 'center', letterSpacing: .8 },
});
