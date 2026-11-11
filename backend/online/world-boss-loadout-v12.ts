/**
 * World Boss V12: PRIVATE, DISABLED, server-owned real GameState -> V9 roster snapshot.
 *
 * Reuses the online co-op equipment/stat/gem/companion pipeline and Party Event
 * forged-copy verification. IMPORTANT: the injected reader must read a state
 * from authoritative online_game_states after authenticating the principal;
 * NEVER construct a reader from request JSON or client game state.
 *
 * No route imports this module. No published Echoes, DB query, or event exists.
 */
import type {GameState} from '../../apps/mobile/src/core/types';
import {deriveOnlineCoopLoadout,onlineCoopLoadoutHash} from './coop-loadout';
import {verifyPartyEventEquippedCopyOwnershipV4} from './party-event-loadout-v4';
import {deriveRole} from '../src/server/coop/role-readiness';
import type {WorldBossAuthoritativeSnapshotV9} from '../src/server/combat/world-boss-verified-roster-v9';
import type {WorldBossPowerBracket} from '../src/server/combat/world-boss-echo-prototype';

export const WORLD_BOSS_V12_REAL_LOADOUT_BRIDGE_LIVE=false as const;
const safeId=(x:string)=>/^[A-Za-z0-9][A-Za-z0-9:_-]{0,159}$/.test(x);
export interface WorldBossOwnedStateV12 {
 /** Verified DB owner, not a supplied account ID or JWT user_metadata. */
 ownerAccountId:string;
 gameVersion:number;
 serverState:GameState;
}
export interface WorldBossOwnedStateReaderV12 {
 /** Authenticated service context, never a client principal parameter. */
 principalAccountId:string;
 loadCharacterState(input:{accountId:string;characterId:string}):Promise<WorldBossOwnedStateV12>;
}
export interface WorldBossServerBracketPolicyV12 {
 /** Four increasing positive COMBAT POWER boundaries supplied by server config.
  * No hardcoded launch values; this is NOT a level gate and not client-configurable.
  */
 bounds:readonly [number,number,number,number];
 version:string;
}
export function worldBossBracketFromVerifiedPowerV12(power:number,policy:WorldBossServerBracketPolicyV12):WorldBossPowerBracket{
 const b=policy.bounds;
 if(!policy.version||!safeId(policy.version)||!Array.isArray(b)||b.length!==4||
  !b.every((v,i)=>Number.isFinite(v)&&v>0&&(i===0||v>b[i-1]))||
  !Number.isFinite(power)||power<0)throw Error('world_boss_v12_invalid_server_bracket_policy');
 return (power<b[0]?1:power<b[1]?2:power<b[2]?3:power<b[3]?4:5);
}
export interface WorldBossRealSnapshotV12 {
 snapshot:WorldBossAuthoritativeSnapshotV9;
 sourceHash:string;
 gameVersion:number;
 combatPower:number;
 bracketPolicyVersion:string;
 /** Not an Echo publication or combat reservation. */
 persisted:false;
}
export async function resolveRealWorldBossSnapshotV12(input:{
 reader:WorldBossOwnedStateReaderV12;characterId:string;expectedGameVersion:number;
 nowUtcMs:number;minimumCharacterLevel:number;policy:WorldBossServerBracketPolicyV12;
}):Promise<WorldBossRealSnapshotV12>{
 const {reader,characterId,expectedGameVersion,nowUtcMs,minimumCharacterLevel,policy}=input;
 const accountId=reader.principalAccountId;
 if(!safeId(accountId)||!safeId(characterId)||!Number.isSafeInteger(expectedGameVersion)||
  expectedGameVersion<1||!Number.isSafeInteger(nowUtcMs)||nowUtcMs<=0||
  !Number.isSafeInteger(minimumCharacterLevel)||minimumCharacterLevel<1||minimumCharacterLevel>100)
  throw Error('world_boss_v12_invalid_authenticated_selection');
 const owned=await reader.loadCharacterState({accountId,characterId});
 if(!owned||owned.ownerAccountId!==accountId||
  owned.serverState.character?.id!==characterId)
  throw Error('world_boss_v12_character_not_owned');
 if(!Number.isSafeInteger(owned.gameVersion)||owned.gameVersion!==expectedGameVersion)
  throw Error('world_boss_v12_stale_server_game_revision');
 // The existing verifier checks exact owner/slot/item identity for forged
 // copies, duplicate forged instances and level requirements.
 verifyPartyEventEquippedCopyOwnershipV4(owned.serverState);
 const record=deriveOnlineCoopLoadout(accountId,owned.serverState,owned.gameVersion);
 if(record.accountId!==accountId||record.characterId!==characterId||
  record.revision!==owned.gameVersion||!record.legalEquipment)
  throw Error('world_boss_v12_invalid_server_equipment');
 if(record.characterLevel<minimumCharacterLevel)
  throw Error('world_boss_v12_character_level_locked');
 if(!Number.isFinite(record.combatPower)||record.combatPower!<0)
  throw Error('world_boss_v12_invalid_server_combat_power');
 const bracket=worldBossBracketFromVerifiedPowerV12(record.combatPower!,policy);
 const sourceHash=onlineCoopLoadoutHash(record);
 if(!/^[a-f0-9]{64}$/.test(sourceHash))throw Error('world_boss_v12_invalid_loadout_hash');
 const effectiveLevel=record.combatScalingLevel??record.characterLevel;
 const snapshot:WorldBossAuthoritativeSnapshotV9={
  snapshotId:'WB12_'+characterId+'_'+owned.gameVersion+'_'+sourceHash.slice(0,12),
  ownerAccountId:accountId,capturedAtUtcMs:nowUtcMs,
  bracket,usageCount:0,eligible:true,
  verified:{...structuredClone(record.stats),role:deriveRole(record.classId),
   characterId,classId:record.classId,level:effectiveLevel},
  abilities:structuredClone(record.abilities),
 };
 if(snapshot.snapshotId.length>160||!Number.isInteger(effectiveLevel)||effectiveLevel<1||effectiveLevel>100||
   !Number.isFinite(snapshot.verified.attackPower)||snapshot.verified.attackPower<=0||
   !Number.isFinite(snapshot.verified.maxHp)||snapshot.verified.maxHp<=0)
  throw Error('world_boss_v12_invalid_resolved_stats');
 return {snapshot,sourceHash,gameVersion:owned.gameVersion,combatPower:record.combatPower!,
  bracketPolicyVersion:policy.version,persisted:false};
}
