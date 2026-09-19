"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventIdentityBadge = EventIdentityBadge;
const react_native_1 = require("react-native");
const event_decoration_assets_1 = require("../theme/event-decoration-assets");
const theme_1 = require("../theme/theme");
function EventIdentityBadge({ event, size = 72 }) {
    const decoration = event_decoration_assets_1.EVENT_DECORATIONS.find(entry => entry.event === event);
    if (!decoration)
        return null;
    return <react_native_1.View accessible={false} importantForAccessibility="no-hide-descendants" pointerEvents="none" style={[s.frame, { width: size, height: size, borderRadius: size / 2 }]}>
    <react_native_1.Image source={decoration.badge} resizeMode="contain" style={{ width: size - 12, height: size - 12 }}/>
  </react_native_1.View>;
}
const s = react_native_1.StyleSheet.create({ frame: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(242,193,78,.7)', backgroundColor: 'rgba(7,17,28,.78)', shadowColor: theme_1.C.accent, shadowOpacity: .25, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 2 } });
