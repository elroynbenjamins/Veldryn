"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EARLY_ACQUISITION_SPLIT_V28 = exports.ACQUISITION_SPLIT_V28 = exports.FINAL_CRAFT_TIMER_RANGE_MIN_V28 = exports.SLOT_EFFORT_MULT_V28 = exports.SET_EFFORT_HOURS_V28 = void 0;
exports.targetPieceHoursV28 = targetPieceHoursV28;
exports.targetFinalCraftMinutesV28 = targetFinalCraftMinutesV28;
exports.targetAcquisitionHoursV28 = targetAcquisitionHoursV28;
exports.SET_EFFORT_HOURS_V28 = { T1: [1.5, 2], T2: [3, 4], T3: [6, 8], T4: [9, 12], T5: [13, 16], T6: [18, 22], T7: [22, 28], T8: [27, 34], T9: [32, 42] };
exports.SLOT_EFFORT_MULT_V28 = { Helmet: .85, Chest: 1.2, Gloves: .7, Legs: 1, Boots: .75, Weapon: 1.35, 'Off-hand': 1.15 };
exports.FINAL_CRAFT_TIMER_RANGE_MIN_V28 = { T1: [1, 3], T2: [3, 6], T3: [5, 10], T4: [8, 15], T5: [12, 20], T6: [15, 25], T7: [20, 30], T8: [25, 40], T9: [30, 45] };
exports.ACQUISITION_SPLIT_V28 = { Foundation: { skilling: .72, combat: .18, dungeon: .10 }, Specialist: { skilling: .51, combat: .21, dungeon: .28 }, Alternate: { skilling: .42, combat: .23, dungeon: .35 } };
exports.EARLY_ACQUISITION_SPLIT_V28 = { Foundation: { skilling: .86, combat: .14, dungeon: 0 }, Specialist: { skilling: .74, combat: .26, dungeon: 0 }, Alternate: { skilling: .65, combat: .30, dungeon: .05 } };
function targetPieceHoursV28(tier, slot) { const [lo, hi] = exports.SET_EFFORT_HOURS_V28[tier]; return ((lo + hi) / 2 / 7) * exports.SLOT_EFFORT_MULT_V28[slot]; }
function targetFinalCraftMinutesV28(tier, slot) { const [lo, hi] = exports.FINAL_CRAFT_TIMER_RANGE_MIN_V28[tier]; const m = exports.SLOT_EFFORT_MULT_V28[slot]; return Math.round(lo + ((m - .70) / (.65)) * (hi - lo)); }
function targetAcquisitionHoursV28(tier, path, slot) { const total = targetPieceHoursV28(tier, slot); const timer = targetFinalCraftMinutesV28(tier, slot) / 60; const remaining = Math.max(0, total - timer); const split = tier === 'T1' || tier === 'T2' ? exports.EARLY_ACQUISITION_SPLIT_V28[path] : exports.ACQUISITION_SPLIT_V28[path]; return { total, finalCraft: timer, skilling: remaining * split.skilling, combat: remaining * split.combat, dungeon: remaining * split.dungeon }; }
