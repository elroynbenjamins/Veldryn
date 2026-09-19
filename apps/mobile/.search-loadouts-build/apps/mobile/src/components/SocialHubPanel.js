"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocialHubPanel = SocialHubPanel;
const theme_1 = require("../theme/theme");
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
function SocialHubPanel({ active, onChange, children }) {
    const tabs = ['party', 'guild', 'chat', 'rankings'];
    return <react_native_1.View style={styles.root}><react_native_1.View style={styles.tabs}>{tabs.map(tab => <react_native_1.Pressable accessibilityRole="tab" accessibilityState={{ selected: active === tab }} key={tab} onPress={() => onChange(tab)} style={[styles.tab, active === tab && styles.active]}><react_native_1.Text style={[styles.text, active === tab && styles.activeText]}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</react_native_1.Text></react_native_1.Pressable>)}</react_native_1.View><react_native_1.View style={styles.body}>{children}</react_native_1.View></react_native_1.View>;
}
const styles = react_native_1.StyleSheet.create({ root: { flex: 1, backgroundColor: theme_1.C.bg }, tabs: { flexDirection: 'row', paddingHorizontal: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: theme_1.C.line }, tab: { minHeight: 52, flex: 1, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderColor: 'transparent' }, active: { borderColor: theme_1.equipmentColors.selectedLine }, text: { color: theme_1.C.muted, fontSize: 12, fontWeight: '600' }, activeText: { color: theme_1.C.text }, body: { flex: 1 } });
