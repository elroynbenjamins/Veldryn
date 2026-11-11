/**
 * Veldryn World Boss V11 — hidden server-snapshot War Camp benefits.
 * No donation endpoint, material debit, live event or wallet integration.
 * This is an integrity-checking data contract, NOT a signature/auth decision.
 *
 * A future authenticated reservation must persist this snapshot and its digest
 * together with the v9 roster, engine version, boss phase and RNG seed.
 */
import {sha256} from '@noble/hashes/sha256';
import {bytesToHex} from '@noble/hashes/utils';

export type WorldBossWarCampTierV11=0|1|2;
export interface WorldBossWarCampLevelsV11{
  fortifications:WorldBossWarCampTierV11;
  fieldProvisions:WorldBossWarCampTierV11;
  siegecraft:WorldBossWarCampTierV11;
}
export interface WorldBossWarCampSnapshotV11{
  version:'world-boss-war-camp-v11';
  eventId:string;
  revision:number;
  levels:WorldBossWarCampLevelsV11;
  digest:string;
}
export interface WorldBossWarCampEffectsV11{
  bossDamageReduction:number;
  startingHpMultiplier:number;
  healingMultiplier:number;
  guardBreakMultiplier:number;
  weakPointMultiplier:number;
}
const validTier=(x:unknown):x is WorldBossWarCampTierV11=>x===0||x===1||x===2;
const validEvent=(s:string)=>/^[A-Za-z0-9][A-Za-z0-9:_-]{0,159}$/.test(s);
const clone=<T>(x:T):T=>structuredClone(x);
function canonical(s:Omit<WorldBossWarCampSnapshotV11,'digest'>){
 return {
  version:s.version,eventId:s.eventId,revision:s.revision,
  levels:{fortifications:s.levels.fortifications,fieldProvisions:s.levels.fieldProvisions,siegecraft:s.levels.siegecraft},
 };
}
function hash(s:Omit<WorldBossWarCampSnapshotV11,'digest'>):string{
 return bytesToHex(sha256(new TextEncoder().encode(JSON.stringify(canonical(s)))));
}
export function makeWorldBossWarCampSnapshotV11(input:{
 eventId:string;revision:number;levels:WorldBossWarCampLevelsV11;
}):WorldBossWarCampSnapshotV11{
 if(!validEvent(input.eventId)||!Number.isSafeInteger(input.revision)||input.revision<0||
  !input.levels||!validTier(input.levels.fortifications)||
  !validTier(input.levels.fieldProvisions)||!validTier(input.levels.siegecraft))
  throw Error('world_boss_v11_invalid_server_war_camp');
 const unsigned:Omit<WorldBossWarCampSnapshotV11,'digest'>={
  version:'world-boss-war-camp-v11',eventId:input.eventId,revision:input.revision,levels:clone(input.levels)
 };
 return {...unsigned,digest:hash(unsigned)};
}
export function deriveWorldBossWarCampEffectsV11(snapshot?:WorldBossWarCampSnapshotV11):WorldBossWarCampEffectsV11{
 if(!snapshot)return {
  bossDamageReduction:0,startingHpMultiplier:1,healingMultiplier:1,
  guardBreakMultiplier:1,weakPointMultiplier:1,
 };
 const s=snapshot;
 if(!s||s.version!=='world-boss-war-camp-v11'||!validEvent(s.eventId)||
  !Number.isSafeInteger(s.revision)||s.revision<0||
  !s.levels||!validTier(s.levels.fortifications)||
  !validTier(s.levels.fieldProvisions)||!validTier(s.levels.siegecraft)||
  !/^[0-9a-f]{64}$/.test(s.digest)||hash(s)!==s.digest)
  throw Error('world_boss_v11_war_camp_digest_mismatch');
 return {
  bossDamageReduction:s.levels.fortifications*.05,
  startingHpMultiplier:s.levels.fieldProvisions>=1?1.05:1,
  healingMultiplier:s.levels.fieldProvisions>=2?1.05:1,
  guardBreakMultiplier:s.levels.siegecraft>=1?1.05:1,
  weakPointMultiplier:s.levels.siegecraft>=2?1.05:1,
 };
}
