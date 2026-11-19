"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REGION_CONTENT_REMOTE_CONFIG_V21 = exports.REGION_CONTENT_ADMIN_COMMANDS_V21 = void 0;
exports.activateRegionContentVersionV21 = activateRegionContentVersionV21;
exports.REGION_CONTENT_ADMIN_COMMANDS_V21 = [
    { key: 'region_content.activate_version', risk: 'critical', ownerApproval: true, reasonRequired: true, handler: 'activateRegionContentVersion' },
    { key: 'region_content.rollback_active_version', risk: 'critical', ownerApproval: true, reasonRequired: true, handler: 'rollbackRegionContentVersion' },
];
exports.REGION_CONTENT_REMOTE_CONFIG_V21 = [
    { key: 'content.frostmarch.enabled', type: 'boolean', defaultValue: true, critical: false },
    { key: 'content.sunscar.side_content.enabled', type: 'boolean', defaultValue: true, critical: false },
];
async function activateRegionContentVersionV21(store, input) { if (!await store.isPublishedForRegion(input.regionId, input.contentVersion))
    throw new Error('invalid_or_unpublished_region_content'); const previous = await store.getActive(input.regionId); await store.activate(input.regionId, input.contentVersion); return { previous, active: input.contentVersion }; }
