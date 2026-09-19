"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StartupScreen = StartupScreen;
const react_native_1 = require("react-native");
const expo_status_bar_1 = require("expo-status-bar");
const i18n_1 = require("../i18n");
const startup_art_1 = require("../theme/startup-art");
/** Shown during real loading. Art failure cannot block save recovery. */
function StartupScreen({ scene, language }) {
    const { width, height } = (0, react_native_1.useWindowDimensions)();
    const logoWidth = Math.min(288, Math.max(160, width - 48));
    const pixelStyle = (react_native_1.Platform.OS === 'web' ? { imageRendering: 'pixelated' } : {});
    return <react_native_1.View style={s.root}>
    <expo_status_bar_1.StatusBar style="light"/>
    <react_native_1.Image source={scene.source} accessible={false} resizeMode="cover" fadeDuration={0} style={[react_native_1.StyleSheet.absoluteFill, s.background, pixelStyle]}/>
    <react_native_1.View pointerEvents="none" style={s.shade}/>
    <react_native_1.SafeAreaView style={s.safe}>
      <react_native_1.View style={[s.brand, { paddingTop: Math.max(24, height * .045) }]}>
        <react_native_1.Image source={startup_art_1.startupWordmark} accessibilityLabel="VELDRYN" resizeMode="contain" fadeDuration={0} style={[{ width: logoWidth, height: logoWidth / 3 }, pixelStyle]}/>
      </react_native_1.View>
      <react_native_1.View accessibilityLiveRegion="polite" accessibilityState={{ busy: true }} style={s.loading}>
        <react_native_1.View style={s.divider}/>
        <react_native_1.ActivityIndicator color="#A2E5ED" size="small"/>
        <react_native_1.Text style={s.label}>{(0, i18n_1.t)(language, 'coopUi.loading')}</react_native_1.Text>
      </react_native_1.View>
    </react_native_1.SafeAreaView>
  </react_native_1.View>;
}
const s = react_native_1.StyleSheet.create({
    root: { flex: 1, backgroundColor: '#101521' }, background: { width: '100%', height: '100%' },
    shade: { ...react_native_1.StyleSheet.absoluteFillObject, backgroundColor: 'rgba(7,15,28,.12)' },
    safe: { flex: 1, justifyContent: 'space-between', paddingTop: react_native_1.Platform.OS === 'android' ? react_native_1.StatusBar.currentHeight ?? 24 : 0 },
    brand: { alignItems: 'center', paddingHorizontal: 24 },
    loading: { alignItems: 'center', gap: 12, paddingTop: 20, paddingBottom: 32, paddingHorizontal: 24, backgroundColor: 'rgba(7,15,28,.86)' },
    divider: { width: 96, height: 2, backgroundColor: '#CEA363', marginBottom: 4 },
    label: { fontSize: 16, fontWeight: '600', color: '#F0D49A', textAlign: 'center' },
});
