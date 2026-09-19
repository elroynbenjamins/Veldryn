"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GatheringToolArtwork = GatheringToolArtwork;
const react_native_1 = require("react-native");
const gathering_tool_assets_1 = require("../theme/gathering-tool-assets");
const theme_1 = require("../theme/theme");
const ATLAS_ASPECT = 1268 / 1241;
function GatheringToolArtwork({ itemId, size = 58, framed = true }) {
    const cell = gathering_tool_assets_1.gatheringToolCells[itemId];
    if (!cell)
        return null;
    const atlasWidth = size * 4, atlasHeight = atlasWidth * ATLAS_ASPECT, cellHeight = atlasHeight / 4;
    return <react_native_1.View style={[s.crop, { width: size, height: size }, framed && s.frame]}><react_native_1.Image source={gathering_tool_assets_1.gatheringToolAtlas} resizeMode="stretch" style={{ position: 'absolute', width: atlasWidth, height: atlasHeight, left: -cell.column * size, top: -cell.row * cellHeight }}/></react_native_1.View>;
}
const s = react_native_1.StyleSheet.create({ crop: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, frame: { borderWidth: 1, borderColor: theme_1.C.line, borderRadius: theme_1.radii.sm, backgroundColor: '#09121a' } });
