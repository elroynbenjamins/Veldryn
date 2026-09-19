"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceArtwork = ResourceArtwork;
const react_native_1 = require("react-native");
const resource_assets_1 = require("../theme/resource-assets");
const theme_1 = require("../theme/theme");
function ResourceArtwork({ itemId, size = 58, framed = true }) {
    const source = (0, resource_assets_1.resourceIconSource)(itemId);
    if (!source)
        return null;
    return <react_native_1.View style={[s.art, { width: size, height: size }, framed && s.frame]}><react_native_1.Image source={source} resizeMode="contain" fadeDuration={0} style={s.image}/></react_native_1.View>;
}
const s = react_native_1.StyleSheet.create({ art: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, frame: { borderWidth: 1, borderColor: theme_1.C.line, borderRadius: theme_1.radii.sm, backgroundColor: '#09121a' }, image: { width: '100%', height: '100%' } });
