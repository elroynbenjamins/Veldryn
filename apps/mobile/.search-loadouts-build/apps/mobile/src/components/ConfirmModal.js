"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfirmModal = ConfirmModal;
const react_native_1 = require("react-native");
const theme_1 = require("../theme/theme");
const GameButton_1 = require("./GameButton");
function ConfirmModal({ visible, title, message, confirmLabel, danger = false, onConfirm, onCancel }) {
    return <react_native_1.Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <react_native_1.View style={s.backdrop}>
      <react_native_1.Pressable style={react_native_1.StyleSheet.absoluteFill} accessible={false} onPress={onCancel}/>
      <react_native_1.View style={s.card} accessibilityViewIsModal>
        <react_native_1.ScrollView style={s.content} contentContainerStyle={s.copy} bounces={false}>
          <react_native_1.Text accessibilityRole="header" style={s.title}>{title}</react_native_1.Text><react_native_1.Text style={s.message}>{message}</react_native_1.Text>
        </react_native_1.ScrollView>
        <react_native_1.View style={s.actions}><GameButton_1.GameButton title="Cancel" tone="secondary" onPress={onCancel}/><GameButton_1.GameButton title={confirmLabel} tone={danger ? 'danger' : 'primary'} onPress={onConfirm}/></react_native_1.View>
      </react_native_1.View>
    </react_native_1.View>
  </react_native_1.Modal>;
}
const s = react_native_1.StyleSheet.create({ backdrop: { flex: 1, backgroundColor: 'rgba(4,8,14,.82)', justifyContent: 'center', alignItems: 'center', padding: theme_1.spacing.lg }, card: { width: '100%', maxWidth: 480, maxHeight: '90%', backgroundColor: theme_1.C.panel, borderWidth: 1, borderColor: theme_1.C.line, borderRadius: theme_1.radii.lg, padding: theme_1.spacing.lg, gap: theme_1.spacing.md }, content: { flexGrow: 0, flexShrink: 1 }, copy: { gap: theme_1.spacing.md, paddingBottom: 4 }, title: { ...theme_1.typography.title, color: theme_1.C.text }, message: { ...theme_1.typography.body, color: theme_1.C.muted }, actions: { gap: theme_1.spacing.sm, flexShrink: 0 } });
