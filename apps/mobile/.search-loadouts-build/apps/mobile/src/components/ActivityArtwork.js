"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityArtwork = ActivityArtwork;
const react_native_1 = require("react-native");
const skill_assets_1 = require("../theme/skill-assets");
function ActivityArtwork({ id, size = 40 }) {
    return <react_native_1.Image accessible={false} source={(size <= 24 ? skill_assets_1.smallSkillIcons : skill_assets_1.skillIcons)[id] ?? skill_assets_1.skillIcons.cooking} resizeMode="contain" fadeDuration={0} style={[{ width: size, height: size }, react_native_1.Platform.OS === 'web' ? { imageRendering: 'pixelated' } : undefined]}/>;
}
