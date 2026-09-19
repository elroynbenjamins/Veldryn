"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvironmentBanner = EnvironmentBanner;
const react_native_1 = require("react-native");
const world_weather_1 = require("../core/world-weather");
const theme_1 = require("../theme/theme");
const EnvironmentArtwork_1 = require("./EnvironmentArtwork");
function remaining(changesAtMs, nowMs) {
    const minutes = Math.max(0, Math.ceil((changesAtMs - nowMs) / 60000));
    const hours = Math.floor(minutes / 60), rest = minutes % 60;
    return hours ? `${hours}h ${rest}m` : `${rest}m`;
}
function EnvironmentBanner({ environment, kind, nowMs = Date.now(), compact = false, locked = false }) {
    return <react_native_1.View style={[s.root, { borderColor: environment.weatherColor }, compact && s.compact]}>
    <react_native_1.View style={s.symbols}><EnvironmentArtwork_1.EnvironmentArtwork type="season" id={environment.seasonId} size={compact ? 30 : 38}/><EnvironmentArtwork_1.EnvironmentArtwork type="weather" id={environment.weatherId} size={compact ? 30 : 38}/></react_native_1.View>
    <react_native_1.View style={s.flex}><react_native_1.Text style={s.title}>{environment.seasonName} · {environment.weatherName}</react_native_1.Text><react_native_1.Text style={s.detail}>{environment.zoneName}{kind ? ` · ${(0, world_weather_1.environmentSummary)(kind, environment)}` : ''}</react_native_1.Text>{!compact && <react_native_1.Text style={s.timer}>{locked ? 'Weather locked until this activity ends' : `Regional weather changes in ${remaining(environment.changesAtMs, nowMs)}`}</react_native_1.Text>}</react_native_1.View>
  </react_native_1.View>;
}
const s = react_native_1.StyleSheet.create({ root: { flexDirection: 'row', alignItems: 'center', gap: theme_1.spacing.md, backgroundColor: theme_1.C.panel, borderWidth: 1, borderRadius: theme_1.radii.lg, padding: theme_1.spacing.md }, compact: { padding: theme_1.spacing.sm }, symbols: { flexDirection: 'row', gap: theme_1.spacing.xs }, flex: { flex: 1 }, title: { ...theme_1.typography.bodyStrong, color: theme_1.C.text }, detail: { ...theme_1.typography.caption, color: theme_1.C.info }, timer: { ...theme_1.typography.caption, color: theme_1.C.muted } });
