/**
 * EQUIPMENT 2.0 T1-T5 — HIDDEN REVIEW-ONLY READ POLICY.
 *
 * This module cannot create, publish or authorize Equipment 2.0; it is
 * intentionally not imported by any live app/Edge/market/combat route.
 * A proposed future launch must separately require authenticated account
 * custody, an owner-approved contract, coordinated major-version activation
 * AND actual server authority. Never promote this preview to a grant API.
 */
export const EQUIPMENT_2_0_REVIEW_GUARDS=Object.freeze({
  coordinatedMajorVersionReleased:false,
  sourceSetRosterApproved:false,
  sourceStatContractApproved:false,
  sourceCpAndBalanceApproved:false,
  sourceForgeMintAuthorityApproved:false,
  sourceRewardsApproved:false,
  ownerApprovedEquipmentAppearance:false,
  ownerApprovedEquipmentPublicUi:false,
  playerMarket2EquipmentAuthorityApproved:false,
  legacyEquipmentEverTradeable:false,
  revealT1:false,revealT2:false,revealT3:false,revealT4:false,revealT5:false
});
export const REVIEW_ONLY_EQUIPMENT_2_0_DENIED_ACTIONS=Object.freeze([
  'public_catalogue','search_discovery','live_item_icons','inventory',
  'forge_start','forge_claim','craft','buy_from_shop','drop','chest_reward',
  'equip','loadout','stats','set_bonus','combat','pve_reward','market_list',
  'market_buy','market_delivery','market_cancel','market_resell',
  'bank_transfer','trade','reward_mint','admin_grant','live_tooltips'
]);

export function reviewEquipment2ReleaseDecision({tier,operation,itemId}={}){
  if(!Number.isInteger(tier)||tier<1||tier>5)
    return Object.freeze({allowed:false,reason:'eq2_unknown_or_out_of_scope_tier',itemId:itemId??null,reviewOnly:true});
  if(!REVIEW_ONLY_EQUIPMENT_2_0_DENIED_ACTIONS.includes(operation))
    return Object.freeze({allowed:false,reason:'eq2_unknown_or_disallowed_operation',itemId:itemId??null,reviewOnly:true});
  return Object.freeze({allowed:false,reason:'equipment_2_0_not_released',itemId:itemId??null,reviewOnly:true});
}

export function publicEquipment2ReviewCatalogue(){
  // No public "Coming Soon" gear cards or unauthenticated lookups.
  return Object.freeze([]);
}
export function assertEquipment2ReviewCannotActivate(operation){
  throw new Error('equipment_2_0_not_released:'+String(operation??'unknown'));
}
