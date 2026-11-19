"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEGACY_DUNGEON_BASE_MARKS = void 0;
exports.frozenRunBaseMarks = frozenRunBaseMarks;
exports.currentDungeonBaseMarks = currentDungeonBaseMarks;
const launch_content_1 = require("./content/launch-content");
/** Previous published base rewards. Runs created before the rebalancing
 * do not contain a frozen reward amount, so settle against this snapshot. */
exports.LEGACY_DUNGEON_BASE_MARKS = Object.freeze({
    EXP_001: 74, EXP_002: 76, EXP_003: 80, EXP_004: 80,
    EXP_005: 84, EXP_006: 85, EXP_007: 88, EXP_008: 90,
});
/** Existing runs retain their original economy even when rewards are retuned.
 * Fresh runs freeze the catalogue value at creation for retry safety. */
function frozenRunBaseMarks(run) {
    if (typeof run.rewardBaseMarks === 'number' && Number.isSafeInteger(run.rewardBaseMarks) && run.rewardBaseMarks >= 0)
        return run.rewardBaseMarks;
    const legacy = exports.LEGACY_DUNGEON_BASE_MARKS[run.expeditionId];
    if (legacy === undefined)
        throw new Error('unknown_expedition');
    return legacy;
}
/** Call only while creating a fresh dungeon run. */
function currentDungeonBaseMarks(expeditionId) {
    const amount = launch_content_1.EXPEDITIONS[expeditionId]?.baseMarks;
    if (typeof amount !== 'number' || !Number.isSafeInteger(amount) || amount < 0)
        throw new Error('unknown_expedition');
    return amount;
}
