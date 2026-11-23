import test from 'node:test';
import assert from 'node:assert/strict';
import {
 inspectExclusiveEquipmentGrantV1,inspectExclusiveEquipmentPurchaseV1,
 assertRewardEquipmentAcquisitionChannelV1,EQ2_EXCLUSIVE_REWARD_POLICY_RELEASED
} from '../backend/src/server/equipment/equipment-v2-exclusive-acquisition-policy.mjs';

test('reward gear policy remains hidden and unmounted',()=>{
 assert.equal(EQ2_EXCLUSIVE_REWARD_POLICY_RELEASED,false);
 assert.throws(()=>assertRewardEquipmentAcquisitionChannelV1({
  origin:'party_event_chest',templateSource:'party_event',verifiedEarnedSource:true,tier:2
 }),/issuer_unmounted/);
});
for(const family of ['dungeon','party_event','world_boss']){
 for(const channel of ['npc_shop','guild_shop','dungeon_shop','world_boss_shop','event_shop','shop_exchange','vendor_exchange','currency_exchange','player_market_purchase','player_market_listing']){
  test(family+' gear cannot be bought via '+channel,()=>{
   const result=inspectExclusiveEquipmentPurchaseV1({channel,templateFamily:family});
   assert.equal(result.canPurchase,false);
   assert.equal(result.allowedByExclusivePolicy,false);
  });
 }
}
test('only same-family server-verified T1–T4 earned sources may become candidates',()=>{
 assert.equal(inspectExclusiveEquipmentGrantV1({origin:'party_event_chest',templateSource:'party_event',verifiedEarnedSource:true,tier:3}).possibleOnlyAfterAuthoritativeReceiptVerification,true);
 assert.equal(inspectExclusiveEquipmentGrantV1({origin:'world_boss_chest',templateSource:'world_boss',verifiedEarnedSource:true,tier:4}).possibleOnlyAfterAuthoritativeReceiptVerification,true);
 assert.equal(inspectExclusiveEquipmentGrantV1({origin:'dungeon_boss_drop',templateSource:'dungeon',verifiedEarnedSource:true,tier:1}).possibleOnlyAfterAuthoritativeReceiptVerification,true);
 assert.equal(inspectExclusiveEquipmentGrantV1({origin:'world_boss_shop',templateSource:'world_boss',verifiedEarnedSource:true,tier:2}).possibleOnlyAfterAuthoritativeReceiptVerification,false);
 assert.equal(inspectExclusiveEquipmentGrantV1({origin:'party_event_chest',templateSource:'party_event',verifiedEarnedSource:false,tier:3}).possibleOnlyAfterAuthoritativeReceiptVerification,false);
 assert.equal(inspectExclusiveEquipmentGrantV1({origin:'party_event_chest',templateSource:'dungeon',verifiedEarnedSource:true,tier:3}).possibleOnlyAfterAuthoritativeReceiptVerification,false);
 assert.equal(inspectExclusiveEquipmentGrantV1({origin:'party_event_chest',templateSource:'party_event',verifiedEarnedSource:true,tier:5}).possibleOnlyAfterAuthoritativeReceiptVerification,false);
});
