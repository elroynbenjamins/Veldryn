"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSunscarRegionContentBundleV21 = buildSunscarRegionContentBundleV21;
exports.buildFrostmarchRegionContentBundleV21 = buildFrostmarchRegionContentBundleV21;
exports.stagePublishActivateRegionV21 = stagePublishActivateRegionV21;
const region_content_publisher_v20_1 = require("./region-content-publisher-v20");
const sunscar_depth_v21_1 = require("./sunscar-depth-v21");
const frostmarch_region_v21_1 = require("./frostmarch-region-v21");
const frostmarch_dungeons_v21_1 = require("./frostmarch-dungeons-v21");
const frostmarch_gameplay_v21_1 = require("./frostmarch-gameplay-v21");
const extra = (type, list, start) => list.map((payload, i) => ({ recordType: type, recordId: payload.id, sortOrder: start + i, payload }));
function buildSunscarRegionContentBundleV21(contentVersion = 'sunscar-v21.0.0') {
    const base = (0, region_content_publisher_v20_1.buildSunscarRegionContentBundleV20)(contentVersion).records;
    const records = [...base, ...extra('side_quest', sunscar_depth_v21_1.SUNSCAR_SIDE_QUESTS_V21, 800), ...extra('activity', sunscar_depth_v21_1.SUNSCAR_ACTIVITIES_V21, 850), ...extra('achievement', sunscar_depth_v21_1.SUNSCAR_ACHIEVEMENTS_V21, 900), ...extra('collection_book', sunscar_depth_v21_1.SUNSCAR_COLLECTION_BOOKS_V21, 930), ...extra('weather_rule', sunscar_depth_v21_1.SUNSCAR_WEATHER_RULES_V21, 940), ...extra('region_contract', sunscar_depth_v21_1.SUNSCAR_CONTRACTS_V21, 950), ...extra('boss_mastery', sunscar_depth_v21_1.SUNSCAR_BOSS_MASTERY_V21, 960)];
    return { contentVersion, regionId: 'REG_002', schemaVersion: 2, records, contentHash: (0, region_content_publisher_v20_1.hashRegionContentV20)({ contentVersion, regionId: 'REG_002', schemaVersion: 2, records }) };
}
function buildFrostmarchRegionContentBundleV21(contentVersion = 'frostmarch-v21.0.0') {
    const records = [
        { recordType: 'region', recordId: 'REG_003', sortOrder: 0, payload: { id: 'REG_003', name: 'Frostmarch', levelMin: 45, levelMax: 70, unlockBossId: 'BOSS_002', finalBossId: 'BOSS_003', nextRegionId: 'REG_004', equipmentPolicy: frostmarch_region_v21_1.FROSTMARCH_EQUIPMENT_POLICY_V21 } },
        ...extra('zone', frostmarch_region_v21_1.FROSTMARCH_ZONES_V21, 100), ...extra('monster', frostmarch_region_v21_1.FROSTMARCH_ENEMIES_V21, 200), ...extra('boss', frostmarch_region_v21_1.FROSTMARCH_BOSSES_V21, 300), ...extra('resource', frostmarch_region_v21_1.FROSTMARCH_RESOURCES_V21, 400), ...extra('quest', frostmarch_region_v21_1.FROSTMARCH_QUESTLINE_V21, 500), ...extra('echo_condition', frostmarch_region_v21_1.FROSTMARCH_ECHOES_V21, 550), ...extra('relic', frostmarch_region_v21_1.FROSTMARCH_RELICS_V21, 560), ...extra('collectible_unlock', frostmarch_region_v21_1.FROSTMARCH_COLLECTIBLES_V21, 570), ...extra('live_dungeon', frostmarch_dungeons_v21_1.FROSTMARCH_DUNGEONS_V21, 600), ...extra('dungeon_node', frostmarch_dungeons_v21_1.FROSTMARCH_DUNGEON_NODES_V21, 700), ...extra('side_quest', frostmarch_gameplay_v21_1.FROSTMARCH_SIDE_QUESTS_V21, 800), ...extra('activity', frostmarch_gameplay_v21_1.FROSTMARCH_ACTIVITIES_V21, 850), ...extra('achievement', frostmarch_gameplay_v21_1.FROSTMARCH_ACHIEVEMENTS_V21, 900), ...extra('collection_book', frostmarch_gameplay_v21_1.FROSTMARCH_COLLECTION_BOOKS_V21, 930), ...extra('weather_rule', frostmarch_gameplay_v21_1.FROSTMARCH_WEATHER_RULES_V21, 940), ...extra('region_contract', frostmarch_gameplay_v21_1.FROSTMARCH_CONTRACTS_V21, 950), ...extra('boss_mastery', frostmarch_gameplay_v21_1.FROSTMARCH_BOSS_MASTERY_V21, 960),
    ];
    return { contentVersion, regionId: 'REG_003', schemaVersion: 2, records, contentHash: (0, region_content_publisher_v20_1.hashRegionContentV20)({ contentVersion, regionId: 'REG_003', schemaVersion: 2, records }) };
}
async function stagePublishActivateRegionV21(store, bundle, input) { await store.stageManifest({ contentVersion: bundle.contentVersion, regionId: bundle.regionId, schemaVersion: bundle.schemaVersion, contentHash: bundle.contentHash, minimumClientBuild: input.minimumClientBuild }); await store.replaceDraftRecords(bundle.contentVersion, bundle.records); if (input.publish)
    await store.publishManifest(bundle.contentVersion, bundle.contentHash); if (input.activate) {
    if (!input.publish)
        throw new Error('activate_requires_publish');
    await store.activateRegion(bundle.regionId, bundle.contentVersion);
} }
