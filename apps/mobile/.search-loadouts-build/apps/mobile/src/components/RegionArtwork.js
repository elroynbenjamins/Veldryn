"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegionArtwork = RegionArtwork;
const react_1 = require("react");
const react_native_1 = require("react-native");
const world_map_1 = require("../content/world-map");
/** Reframes the approved Asterfall map around a region; no additional location lore or unlocks. */
function RegionArtwork({ regionId, muted = false }) {
    const [size, setSize] = (0, react_1.useState)({ width: 0, height: 0 });
    const zone = world_map_1.WORLD_ZONES.find(item => item.id === regionId) ?? world_map_1.WORLD_ZONES[0];
    const width = Math.max(size.width * 3, size.height * 2), height = width * (1537 / 1023);
    const left = Math.min(0, Math.max(size.width - width, size.width / 2 - zone.x * width));
    const top = Math.min(0, Math.max(size.height - height, size.height / 2 - zone.y * height));
    return <react_native_1.View accessible={false} pointerEvents="none" onLayout={event => { const { width, height } = event.nativeEvent.layout; setSize(old => old.width === width && old.height === height ? old : { width, height }); }} style={[react_native_1.StyleSheet.absoluteFill, s.crop, muted && { opacity: .4 }]}>
    {size.width > 0 && <react_native_1.Image source={require('../../assets/world/asterfall-map-v1.png')} resizeMode="stretch" fadeDuration={0} style={{ position: 'absolute', width, height, left, top }}/>}
  </react_native_1.View>;
}
const s = react_native_1.StyleSheet.create({ crop: { overflow: 'hidden', backgroundColor: '#101a24' } });
