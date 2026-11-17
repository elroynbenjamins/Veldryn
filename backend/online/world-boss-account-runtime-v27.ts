/**
 * V27 private-only integration factory (UNMOUNTED). Couples the V26
 * authored raid worker/reservation to the SAME authoritative V27 frozen
 * War Camp and atomic material-deduction repository. Never expose this
 * factory, SQL credentials, Auth verifier or repository to a client.
 */
import {createWorldBossAccountPgV26} from './world-boss-account-pg-v26';
import type {WorldBossDepsV26} from './world-boss-account-service-v26';
import {createWorldBossWarCampPgV27,withWorldBossFrozenWarCampV27,
 type WorldBossWarCampDepsV27} from './world-boss-war-camp-service-v27';
import type {WorldBossRulesSourceV20} from './world-boss-frozen-modifiers-v20';
import type {WorldBossPgExecutorV19} from './world-boss-private-pg-v19';

export const WORLD_BOSS_V27_PRIVATE_RUNTIME_LIVE=false as const;
export interface WorldBossRuntimeV27{
 authoredRaid:WorldBossDepsV26;
 donations:WorldBossWarCampDepsV27;
}
/** Caller must supply server-only Auth, CSPRNG, replay storage and frozen
 * V13 enemy profiles. Profile source is still required to be approved.
 */
export function createWorldBossPrivateRuntimeV27(input:{
 executor:WorldBossPgExecutorV19;
 service:Omit<WorldBossDepsV26,'db'|'rulesSource'>;
 rulesSource:WorldBossRulesSourceV20;
}):WorldBossRuntimeV27{
 if(!input||!input.executor||
  typeof input.executor.query!=='function'||
  !input.service||!input.rulesSource)
  throw Error('world_boss_v27_private_runtime_required');
 const warCampDb=createWorldBossWarCampPgV27(input.executor);
 return {
  authoredRaid:{
   ...input.service,
   db:createWorldBossAccountPgV26(input.executor),
   rulesSource:withWorldBossFrozenWarCampV27(
    input.rulesSource,warCampDb),
  },
  donations:{
   authenticate:input.service.authenticate,
   db:warCampDb,
  },
 };
}
