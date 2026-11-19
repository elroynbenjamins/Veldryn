/**
 * V64 private-only World Boss composition. HIDDEN, NOT MOUNTED.
 *
 * A trusted production host can eventually supply server-only Auth, an
 * account-erasure privacy reader, a privileged private PostgreSQL executor,
 * frozen combat source/entropy and immutable replay storage. This factory
 * deliberately exports NO HTTP endpoint, no public RPC, no event scheduler,
 * and no client-selected account or World Boss event.
 */
import {worldBossWindowsV22} from '../src/server/combat/world-boss-weekend-v22';
import {createWorldBossCurrentEventPgV51,
 type WorldBossCurrentOverviewDepsV51} from './world-boss-current-overview-v51';
import {createWorldBossOverviewPgV41} from './world-boss-overview-v41';
import {createWorldBossGateAttestationPgV63} from './world-boss-gate-attestation-v63';
import {createWorldBossPrivateRuntimeV28} from './world-boss-reward-runtime-v28';
import type {WorldBossActionDepsV62} from './world-boss-current-action-v62';
import type {WorldBossDepsV26} from './world-boss-account-service-v26';
import type {WorldBossRulesSourceV20} from './world-boss-frozen-modifiers-v20';
import type {WorldBossPgExecutorV19} from './world-boss-private-pg-v19';

export const WORLD_BOSS_V64_PRIVATE_COMPOSITION_LIVE=false as const;

/** Every dependency is a server-owned capability, never derived from JSON. */
export interface WorldBossActionRuntimeConfigV64 {
 executor:WorldBossPgExecutorV19;
 authenticate:WorldBossDepsV26['authenticate'];
 accountPrivacy:WorldBossCurrentOverviewDepsV51['accountPrivacy'];
 /** Immutable server configuration: globally canonical Monday 00:00 UTC. */
 launchMondayUtcMs:number;
 serverNowUtcMs:()=>number;
 rulesSource:WorldBossRulesSourceV20;
 bracketPolicy:WorldBossDepsV26['bracketPolicy'];
 minimumCharacterLevel:WorldBossDepsV26['minimumCharacterLevel'];
 randomSeed:WorldBossDepsV26['randomSeed'];
 workerId:WorldBossDepsV26['workerId'];
 replayStore:{
  putImmutable:WorldBossDepsV26['replayStore']['putImmutable'];
  readImmutable:(key:string)=>Promise<string>;
 };
}

/**
 * One shared Auth source for the status read and ALL downstream actions.
 * Missing account-privacy or gate-attestation dependencies fail closed.
 * The caller must separately install approved V57/58/59 erasure controls,
 * V61/V63 SQL and the private schema before mounting any request handler.
 */
export function createWorldBossActionDepsV64(
 input:WorldBossActionRuntimeConfigV64,
):WorldBossActionDepsV62{
 if(!input||!input.executor||
  typeof input.executor.query!=='function'||
  typeof input.authenticate!=='function'||
  !input.accountPrivacy||
  typeof input.accountPrivacy.allowRead!=='function'||
  typeof input.serverNowUtcMs!=='function'||
  !input.rulesSource||!input.bracketPolicy||
  typeof input.randomSeed!=='function'||
  !Number.isSafeInteger(input.minimumCharacterLevel)||
  input.minimumCharacterLevel<1||input.minimumCharacterLevel>100||
  typeof input.workerId!=='string'||
  !/^[A-Za-z0-9:_-]{8,160}$/.test(input.workerId)||
  !input.replayStore||
  typeof input.replayStore.putImmutable!=='function'||
  typeof input.replayStore.readImmutable!=='function')
  throw Error('world_boss_v64_private_capabilities_required');
 // A malformed or client-chosen launch epoch must never be normalized into
 // an apparently legitimate World Boss cycle.
 worldBossWindowsV22(input.launchMondayUtcMs);
 const service:Omit<WorldBossDepsV26,'db'|'rulesSource'>={
  authenticate:input.authenticate,
  bracketPolicy:input.bracketPolicy,
  minimumCharacterLevel:input.minimumCharacterLevel,
  randomSeed:input.randomSeed,
  workerId:input.workerId,
  nowUtcMs:input.serverNowUtcMs,
  // Keep storage methods attached to their owning adapter. Some durable
  // replay providers require their own state/receiver for authorization.
  replayStore:{putImmutable:payload=>input.replayStore.putImmutable(payload)},
 };
 const runtime=createWorldBossPrivateRuntimeV28({
  executor:input.executor,
  service,rulesSource:input.rulesSource,
  immutableReplayReader:{readImmutable:key=>input.replayStore.readImmutable(key)},
 });
 return {
  current:{
   authenticate:input.authenticate,
   accountPrivacy:input.accountPrivacy,
   launchMondayUtcMs:input.launchMondayUtcMs,
   serverNowUtcMs:input.serverNowUtcMs,
   events:createWorldBossCurrentEventPgV51(input.executor),
   overview:createWorldBossOverviewPgV41(input.executor),
  },
  ops:createWorldBossGateAttestationPgV63(input.executor),
  raid:runtime.authoredRaid,
  donations:runtime.donations,
  rewards:runtime.rewards,
 };
}
