/** Review-only server rare-blueprint definition and prerequisite checks.
 *
 * These six pieces are NOT in V2_SERVER_PIECES, V2_SERVER_RECIPES or
 * EQUIPMENT_V2_ALL_CRAFTABLE_PIECES, and do not grant recipes by default.
 * The actual drop roll must be HMAC/server-RNG tied to committed encounter
 * receipt, and the learned blueprint must be checked in the same online
 * transaction as material + Gold spend and exact-copy item mint.
 * The public game and all equipment reward issuers remain OFF.
 */
export const EQ2_RARE_BLUEPRINT_VERSION='eq2-rare-blueprint-review-v1';
export const EQ2_RARE_BLUEPRINT_RELEASED=false;
export const V2_RARE_BLUEPRINT_DRAFTS=Object.freeze([{"blueprintId":"EQ2_BP_T2_IRONROOT_GUARD","itemId":"EQ2_RARE_T2_IRONROOT_GUARD","name":"Ironwood Heartguard Carapace","tier":2,"slot":"chest","role":"tank","traitId":"ironroot_guard","baseBudgetMultiplier":1.03,"materialCostMultiplier":1.4,"proposedEligibleEliteBps":5,"proposedZoneBossBps":20},{"blueprintId":"EQ2_BP_T2_WOODLAND_MENDING","itemId":"EQ2_RARE_T2_WOODLAND_MENDING","name":"Ironwood Whisperbloom Mantle","tier":2,"slot":"cape","role":"support","traitId":"woodland_mending","baseBudgetMultiplier":1.03,"materialCostMultiplier":1.4,"proposedEligibleEliteBps":5,"proposedZoneBossBps":20},{"blueprintId":"EQ2_BP_T3_MIRAGE_PRECISION","itemId":"EQ2_RARE_T3_MIRAGE_PRECISION","name":"Sunscar Miragefang Gloves","tier":3,"slot":"gloves","role":"damage","traitId":"mirage_precision","baseBudgetMultiplier":1.04,"materialCostMultiplier":1.4,"proposedEligibleEliteBps":3,"proposedZoneBossBps":12},{"blueprintId":"EQ2_BP_T3_AMBERGLASS_WARD","itemId":"EQ2_RARE_T3_AMBERGLASS_WARD","name":"Sunscar Amberglass Signet","tier":3,"slot":"ring","role":"support","traitId":"amberglass_ward","baseBudgetMultiplier":1.04,"materialCostMultiplier":1.4,"proposedEligibleEliteBps":3,"proposedZoneBossBps":12},{"blueprintId":"EQ2_BP_T4_STEADFAST_ANCHOR","itemId":"EQ2_RARE_T4_STEADFAST_ANCHOR","name":"Glassbound Oathforged Boots","tier":4,"slot":"boots","role":"tank","traitId":"steadfast_anchor","baseBudgetMultiplier":1.05,"materialCostMultiplier":1.4,"proposedEligibleEliteBps":2,"proposedZoneBossBps":8},{"blueprintId":"EQ2_BP_T4_SPELLTHREAD_ECHO","itemId":"EQ2_RARE_T4_SPELLTHREAD_ECHO","name":"Glassbound Soulweft Pendant","tier":4,"slot":"amulet","role":"damage","traitId":"spellthread_echo","baseBudgetMultiplier":1.05,"materialCostMultiplier":1.4,"proposedEligibleEliteBps":2,"proposedZoneBossBps":8}].map(x=>Object.freeze(x)));
const byId=new Map(V2_RARE_BLUEPRINT_DRAFTS.map(row=>[row.blueprintId,row]));
const BLUEPRINT_SOURCES=new Set(['eligible_zone_elite','eligible_zone_boss']);
const FORBIDDEN_ACCESS=new Set(['npc_shop','event_shop','dungeon_shop','guild_shop','world_boss_shop','player_market_purchase','shop_exchange','currency_exchange','vendor_exchange']);
export function blueprintDraftById(blueprintId){return byId.get(blueprintId);}
export function inspectBlueprintDropCandidateV1({
 blueprintId,sourceKind,sourceTier,committedEncounter=false,accountBound=false,sourceReceiptKey,
}={}){
 const row=blueprintDraftById(blueprintId);
 const valid=Boolean(row)&&BLUEPRINT_SOURCES.has(sourceKind)&&Number.isInteger(sourceTier)&&sourceTier===row.tier
   &&committedEncounter===true&&accountBound===true
   &&typeof sourceReceiptKey==='string'&&sourceReceiptKey.length>=20&&sourceReceiptKey.length<=220;
 const odds=valid?(sourceKind==='eligible_zone_elite'?row.proposedEligibleEliteBps:row.proposedZoneBossBps):null;
 return Object.freeze({
  reviewCandidate:valid,proposedRateBps:odds,
  sourceVerifiedInDatabase:false,readyToRoll:false,canUnlock:false,
  canCraft:false,canEquip:false,released:false,
  missing:Object.freeze(['canonical_attested_db_encounter','one_time_server_entropy','persisted_account_blueprint_ownership','server_owned_exact_recipe','same_transaction_gold_material_debit','combat_trait_snapshot']),
 });
}
/** No runtime unlock endpoint exists. Even a forged prevalidated flag fails. */
export function assertBlueprintUnlockV1(input){
 const preview=inspectBlueprintDropCandidateV1(input);
 if(!preview.reviewCandidate)throw Error('eq2_blueprint_invalid_earned_source');
 throw Error('eq2_blueprint_issuer_unmounted');
}
export function assertBlueprintPurchaseDeniedV1(channel){
 if(FORBIDDEN_ACCESS.has(channel))throw Error('eq2_blueprint_shop_market_exchange_forbidden');
 throw Error('eq2_blueprint_purchase_unavailable');
}
