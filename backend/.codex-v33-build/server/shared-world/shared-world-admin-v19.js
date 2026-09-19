"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SHARED_WORLD_ADMIN_COMMANDS = void 0;
exports.executeSharedWorldAdminCommand = executeSharedWorldAdminCommand;
exports.SHARED_WORLD_ADMIN_COMMANDS = [
    'shared_world.crisis_cancel',
    'shared_world.crisis_recalculate',
    'shared_world.world_boss_cancel',
    'shared_world.world_boss_recalculate_hp',
    'shared_world.world_boss_repair_attempt',
    'shared_world.world_boss_finalize',
];
async function executeSharedWorldAdminCommand(deps, command, params, reason) {
    const id = String(params.instanceId ?? '');
    if (command === 'shared_world.crisis_cancel')
        return deps.cancelCrisis(id, reason);
    if (command === 'shared_world.crisis_recalculate')
        return deps.recalculateCrisis(id);
    if (command === 'shared_world.world_boss_cancel')
        return deps.cancelWorldBoss(id, reason);
    if (command === 'shared_world.world_boss_recalculate_hp')
        return deps.recalculateWorldBossHp(id);
    if (command === 'shared_world.world_boss_repair_attempt')
        return deps.repairWorldBossAttempt(String(params.encounterId ?? ''));
    if (command === 'shared_world.world_boss_finalize')
        return deps.finalizeWorldBoss(id);
    throw new Error('shared_world_admin_command_not_supported');
}
