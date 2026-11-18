export interface SharedWorldClock { nowMs():number; }
export interface SharedWorldWorkerStore {
  activateDueCrises(nowMs:number):Promise<number>;
  failExpiredCrises(nowMs:number):Promise<number>;
  finalizeResolvedCrises(nowMs:number):Promise<number>;
  spawnUnlockedWorldBosses(nowMs:number):Promise<number>;
  activateDueWorldBosses(nowMs:number):Promise<number>;
  /** Marks reserved attempts past their expiry as expired so they stop blocking new attempts and finalization. */
  expireStaleBossAttempts?(nowMs:number):Promise<number>;
  expireWorldBosses(nowMs:number):Promise<number>;
  finalizeWorldBosses(nowMs:number):Promise<number>;
  heartbeat(workerKey:string,details:Record<string,unknown>):Promise<void>;
}

export interface SharedWorldWorkerResult { activatedCrises:number; failedCrises:number; finalizedCrises:number; spawnedBosses:number; activatedBosses:number; expiredAttempts:number; expiredBosses:number; finalizedBosses:number; errors:SharedWorldWorkerStepError[]; }
export interface SharedWorldWorkerStepError { step:string; message:string; }

/**
 * Run once per minute from the same worker/cron infrastructure used by v17 Live-Ops.
 * Each step is idempotent and isolated: one failing step is reported in the heartbeat instead of
 * stopping unrelated crisis or boss lifecycle steps for the whole minute.
 */
export async function runSharedWorldWorker(store:SharedWorldWorkerStore,clock:SharedWorldClock):Promise<SharedWorldWorkerResult>{
  const nowMs=clock.nowMs();
  const errors:SharedWorldWorkerStepError[]=[];
  const step=async(name:string,run:(()=>Promise<number>)|undefined):Promise<number>=>{
    if(!run) return 0;
    try{ return await run(); }
    catch(error){ errors.push({step:name,message:error instanceof Error?error.message:String(error)}); return 0; }
  };
  const activatedCrises=await step('activateDueCrises',()=>store.activateDueCrises(nowMs));
  const failedCrises=await step('failExpiredCrises',()=>store.failExpiredCrises(nowMs));
  const spawnedBosses=await step('spawnUnlockedWorldBosses',()=>store.spawnUnlockedWorldBosses(nowMs));
  const activatedBosses=await step('activateDueWorldBosses',()=>store.activateDueWorldBosses(nowMs));
  const expiredAttempts=await step('expireStaleBossAttempts',store.expireStaleBossAttempts?()=>store.expireStaleBossAttempts!(nowMs):undefined);
  const expiredBosses=await step('expireWorldBosses',()=>store.expireWorldBosses(nowMs));
  const finalizedCrises=await step('finalizeResolvedCrises',()=>store.finalizeResolvedCrises(nowMs));
  const finalizedBosses=await step('finalizeWorldBosses',()=>store.finalizeWorldBosses(nowMs));
  const result={activatedCrises,failedCrises,finalizedCrises,spawnedBosses,activatedBosses,expiredAttempts,expiredBosses,finalizedBosses,errors};
  await store.heartbeat('shared_world_v19',{...result,ok:errors.length===0});
  return result;
}
