"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.developmentDonationGoals = developmentDonationGoals;
exports.donationRemaining = donationRemaining;
exports.developmentMeaningfulDonorThreshold = developmentMeaningfulDonorThreshold;
exports.minimumDevelopmentDonors = minimumDevelopmentDonors;
exports.developmentProjectComplete = developmentProjectComplete;
exports.normalizedDonationShare = normalizedDonationShare;
exports.validateDonationAgainstDefinition = validateDonationAgainstDefinition;
function developmentDonationGoals(definition) {
    if (definition.kind !== 'development')
        throw new Error('not_development_project');
    return (definition.donationRequirements ?? []).map((row) => ({ resourceKind: row.resourceKind, resourceId: row.resourceId, targetAmount: row.quantity, contributedAmount: 0 }));
}
function donationRemaining(goal) { return Math.max(0, Math.floor(goal.targetAmount) - Math.max(0, Math.floor(goal.contributedAmount))); }
function developmentMeaningfulDonorThreshold() { return 0.03; }
function minimumDevelopmentDonors(activeMemberSnapshot) { return Math.max(1, Math.min(3, Math.ceil(Math.max(1, activeMemberSnapshot) * 0.15))); }
function developmentProjectComplete(goals, donors = [], activeMemberSnapshot = 1) {
    const resourcesComplete = goals.length > 0 && goals.every((goal) => donationRemaining(goal) === 0);
    if (!resourcesComplete)
        return false;
    const required = minimumDevelopmentDonors(activeMemberSnapshot);
    const meaningful = donors.filter((d) => d.normalizedProjectShare >= developmentMeaningfulDonorThreshold()).length;
    return meaningful >= required;
}
function normalizedDonationShare(input) {
    if (input.amount <= 0 || input.goalTarget <= 0 || input.goalCount <= 0)
        return 0;
    return Math.min(1 / input.goalCount, (input.amount / input.goalTarget) / input.goalCount);
}
function validateDonationAgainstDefinition(definition, resourceKind, resourceId, amount) {
    if (definition.kind !== 'development')
        throw new Error('project_does_not_accept_direct_donations');
    if (!Number.isInteger(amount) || amount <= 0)
        throw new Error('invalid_donation_amount');
    const requirement = (definition.donationRequirements ?? []).find((row) => row.resourceKind === resourceKind && row.resourceId === resourceId);
    if (!requirement)
        throw new Error('resource_not_required_by_project');
    return requirement;
}
