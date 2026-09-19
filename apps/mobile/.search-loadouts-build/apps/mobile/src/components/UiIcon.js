"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UiIcon = UiIcon;
const react_native_1 = require("react-native");
const ui_icons_1 = require("../theme/ui-icons");
const pixelStyle = (react_native_1.Platform.OS === 'web' ? { imageRendering: 'pixelated' } : {});
function UiIcon({ name, size = 24, muted = false }) {
    return <react_native_1.Image accessible={false} source={(size <= 24 ? ui_icons_1.uiSmallIcons : ui_icons_1.uiIcons)[name]} fadeDuration={0} resizeMode="contain" style={[pixelStyle, { width: size, height: size, opacity: muted ? .6 : 1 }]}/>;
}
