/**
 * Equipment/Crafting 2.0 — HIDDEN REVIEW ONLY.
 *
 * Item *identity* must precede inventory balance arithmetic: a unique gear
 * copy, gem or invented "EQ2_" key is never a fungible material stack. This
 * registry lists precisely the 14 raw materials and 15 NEW processed outputs
 * proposed by the v3 746-route catalogue. It is not the production registry,
 * a recipe authorizer, a market entitlement or a source grant.
 *
 * Keep the existing equipment-crafting-v2-server-projection.ts EQ2_ rejection
 * in place. A future authenticated, locked DB adapter must attach a separate,
 * verified material registration AND original source/processing receipt before
 * a real stack can exist. Client flags cannot establish either condition.
 */
import {EQ2_REQUIRED_MATERIAL_SOURCE_DRAFTS} from
 './equipment-crafting-v2-material-source-review';

export const EQ2_STACKABLE_MATERIAL_BOUNDARY_VERSION=
 'eq2-t1-t4-exact-stack-identity-review-v5' as const;
export const EQ2_STACKABLE_MATERIAL_GRANTS_ENABLED=false as const;
export type Eq2ReviewMaterialOrigin='monster'|'gathering'|'either'|'processing';
export interface Eq2ReviewMaterialIdentity {
 readonly itemId:string;
 readonly tier:1|2|3|4;
 readonly origin:Eq2ReviewMaterialOrigin;
 readonly stackableCandidate:true;
 readonly registered:false;
 readonly sourceOrProcessingReceiptVerified:false;
 readonly permittedInOwnedInventory:false;
 readonly permittedInBank:false;
 readonly permittedOnMarket:false;
 readonly mayMint:false;
}
/** 15 proposed *new* processing outputs; canonical SUNSTONE_INGOT is reused,
 * not minted from a second process. Names are authoring IDs, not registrations.
 */
const REVIEW_PROCESSED_OUTPUTS=Object.freeze([
 ['EQ2_COPPER_BAR',1],['EQ2_GREENWOOD_PLANK',1],
 ['EQ2_BOAR_LEATHER',1],['EQ2_MOSS_CLOTH',1],
 ['EQ2_IRON_BAR',2],['EQ2_IRONWOOD_PLANK',2],
 ['EQ2_WOLF_LEATHER',2],['EQ2_THORN_CLOTH',2],
 ['EQ2_TREATED_DUNEWOOD',3],['EQ2_SUNSCAR_LEATHER',3],
 ['EQ2_DUNE_CLOTH',3],['EQ2_GLASSBOUND_ALLOY_BAR',4],
 ['EQ2_REINFORCED_DUNEWOOD',4],
 ['EQ2_HARDENED_SUNSCAR_LEATHER',4],['EQ2_SOULWEAVE_CLOTH',4],
] as const);
function row(
 itemId:string,tier:1|2|3|4,origin:Eq2ReviewMaterialOrigin,
):Eq2ReviewMaterialIdentity {
 return Object.freeze({itemId,tier,origin,stackableCandidate:true as const,
  registered:false as const,sourceOrProcessingReceiptVerified:false as const,
  permittedInOwnedInventory:false as const,permittedInBank:false as const,
  permittedOnMarket:false as const,mayMint:false as const});
}
export const EQ2_REVIEW_MATERIAL_IDENTITIES:readonly Eq2ReviewMaterialIdentity[]=
 Object.freeze([
  ...EQ2_REQUIRED_MATERIAL_SOURCE_DRAFTS.map(
   source=>row(source.itemId,source.tier,source.kind)),
  ...REVIEW_PROCESSED_OUTPUTS.map(([id,tier])=>row(id,tier,'processing')),
 ]);
const exactById=new Map(EQ2_REVIEW_MATERIAL_IDENTITIES.map(x=>[x.itemId,x]));
if(exactById.size!==EQ2_REVIEW_MATERIAL_IDENTITIES.length)
 throw new Error('eq2_duplicate_material_review_identity');

export function eq2ReviewMaterialIdentity(id:unknown):
 Eq2ReviewMaterialIdentity|undefined{
 return typeof id==='string'?exactById.get(id):undefined;
}
export type Eq2StackReviewDenial=
 'invalid_material_key'|'invalid_quantity'|'not_an_eq2_material'|
 'unregistered_or_equipment_identity'|'unregistered_raw_source'|
 'unregistered_processing_output';
export interface Eq2StackReviewDecision {
 readonly mayStore:false;
 readonly mayMint:false;
 readonly mayTrade:false;
 readonly needsServerAuthenticatedSourceAndAtomicReceipt:true;
 readonly reason:Eq2StackReviewDenial;
 readonly identity?:Eq2ReviewMaterialIdentity;
}
/**
 * Pure diagnostic ONLY: even a matching exact ID, positive quantity and
 * caller-claimed "verified" status cannot create an entitlement.
 */
export function reviewEq2MaterialStack(
 itemId:unknown,quantity:unknown,_claimedVerified?:unknown,
):Eq2StackReviewDecision{
 const closed=(reason:Eq2StackReviewDenial,identity?:Eq2ReviewMaterialIdentity):
 Eq2StackReviewDecision=>({mayStore:false,mayMint:false,mayTrade:false,
  needsServerAuthenticatedSourceAndAtomicReceipt:true,reason,identity});
 if(typeof itemId!=='string'||!itemId||
  itemId!==itemId.trim()||['__proto__','constructor','prototype'].includes(itemId))
  return closed('invalid_material_key');
 if(typeof quantity!=='number'||!Number.isSafeInteger(quantity)||quantity<1)
  return closed('invalid_quantity');
 if(!itemId.startsWith('EQ2_'))return closed('not_an_eq2_material');
 const identity=exactById.get(itemId);
 if(!identity)return closed('unregistered_or_equipment_identity');
 return closed(identity.origin==='processing'?'unregistered_processing_output':
  'unregistered_raw_source',identity);
}
/**
 * Diagnose a storage snapshot before planning EQ2 issuance. No success path,
 * and no changes to the existing production/prototype blanket EQ2_ ban.
 * Rejects poison keys and malformed counters; non-EQ2 keys remain under
 * the existing real-item registry, not this review registry.
 */
export function reviewEq2PendingStackBalances(snapshot:unknown):{
 readonly mayCommit:false;readonly invalidOrPendingKeys:readonly string[];
 readonly pendingKnownMaterialCount:number;
}{
 const proto=snapshot&&typeof snapshot==='object'?
  Object.getPrototypeOf(snapshot):null;
 if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot)||
    (proto!==Object.prototype&&proto!==null))
  return {mayCommit:false,invalidOrPendingKeys:['<invalid_snapshot>'],
   pendingKnownMaterialCount:0};
 const invalidOrPendingKeys:string[]=[];
 let pendingKnownMaterialCount=0;
 for(const [id,quantity] of Object.entries(snapshot)){
  if(!id||id!==id.trim()||['__proto__','constructor','prototype'].includes(id)
   ||typeof quantity!=='number'||!Number.isSafeInteger(quantity)||quantity<0){
   invalidOrPendingKeys.push(id);continue;
  }
  if(!id.startsWith('EQ2_'))continue;
  if(exactById.has(id))pendingKnownMaterialCount++;
  invalidOrPendingKeys.push(id);
 }
 return {mayCommit:false,invalidOrPendingKeys:Object.freeze(invalidOrPendingKeys),
  pendingKnownMaterialCount};
}
