"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrimaryNavigationIcon = PrimaryNavigationIcon;
const react_native_1 = require("react-native");
const ui_icons_1 = require("../theme/ui-icons");
function PrimaryNavigationIcon({ destination, active }) {
    return <react_native_1.Image accessible={false} source={ui_icons_1.navigationIcons[destination]} resizeMode="contain" style={[{ width: 32, height: 32, opacity: active ? 1 : .82 }, react_native_1.Platform.OS === 'web' ? { imageRendering: 'pixelated' } : undefined]}/>;
}
