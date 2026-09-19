"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Panel = Panel;
const react_native_1 = require("react-native");
const theme_1 = require("../theme/theme");
/** Quiet shared surface. Accent borders are reserved for meaningful emphasis. */
function Panel({ children, accentColor, accentSurface, borderWidth = 1, glowOpacity = 0 }) {
    return <react_native_1.View style={[s.panel, accentSurface && { backgroundColor: accentSurface }, accentColor && { borderColor: accentColor, borderWidth, shadowColor: accentColor, shadowOpacity: glowOpacity, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: glowOpacity > 0 ? 3 : 0 }]}>{children}</react_native_1.View>;
}
const s = react_native_1.StyleSheet.create({ panel: { backgroundColor: theme_1.C.panel, borderWidth: react_native_1.StyleSheet.hairlineWidth, borderColor: '#293746', borderRadius: theme_1.radii.md, padding: 14, gap: 9 } });
