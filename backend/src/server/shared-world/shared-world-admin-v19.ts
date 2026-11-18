export const SHARED_WORLD_ADMIN_COMMANDS = [
  'shared_world.crisis_cancel',
  'shared_world.crisis_recalculate',
  'shared_world.world_boss_cancel',
  'shared_world.world_boss_recalculate_hp',
  'shared_world.world_boss_repair_attempt',
  'shared_world.world_boss_finalize',
] as const;
export type SharedWorldAdminCommand=typeof SHARED_WORLD_ADMIN_COMMANDS[number];

/** Destructive commands must carry an operator reason for the audit trail. */
const REASON_REQUIRED:ReadonlySet<SharedWorldAdminCommand>=new Set(['shared_world.crisis_cancel','shared_world.world_boss_cancel','shared_world.world_boss_repair_attempt','shared_world.world_boss_finalize']);

export interface SharedWorldAdminHandlerDependencies {
  cancelCrisis(instanceId:string,reason:string):Promise<unknown>;
  recalculateCrisis(instanceId:string):Promise<unknown>;
  cancelWorldBoss(instanceId:string,reason:string):Promise<unknown>;
  recalculateWorldBossHp(instanceId:string):Promise<unknown>;
  repairWorldBossAttempt(encounterId:string):Promise<unknown>;
  finalizeWorldBoss(instanceId:string):Promise<unknown>;
}

export function isSharedWorldAdminCommand(value:string):value is SharedWorldAdminCommand{
  return (SHARED_WORLD_ADMIN_COMMANDS as readonly string[]).includes(value);
}

function requiredId(params:Record<string,unknown>,key:'instanceId'|'encounterId'):string{
  const value=params[key];
  const id=typeof value==='string'?value.trim():'';
  if(!id) throw new Error(`shared_world_admin_${key==='instanceId'?'instance_id':'encounter_id'}_required`);
  return id;
}

export async function executeSharedWorldAdminCommand(deps:SharedWorldAdminHandlerDependencies,command:SharedWorldAdminCommand,params:Record<string,unknown>,reason:string):Promise<unknown>{
  if(!isSharedWorldAdminCommand(command)) throw new Error('shared_world_admin_command_not_supported');
  const trimmedReason=reason.trim();
  if(REASON_REQUIRED.has(command)&&!trimmedReason) throw new Error('shared_world_admin_reason_required');
  switch(command){
    case 'shared_world.crisis_cancel': return deps.cancelCrisis(requiredId(params,'instanceId'),trimmedReason);
    case 'shared_world.crisis_recalculate': return deps.recalculateCrisis(requiredId(params,'instanceId'));
    case 'shared_world.world_boss_cancel': return deps.cancelWorldBoss(requiredId(params,'instanceId'),trimmedReason);
    case 'shared_world.world_boss_recalculate_hp': return deps.recalculateWorldBossHp(requiredId(params,'instanceId'));
    case 'shared_world.world_boss_repair_attempt': return deps.repairWorldBossAttempt(requiredId(params,'encounterId'));
    case 'shared_world.world_boss_finalize': return deps.finalizeWorldBoss(requiredId(params,'instanceId'));
  }
}
