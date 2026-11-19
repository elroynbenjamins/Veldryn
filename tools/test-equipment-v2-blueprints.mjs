import test from 'node:test';
import assert from 'node:assert/strict';
import {V2_RARE_BLUEPRINT_DRAFTS,EQ2_RARE_BLUEPRINT_RELEASED,
 blueprintDraftById,inspectBlueprintDropCandidateV1,assertBlueprintUnlockV1,
 assertBlueprintPurchaseDeniedV1
} from '../backend/src/server/equipment/equipment-crafting-v2-blueprint-policy.mjs';

test('six T2–T4 rare blueprints, no T1 and no default unlock',()=>{
 assert.equal(EQ2_RARE_BLUEPRINT_RELEASED,false);
 assert.equal(V2_RARE_BLUEPRINT_DRAFTS.length,6);
 const ids=new Set();
 const tiers=new Map();
 for(const row of V2_RARE_BLUEPRINT_DRAFTS){
  assert.ok(row.tier>=2&&row.tier<=4);
  assert.ok(row.baseBudgetMultiplier>=1.03&&row.baseBudgetMultiplier<=1.05);
  assert.ok(row.materialCostMultiplier>=1.4);
  assert.ok(row.proposedEligibleEliteBps>=1&&row.proposedEligibleEliteBps<=5);
  assert.ok(row.proposedZoneBossBps>=1&&row.proposedZoneBossBps<=20);
  assert.ok(!ids.has(row.blueprintId));
  assert.equal(blueprintDraftById(row.blueprintId),row);
  ids.add(row.blueprintId);tiers.set(row.tier,(tiers.get(row.tier)||0)+1);
 }
 assert.equal(tiers.get(2),2);assert.equal(tiers.get(3),2);assert.equal(tiers.get(4),2);
});
test('source must be earned elite/zone boss, correct tier and stored encounter',()=>{
 const x=V2_RARE_BLUEPRINT_DRAFTS[0];
 const proof={blueprintId:x.blueprintId,sourceKind:'eligible_zone_boss',
  sourceTier:x.tier,committedEncounter:true,accountBound:true,
  sourceReceiptKey:'canonical-database-receipt-but-not-verified-in-this-module'};
 const view=inspectBlueprintDropCandidateV1(proof);
 assert.equal(view.reviewCandidate,true);
 assert.equal(view.readyToRoll,false);
 assert.equal(view.canUnlock,false);
 assert.equal(view.canCraft,false);
 assert.equal(view.sourceVerifiedInDatabase,false);
 assert.throws(()=>assertBlueprintUnlockV1(proof),/issuer_unmounted/);
 for(const bad of [
  {sourceKind:'npc_shop'},{sourceKind:'player_market_purchase'},
  {sourceTier:1},{committedEncounter:false},{accountBound:false},
  {sourceReceiptKey:'client-supplied-short'},
 ]){
  const altered={...proof,...bad};
  assert.equal(inspectBlueprintDropCandidateV1(altered).reviewCandidate,false);
  assert.throws(()=>assertBlueprintUnlockV1(altered),/invalid_earned_source/);
 }
});
test('blueprints cannot be bought or exchanged through any merchant',()=>{
 for(const channel of ['npc_shop','event_shop','dungeon_shop','guild_shop',
  'world_boss_shop','player_market_purchase','shop_exchange','currency_exchange','vendor_exchange'])
  assert.throws(()=>assertBlueprintPurchaseDeniedV1(channel),/forbidden/);
 assert.throws(()=>assertBlueprintPurchaseDeniedV1('other'),/unavailable/);
});
