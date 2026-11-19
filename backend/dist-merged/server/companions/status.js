"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companionAvailabilityStatus = companionAvailabilityStatus;
exports.availableForCompanionActivity = availableForCompanionActivity;
const assignments_1 = require("./assignments");
const content_1 = require("./content");
function companionAvailabilityStatus(companionId, context) {
    if (!(0, content_1.companionServerDefinition)(companionId))
        return 'unavailable';
    if (!context.owned[companionId])
        return 'locked';
    if (context.unavailableCompanionIds?.has(companionId))
        return 'unavailable';
    if (context.equippedCompanionIds.has(companionId))
        return 'equipped';
    const assignments = (0, assignments_1.rolloverCompanionAssignmentStatuses)(context.assignments, context.serverNowMs);
    if ((0, assignments_1.busyCompanionIds)(assignments).has(companionId))
        return 'expedition';
    if (context.trialProgress?.season.activeRun?.teamCompanionIds.includes(companionId))
        return 'active_trial';
    return 'available';
}
function availableForCompanionActivity(companionId, context) { return companionAvailabilityStatus(companionId, context) === 'available'; }
