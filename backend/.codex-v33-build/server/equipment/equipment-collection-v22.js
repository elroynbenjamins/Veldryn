"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SKIN_MILESTONE_RULES_V22 = exports.SKIN_OWNERSHIP_CATEGORY_CAP = void 0;
exports.cappedSkinCategoryBonusV22 = cappedSkinCategoryBonusV22;
exports.unlockedSkinMilestonesV22 = unlockedSkinMilestonesV22;
exports.SKIN_OWNERSHIP_CATEGORY_CAP = 0.10;
exports.SKIN_MILESTONE_RULES_V22 = [{ count: 3, key: 'gold_normal', value: .01 }, { count: 6, key: 'gathering_yield', value: .01 }, { count: 9, key: 'craft_processing_speed', value: .01 }, { count: 12, key: 'combat_xp', value: .01 }, { count: 18, key: 'skilling_xp', value: .01 }, { count: 24, key: 'rare_material_find', value: .01 }, { count: 27, key: 'dungeon_material_quantity', value: .01 }];
function cappedSkinCategoryBonusV22(numberOfEligibleSkins, perSkin = .01) { return Math.min(exports.SKIN_OWNERSHIP_CATEGORY_CAP, numberOfEligibleSkins * perSkin); }
function unlockedSkinMilestonesV22(totalEligibleSkins) { return exports.SKIN_MILESTONE_RULES_V22.filter(v => totalEligibleSkins >= v.count); }
