"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SHARED_WORLD_ADMIN_COMMANDS = void 0;
exports.isSharedWorldAdminCommand = isSharedWorldAdminCommand;
exports.executeSharedWorldAdminCommand = executeSharedWorldAdminCommand;
exports.SHARED_WORLD_ADMIN_COMMANDS = [
    'shared_world.crisis_cancel',
    'shared_world.crisis_recalculate',
    'shared_world.world_boss_cancel',
    'shared_world.world_boss_recalculate_hp',
    'shared_world.world_boss_repair_attempt',
    'shared_world.world_boss_finalize',
];
/** Destructive commands must carry an operator reason for the audit trail. */
const REASON_REQUIRED = new Set(['shared_world.crisis_cancel', 'shared_world.world_boss_cancel', 'shared_world.world_boss_repair_attempt', 'shared_world.world_boss_finalize']);
function isSharedWorldAdminCommand(value) {
    return exports.SHARED_WORLD_ADMIN_COMMANDS.includes(value);
}
function requiredId(params, key) {
    const value = params[key];
    const id = typeof value === 'string' ? value.trim() : '';
    if (!id)
        throw new Error(`shared_world_admin_${key === 'instanceId' ? 'instance_id' : 'encounter_id'}_required`);
    return id;
}
async function executeSharedWorldAdminCommand(deps, command, params, reason) {
    if (!isSharedWorldAdminCommand(command))
        throw new Error('shared_world_admin_command_not_supported');
    const trimmedReason = reason.trim();
    if (REASON_REQUIRED.has(command) && !trimmedReason)
        throw new Error('shared_world_admin_reason_required');
    switch (command) {
        case 'shared_world.crisis_cancel': return deps.cancelCrisis(requiredId(params, 'instanceId'), trimmedReason);
        case 'shared_world.crisis_recalculate': return deps.recalculateCrisis(requiredId(params, 'instanceId'));
        case 'shared_world.world_boss_cancel': return deps.cancelWorldBoss(requiredId(params, 'instanceId'), trimmedReason);
        case 'shared_world.world_boss_recalculate_hp': return deps.recalculateWorldBossHp(requiredId(params, 'instanceId'));
        case 'shared_world.world_boss_repair_attempt': return deps.repairWorldBossAttempt(requiredId(params, 'encounterId'));
        case 'shared_world.world_boss_finalize': return deps.finalizeWorldBoss(requiredId(params, 'instanceId'));
    }
}
