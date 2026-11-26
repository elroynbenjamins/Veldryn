/**
 * Hidden V90A: reconcile a frozen single-account raid reservation with the
 * proposed canonical V2 compiler projection and exact-copy receipt summaries.
 * Structural comparison only: all inputs are forgeable until independent
 * transaction-owned readers and canonical compiler are wired. Never authorize.
 */
import {
 auditWorldBossCanonicalRuntimeV89,
 type WorldBossCanonicalEvidenceV89,
 type WorldBossV89ActorEvidence,
 type WorldBossV89Boss,type WorldBossV89Phase,
} from './world-boss-canonical-runtime-readiness-v89';

export const WORLD_BOSS_ROSTER_V90_LIVE=false as const;
type Trait=WorldBossV89ActorEvidence['activeTraits'][number];
export interface FrozenWorldBossReservationV90 {
 readonly eventId:string;
 readonly accountId:string;
 readonly reservationId:string;
 readonly attempt:number;
 readonly bossId:WorldBossV89Boss;
 readonly phase:WorldBossV89Phase;
 readonly bossMaxHp:number;
 readonly rosterDigest:string;
 readonly contentVersion:string;
 readonly balanceVersion:string;
 readonly members:readonly {
  readonly characterId:string;
  readonly snapshotId:string;
  readonly sourceRevision:number;
  readonly sourceHash:string;
  readonly equipmentReceiptDigest:string;
  readonly equipmentReceiptRevision:number;
 }[];
}
/** Projection of existing VerifiedV2EquipmentEffectSource receipt fields.
 * Receipt digest is not the compiled actor digest; never substitute either. */
export interface WorldBossExactCopySummaryV90 {
 readonly accountId:string;
 readonly characterId:string;
 readonly actorId:string;
 readonly revision:number;
 readonly equipmentReceiptDigest:string;
 readonly ownedEquippedInstanceIds:readonly string[];
 readonly traits:readonly Trait[];
}
export interface WorldBossCompilerProjectionV90 {
 readonly reservationId:string;
 readonly attempt:number;
 readonly contentVersion:string;
 readonly balanceVersion:string;
 readonly runtime:WorldBossCanonicalEvidenceV89;
 readonly equipment:readonly WorldBossExactCopySummaryV90[];
}
const validId=(x:unknown):x is string=>typeof x==='string'&&/^[A-Za-z0-9][A-Za-z0-9:_-]{0,159}$/.test(x);
const digest=(x:unknown):x is string=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);
const revision=(x:unknown):boolean=>typeof x==='number'&&Number.isSafeInteger(x)&&x>=1;
function exactStrings(left:readonly string[],right:readonly string[]):boolean{
 return Array.isArray(left)&&Array.isArray(right)&&left.length===right.length&&
  Array.from(left).every(validId)&&Array.from(right).every(validId)&&
  new Set(left).size===left.length&&new Set(right).size===right.length&&
  left.every(x=>right.includes(x));
}
function exactTraits(left:readonly Trait[],right:readonly Trait[]):boolean{
 if(!Array.isArray(left)||!Array.isArray(right)||left.length>2||right.length>2||
  Array.from(left).some(x=>!x||!validId(x.instanceId)||!validId(x.traitId))||
  Array.from(right).some(x=>!x||!validId(x.instanceId)||!validId(x.traitId)))return false;
 return exactStrings(left.map(x=>x.instanceId),right.map(x=>x.instanceId))&&
  left.every(x=>right.some(y=>x.instanceId===y.instanceId&&x.traitId===y.traitId));
}
export function reviewWorldBossRosterV90(
 reservation:FrozenWorldBossReservationV90,
 projection:WorldBossCompilerProjectionV90,
){
 const issues=new Set<string>();
 const finish=()=>Object.freeze({
  structurallyCompatible:issues.size===0,
  blockers:Object.freeze([...issues].sort()),
  releaseReady:false as const,canAuthorizeCombat:false as const,
  canGrantRewards:false as const,canPersistState:false as const,
 });
 if(!reservation||!projection||!projection.runtime){
  issues.add('missing_reservation_or_projection');return finish();
 }
 const runtime=projection.runtime;
 const audit=auditWorldBossCanonicalRuntimeV89(runtime);
 for(const blocker of audit.blockers)issues.add('v89:'+blocker);
 if(!validId(reservation.reservationId)||!Number.isInteger(reservation.attempt)||
  reservation.attempt<1||reservation.attempt>3||
  !validId(reservation.contentVersion)||!validId(reservation.balanceVersion)||
  reservation.reservationId!==projection.reservationId||
  reservation.attempt!==projection.attempt||
  reservation.contentVersion!==projection.contentVersion||
  reservation.balanceVersion!==projection.balanceVersion||
  reservation.eventId!==runtime.eventId||reservation.accountId!==runtime.accountId||
  reservation.bossId!==runtime.bossId||reservation.phase!==runtime.phase||
  reservation.bossMaxHp!==runtime.bossMaxHp||reservation.rosterDigest!==runtime.rosterDigest)
  issues.add('reservation_scope_mismatch');
 if(!Array.isArray(reservation.members)||!Array.isArray(runtime.actors)||
  !Array.isArray(projection.equipment)||reservation.members.length<1||
  reservation.members.length>5||reservation.members.length!==runtime.actors.length||
  reservation.members.length!==projection.equipment.length){
  issues.add('roster_cardinality_mismatch');return finish();
 }
 const members=new Map<string,FrozenWorldBossReservationV90['members'][number]>();
 const snapshots=new Set<string>(),receiptDigests=new Set<string>();
 for(const member of reservation.members){
  if(!member||!validId(member.characterId)||!validId(member.snapshotId)||
   !revision(member.sourceRevision)||!digest(member.sourceHash)||
   !revision(member.equipmentReceiptRevision)||!digest(member.equipmentReceiptDigest)||
   members.has(member.characterId)||snapshots.has(member.snapshotId)||
   receiptDigests.has(member.equipmentReceiptDigest)){
   issues.add('invalid_or_duplicate_reserved_member');continue;
  }
  members.set(member.characterId,member);snapshots.add(member.snapshotId);
  receiptDigests.add(member.equipmentReceiptDigest);
 }
 const receipts=new Map<string,WorldBossExactCopySummaryV90>();
 for(const receipt of projection.equipment){
  if(!receipt||!validId(receipt.characterId)||receipts.has(receipt.characterId)){
   issues.add('invalid_or_duplicate_equipment_receipt');continue;
  }
  receipts.set(receipt.characterId,receipt);
 }
 for(const actor of runtime.actors){
  if(!actor){issues.add('missing_actor');continue;}
  const member=members.get(actor.characterId),receipt=receipts.get(actor.characterId);
  if(!member||!receipt){issues.add('unreserved_actor_or_missing_receipt');continue;}
  if(actor.snapshotId!==member.snapshotId||actor.sourceRevision!==member.sourceRevision||
   actor.sourceHash!==member.sourceHash)issues.add('frozen_loadout_mismatch');
  if(receipt.accountId!==reservation.accountId||receipt.actorId!==actor.actorId||
   receipt.revision!==member.equipmentReceiptRevision||
   receipt.equipmentReceiptDigest!==member.equipmentReceiptDigest)
   issues.add('equipment_receipt_scope_mismatch');
  if(!exactStrings(actor.equippedCopyIds,receipt.ownedEquippedInstanceIds))
   issues.add('equipped_copy_set_mismatch');
  if(!exactTraits(actor.activeTraits,receipt.traits))issues.add('selected_trait_set_mismatch');
 }
 return finish();
}
