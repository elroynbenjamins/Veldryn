"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmptyState = EmptyState;
const react_native_1 = require("react-native");
const theme_1 = require("../theme/theme");
const UiIcon_1 = require("./UiIcon");
function EmptyState({ title, message, icon = 'search' }) { return <react_native_1.View style={s.root}><UiIcon_1.UiIcon name={icon} size={32}/><react_native_1.Text style={s.title}>{title}</react_native_1.Text><react_native_1.Text style={s.message}>{message}</react_native_1.Text></react_native_1.View>; }
const s = react_native_1.StyleSheet.create({ root: { alignItems: 'center', padding: theme_1.spacing.xl, gap: theme_1.spacing.sm }, title: { ...theme_1.typography.title, color: theme_1.C.text, textAlign: 'center' }, message: { ...theme_1.typography.body, color: theme_1.C.muted, textAlign: 'center', maxWidth: 360 } });
