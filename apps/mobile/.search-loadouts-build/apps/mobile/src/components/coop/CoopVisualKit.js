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
exports.FantasyPanel = FantasyPanel;
exports.PrimaryAction = PrimaryAction;
exports.RoleBadge = RoleBadge;
exports.StateChip = StateChip;
exports.CoopImageSlot = CoopImageSlot;
exports.ExpeditionScreenShell = ExpeditionScreenShell;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const coop_ui_assets_1 = require("../../theme/coop-ui-assets");
const coop_ui_theme_1 = require("../../theme/coop-ui-theme");
function FantasyPanel({ children, variant = 'default', style }) {
    return <react_native_1.View accessibilityState={{ disabled: variant === 'disabled', selected: variant === 'selected' }} style={[s.panel, s[`panel_${variant}`], style]}>
    <react_native_1.View style={s.panelInner}>{children}</react_native_1.View>
  </react_native_1.View>;
}
function PrimaryAction({ label, onPress, disabled = false, loading = false, selected = false, tone = 'primary', accessibilityLabel, previewPressed = false }) {
    const [focused, setFocused] = (0, react_1.useState)(false), inactive = disabled || loading;
    return <react_native_1.Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} accessibilityState={{ disabled: inactive, busy: loading, selected }} disabled={inactive} onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={({ pressed }) => [s.action, s[`action_${tone}`], selected && s.actionSelected, (pressed || previewPressed) && !inactive && s.actionPressed, focused && s.actionFocused, inactive && s.actionDisabled]}>
    {loading ? <react_native_1.ActivityIndicator color={coop_ui_theme_1.coopColors.text}/> : null}<react_native_1.Text style={[s.actionText, tone === 'danger' && s.dangerText]}>{label}</react_native_1.Text>
  </react_native_1.Pressable>;
}
const roleAsset = { tank: 'role_tank', damage: 'role_damage', support: 'role_support' };
function RoleBadge({ role, label }) {
    return <react_native_1.View accessibilityLabel={label} style={s.roleBadge}><react_native_1.Image source={coop_ui_assets_1.coopUiAssets[roleAsset[role]]} resizeMode="contain" style={s.roleImage}/><react_native_1.Text style={s.roleText}>{label}</react_native_1.Text></react_native_1.View>;
}
function StateChip({ label, tone = 'neutral' }) {
    return <react_native_1.View style={[s.chip, s[`chip_${tone}`]]}><react_native_1.Text style={[s.chipText, s[`chipText_${tone}`]]}>{label}</react_native_1.Text></react_native_1.View>;
}
function CoopImageSlot({ assetId, size = 'node', fallbackLabel = 'ART', accessibilityLabel }) {
    const source = assetId ? coop_ui_assets_1.coopUiAssets[assetId] : undefined;
    return <react_native_1.View accessibilityLabel={accessibilityLabel} style={[s.imageSlot, s[`image_${size}`]]}>{source ? <react_native_1.Image source={source} resizeMode={size === 'hero' || size === 'room' ? 'cover' : 'contain'} style={s.image}/> : <react_native_1.View style={s.imageFallback}><react_native_1.Text style={s.fallbackMark}>◇</react_native_1.Text><react_native_1.Text style={s.fallbackText}>{fallbackLabel}</react_native_1.Text></react_native_1.View>}</react_native_1.View>;
}
/** Content shell for use inside the app's single existing SafeAreaView. */
function ExpeditionScreenShell({ eyebrow, title, onBack, backLabel = 'Back', banner, stickyAction, children, testID }) {
    return <react_native_1.View testID={testID} style={s.shell}>
    <react_native_1.View style={s.shellHeader}>{onBack ? <react_native_1.Pressable accessibilityRole="button" accessibilityLabel={backLabel} hitSlop={8} onPress={onBack} style={({ pressed }) => [s.back, pressed && s.backPressed]}><react_native_1.Text style={s.backText}>‹ {backLabel}</react_native_1.Text></react_native_1.Pressable> : null}<react_native_1.View style={s.heading}><react_native_1.Text style={s.eyebrow}>{eyebrow}</react_native_1.Text><react_native_1.Text style={s.title}>{title}</react_native_1.Text></react_native_1.View></react_native_1.View>
    {banner ? <react_native_1.View style={s.banner}>{banner}</react_native_1.View> : null}
    <react_native_1.ScrollView style={s.scroll} contentContainerStyle={[s.content, stickyAction ? s.contentWithAction : undefined]} keyboardShouldPersistTaps="handled">{children}</react_native_1.ScrollView>
    {stickyAction ? <react_native_1.View style={s.sticky}>{stickyAction}</react_native_1.View> : null}
  </react_native_1.View>;
}
const s = react_native_1.StyleSheet.create({
    shell: { flex: 1, backgroundColor: coop_ui_theme_1.coopColors.background }, shellHeader: { minHeight: 76, paddingHorizontal: coop_ui_theme_1.coopSpacing.lg, paddingVertical: coop_ui_theme_1.coopSpacing.sm, flexDirection: 'row', alignItems: 'center', gap: coop_ui_theme_1.coopSpacing.sm, borderBottomWidth: 1, borderColor: coop_ui_theme_1.coopColors.goldDim, backgroundColor: coop_ui_theme_1.coopColors.surface }, heading: { flex: 1, minWidth: 0 }, eyebrow: { ...coop_ui_theme_1.coopTypography.meta, color: coop_ui_theme_1.coopColors.gold, fontWeight: '900', letterSpacing: 1 }, title: { ...coop_ui_theme_1.coopTypography.title, color: coop_ui_theme_1.coopColors.text, flexShrink: 1 }, back: { minWidth: coop_ui_theme_1.coopSizing.minimumTarget, minHeight: coop_ui_theme_1.coopSizing.minimumTarget, justifyContent: 'center', paddingRight: coop_ui_theme_1.coopSpacing.sm }, backPressed: { opacity: .65 }, backText: { ...coop_ui_theme_1.coopTypography.meta, color: coop_ui_theme_1.coopColors.gold, fontWeight: '900' }, banner: { paddingHorizontal: coop_ui_theme_1.coopSpacing.lg, paddingVertical: coop_ui_theme_1.coopSpacing.sm, backgroundColor: coop_ui_theme_1.coopColors.surfaceRaised, borderBottomWidth: 1, borderColor: coop_ui_theme_1.coopColors.goldDim }, scroll: { flex: 1 }, content: { padding: coop_ui_theme_1.coopSpacing.lg, gap: coop_ui_theme_1.coopSpacing.md }, contentWithAction: { paddingBottom: coop_ui_theme_1.coopSizing.minimumTarget + coop_ui_theme_1.coopSpacing.xxl }, sticky: { padding: coop_ui_theme_1.coopSpacing.md, borderTopWidth: 1, borderColor: coop_ui_theme_1.coopColors.goldDim, backgroundColor: coop_ui_theme_1.coopColors.surface },
    panel: { position: 'relative', padding: 0, borderWidth: react_native_1.StyleSheet.hairlineWidth, borderColor: '#293C4C', borderRadius: coop_ui_theme_1.coopRadii.panel, backgroundColor: coop_ui_theme_1.coopColors.surface, overflow: 'hidden' }, panelInner: { padding: coop_ui_theme_1.coopSpacing.md, gap: coop_ui_theme_1.coopSpacing.sm, borderRadius: coop_ui_theme_1.coopRadii.panel }, panel_default: {}, panel_selected: { borderColor: coop_ui_theme_1.coopColors.cyan, shadowColor: coop_ui_theme_1.coopColors.cyan, shadowOpacity: .22, shadowRadius: 7, elevation: 2 }, panel_success: { borderColor: coop_ui_theme_1.coopColors.success }, panel_danger: { borderColor: coop_ui_theme_1.coopColors.danger }, panel_disabled: { opacity: .42 }, cornerTop: { position: 'absolute', top: 0, left: 0, width: 18, height: 18, borderRightWidth: 1, borderBottomWidth: 1, borderColor: coop_ui_theme_1.coopColors.gold }, cornerBottom: { position: 'absolute', right: 0, bottom: 0, width: 18, height: 18, borderLeftWidth: 1, borderTopWidth: 1, borderColor: coop_ui_theme_1.coopColors.goldDim },
    action: { minHeight: coop_ui_theme_1.coopSizing.minimumTarget, paddingHorizontal: coop_ui_theme_1.coopSpacing.lg, paddingVertical: coop_ui_theme_1.coopSpacing.sm, flexDirection: 'row', gap: coop_ui_theme_1.coopSpacing.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: coop_ui_theme_1.coopRadii.button, shadowColor: '#000', shadowOpacity: .3, shadowRadius: 3, shadowOffset: { width: 0, height: 2 }, elevation: 2 }, action_primary: { backgroundColor: coop_ui_theme_1.coopColors.blue, borderColor: coop_ui_theme_1.coopColors.cyan }, action_secondary: { backgroundColor: coop_ui_theme_1.coopColors.surfaceRaised, borderColor: coop_ui_theme_1.coopColors.gold }, action_danger: { backgroundColor: '#501E2A', borderColor: coop_ui_theme_1.coopColors.danger }, actionSelected: { borderWidth: 2, backgroundColor: '#0A4168' }, actionPressed: { transform: [{ translateY: 1 }], opacity: .72 }, actionFocused: { borderColor: coop_ui_theme_1.coopColors.text, borderWidth: 2 }, actionDisabled: { opacity: .38 }, actionText: { ...coop_ui_theme_1.coopTypography.button, color: coop_ui_theme_1.coopColors.text, textAlign: 'center', flexShrink: 1 }, dangerText: { color: '#FFE0E1' },
    roleBadge: { minHeight: coop_ui_theme_1.coopSizing.minimumTarget, flexDirection: 'row', alignItems: 'center', gap: coop_ui_theme_1.coopSpacing.sm, paddingHorizontal: coop_ui_theme_1.coopSpacing.sm, borderWidth: 1, borderColor: coop_ui_theme_1.coopColors.goldDim, borderRadius: coop_ui_theme_1.coopRadii.tile, backgroundColor: coop_ui_theme_1.coopColors.surfaceRaised }, roleImage: { width: coop_ui_theme_1.coopSizing.roleIcon, height: coop_ui_theme_1.coopSizing.roleIcon }, roleText: { ...coop_ui_theme_1.coopTypography.meta, color: coop_ui_theme_1.coopColors.text, fontWeight: '900', flexShrink: 1 },
    chip: { alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center', paddingHorizontal: coop_ui_theme_1.coopSpacing.sm, borderWidth: 1, borderRadius: coop_ui_theme_1.coopRadii.tile, backgroundColor: coop_ui_theme_1.coopColors.surfaceRaised }, chip_neutral: { borderColor: coop_ui_theme_1.coopColors.goldDim }, chip_selected: { borderColor: coop_ui_theme_1.coopColors.cyan }, chip_success: { borderColor: coop_ui_theme_1.coopColors.success }, chip_warning: { borderColor: coop_ui_theme_1.coopColors.gold }, chip_danger: { borderColor: coop_ui_theme_1.coopColors.danger }, chipText: { ...coop_ui_theme_1.coopTypography.meta, fontWeight: '900' }, chipText_neutral: { color: coop_ui_theme_1.coopColors.textMuted }, chipText_selected: { color: coop_ui_theme_1.coopColors.cyan }, chipText_success: { color: coop_ui_theme_1.coopColors.success }, chipText_warning: { color: coop_ui_theme_1.coopColors.gold }, chipText_danger: { color: coop_ui_theme_1.coopColors.danger },
    imageSlot: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: coop_ui_theme_1.coopColors.goldDim, borderRadius: coop_ui_theme_1.coopRadii.tile, backgroundColor: coop_ui_theme_1.coopColors.surfaceRaised }, image_hero: { width: '100%', aspectRatio: 901 / 301 }, image_room: { width: 96, height: 136 }, image_node: { width: coop_ui_theme_1.coopSizing.nodeIcon, height: coop_ui_theme_1.coopSizing.nodeIcon }, image_boon: { width: coop_ui_theme_1.coopSizing.boonIcon, height: coop_ui_theme_1.coopSizing.boonIcon }, image_skill: { width: 40, height: 40 }, image: { width: '100%', height: '100%' }, imageFallback: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', padding: 2 }, fallbackMark: { color: coop_ui_theme_1.coopColors.danger, fontSize: 16, lineHeight: 18 }, fallbackText: { color: coop_ui_theme_1.coopColors.textMuted, fontSize: 9, lineHeight: 11, fontWeight: '900', textAlign: 'center' },
});
