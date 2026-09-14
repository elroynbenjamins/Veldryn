"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COOP_PRIMARY_TABS = exports.COOP_UI_READY_ASSET_IDS = void 0;
exports.isCoopUiAssetId = isCoopUiAssetId;
exports.COOP_UI_READY_ASSET_IDS = [
    'rootbound_hero', 'forest_thumbnail', 'lava_thumbnail', 'ice_thumbnail', 'sunken_thumbnail',
    'elite_room_art', 'camp_room_art', 'shrine_room_art',
    'node_battle', 'node_elite', 'node_event', 'node_shrine', 'node_camp', 'node_treasure', 'node_merchant', 'node_echo', 'node_risk', 'node_boss',
    'role_tank', 'role_damage', 'role_support',
    'boon_rooted', 'boon_growth', 'boon_resilience',
    'skill_guard', 'skill_bulwark', 'skill_strike', 'skill_rift',
];
exports.COOP_PRIMARY_TABS = ['Home', 'Character', 'World', 'Inventory', 'More'];
function isCoopUiAssetId(value) {
    return typeof value === 'string' && exports.COOP_UI_READY_ASSET_IDS.includes(value);
}
