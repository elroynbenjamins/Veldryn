/**
 * REVIEW ONLY / UNMOUNTED: source policy for T1–T4 event and dungeon gear.
 *
 * This is a pure policy contract, not a security boundary by itself.
 * Runtime integration MUST classify item IDs from the server's canonical
 * signed item registry, load an immutable earned receipt and validate within
 * one authenticated SQL transaction. Never trust a source claimed by client.
 *
 * Not imported by any live shop, Market, rewards or craft service.
 */
export const EQ2_EXCLUSIVE_REWARD_POLICY_VERSION='eq2-exclusive-earned-v1';
export const EQ2_EXCLUSIVE_REWARD_POLICY_RELEASED=false;
export const ALLOWED_EQUIPMENT_REWARD_SOURCES=Object.freeze([
 'dungeon_boss_drop','dungeon_completion_chest',
 'party_event_chest','world_boss_chest',
]);
const allowed=new Set(ALLOWED_EQUIPMENT_REWARD_SOURCES);
export const FORBIDDEN_EQUIPMENT_REWARD_PURCHASES=Object.freeze([
 'npc_shop','guild_shop','dungeon_shop','world_boss_shop','event_shop',
 'shop_exchange','vendor_exchange','currency_exchange','player_market_purchase',
 'player_market_listing','craft_from_reward_item','direct_admin_purchase',
]);
const denied=new Set(FORBIDDEN_EQUIPMENT_REWARD_PURCHASES);
/** Preview-only source validation. No token/client argument can authorize issuance. */
export function inspectExclusiveEquipmentGrantV1({origin,verifiedEarnedSource=false,templateSource='unverified',tier}={}){
 const eligible=allowed.has(origin)&&verifiedEarnedSource===true&&
  Number.isInteger(tier)&&tier>=1&&tier<=4&&
  ((origin==='world_boss_chest'&&templateSource==='world_boss')||
  (origin==='party_event_chest'&&templateSource==='party_event')||
  (origin.startsWith('dungeon_')&&templateSource==='dungeon'));
 return Object.freeze({
  possibleOnlyAfterAuthoritativeReceiptVerification:eligible,
  runtimeGrantEnabled:false,
  blocks:!eligible?Object.freeze(['source_not_verified_or_wrong_family_or_tier']):Object.freeze(['hidden_eq2_reward_grant_not_integrated']),
 });
}
export function inspectExclusiveEquipmentPurchaseV1({channel,templateFamily}={}){
 const restricted=['dungeon','party_event','world_boss'].includes(templateFamily);
 return Object.freeze({
  canPurchase: false,
  allowedByExclusivePolicy: !restricted && !denied.has(channel),
  hardDenyReason: restricted?'earned_reward_gear_not_sold':
    denied.has(channel)?'reward_gear_purchase_channel_forbidden':'not_a_reward_gear_authorization',
 });
}
export function assertRewardEquipmentAcquisitionChannelV1(input){
 const result=inspectExclusiveEquipmentGrantV1(input);
 if(!result.possibleOnlyAfterAuthoritativeReceiptVerification)
  throw Error('eq2_reward_gear_must_be_earned_by_verified_drop_or_chest');
 // Intentionally still not an issuer. Real grant requires the verified,
 // server-owned source receipt in the same persisted SQL transaction.
 throw Error('eq2_reward_gear_issuer_unmounted');
}
