"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ItemArtwork = ItemArtwork;
const react_native_1 = require("react-native");
const items_1 = require("../content/items");
const EquipmentArtwork_1 = require("./EquipmentArtwork");
const GatheringToolArtwork_1 = require("./GatheringToolArtwork");
const gathering_tool_assets_1 = require("../theme/gathering-tool-assets");
const ResourceArtwork_1 = require("./ResourceArtwork");
const resource_assets_1 = require("../theme/resource-assets");
const UiIcon_1 = require("./UiIcon");
/** Known items use their artwork. Uncatalogued materials retain a neutral bag marker and a text name. */
function ItemArtwork({ itemId, size = 40 }) {
    const item = (0, items_1.itemDef)(itemId);
    if ((0, resource_assets_1.hasResourceArtwork)(itemId))
        return <ResourceArtwork_1.ResourceArtwork itemId={itemId} size={size} framed={false}/>;
    if (item.type === 'tool' && gathering_tool_assets_1.gatheringToolCells[itemId])
        return <GatheringToolArtwork_1.GatheringToolArtwork itemId={itemId} size={size} framed={false}/>;
    if (item.type === 'gear' && (0, EquipmentArtwork_1.hasEquipmentArtwork)(item))
        return <react_native_1.View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}><react_native_1.View style={{ width: 48, height: 48, transform: [{ scale: size / 48 }] }}><EquipmentArtwork_1.EquipmentArtwork item={item} compact framed={false}/></react_native_1.View></react_native_1.View>;
    return <UiIcon_1.UiIcon name="inventory" size={size}/>;
}
