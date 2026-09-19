"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaveRecoveryScreen = SaveRecoveryScreen;
const react_native_1 = require("react-native");
const GameButton_1 = require("./GameButton");
const theme_1 = require("../theme/theme");
const i18n_1 = require("../i18n");
function SaveRecoveryScreen({ message, onRetry, onStartFresh, language = 'en' }) {
    return <react_native_1.View style={s.root} accessibilityLiveRegion="polite">
    <react_native_1.Text style={s.kicker}>{(0, i18n_1.ot)(language, 'save.recoveryKicker')}</react_native_1.Text>
    <react_native_1.Text style={s.title}>{(0, i18n_1.ot)(language, 'save.recoveryTitle')}</react_native_1.Text>
    <react_native_1.Text style={s.body}>{(0, i18n_1.ot)(language, 'save.recoveryBody')}</react_native_1.Text>
    <react_native_1.View style={s.detail}><react_native_1.Text style={s.detailText}>{message}</react_native_1.Text></react_native_1.View>
    <GameButton_1.GameButton title={(0, i18n_1.ot)(language, 'save.retry')} onPress={onRetry}/>
    <GameButton_1.GameButton title={(0, i18n_1.ot)(language, 'save.startFresh')} tone="danger" onPress={onStartFresh}/>
  </react_native_1.View>;
}
const s = react_native_1.StyleSheet.create({ root: { flex: 1, justifyContent: 'center', padding: theme_1.spacing.xl, gap: theme_1.spacing.md, backgroundColor: theme_1.C.bg }, kicker: { ...theme_1.typography.caption, color: theme_1.C.bad, fontWeight: '900', letterSpacing: 1 }, title: { ...theme_1.typography.hero, color: theme_1.C.text }, body: { ...theme_1.typography.body, color: theme_1.C.muted }, detail: { padding: theme_1.spacing.md, borderWidth: 1, borderColor: theme_1.C.line, borderRadius: 8, backgroundColor: theme_1.C.panel }, detailText: { ...theme_1.typography.caption, color: theme_1.C.warning } });
