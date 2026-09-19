export type LiveRunState='forming'|'ready_check'|'launching'|'active'|'recovering'|'completed'|'failed'|'abandoned'|'cancelled';
const allowed:Record<LiveRunState,readonly LiveRunState[]>={
 forming:['ready_check','cancelled'], ready_check:['launching','forming','cancelled'], launching:['active','recovering','cancelled'], active:['recovering','completed','failed','abandoned'], recovering:['active','failed','abandoned'], completed:[], failed:[], abandoned:[], cancelled:[]
};
export function canTransitionLiveRun(from:LiveRunState,to:LiveRunState):boolean{return allowed[from].includes(to);}
export function requiresRecovery(input:{state:LiveRunState;nowMs:number;leaseExpiresAtMs?:number;lastServerHeartbeatMs?:number}):boolean{
  if(!['launching','active','recovering'].includes(input.state)) return false;
  if(input.leaseExpiresAtMs!=null&&input.leaseExpiresAtMs<input.nowMs) return true;
  if(input.lastServerHeartbeatMs!=null&&input.nowMs-input.lastServerHeartbeatMs>30_000) return true;
  return false;
}
export function recoveryDisposition(input:{state:LiveRunState;encounterCommitted:boolean;runSnapshotAvailable:boolean}):'resume_from_snapshot'|'replay_current_encounter'|'fail_safe'{
  if(!input.runSnapshotAvailable) return 'fail_safe';
  return input.encounterCommitted?'resume_from_snapshot':'replay_current_encounter';
}
