/**
 * Unmounted V28 server composition: authored V26 battle, frozen V27 War
 * Camp, then immutable-replay V28 reward proof. OFF by default.
 * Failure to save proof after V18 settlement does NOT debit boss HP twice:
 * retry reads the committed receipt, then replays the proof recovery.
 */
import {settleTrustedWorldBossAccountV26} from './world-boss-account-service-v26';
import {createWorldBossPrivateRuntimeV27,
 type WorldBossRuntimeV27} from './world-boss-account-runtime-v27';
import {createWorldBossRewardPgV28} from './world-boss-rewards-pg-v28';
import {recordTrustedWorldBossReplayV28,
 type WorldBossRewardDepsV28} from './world-boss-rewards-v28';
import type {WorldBossPgExecutorV19} from './world-boss-private-pg-v19';
import type {WorldBossDepsV26} from './world-boss-account-service-v26';
import type {WorldBossRulesSourceV20} from './world-boss-frozen-modifiers-v20';

export const WORLD_BOSS_V28_RUNTIME_LIVE=false as const;
export interface WorldBossRuntimeV28 extends WorldBossRuntimeV27 {
 rewards:WorldBossRewardDepsV28;
}
export function createWorldBossPrivateRuntimeV28(input:{
 executor:WorldBossPgExecutorV19;
 service:Omit<WorldBossDepsV26,'db'|'rulesSource'>;
 rulesSource:WorldBossRulesSourceV20;
 immutableReplayReader:{readImmutable(key:string):Promise<string>};
}):WorldBossRuntimeV28{
 if(!input?.immutableReplayReader||
  typeof input.immutableReplayReader.readImmutable!=='function')
  throw Error('world_boss_v28_replay_reader_required');
 const v27=createWorldBossPrivateRuntimeV27(input);
 return {...v27,rewards:{
  authenticate:input.service.authenticate,
  db:createWorldBossRewardPgV28(input.executor),
  replayStore:input.immutableReplayReader,
 }};
}
/**
 * Only an internal trusted worker calls this after a V26 reservation.
 * A persisted replay is proof-verified only AFTER the V18 HP commit.
 * A proof write failure can be retried without replaying/debiting a new
 * attempt; V18 settlement is immutable and replay storage is content-keyed.
 * No Sigils are minted here. Claims are separate authenticated actions.
 */
export async function settleAndProveWorldBossAccountV28(
 job:{eventId:string;accountId:string;requestId:string},
 runtime:WorldBossRuntimeV28,
){
 if(!runtime||!runtime.authoredRaid||!runtime.rewards)
  throw Error('world_boss_v28_private_worker_required');
 const battle=await settleTrustedWorldBossAccountV26(job,runtime.authoredRaid);
 if(battle.status!=='committed')return {battle,proof:null};
 const proof=await recordTrustedWorldBossReplayV28(job,runtime.rewards);
 return {battle,proof};
}
