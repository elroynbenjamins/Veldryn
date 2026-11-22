/**
 * Veldryn 2.0 HIDDEN / REVIEW-ONLY progression -> equipment crafting handoff.
 *
 * This module never authorizes an item, Gold/XP grant, source registration,
 * actual reservation or Player Market settlement. It does not import unfinished
 * Equipment 2.0 branches. Inputs MUST be loaded by a service-authenticated
 * database transaction, not the mobile app. Valid shape alone is NOT proof of
 * ownership or provenance. Recheck every snapshot under DB locks at commit.
 *
 * Until the V5 29 proposed material definitions have real source grants and
 * production registrations, ALL EQ2_-prefixed input stacks remain blocked.
 */
import {
  type TrustedCharacterProgressionV2,
  type ProfessionIdV2,
  PROFESSION_TIER_FLOORS_V2,
  projectCharacterProgressionV2,
} from './character-progression';

export const CRAFT_CUSTODY_HANDOFF_REVIEW_V2='career-eq2-craft-custody-review-v1' as const;
export const CRAFT_CUSTODY_HANDOFF_ENABLED_V2=false as const;
const CANONICAL_UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN=/^[A-Za-z0-9_:-]{8,128}$/;
const validToken=(v:unknown):v is string=>
  typeof v==='string'&&TOKEN.test(v)&&
  !['__proto__','constructor','prototype'].includes(v);
const MATERIAL=/^[A-Z0-9_]{3,96}$/;
const int=(v:unknown,a:number,b:number):v is number=>
  typeof v==='number'&&Number.isSafeInteger(v)&&v>=a&&v<=b;
const fail=(name:string):never=>{throw Error('craft_custody_v2_'+name);};

export type OriginalMaterialOriginV2='combat'|'gathering'|'processing';
export type CraftMaterialCustodyV2='inventory'|'bank'|'market_escrow';
export interface TrustedMaterialRegistrationV2 {
 readonly itemId:string;
 readonly kind:'stackable_material'|'equipment_copy'|'gem';
 readonly registered:boolean;
 readonly originalSourceRegistered:boolean;
}
export interface TrustedCraftIngredientV2 {
 readonly itemId:string;
 readonly units:number;
 /** Require a true combat-issued loot ancestry, including if bought. */
 readonly requiredOriginalOrigin:'any'|'combat';
}
export interface TrustedProfessionCraftRecipeV2 {
 readonly recipeId:string;
 readonly itemId:string;
 readonly tier:1|2|3|4|5|6|7|8|9;
 readonly profession:'smithing'|'tailoring';
 readonly requiredProfessionLevel:number;
 readonly goldCost:number;
 readonly inputs:readonly TrustedCraftIngredientV2[];
 /** A combat-gear WEARING check, never a crafting prerequisite. */
 readonly combatWearLevel:number;
 readonly authoredAndReviewed:boolean;
}
export interface TrustedCraftMaterialLotV2 {
 readonly lotId:string;
 readonly itemId:string;
 readonly custody:CraftMaterialCustodyV2;
 readonly accountId:string;
 /** Inventory is character-owned; Bank is account-owned. */
 readonly characterId:string|null;
 readonly availableQuantity:number;
 readonly provenanceId:string;
}
export interface TrustedMaterialSourceProvenanceV2 {
 readonly provenanceId:string;
 readonly sourceReceiptId:string;
 readonly sourceAccountId:string;
 readonly sourceCharacterId:string;
 readonly originalOrigin:OriginalMaterialOriginV2;
 readonly itemId:string;
 readonly originalLotId:string;
 readonly originalGrantedQuantity:number;
 readonly completed:true;
 /** Explicit custody receipt required before consuming from the shared Bank. */
 readonly bankDeposit?:{
  readonly receiptId:string;
  readonly accountId:string;
  readonly depositedByCharacterId:string;
  readonly lotId:string;
  readonly committed:true;
 };
 /** If present, this is a finalized Market/commission transfer, not a listing. */
 readonly settledTransfer?:{
  readonly transferReceiptId:string;
  readonly kind:'market'|'commission';
  readonly originalSourceReceiptId:string;
  readonly fromAccountId:string;
  readonly toAccountId:string;
  readonly recipientCharacterId:string;
  readonly settled:true;
 };
}
export interface TrustedCraftReviewStateV2{
 readonly accountId:string;
 readonly characterId:string;
 /** Authenticated account roster loaded at the same state revision. */
 readonly ownedCharacterIds:readonly string[];
 readonly revision:number;
 readonly availableGold:number;
 readonly progression:TrustedCharacterProgressionV2;
 readonly ownedLots:readonly TrustedCraftMaterialLotV2[];
 readonly originalSourceProofs:readonly TrustedMaterialSourceProvenanceV2[];
 readonly registrations:readonly TrustedMaterialRegistrationV2[];
 readonly priorRequests:readonly {
  readonly requestId:string;readonly requestHash:string;
  readonly accountId:string;readonly characterId:string;
  readonly recipeId:string;readonly quantity:number;
  readonly settledRevision:number;
 }[];
}
export interface CraftReviewRequestV2{
 readonly accountId:string;
 readonly characterId:string;
 readonly expectedRevision:number;
 readonly requestId:string;
 readonly requestHash:string;
 readonly recipeId:string;
 readonly quantity:number;
}
export interface PlannedSourceDebitV2{
 readonly lotId:string;
 readonly itemId:string;
 readonly custody:'inventory'|'bank';
 readonly quantity:number;
 readonly originalOrigin:OriginalMaterialOriginV2;
 readonly sourceReceiptId:string;
 readonly transferReceiptId:string|null;
}
export interface CraftCustodyReviewResultV2{
 readonly version:typeof CRAFT_CUSTODY_HANDOFF_REVIEW_V2;
 readonly accountId:string;readonly characterId:string;
 readonly recipeId:string;readonly quantity:number;
 readonly expectedRevision:number;
 readonly reviewable:true;
 readonly replayReadbackRequired:boolean;
 readonly goldDebit:number;
 readonly debits:readonly PlannedSourceDebitV2[];
 readonly preservesIndependentProfessionGate:true;
 readonly combatLevelUsedForCraft:false;
 readonly canCommit:false;
 readonly canGrantItemsOrXp:false;
 readonly mayMoveMarketEscrow:false;
 readonly requiresAuthenticatedAtomicDbAdapter:true;
 readonly releaseEnabled:false;
}
/** Explicitly non-authorizing: a future DB adapter must supply all references. */
export function previewProfessionCraftMaterialCustodyV2(
 request:CraftReviewRequestV2,state:TrustedCraftReviewStateV2,
 recipe:TrustedProfessionCraftRecipeV2,
):CraftCustodyReviewResultV2{
 if(!request||!state||!recipe||
  typeof request.accountId!=='string'||!CANONICAL_UUID.test(request.accountId)||
  typeof request.characterId!=='string'||!CANONICAL_UUID.test(request.characterId)||
  typeof state.accountId!=='string'||!CANONICAL_UUID.test(state.accountId)||
  typeof state.characterId!=='string'||!CANONICAL_UUID.test(state.characterId)||
  request.accountId.toLowerCase()!==state.accountId.toLowerCase()||
  request.characterId.toLowerCase()!==state.characterId.toLowerCase()||
  !int(request.expectedRevision,0,Number.MAX_SAFE_INTEGER)||
  !int(state.revision,0,Number.MAX_SAFE_INTEGER)||
  !validToken(request.requestId)||
  typeof request.requestHash!=='string'||!/^[0-9a-f]{64}$/.test(request.requestHash)||
  !int(request.quantity,1,100)||
  !int(state.availableGold,0,Number.MAX_SAFE_INTEGER)||
  !Array.isArray(state.ownedCharacterIds)||
  state.ownedCharacterIds.length<1||state.ownedCharacterIds.length>5||
  !Array.isArray(state.ownedLots)||!Array.isArray(state.originalSourceProofs)||
  !Array.isArray(state.registrations)||!Array.isArray(state.priorRequests)||
  state.ownedLots.length>5000||state.originalSourceProofs.length>6000||
  state.registrations.length>10000||state.priorRequests.length>2000)
   fail('invalid_identity_or_snapshot');
 const ownedCharacterIds=new Set<string>();
 for(const id of state.ownedCharacterIds){
   if(typeof id!=='string'||!CANONICAL_UUID.test(id)||
      ownedCharacterIds.has(id.toLowerCase()))
     fail('invalid_account_character_roster');
   ownedCharacterIds.add(id.toLowerCase());
 }
 if(!ownedCharacterIds.has(state.characterId.toLowerCase()))
   fail('active_character_missing_from_roster');
 if(recipe.recipeId!==request.recipeId||!validToken(recipe.recipeId)||
    !MATERIAL.test(recipe.itemId)||
    !['smithing','tailoring'].includes(recipe.profession)||
    !int(recipe.tier,1,9)||
    !int(recipe.requiredProfessionLevel,1,100)||
    !int(recipe.goldCost,0,1000000000)||
    !int(recipe.combatWearLevel,1,100)||
    recipe.authoredAndReviewed!==true||
    !Array.isArray(recipe.inputs)||recipe.inputs.length<2||
    recipe.inputs.length>24)
   fail('unreviewed_recipe');
 // New independent-careers thresholds are PROVISIONAL. An old T2/3/4
 // recipe must not silently bypass them without owner-approved migration.
 if(recipe.requiredProfessionLevel<PROFESSION_TIER_FLOORS_V2[recipe.tier-1])
   fail('unreconciled_profession_tier');
 const ingredientIds=new Set<string>();
 let hasCombatIngredient=false;
 for(const input of recipe.inputs){
   if(!input||typeof input.itemId!=='string'||!MATERIAL.test(input.itemId)||
      !int(input.units,1,1000000)||ingredientIds.has(input.itemId)||
      !['any','combat'].includes(input.requiredOriginalOrigin))
      fail('invalid_recipe_ingredients');
   ingredientIds.add(input.itemId);
   if(input.requiredOriginalOrigin==='combat')hasCombatIngredient=true;
 }
 if(!hasCombatIngredient)fail('missing_combat_source_requirement');
 const registrations=new Map<string,TrustedMaterialRegistrationV2>();
 for(const reg of state.registrations){
   if(!reg||typeof reg.itemId!=='string'||!MATERIAL.test(reg.itemId)||
      !['stackable_material','equipment_copy','gem'].includes(reg.kind)||
      typeof reg.registered!=='boolean'||
      typeof reg.originalSourceRegistered!=='boolean'||
      registrations.has(reg.itemId))fail('invalid_material_registration');
   registrations.set(reg.itemId,reg);
 }
 for(const input of recipe.inputs){
   const reg=registrations.get(input.itemId);
   if(!reg||reg.kind!=='stackable_material'||!reg.registered||
      !reg.originalSourceRegistered)fail('material_source_unregistered');
   // V5 review-only 29 materials have no actual grants. This blanket guard
   // MUST remain until a different audited release-gated policy supersedes it.
   if(input.itemId.startsWith('EQ2_'))fail('eq2_source_registration_pending');
 }
 const progression=projectCharacterProgressionV2(state.progression);
 const skillLevel=progression.professionLevels[recipe.profession]??0;
 if(skillLevel<recipe.requiredProfessionLevel)fail('profession_locked');
 // We deliberately DO NOT read progression.combatLevel to authorize crafting.
 // The product's combatWearLevel is applied only on the future equip action.
 const originalProofs=new Map<string,TrustedMaterialSourceProvenanceV2>();
 const receipts=new Set<string>(),transferReceipts=new Set<string>();
 for(const proof of state.originalSourceProofs){
   if(!proof||!validToken(proof.provenanceId)||
     !validToken(proof.sourceReceiptId)||
     typeof proof.sourceAccountId!=='string'||!CANONICAL_UUID.test(proof.sourceAccountId)||
     typeof proof.sourceCharacterId!=='string'||!CANONICAL_UUID.test(proof.sourceCharacterId)||
     !validToken(proof.originalLotId)||
     typeof proof.itemId!=='string'||!MATERIAL.test(proof.itemId)||
     !['combat','gathering','processing'].includes(proof.originalOrigin)||
     !int(proof.originalGrantedQuantity,1,1000000000)||
     proof.completed!==true||
     originalProofs.has(proof.provenanceId))
     fail('invalid_source_provenance');
   // A spare or unrelated proof cannot establish a disguised material type
   // that the registered lot classifier would reject if it were consumed.
   const proofRegistration=registrations.get(proof.itemId);
   if(proof.itemId.startsWith('EQ2_')||!proofRegistration||
      proofRegistration.kind!=='stackable_material'||
      !proofRegistration.registered||!proofRegistration.originalSourceRegistered)
     fail('invalid_source_material_identity');
   const deposit=proof.bankDeposit;
   if(deposit&&(!validToken(deposit.receiptId)||
     typeof deposit.accountId!=='string'||!CANONICAL_UUID.test(deposit.accountId)||
     typeof deposit.depositedByCharacterId!=='string'||
     !CANONICAL_UUID.test(deposit.depositedByCharacterId)||
     !validToken(deposit.lotId)||deposit.committed!==true))
     fail('invalid_bank_deposit_receipt');
   originalProofs.set(proof.provenanceId,proof);
   // Source receipt cannot be re-used as a second independent lot
   // in this preview without an authenticated split/merge receipt.
   if(receipts.has(proof.sourceReceiptId))fail('duplicate_source_receipt');
   receipts.add(proof.sourceReceiptId);
   const transfer=proof.settledTransfer;
   if(transfer){
     if(!validToken(transfer.transferReceiptId)||
        !['market','commission'].includes(transfer.kind)||
        transfer.settled!==true||
        transfer.originalSourceReceiptId!==proof.sourceReceiptId||
        typeof transfer.fromAccountId!=='string'||
        !CANONICAL_UUID.test(transfer.fromAccountId)||
        typeof transfer.toAccountId!=='string'||
        !CANONICAL_UUID.test(transfer.toAccountId)||
        typeof transfer.recipientCharacterId!=='string'||
        !CANONICAL_UUID.test(transfer.recipientCharacterId)||
        transfer.fromAccountId.toLowerCase()!==proof.sourceAccountId.toLowerCase()||
        transfer.fromAccountId.toLowerCase()===transfer.toAccountId.toLowerCase()||
        transferReceipts.has(transfer.transferReceiptId))
       fail('invalid_market_transfer_provenance');
     transferReceipts.add(transfer.transferReceiptId);
   }
 }
 const lots=new Map<string,TrustedCraftMaterialLotV2>();
 const consumedProofIds=new Set<string>();
 for(const lot of state.ownedLots){
   if(!lot||!validToken(lot.lotId)||
      typeof lot.itemId!=='string'||!MATERIAL.test(lot.itemId)||
      typeof lot.accountId!=='string'||!CANONICAL_UUID.test(lot.accountId)||
      lot.accountId.toLowerCase()!==state.accountId.toLowerCase()||
      !['inventory','bank','market_escrow'].includes(lot.custody)||
      (lot.custody==='bank'?lot.characterId!==null:
        (typeof lot.characterId!=='string'||!CANONICAL_UUID.test(lot.characterId)))||
      !int(lot.availableQuantity,1,1000000000)||
      !validToken(lot.provenanceId)||
      lots.has(lot.lotId))fail('invalid_or_duplicate_lot');
   if(lot.custody!=='bank'&&lot.characterId?.toLowerCase()!==state.characterId.toLowerCase())
     fail('wrong_character_custody');
   // Every candidate material lot is typed, not just ingredients that this
   // one recipe would happen to consume. Reject latent EQ2/gear/gem blobs.
   const registeredLot=registrations.get(lot.itemId);
   if(lot.itemId.startsWith('EQ2_')||!registeredLot||
      registeredLot.kind!=='stackable_material'||
      !registeredLot.registered||!registeredLot.originalSourceRegistered)
     fail('invalid_owned_material_identity');
   lots.set(lot.lotId,lot);
   const proof=originalProofs.get(lot.provenanceId);
   // Explicit return ensures strict TS control flow knows that a missing
   // proof can never proceed to transfer/deposit dereferences.
   if(!proof)return fail('missing_or_mismatched_source_receipt');
   if(proof.itemId!==lot.itemId||
      proof.originalLotId!==lot.lotId||
      consumedProofIds.has(lot.provenanceId)||
      proof.originalGrantedQuantity<lot.availableQuantity)
     fail('missing_or_mismatched_source_receipt');
   const transfer=proof.settledTransfer;
   const currentAccountId=state.accountId.toLowerCase();
   const creditedCharacterId=transfer?.recipientCharacterId.toLowerCase()??
     proof.sourceCharacterId.toLowerCase();
   const originOwnedByAccount=transfer
     ?transfer.toAccountId.toLowerCase()===currentAccountId
     :proof.sourceAccountId.toLowerCase()===currentAccountId;
   if(!originOwnedByAccount)
     fail('missing_or_mismatched_source_receipt');
   const deposit=proof.bankDeposit;
   if(lot.custody==='bank'){
     if(!deposit||deposit.accountId.toLowerCase()!==currentAccountId||
        deposit.lotId!==lot.lotId||
        deposit.depositedByCharacterId.toLowerCase()!==creditedCharacterId||
        !ownedCharacterIds.has(creditedCharacterId))
       fail('missing_or_mismatched_bank_deposit');
   }else if(deposit||creditedCharacterId!==state.characterId.toLowerCase()){
     // A deposited then withdrawn lot needs an explicit new withdrawal proof.
     // A Bank-only source receipt must not be recycled as inventory.
     fail('missing_or_mismatched_source_receipt');
   }
   consumedProofIds.add(lot.provenanceId);
 }
 if(!state.priorRequests.every(r=>r&&validToken(r.requestId)&&
     /^[0-9a-f]{64}$/.test(r.requestHash)&&
     CANONICAL_UUID.test(r.accountId)&&CANONICAL_UUID.test(r.characterId)&&
     validToken(r.recipeId)&&int(r.quantity,1,100)&&
     int(r.settledRevision,0,Number.MAX_SAFE_INTEGER)))
   fail('invalid_prior_requests');
 const matches=state.priorRequests.filter(r=>r.requestId===request.requestId);
 if(matches.length>1)fail('duplicate_prior_request');
 const previous=matches[0];
 if(previous){
   if(previous.accountId.toLowerCase()!==request.accountId.toLowerCase()||
      previous.characterId.toLowerCase()!==request.characterId.toLowerCase()||
      previous.recipeId!==request.recipeId||
      previous.requestHash!==request.requestHash||
      previous.quantity!==request.quantity||
      previous.settledRevision>state.revision)
     fail('request_collision');
   return {
     version:CRAFT_CUSTODY_HANDOFF_REVIEW_V2,
     accountId:state.accountId.toLowerCase(),
     characterId:state.characterId.toLowerCase(),recipeId:recipe.recipeId,
     quantity:request.quantity,expectedRevision:request.expectedRevision,
     reviewable:true,replayReadbackRequired:true,goldDebit:0,debits:[],
     preservesIndependentProfessionGate:true,combatLevelUsedForCraft:false,
     canCommit:false,canGrantItemsOrXp:false,mayMoveMarketEscrow:false,
     requiresAuthenticatedAtomicDbAdapter:true,releaseEnabled:false,
   };
 }
 if(request.expectedRevision!==state.revision)fail('stale_revision');
 const goldDebit=recipe.goldCost*request.quantity;
 if(!int(goldDebit,0,Number.MAX_SAFE_INTEGER)||
    goldDebit>state.availableGold)fail('insufficient_gold');
 const debits:PlannedSourceDebitV2[]=[];
 for(const input of recipe.inputs){
   const required=input.units*request.quantity;
   if(!int(required,1,Number.MAX_SAFE_INTEGER))
     fail('invalid_material_quantity');
   let remaining=required;
   // Deterministic preference: character's inventory before shared Bank;
   // market escrow NEVER enters the spendable lot set.
   const options=[...lots.values()].filter(lot=>
     lot.itemId===input.itemId&&lot.custody!=='market_escrow')
     .sort((a,b)=>(a.custody===b.custody?0:a.custody==='inventory'?-1:1)||
       a.lotId.localeCompare(b.lotId));
   for(const lot of options){
     const proof=originalProofs.get(lot.provenanceId)!;
     if(input.requiredOriginalOrigin==='combat'&&proof.originalOrigin!=='combat')
       continue;
     const take=Math.min(remaining,lot.availableQuantity);
     if(take===0)continue;
     debits.push({
       lotId:lot.lotId,itemId:lot.itemId,
       custody:lot.custody as 'inventory'|'bank',
       quantity:take,originalOrigin:proof.originalOrigin,
       sourceReceiptId:proof.sourceReceiptId,
       transferReceiptId:proof.settledTransfer?.transferReceiptId??null,
     });
     remaining-=take;
     if(remaining===0)break;
   }
   if(remaining!==0)fail('insufficient_verified_materials');
 }
 return {
   version:CRAFT_CUSTODY_HANDOFF_REVIEW_V2,
   accountId:state.accountId.toLowerCase(),
   characterId:state.characterId.toLowerCase(),recipeId:recipe.recipeId,
   quantity:request.quantity,expectedRevision:state.revision,
   reviewable:true,replayReadbackRequired:false,goldDebit,debits,
   preservesIndependentProfessionGate:true,combatLevelUsedForCraft:false,
   canCommit:false,canGrantItemsOrXp:false,mayMoveMarketEscrow:false,
   requiresAuthenticatedAtomicDbAdapter:true,releaseEnabled:false,
 };
}
