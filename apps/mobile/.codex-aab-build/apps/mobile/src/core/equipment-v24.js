"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EQUIPMENT_V24_UI_RULES = void 0;
exports.formatStatDeltaV24 = formatStatDeltaV24;
exports.skinProgressLabelV24 = skinProgressLabelV24;
exports.EQUIPMENT_V24_UI_RULES = { tabs: ['Equipped', 'Compare', 'Upgrade', 'Sets', 'Skins'], showFiveArmorSetThresholds: true, showSevenPieceSkinProgress: true, eventSkinsLiveOnlyInSkinsTab: true, neverShowEventSkinAsEquipment: true, showWeaponAndOffhandNamesOnSetCard: true };
function formatStatDeltaV24(v, isPercent) { const sign = v > 0 ? '+' : ''; return isPercent ? `${sign}${(v * 100).toFixed(1)}%` : `${sign}${Math.round(v)}`; }
function skinProgressLabelV24(v) { return v.unlocked ? 'Skin Unlocked' : `${v.crafted}/${v.required} crafted`; }
