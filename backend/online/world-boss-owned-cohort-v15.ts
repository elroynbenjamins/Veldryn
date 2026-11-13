/**
 * World Boss V15 — HIDDEN, read-only owner-bound CP audit bridge.
 *
 * This module has no HTTP route, Supabase client or live game integration.
 * The injected source MUST enumerate eligible accounts and read GameState from
 * server-controlled, owner-bound storage (never a client-submitted roster,
 * Power, state, character ownership, revision, or role). Runtime verification
 * is defense in depth, NOT proof that the source authenticated its caller.
 *
 * Only aggregate cohort data leaves this method. No account-level powers or
 * GameStates are returned, and nothing is persisted or enabled.
 */
import type {GameState} from '../../apps/mobile/src/core/types';
import {deriveOnlineCoopLoadout} from './coop-loadout';
import {verifyPartyEventEquippedCopyOwnershipV4} from './party-event-loadout-v4';
import {deriveRole} from '../src/server/coop/role-readiness';
import {
 auditWorldBossPowerBracketsV14,
 type WorldBossBracketAuditV14,type WorldBossPowerSampleV14,
} from '../src/server/combat/world-boss-bracket-audit-v14';

export const WORLD_BOSS_V15_OWNED_COHORT_LIVE=false as const;
const SAFE_ID=/^[A-Za-z0-9][A-Za-z0-9:_-]{0,95}$/;
const safe=(value:string):boolean=>typeof value==='string'&&SAFE_ID.test(value);
/** Records come from an authenticated server-side selector, not a mobile request. */
export interface WorldBossCohortSelectionV15{
 accountId:string;
 characterId:string;
 expectedRevision:number;
}
/** Mirrors public.online_game_states ownership/revision, not client metadata. */
export interface WorldBossCohortOwnedStateV15{
 ownerAccountId:string;
 gameVersion:number;
 serverState:GameState;
}
/** A service-only repository abstraction; no real database is implemented here. */
export interface WorldBossServerOwnedCohortSourceV15{
 nowUtcMs():number;
 listEligibleOwnedCharacters(eventId:string):Promise<readonly WorldBossCohortSelectionV15[]>;
 loadOwnedCharacterState(selection:{accountId:string;characterId:string}):Promise<WorldBossCohortOwnedStateV15>;
}
export interface WorldBossOwnedCohortAuditV15{
 source:'server_owned_state_adapter_review_only_v15';
 report:WorldBossBracketAuditV14;
 verifiedCount:number;
 persisted:false;
 live:false;
}
/**
 * Fail closed on any unverified member; do not silently replace it with an
 * NPC, discard low-powered characters or emit individual CPs to an API.
 *
 * This audit is intentionally NOT a transactionally consistent player census.
 * For production power thresholds a separately authorized, privacy-reviewed
 * snapshot/export would be necessary, plus manual distribution approval.
 */
export async function auditWorldBossOwnedCohortV15(input:{
 eventId:string;
 source:WorldBossServerOwnedCohortSourceV15;
}):Promise<WorldBossOwnedCohortAuditV15>{
 const {eventId,source}=input;
 if(!safe(eventId)||!source||typeof source.listEligibleOwnedCharacters!=='function'||
  typeof source.loadOwnedCharacterState!=='function'||typeof source.nowUtcMs!=='function')
  throw Error('world_boss_v15_invalid_service_source');
 const now=source.nowUtcMs();
 if(!Number.isSafeInteger(now)||now<=0)
  throw Error('world_boss_v15_invalid_service_clock');
 const selections=await source.listEligibleOwnedCharacters(eventId);
 if(!Array.isArray(selections)||selections.length<100||selections.length>2000)
  throw Error('world_boss_v15_invalid_population_size');
 const seen=new Set<string>();
 const samples:WorldBossPowerSampleV14[]=[];
 for(const selection of selections){
  if(!selection||!safe(selection.accountId)||!safe(selection.characterId)||
   !Number.isSafeInteger(selection.expectedRevision)||selection.expectedRevision<1||
   seen.has(selection.accountId))
   throw Error('world_boss_v15_invalid_or_duplicate_server_selection');
  seen.add(selection.accountId);
  const owned=await source.loadOwnedCharacterState({
   accountId:selection.accountId,characterId:selection.characterId,
  });
  if(!owned||owned.ownerAccountId!==selection.accountId||
   !Number.isSafeInteger(owned.gameVersion)||owned.gameVersion!==selection.expectedRevision||
   owned.serverState?.character?.id!==selection.characterId)
   throw Error('world_boss_v15_owner_character_or_revision_mismatch');
  // Reuse the same forged-equipment verifier, gem/companion-backed CP resolver,
  // and role derivation already used by online co-op and World Boss V12.
  verifyPartyEventEquippedCopyOwnershipV4(owned.serverState);
  const record=deriveOnlineCoopLoadout(selection.accountId,owned.serverState,owned.gameVersion);
  if(record.accountId!==selection.accountId||
   record.characterId!==selection.characterId||
   record.revision!==selection.expectedRevision||!record.legalEquipment||
   !Number.isFinite(record.combatPower)||record.combatPower<=0||
   record.combatPower>1e8)
   throw Error('world_boss_v15_invalid_verified_loadout');
  samples.push({
   ownerAccountId:selection.accountId,
   role:deriveRole(record.classId),
   combatPower:record.combatPower,
   capturedAtUtcMs:now,
  });
 }
 const report=auditWorldBossPowerBracketsV14({eventId,nowUtcMs:now,samples});
 return {source:'server_owned_state_adapter_review_only_v15',
  report,verifiedCount:samples.length,persisted:false,live:false};
}
