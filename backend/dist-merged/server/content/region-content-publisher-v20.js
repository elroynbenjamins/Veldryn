"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashRegionContentV20 = hashRegionContentV20;
exports.buildSunscarRegionContentBundleV20 = buildSunscarRegionContentBundleV20;
exports.stageAndPublishSunscarV20 = stageAndPublishSunscarV20;
const node_crypto_1 = require("node:crypto");
const sunscar_dungeons_v20_1 = require("./sunscar-dungeons-v20");
const sunscar_region_v20_1 = require("./sunscar-region-v20");
function canonical(value) {
    if (value === null || typeof value !== 'object')
        return JSON.stringify(value);
    if (Array.isArray(value))
        return `[${value.map(canonical).join(',')}]`;
    const object = value;
    return `{${Object.keys(object).sort().map(k => `${JSON.stringify(k)}:${canonical(object[k])}`).join(',')}}`;
}
function hashRegionContentV20(input) { return (0, node_crypto_1.createHash)('sha256').update(canonical(input)).digest().toString('hex'); }
function buildSunscarRegionContentBundleV20(contentVersion = 'sunscar-v20.0.0') {
    const records = [
        { recordType: 'region', recordId: 'REG_002', sortOrder: 0, payload: { id: 'REG_002', name: 'Sunscar Desert', levelMin: 25, levelMax: 45, unlockBossId: 'BOSS_001', finalBossId: 'BOSS_002', nextRegionId: 'REG_003', equipmentPolicy: sunscar_region_v20_1.SUNSCAR_EQUIPMENT_POLICY_V20 } },
        ...sunscar_region_v20_1.SUNSCAR_ZONES_V20.map((payload, i) => ({ recordType: 'zone', recordId: payload.id, sortOrder: 100 + i, payload })),
        ...sunscar_region_v20_1.SUNSCAR_ENEMIES_V20.map((payload, i) => ({ recordType: 'monster', recordId: payload.id, sortOrder: 200 + i, payload })),
        ...sunscar_region_v20_1.SUNSCAR_BOSSES_V20.map((payload, i) => ({ recordType: 'boss', recordId: payload.id, sortOrder: 300 + i, payload })),
        ...sunscar_region_v20_1.SUNSCAR_RESOURCES_V20.map((payload, i) => ({ recordType: 'resource', recordId: payload.id, sortOrder: 400 + i, payload })),
        ...sunscar_region_v20_1.SUNSCAR_QUESTLINE_V20.map((payload, i) => ({ recordType: 'quest', recordId: payload.id, sortOrder: 500 + i, payload })),
        ...sunscar_region_v20_1.SUNSCAR_ECHO_CONDITIONS_V20.map((payload, i) => ({ recordType: 'echo_condition', recordId: payload.id, sortOrder: 550 + i, payload })),
        ...sunscar_region_v20_1.SUNSCAR_RELIC_HOOKS_V20.map((payload, i) => ({ recordType: 'relic', recordId: payload.id, sortOrder: 560 + i, payload })),
        ...sunscar_region_v20_1.SUNSCAR_COLLECTIBLE_UNLOCKS_V20.map((payload, i) => ({ recordType: 'collectible_unlock', recordId: payload.id, sortOrder: 570 + i, payload })),
        ...sunscar_dungeons_v20_1.SUNSCAR_DUNGEONS_V20.map((payload, i) => ({ recordType: 'live_dungeon', recordId: payload.id, sortOrder: 600 + i, payload })),
        ...sunscar_dungeons_v20_1.SUNSCAR_DUNGEON_NODES_V20.map((payload, i) => ({ recordType: 'dungeon_node', recordId: payload.id, sortOrder: 700 + i, payload })),
    ];
    return { contentVersion, regionId: 'REG_002', schemaVersion: 1, records, contentHash: hashRegionContentV20({ contentVersion, regionId: 'REG_002', schemaVersion: 1, records }) };
}
async function stageAndPublishSunscarV20(store, input) {
    const bundle = buildSunscarRegionContentBundleV20(input.contentVersion);
    await store.stageManifest({ contentVersion: bundle.contentVersion, regionId: bundle.regionId, schemaVersion: bundle.schemaVersion, contentHash: bundle.contentHash, minimumClientBuild: input.minimumClientBuild });
    await store.replaceDraftRecords(bundle.contentVersion, bundle.records);
    if (input.publish)
        await store.publishManifest(bundle.contentVersion, bundle.contentHash);
    return bundle;
}
