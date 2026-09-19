"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.equipmentColors = exports.C = exports.touchTargetPreferred = exports.touchTargetMin = exports.typography = exports.radii = exports.spacing = exports.displayFont = void 0;
const react_native_1 = require("react-native");
exports.displayFont = react_native_1.Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });
exports.spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
exports.radii = { sm: 8, md: 14, lg: 18 };
exports.typography = {
    caption: { fontSize: 12, lineHeight: 16 },
    body: { fontSize: 14, lineHeight: 20 },
    bodyStrong: { fontSize: 14, lineHeight: 21, fontWeight: '600' },
    title: { fontFamily: exports.displayFont, fontSize: 19, lineHeight: 25, fontWeight: '700' },
    hero: { fontFamily: exports.displayFont, fontSize: 28, lineHeight: 36, fontWeight: '700' },
};
exports.touchTargetMin = 44;
exports.touchTargetPreferred = 48;
exports.C = {
    bg: '#0b1018', panel: '#151e2b', panel2: '#1c2939', line: '#314259',
    text: '#eef4ff', muted: '#93a4ba', disabled: '#64748b', accent: '#d4ad58',
    good: '#7fc59b', bad: '#e08888', warning: '#e6bd72', info: '#7bb7df',
};
/** Shared presentation tokens for the approved dark-navy / warm-gold equipment surfaces. */
exports.equipmentColors = {
    background: '#07111c', stage: '#071a2b', panel: '#0c1d2e', panelRaised: '#11283d',
    line: '#725a2b', lineStrong: '#c69a3d', gold: '#f2c14e', goldSoft: '#efd895',
    selected: '#123e61', selectedLine: '#43bdf2',
};
