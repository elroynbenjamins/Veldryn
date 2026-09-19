"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncAdminContentCatalog = syncAdminContentCatalog;
const map = (type, rows, version) => rows.map(row => ({ entityType: type, entityKey: String(row.id), label: String(row.name), metadata: { ...row }, enabled: row.enabled !== false, sourceVersion: version }));
async function syncAdminContentCatalog(sink, src) {
    await sink.replaceType('item', map('item', src.items, src.sourceVersion));
    await sink.replaceType('skill', map('skill', src.skills, src.sourceVersion));
    await sink.replaceType('currency_nonpremium', map('currency_nonpremium', src.currencies.filter(x => !x.premium), src.sourceVersion));
    await sink.replaceType('premium_currency', map('premium_currency', src.currencies.filter(x => x.premium), src.sourceVersion));
    await sink.replaceType('reward_bundle', map('reward_bundle', src.rewards, src.sourceVersion));
    await sink.replaceType('companion', map('companion', src.companions, src.sourceVersion));
    await sink.replaceType('entitlement', map('entitlement', src.entitlements, src.sourceVersion));
    await sink.replaceType('pet', map('pet', (src.pets ?? []), src.sourceVersion));
    await sink.replaceType('profile_background', map('profile_background', (src.profileBackgrounds ?? []), src.sourceVersion));
    await sink.replaceType('profile_border', map('profile_border', (src.profileBorders ?? []), src.sourceVersion));
    await sink.replaceType('skin', map('skin', (src.skins ?? []), src.sourceVersion));
    await sink.replaceType('achievement', map('achievement', (src.achievements ?? []), src.sourceVersion));
    await sink.replaceType('title', map('title', (src.titles ?? []), src.sourceVersion));
}
