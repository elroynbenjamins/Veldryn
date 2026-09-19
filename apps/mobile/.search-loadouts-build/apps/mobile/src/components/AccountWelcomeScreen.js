"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountWelcomeScreen = AccountWelcomeScreen;
const react_native_1 = require("react-native");
const expo_status_bar_1 = require("expo-status-bar");
const startup_art_1 = require("../theme/startup-art");
/** The same session artwork carries from loading into account entry. */
function AccountWelcomeScreen({ scene, children }) {
    return <react_native_1.View style={s.root}><expo_status_bar_1.StatusBar style="light"/>
  <react_native_1.Image source={scene.source} accessible={false} resizeMode="cover" fadeDuration={0} style={[react_native_1.StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}/>
  <react_native_1.View pointerEvents="none" style={s.shade}/>
  <react_native_1.SafeAreaView style={s.safe}><react_native_1.KeyboardAvoidingView style={s.flex} behavior={react_native_1.Platform.OS === 'ios' ? 'padding' : 'height'}>
   <react_native_1.ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={s.content}>
    <react_native_1.View style={s.column}><react_native_1.Image source={startup_art_1.startupWordmark} accessibilityLabel="VELDRYN" resizeMode="contain" fadeDuration={0} style={s.logo}/>{children}</react_native_1.View>
   </react_native_1.ScrollView>
  </react_native_1.KeyboardAvoidingView></react_native_1.SafeAreaView>
 </react_native_1.View>;
}
const s = react_native_1.StyleSheet.create({ root: { flex: 1, backgroundColor: '#101521' }, shade: { ...react_native_1.StyleSheet.absoluteFillObject, backgroundColor: 'rgba(7,15,28,.46)' }, safe: { flex: 1, paddingTop: react_native_1.Platform.OS === 'android' ? react_native_1.StatusBar.currentHeight ?? 24 : 0 }, flex: { flex: 1 }, content: { flexGrow: 1, justifyContent: 'center', padding: 20, paddingVertical: 32 }, column: { width: '100%', maxWidth: 440, alignSelf: 'center', gap: 20 }, logo: { width: '85%', maxWidth: 288, height: 96, alignSelf: 'center' } });
