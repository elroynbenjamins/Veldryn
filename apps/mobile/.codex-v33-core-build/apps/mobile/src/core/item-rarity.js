"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rarityMeta = exports.rarityLabel = exports.GEAR_RARITIES = void 0;
exports.itemRarity = itemRarity;
exports.rollGearRarity = rollGearRarity;
/** Familiar MMORPG rarity language, kept in one place for every equipment surface. */
exports.GEAR_RARITIES = [
    { id: 'common', label: 'Common', chance: .89, color: '#9aa4b2', surface: 'rgba(154,164,178,.08)', statMultiplier: 1, borderWidth: 1, glowOpacity: 0, symbol: '◆' },
    { id: 'uncommon', label: 'Uncommon', chance: .07, color: '#49c873', surface: 'rgba(73,200,115,.10)', statMultiplier: 1.12, borderWidth: 1, glowOpacity: .08, symbol: '◆' },
    { id: 'rare', label: 'Rare', chance: .03, color: '#4b91ff', surface: 'rgba(75,145,255,.11)', statMultiplier: 1.28, borderWidth: 2, glowOpacity: .12, symbol: '✦' },
    { id: 'epic', label: 'Epic', chance: .01, color: '#ad72ff', surface: 'rgba(173,114,255,.12)', statMultiplier: 1.5, borderWidth: 2, glowOpacity: .18, symbol: '✦' },
    { id: 'legendary', label: 'Legendary', chance: .001, color: '#ff9f35', surface: 'rgba(255,159,53,.13)', statMultiplier: 1.8, borderWidth: 2, glowOpacity: .24, symbol: '★' },
    { id: 'mythic', label: 'Mythic', chance: .0005, color: '#f25591', surface: 'rgba(242,85,145,.15)', statMultiplier: 2.2, borderWidth: 3, glowOpacity: .3, symbol: '✧' },
];
function itemRarity(item) {
    if (item.rarity)
        return item.rarity;
    if (item.type !== 'gear')
        return 'common';
    if (item.value >= 1500)
        return 'mythic';
    if (item.value >= 800)
        return 'legendary';
    if (item.value >= 400 || item.readiness && item.readiness >= 10)
        return 'epic';
    if (item.value >= 150 || item.readiness && item.readiness >= 7)
        return 'rare';
    if (item.value >= 50 || item.readiness && item.readiness >= 3)
        return 'uncommon';
    return 'common';
}
const rarityLabel = (item) => itemRarity(item).toUpperCase();
exports.rarityLabel = rarityLabel;
const rarityMeta = (rarity) => exports.GEAR_RARITIES.find(entry => entry.id === rarity);
exports.rarityMeta = rarityMeta;
/** Offline preview only. Online servers must roll and persist rarity authoritatively. */
function rollGearRarity(seed) { let hash = 0; for (const char of seed)
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0; const roll = (hash % 100000) / 100000; let cursor = 0; for (const entry of exports.GEAR_RARITIES.slice().reverse()) {
    cursor += entry.chance;
    if (roll < cursor)
        return entry.id;
} return 'common'; }
