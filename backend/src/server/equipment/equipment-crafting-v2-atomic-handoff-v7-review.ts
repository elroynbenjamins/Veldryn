/**
 * HIDDEN Equipment 2.0 V7: noncommittable atomic crafting handoff.
 *
 * This is a dry-run COMPATIBILITY AND SECURITY AUDIT, not an authenticated
 * database service. Its "trusted" inputs must eventually be loaded and locked
 * independently by a service-role transaction, never supplied by the client.
 * It has NO write, mint, inventory, XP, Gold or public route entrypoint.
 */
import {
 previewEq2ReviewedReservation,Eq2ReserveRequest,Eq2TrustedDraftAccount,
 Eq2ReviewRecipe,Eq2ReviewReservePlan,Eq2ReviewReserveError,
} from './equipment-crafting-v2-unified-reservation-review';
import {eq2ReviewMaterialIdentity} from
 './equipment-crafting-v2-stackable-material-boundary-review';
import {reviewEq2V6MaterialOrigin} from
 './equipment-crafting-v2-material-origins-v6-review';

export const EQ2_V7_ATOMIC_CRAFT_ENABLED=false as const;
export interface Eq2V7LotReview {
 readonly lotId:string;readonly accountId:string;
 readonly materialId:string;readonly quantity:number;
 readonly originReceiptId:string;readonly receiptTotalQuantity:number;
 readonly originKind:'monster'|'gathering'|'processing';
 readonly sourceId:string;
 readonly location:'inventory'|'bank';
 /** For Inventory: the owning character. A shared Bank has no character. */
 readonly characterId?:string;
 /** Bank movement has an independently verified deposit in a future service. */
 readonly bankDepositReceiptId?:string;
}
export interface Eq2V7QueueReview{
 readonly activeSlotsUsed:number;readonly activeSlotsCapacity:number;
 readonly waitingJobs:number;readonly readyJobs:number;
 readonly currentlyOwnedCopiesOfOutput:number;
 readonly pendingRequestIds:readonly string[];
}
export interface Eq2V7CraftHandoff {
 readonly releaseEnabled:false;readonly canCommit:false;
 readonly canDebitGoldOrMaterials:false;readonly canMintOrGrantXp:false;
 readonly canUpdateBankOrQueue:false;
 readonly requiresSerializableAccountAndCustodyLocks:true;
 readonly originReceiptsIndependentlyVerified:false;
 readonly reservation:Eq2ReviewReservePlan;
 readonly auditedLots:number;
 readonly pendingOriginReceipts:number;
 readonly proposedNextRevision:number;
 readonly reason:'REVIEW_ONLY_SOURCE_AND_TRANSACTION_NOT_REGISTERED';
}
export class Eq2V7HandoffError extends Error {
 constructor(readonly code:string){super(code);}
}
const fail=(code:string):never=>{throw new Eq2V7HandoffError(code);};
const count=(x:unknown):x is number=>typeof x==='number'&&
 Number.isSafeInteger(x)&&x>=0;
const validId=(x:unknown):x is string=>typeof x==='string'&&
 /^[A-Za-z0-9_:-]{1,160}$/.test(x)&&
 !['__proto__','constructor','prototype'].includes(x);
const plain=(x:unknown):x is Record<string,unknown>=>{
 if(!x||typeof x!=='object'||Array.isArray(x))return false;
 const proto=Object.getPrototypeOf(x);
 return proto===Object.prototype||proto===null;
};
const queueGuard=(queue:Eq2V7QueueReview,replay:boolean)=>{
 if(!queue||!count(queue.activeSlotsUsed)||!count(queue.activeSlotsCapacity)||
  queue.activeSlotsCapacity<3||queue.activeSlotsCapacity>7||
  queue.activeSlotsUsed>queue.activeSlotsCapacity||
  !count(queue.waitingJobs)||queue.waitingJobs>5||
  !count(queue.readyJobs)||queue.readyJobs>20||
  !count(queue.currentlyOwnedCopiesOfOutput)||
  !Array.isArray(queue.pendingRequestIds)||
  !queue.pendingRequestIds.every(validId)||
  new Set(queue.pendingRequestIds).size!==queue.pendingRequestIds.length)
  fail('invalid_queue_or_copy_snapshot');
 if(!replay&&(queue.activeSlotsUsed===queue.activeSlotsCapacity||
    queue.waitingJobs===5))fail('forge_capacity_full');
 if(!replay&&queue.currentlyOwnedCopiesOfOutput>=25)
  fail('piece_copy_limit_reached');
};
/**
 * Audit a *complete* EQ2 lot snapshot. Not just recipe inputs: a forged copy
 * hidden in another character or unconsumed Bank material must also fail.
 *
 * A structurally matching source receipt is NOT authentication, and no lot
 * supplied here changes V5's universal EQ2_ storage denial.
 */
export function auditEq2V7ReviewLots(
 snapshot:Eq2TrustedDraftAccount,lots:readonly Eq2V7LotReview[],
):number {
 if(!snapshot||!plain(snapshot.characters)||!plain(snapshot.bank)||
  !Array.isArray(lots))fail('invalid_lot_snapshot');
 const expected=new Map<string,number>();
 const key=(location:string,characterId:string,itemId:string)=>
  location+'|'+characterId+'|'+itemId;
 const scan=(store:unknown,location:'inventory'|'bank',
  characterId:string)=>{
  if(!plain(store))fail('invalid_lot_storage');
  for(const [itemId,quantity] of Object.entries(store)){
   if(!count(quantity))fail('invalid_lot_storage');
   if(!itemId.startsWith('EQ2_'))continue;
   if(!eq2ReviewMaterialIdentity(itemId))
    fail('unknown_eq2_identity_in_storage');
   if(quantity>0)expected.set(key(location,characterId,itemId),quantity);
  }
 };
 for(const [characterId,actor] of Object.entries(snapshot.characters)){
  if(!validId(characterId)||!actor)fail('invalid_lot_character');
  scan(actor.inventory,'inventory',characterId);
 }
 scan(snapshot.bank,'bank','');
 const observed=new Map<string,number>();
 const lotsSeen=new Set<string>();
 const depositSeen=new Set<string>();
 const receipts=new Map<string,{total:number;claimed:number;itemId:string}>();
 for(const lot of lots){
  if(!lot||!validId(lot.lotId)||!validId(lot.accountId)||
   lot.accountId!==snapshot.accountId||
   !validId(lot.materialId)||!eq2ReviewMaterialIdentity(lot.materialId)||
   !count(lot.quantity)||lot.quantity<1||
   !count(lot.receiptTotalQuantity)||lot.receiptTotalQuantity<lot.quantity||
   !validId(lot.originReceiptId)||!validId(lot.sourceId)||
   !['inventory','bank'].includes(lot.location)||
   lotsSeen.has(lot.lotId))fail('forged_or_duplicate_lot');
  lotsSeen.add(lot.lotId);
  let owner='';
  if(lot.location==='inventory'){
   if(!validId(lot.characterId)||!snapshot.characters[lot.characterId]||
    lot.bankDepositReceiptId!==undefined)
    fail('wrong_character_or_bank_custody');
   owner=lot.characterId;
  }else{
   if(lot.characterId!==undefined||!validId(lot.bankDepositReceiptId)||
    depositSeen.has(lot.bankDepositReceiptId))
    fail('missing_or_replayed_bank_deposit');
   depositSeen.add(lot.bankDepositReceiptId);
  }
  const origin=reviewEq2V6MaterialOrigin({
   itemId:lot.materialId,sourceKind:lot.originKind,
   sourceId:lot.sourceId,quantity:lot.quantity,
   originReceiptId:lot.originReceiptId,
  });
  if(!origin.proposalKnown||
   !['unregistered_processing','candidate_source_unverified',
     'missing_registered_source'].includes(origin.reason))
   fail('unrecognised_or_invalid_source_proposal');
  const locationKey=key(lot.location,owner,lot.materialId);
  const updated=(observed.get(locationKey)??0)+lot.quantity;
  if(!Number.isSafeInteger(updated))fail('lot_quantity_overflow');
  observed.set(locationKey,updated);
  const receiptKey=lot.accountId+'|'+lot.originReceiptId;
  const previous=receipts.get(receiptKey);
  if(previous&&(previous.total!==lot.receiptTotalQuantity||
    previous.itemId!==lot.materialId))fail('source_receipt_reused_for_other_material');
  const claimed=(previous?.claimed??0)+lot.quantity;
  if(!Number.isSafeInteger(claimed)||claimed>lot.receiptTotalQuantity)
   fail('source_receipt_overclaimed');
  receipts.set(receiptKey,{
   total:lot.receiptTotalQuantity,claimed,itemId:lot.materialId,
  });
 }
 if(observed.size!==expected.size)fail('incomplete_material_lot_coverage');
 for(const [id,quantity] of expected)
  if(observed.get(id)!==quantity)fail('material_lot_quantity_mismatch');
 return lots.length;
}
/**
 * Must never be sent to an actual transaction executor as a permission.
 * This checks preconditions only. SERIALIZABLE transaction, physical item
 * custody and immutable server-origin receipts are intentionally absent.
 */
export function previewEq2V7AtomicCraftHandoff(
 request:Eq2ReserveRequest,snapshot:Eq2TrustedDraftAccount,
 trustedCatalog:readonly Eq2ReviewRecipe[],lots:readonly Eq2V7LotReview[],
 queue:Eq2V7QueueReview,
):Eq2V7CraftHandoff {
 let reservation:Eq2ReviewReservePlan;
 try{
  reservation=previewEq2ReviewedReservation(request,snapshot,trustedCatalog);
 }catch(error){
  if(error instanceof Eq2ReviewReserveError)
   fail('reservation_'+error.code);
  throw error;
 }
 queueGuard(queue,reservation.replay);
 if(!reservation.replay&&queue.pendingRequestIds.includes(request.requestId))
  fail('queue_request_id_conflict');
 const auditedLots=auditEq2V7ReviewLots(snapshot,lots);
 if(!count(snapshot.revision)||snapshot.revision>=Number.MAX_SAFE_INTEGER)
  fail('invalid_revision_next');
 return Object.freeze({
  releaseEnabled:false as const,canCommit:false as const,
  canDebitGoldOrMaterials:false as const,canMintOrGrantXp:false as const,
  canUpdateBankOrQueue:false as const,
  requiresSerializableAccountAndCustodyLocks:true as const,
  originReceiptsIndependentlyVerified:false as const,
  reservation,auditedLots,pendingOriginReceipts:auditedLots,
  proposedNextRevision:reservation.replay?snapshot.revision:snapshot.revision+1,
  reason:'REVIEW_ONLY_SOURCE_AND_TRANSACTION_NOT_REGISTERED' as const,
 });
}
