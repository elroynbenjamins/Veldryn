export interface SharedWorldClock { nowMs():number; }
export interface SharedWorldWorkerStore {
  activateDueCrises(nowMs:number):Promise<number>;
  failExpiredCrises(nowMs:number):Promise<number>;
  finalizeResolvedCrises(nowMs:number):Promise<number>;
  spawnUnlockedWorldBosses(nowMs:number):Promise<number>;
  activateDueWorldBosses(nowMs:number):Promise<number>;
  expireWorldBosses(nowMs:number):Promise<number>;
  finalizeWorldBosses(nowMs:number):Promise<number>;
  heartbeat(workerKey:string,details:Record<string,unknown>):Promise<void>;
}

export interface SharedWorldWorkerResult { activatedCrises:number; failedCrises:number; finalizedCrises:number; spawnedBosses:number; activatedBosses:number; expiredBosses:number; finalizedBosses:number; }

/** Run once per minute from the same worker/cron infrastructure used by v17 Live-Ops. */
export async function runSharedWorldWorker(store:SharedWorldWorkerStore,clock:SharedWorldClock):Promise<SharedWorldWorkerResult>{
  const nowMs=clock.nowMs();
  const activatedCrises=await store.activateDueCrises(nowMs);
  const failedCrises=await store.failExpiredCrises(nowMs);
  const spawnedBosses=await store.spawnUnlockedWorldBosses(nowMs);
  const activatedBosses=await store.activateDueWorldBosses(nowMs);
  const expiredBosses=await store.expireWorldBosses(nowMs);
  const finalizedCrises=await store.finalizeResolvedCrises(nowMs);
  const finalizedBosses=await store.finalizeWorldBosses(nowMs);
  const result={activatedCrises,failedCrises,finalizedCrises,spawnedBosses,activatedBosses,expiredBosses,finalizedBosses};
  await store.heartbeat('shared_world_v19',result);
  return result;
}
