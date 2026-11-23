/**
 * HIDDEN account-snapshot/CAS recheck review for Equipment 2.0 combat.
 *
 * A database-shaped account read is NOT a transaction. This module compares
 * two snapshots from the SAME server-only account read service. It does not
 * open a PostgreSQL transaction, authenticate a session, or authorize reward
 * settlement. Real CAS, account lock and reward commit must happen in the
 * same privileged service transaction, with a revision predicate.
 *
 * Never provide these rows to clients, never accept an account ID from
 * client metadata, and never treat a matching digest as a signed receipt.
 */
import {enemyV2SnapshotDigest} from './enemy-engine-authority';
import {
 inspectOnlineGameStateForgeCombatV2,
 type OnlineGameStateDbRowV2,
 type OnlineForgeCombatInspectionInputV2,
 type OnlineForgeCombatReadbackV2,
} from './equipment-online-readback-review';

export interface OnlineForgeCombatRevisionPreflightV2{
 readonly accountId:string;
 readonly characterId:string;
 readonly revision:number;
 readonly fullGameStateDigest:string;
 readonly exactForgeLedgerDigest:string;
 readonly inspection:OnlineForgeCombatReadbackV2;
 readonly requiresActualAccountLock:true;
 readonly maySettleRewards:false;
 readonly mayAuthorizeCombat:false;
}
export interface OnlineForgeCombatRevisionRecheckV2{
 readonly matchesOriginalState:true;
 readonly accountId:string;
 readonly characterId:string;
 readonly originalRevision:number;
 readonly recheckedRevision:number;
 readonly sourceDigest:string;
 readonly requiresActualAtomicCasAndServiceAuth:true;
 readonly maySettleRewards:false;
}
function deny(why:string):never{throw Error('eq2_online_combat_cas_'+why);}
const digest=(data:unknown):string=>enemyV2SnapshotDigest(data);
const fullRowFingerprint=(row:OnlineGameStateDbRowV2)=>
 digest({account_id:row.account_id,character_id:row.character_id,
  revision:row.revision,state:row.state});
const forgeFingerprint=(readback:OnlineForgeCombatReadbackV2)=>
 digest({
  accountId:readback.accountId,characterId:readback.characterId,
  revision:readback.revision,currentClassId:readback.currentClassId,
  currentLevel:readback.currentLevel,
  custody:readback.custody,jobs:readback.jobs,items:readback.items,
  claims:readback.claims,awards:readback.awards,
  reservations:readback.reservations,
  custodyReceipts:readback.custodyReceipts,
 });
/** Input MUST be supplied by a privileged read-only service, not a request. */
export function prepareForgeCombatRevisionPreflightV2(
 input:OnlineForgeCombatInspectionInputV2,
):OnlineForgeCombatRevisionPreflightV2{
 const inspected=inspectOnlineGameStateForgeCombatV2(input);
 return {
  accountId:inspected.accountId,characterId:inspected.characterId,
  revision:inspected.revision,
  fullGameStateDigest:fullRowFingerprint(input.row),
  exactForgeLedgerDigest:forgeFingerprint(inspected),
  inspection:inspected,requiresActualAccountLock:true,
  maySettleRewards:false,mayAuthorizeCombat:false,
 };
}
/**
 * Explicit replay check only. A result with matchesOriginalState=true
 * still DOES NOT authorize a combat result, a reward, or a player mutation.
 * A real server transaction must also compare and atomically change the
 * online_game_states row revision (and all party-member revisions).
 */
export function recheckForgeCombatRevisionV2(
 earlier:OnlineForgeCombatRevisionPreflightV2,
 latest:OnlineForgeCombatInspectionInputV2,
):OnlineForgeCombatRevisionRecheckV2{
 if(!earlier||earlier.maySettleRewards!==false||
    earlier.mayAuthorizeCombat!==false||
    earlier.requiresActualAccountLock!==true)
  deny('invalid_prior_preflight');
 if(!latest||latest.authenticatedAccountId!==earlier.accountId||
    latest.characterId!==earlier.characterId||
    latest.row?.account_id!==earlier.accountId)
  deny('rechecked_account_or_character_changed');
 // Reject revision advance BEFORE other validators (whose state may have
 // changed shape during a legitimate concurrent crafting transition).
 if(latest.expectedRevision!==earlier.revision||
    latest.row.revision!==earlier.revision)
  deny('revision_moved_concurrent_update');
 if(fullRowFingerprint(latest.row)!==earlier.fullGameStateDigest)
  deny('same_revision_but_state_mutated');
 const inspected=inspectOnlineGameStateForgeCombatV2(latest);
 if(forgeFingerprint(inspected)!==earlier.exactForgeLedgerDigest)
  deny('forge_source_mutated');
 return {
  matchesOriginalState:true,accountId:earlier.accountId,
  characterId:earlier.characterId,originalRevision:earlier.revision,
  recheckedRevision:inspected.revision,
  sourceDigest:earlier.exactForgeLedgerDigest,
  requiresActualAtomicCasAndServiceAuth:true,
  maySettleRewards:false,
 };
}
/** Verify party snapshots without accepting duplicate account actors. */
export function recheckForgeCombatPartyRevisionsV2(
 prepared:readonly OnlineForgeCombatRevisionPreflightV2[],
 latest:readonly OnlineForgeCombatInspectionInputV2[],
):readonly OnlineForgeCombatRevisionRecheckV2[]{
 if(!Array.isArray(prepared)||!Array.isArray(latest)||
    prepared.length!==latest.length||prepared.length<1||
    prepared.length>4)
  deny('invalid_party_size');
 // Account-wide equipment ownership is shared across characters. Never
 // allow two characters from the same account to create distinct concurrent
 // reward commitments from independent copies of one account revision.
 const seen=new Set<string>(),members:OnlineForgeCombatRevisionRecheckV2[]=[];
 for(let i=0;i<prepared.length;i++){
  const key=prepared[i]?.accountId;
  if(!key||seen.has(key))deny('party_duplicate_account');
  seen.add(key);
  members.push(recheckForgeCombatRevisionV2(prepared[i],latest[i]));
 }
 return members;
}
