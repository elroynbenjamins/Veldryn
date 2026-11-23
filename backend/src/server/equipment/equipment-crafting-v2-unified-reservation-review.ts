/**
 * HIDDEN Equipment/Crafting 2.0 — pure, NON-EXECUTABLE preview of a single
 * server-owned recipe reservation. No runtime imports, SQL, Edge route, RNG,
 * release flags, item mint, Bank mutation or player claims.
 *
 * A future server adapter must independently authenticate and lock the
 * account+character+wallet+Bank+queue+receipts in one transaction. A type
 * marker here is NOT proof that a client payload is trusted.
 */
export const EQ2_REVIEW_RESERVATION_VERSION='eq2-t1-t4-craft-reservation-review-v1' as const;
export interface Eq2ReviewRecipe {
 readonly id:string;readonly pieceId:string;readonly route:'foundation'|'alternate';
 readonly tier:1|2|3|4;readonly profession:'smithing'|'tailoring';
 readonly gold:number;readonly xp:number;readonly seconds:number;
 readonly professionLevel:number;readonly craftCombatLevelRequired:0;
 readonly reviewOnly:true;readonly craftable:false;readonly mayMint:false;
 readonly inputs:readonly {readonly itemId:string;readonly quantity:number}[];
}
export interface Eq2TrustedDraftCharacter {
 readonly professionLevels:{readonly smithing:number;readonly tailoring:number};
 readonly walletGold:number;
 readonly inventory:Readonly<Record<string,number>>;
}
export interface Eq2TrustedDraftAccount {
 readonly accountId:string;readonly authenticatedCharacterId:string;
 readonly revision:number;
 /** Loaded and locked by future DB adapter. NOT a client trust token. */
 readonly characters:Readonly<Record<string,Eq2TrustedDraftCharacter>>;
 readonly bank:Readonly<Record<string,number>>;
 readonly receipts:readonly Eq2ReservationReceipt[];
}
export interface Eq2ReservationReceipt {
 readonly requestId:string;readonly accountId:string;readonly characterId:string;
 readonly recipeId:string;readonly sourceRevision:number;
}
export interface Eq2ReserveRequest {
 readonly requestId:string;readonly accountId:string;readonly characterId:string;
 readonly recipeId:string;readonly expectedRevision:number;
}
export interface Eq2Debit {
 readonly itemId:string;readonly quantity:number;
 readonly fromCharacter:number;readonly fromBank:number;
}
export interface Eq2ReviewReservePlan {
 readonly version:typeof EQ2_REVIEW_RESERVATION_VERSION;
 readonly allowedToCommit:false;
 readonly requiresAuthenticatedAtomicDbAdapter:true;
 readonly requestId:string;readonly accountId:string;readonly characterId:string;
 readonly recipeId:string;readonly revision:number;
 readonly replay:boolean;readonly goldDebit:number;readonly wouldAwardXp:number;
 readonly debits:readonly Eq2Debit[];
 readonly reason:'REVIEW_ONLY_NO_MINT_OR_PERSISTENCE';
}
export class Eq2ReviewReserveError extends Error {
 constructor(readonly code:string){super(code);}
}
const denied=(reason:string):never=>{throw new Eq2ReviewReserveError(reason);};
const count=(n:unknown):n is number=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0;
const key=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&
 v.trim()===v&&v!=='__proto__'&&v!=='constructor'&&v!=='prototype';
const obj=(v:unknown):v is Record<string,unknown>=>{
 if(v===null||typeof v!=='object'||Array.isArray(v))return false;
 const p=Object.getPrototypeOf(v);return p===Object.prototype||p===null;
};
function validateBalances(input:unknown){
 // Throw directly so strict TypeScript narrows unknown to a plain record.
 if(!obj(input))throw new Eq2ReviewReserveError('invalid_material_storage');
 for(const [id,quantity] of Object.entries(input))
  if(!key(id)||!count(quantity))denied('invalid_material_storage');
}
function validatedRecipes(
 recipeId:string,source:readonly Eq2ReviewRecipe[],
):Eq2ReviewRecipe{
 if(!Array.isArray(source)||!source.length)denied('unknown_review_catalog');
 const matches=source.filter(x=>x.id===recipeId);
 if(matches.length!==1)denied('unknown_or_duplicate_review_recipe');
 const recipe=matches[0];
 if(!recipe||recipe.craftable!==false||recipe.mayMint!==false||
  recipe.reviewOnly!==true||recipe.craftCombatLevelRequired!==0||
  !['smithing','tailoring'].includes(recipe.profession)||
  !['foundation','alternate'].includes(recipe.route)||
  !count(recipe.gold)||recipe.gold<1||!count(recipe.xp)||!count(recipe.seconds)||
  !count(recipe.professionLevel)||recipe.professionLevel<1||
  !Array.isArray(recipe.inputs)||recipe.inputs.length<4)denied('invalid_review_recipe');
 const seen=new Set<string>();
 for(const material of recipe.inputs){
  if(!key(material.itemId)||!count(material.quantity)||material.quantity<1||
   seen.has(material.itemId))denied('invalid_review_recipe_inputs');
  seen.add(material.itemId);
 }
 // Route parity may only be verified from a fully loaded, server-owned catalog.
 const siblings=source.filter(x=>x.pieceId===recipe.pieceId);
 if(siblings.length!==2||new Set(siblings.map(x=>x.route)).size!==2)
  denied('incomplete_review_recipe_pair');
 const other=siblings.find(x=>x.id!==recipe.id)!;
 if(other.craftable!==false||other.mayMint!==false||other.reviewOnly!==true
  ||other.craftCombatLevelRequired!==0||other.tier!==recipe.tier
  ||other.professionLevel!==recipe.professionLevel||other.gold!==recipe.gold
  ||other.xp!==recipe.xp||other.seconds!==recipe.seconds)
  denied('cross_route_price_or_gate_bypass');
 const common:{[k:number]:string}={
 1:'EQ2_BOAR_TUSK',2:'IRONWOOD_FANG',3:'EQ2_SUNSCAR_SCALE',4:'EQ2_GLASSBOUND_PLATE'};
 const scarce:{[k:number]:string}={
 1:'EQ2_VERDANT_ESSENCE',2:'EQ2_TROLL_SINEW',
 3:'EQ2_MIRAGEFANG_CORE',4:'EQ2_GLASSHEART_FRAGMENT'};
 const binder:{[k:number]:string}={
 1:'VERDANT_BINDING_RESIN',2:'IRONWOOD_BINDING_RESIN',
 3:'SUNSCAR_DUNE_BINDER',4:'GLASSBOUND_BINDER'};
 const get=(r:Eq2ReviewRecipe,id:string)=>r.inputs.find(x=>x.itemId===id)?.quantity??0;
 for(const id of [common[recipe.tier],scarce[recipe.tier],binder[recipe.tier]]){
  if(get(recipe,id)!==get(other,id))denied('cross_route_combat_binder_bypass');
 }
 if(!get(recipe,common[recipe.tier])||!get(recipe,binder[recipe.tier]))
  denied('missing_required_combat_or_binder');
 return recipe;
}
export function previewEq2ReviewedReservation(
 request:Eq2ReserveRequest,snapshot:Eq2TrustedDraftAccount,
 trustedCatalog:readonly Eq2ReviewRecipe[],
):Eq2ReviewReservePlan {
 if(!request||!snapshot||!key(request.requestId)||
  !/^[A-Za-z0-9_-]{8,128}$/.test(request.requestId)||
  !key(request.accountId)||!key(request.characterId)||
  !key(request.recipeId)||!count(request.expectedRevision)||
  !count(snapshot.revision)||!obj(snapshot.characters)||
  snapshot.accountId!==request.accountId||
  snapshot.authenticatedCharacterId!==request.characterId||
  !Array.isArray(snapshot.receipts))denied('invalid_authenticated_snapshot_or_request');
 const actor=snapshot.characters[request.characterId];
 if(!actor||!obj(actor)||!obj(actor.professionLevels)||
  !count(actor.professionLevels.smithing)||!count(actor.professionLevels.tailoring)||
  !count(actor.walletGold))denied('invalid_character_or_wallet');
 validateBalances(actor.inventory);validateBalances(snapshot.bank);
 for(const ch of Object.values(snapshot.characters)){
  if(!ch||!obj(ch)||!obj(ch.professionLevels)||
   !count(ch.professionLevels.smithing)||!count(ch.professionLevels.tailoring)||
   !count(ch.walletGold))denied('invalid_other_character');
  validateBalances(ch.inventory);
 }
 const recipe=validatedRecipes(request.recipeId,trustedCatalog);
 const previous=snapshot.receipts.filter(r=>r.requestId===request.requestId);
 if(previous.length>1)denied('duplicate_reserved_receipt');
 if(previous.length){
  const p=previous[0];
  if(p.accountId!==request.accountId||p.characterId!==request.characterId||
   p.recipeId!==request.recipeId||!count(p.sourceRevision))
   denied('request_id_conflict');
  return {version:EQ2_REVIEW_RESERVATION_VERSION,allowedToCommit:false,
   requiresAuthenticatedAtomicDbAdapter:true,requestId:request.requestId,
   accountId:request.accountId,characterId:request.characterId,
   recipeId:request.recipeId,revision:snapshot.revision,replay:true,
   goldDebit:0,wouldAwardXp:0,debits:[],
   reason:'REVIEW_ONLY_NO_MINT_OR_PERSISTENCE'};
 }
 if(request.expectedRevision!==snapshot.revision)denied('stale_account_revision');
 if(actor.professionLevels[recipe.profession]<recipe.professionLevel)
  denied('profession_level_locked');
 if(actor.walletGold<recipe.gold)denied('insufficient_gold');
 const debits:Eq2Debit[]=[];
 for(const input of recipe.inputs){
  const inPack=actor.inventory[input.itemId]??0;
  const inBank=snapshot.bank[input.itemId]??0;
  if(!count(inPack)||!count(inBank)||!count(inPack+inBank))
   denied('invalid_owned_material_balance');
  if(inPack+inBank<input.quantity)denied('insufficient_owned_materials');
  const fromCharacter=Math.min(inPack,input.quantity);
  debits.push({itemId:input.itemId,quantity:input.quantity,fromCharacter,
   fromBank:input.quantity-fromCharacter});
 }
 return {version:EQ2_REVIEW_RESERVATION_VERSION,allowedToCommit:false,
  requiresAuthenticatedAtomicDbAdapter:true,requestId:request.requestId,
  accountId:request.accountId,characterId:request.characterId,
  recipeId:request.recipeId,revision:snapshot.revision,replay:false,
  goldDebit:recipe.gold,wouldAwardXp:recipe.xp,debits,
  reason:'REVIEW_ONLY_NO_MINT_OR_PERSISTENCE'};
}
