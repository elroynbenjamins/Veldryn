"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaveTransferPanel = SaveTransferPanel;
const GameTextInput_1 = require("./GameTextInput");
const react_1 = require("react");
const react_native_1 = require("react-native");
const GameButton_1 = require("./GameButton");
const Panel_1 = require("./Panel");
const theme_1 = require("../theme/theme");
function SaveTransferPanel({ onExport, onImport, reduceMotion = false }) {
    const [visible, setVisible] = (0, react_1.useState)(false), [raw, setRaw] = (0, react_1.useState)(''), [busy, setBusy] = (0, react_1.useState)(false), [error, setError] = (0, react_1.useState)('');
    const importSave = async () => { setBusy(true); setError(''); try {
        await onImport(raw);
        setRaw('');
        setVisible(false);
    }
    catch (value) {
        setError(value instanceof Error ? value.message : 'The save could not be imported.');
    }
    finally {
        setBusy(false);
    } };
    return <Panel_1.Panel>
    <react_native_1.Text style={s.title}>Save backup</react_native_1.Text>
    <react_native_1.Text style={s.body}>Export a versioned JSON backup through your phone's share sheet, or paste one back into VELDRYN.</react_native_1.Text>
    <GameButton_1.GameButton title="Export save" tone="secondary" onPress={() => void onExport()}/>
    <GameButton_1.GameButton title="Import save…" tone="secondary" onPress={() => { setError(''); setVisible(true); }}/>
    <react_native_1.Modal visible={visible} transparent animationType={reduceMotion ? 'none' : 'fade'} onRequestClose={() => !busy && setVisible(false)}>
      <react_native_1.View style={s.scrim}><react_native_1.View style={s.dialog}>
        <react_native_1.Text style={s.title}>Import save backup</react_native_1.Text>
        <react_native_1.Text style={s.body}>Paste the complete JSON backup. It is validated and migrated before replacing the current local save.</react_native_1.Text>
        <react_native_1.ScrollView keyboardShouldPersistTaps="handled"><GameTextInput_1.GameTextInput accessibilityLabel="VELDRYN save backup JSON" value={raw} onChangeText={setRaw} multiline autoCapitalize="none" autoCorrect={false} placeholder="Paste backup JSON here" placeholderTextColor={theme_1.C.muted} style={s.input}/></react_native_1.ScrollView>
        {!!error && <react_native_1.Text accessibilityRole="alert" style={s.error}>{error}</react_native_1.Text>}
        <react_native_1.View style={s.actions}><react_native_1.View style={s.flex}><GameButton_1.GameButton title="Cancel" tone="secondary" disabled={busy} onPress={() => setVisible(false)}/></react_native_1.View><react_native_1.View style={s.flex}><GameButton_1.GameButton title={busy ? 'Importing…' : 'Validate & import'} disabled={busy || !raw.trim()} onPress={() => void importSave()}/></react_native_1.View></react_native_1.View>
      </react_native_1.View></react_native_1.View>
    </react_native_1.Modal>
  </Panel_1.Panel>;
}
const s = react_native_1.StyleSheet.create({ title: { ...theme_1.typography.title, color: theme_1.C.text }, body: { ...theme_1.typography.body, color: theme_1.C.muted }, scrim: { flex: 1, justifyContent: 'center', padding: theme_1.spacing.lg, backgroundColor: 'rgba(0,0,0,.75)' }, dialog: { maxHeight: '90%', gap: theme_1.spacing.md, padding: theme_1.spacing.lg, borderWidth: 1, borderColor: theme_1.C.accent, borderRadius: 12, backgroundColor: theme_1.C.panel }, input: { minHeight: 190, maxHeight: 360, textAlignVertical: 'top', padding: theme_1.spacing.md, borderWidth: 1, borderColor: theme_1.C.line, borderRadius: 8, backgroundColor: theme_1.C.bg, color: theme_1.C.text, fontSize: 14 }, error: { ...theme_1.typography.bodyStrong, color: theme_1.C.bad }, actions: { flexDirection: 'row', gap: theme_1.spacing.sm }, flex: { flex: 1 } });
