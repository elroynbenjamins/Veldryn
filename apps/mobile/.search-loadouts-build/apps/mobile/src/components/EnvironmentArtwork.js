"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvironmentArtwork = EnvironmentArtwork;
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const environment_assets_1 = require("../theme/environment-assets");
function EnvironmentArtwork({ type, id, size = 28 }) {
    const source = type === 'season' ? environment_assets_1.seasonIconSource[id] : environment_assets_1.weatherIconSource[id];
    return <react_native_1.View style={{ width: size, height: size }}><react_native_1.Image source={source} resizeMode="contain" fadeDuration={0} style={s.image}/></react_native_1.View>;
}
const s = react_native_1.StyleSheet.create({ image: { width: '100%', height: '100%' } });
