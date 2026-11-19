"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canTransitionLiveRun = canTransitionLiveRun;
exports.requiresRecovery = requiresRecovery;
exports.recoveryDisposition = recoveryDisposition;
const allowed = {
    forming: ['ready_check', 'cancelled'], ready_check: ['launching', 'forming', 'cancelled'], launching: ['active', 'recovering', 'cancelled'], active: ['recovering', 'completed', 'failed', 'abandoned'], recovering: ['active', 'failed', 'abandoned'], completed: [], failed: [], abandoned: [], cancelled: []
};
function canTransitionLiveRun(from, to) { return allowed[from].includes(to); }
function requiresRecovery(input) {
    if (!['launching', 'active', 'recovering'].includes(input.state))
        return false;
    if (input.leaseExpiresAtMs != null && input.leaseExpiresAtMs < input.nowMs)
        return true;
    if (input.lastServerHeartbeatMs != null && input.nowMs - input.lastServerHeartbeatMs > 30_000)
        return true;
    return false;
}
function recoveryDisposition(input) {
    if (!input.runSnapshotAvailable)
        return 'fail_safe';
    return input.encounterCommitted ? 'resume_from_snapshot' : 'replay_current_encounter';
}
