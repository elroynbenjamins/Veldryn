#!/usr/bin/env node
/** Hidden EQ2 V5 exact-material-identity audit against all 746 draft routes. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const root='../backend/dist-equipment-combat-v2-launch/server/equipment/';
const m=require(root+'equipment-crafting-v2-stackable-material-boundary-review.js');
const s=require(root+'equipment-crafting-v2-material-source-review.js');
const v3=JSON.parse(fs.readFileSync(
 'docs/equipment-2-0/t1-t4-48-set-unified-recipe-review-v3.json','utf8'));

assert.equal(m.EQ2_STACKABLE_MATERIAL_GRANTS_ENABLED,false);
const candidates=m.EQ2_REVIEW_MATERIAL_IDENTITIES;
assert.equal(candidates.length,29,'14 raw + 15 proposed processing outputs');
assert.equal(new Set(candidates.map(x=>x.itemId)).size,29);
const sourceSet=new Set(s.EQ2_REQUIRED_MATERIAL_SOURCE_DRAFTS.map(x=>x.itemId));
assert.equal(sourceSet.size,14);
const newProcesses=v3.processingReview.filter(x=>
 x.authoringMode==='NEW_PROCESSED_OUTPUT_UNREGISTERED');
assert.equal(newProcesses.length,15);
const processedSet=new Set(newProcesses.map(x=>x.output));
assert.deepEqual(candidates.filter(x=>x.origin!=='processing')
 .map(x=>x.itemId).sort(),[...sourceSet].sort());
assert.deepEqual(candidates.filter(x=>x.origin==='processing')
 .map(x=>x.itemId).sort(),[...processedSet].sort());
assert.ok(!m.eq2ReviewMaterialIdentity('SUNSTONE_INGOT'),
 'Canonical Sunstone process is a legacy ID, never a duplicate EQ2 source');
assert.ok(!m.eq2ReviewMaterialIdentity('EQ2_VERDANT_ESSENCE'),
 'Optional rare not yet registered must remain blocked');
for(const row of candidates){
 assert.ok(row.itemId.startsWith('EQ2_'));
 assert.equal(row.registered,false);
 assert.equal(row.sourceOrProcessingReceiptVerified,false);
 assert.equal(row.permittedInOwnedInventory,false);
 assert.equal(row.permittedInBank,false);
 assert.equal(row.permittedOnMarket,false);
 assert.equal(row.mayMint,false);
 assert.equal(row.stackableCandidate,true);
 assert.equal(m.eq2ReviewMaterialIdentity(row.itemId),row);
 const result=m.reviewEq2MaterialStack(row.itemId,1,true);
 assert.equal(result.mayStore,false);
 assert.equal(result.mayMint,false);
 assert.equal(result.mayTrade,false);
 assert.equal(result.identity,row);
 assert.equal(result.reason,row.origin==='processing'?
  'unregistered_processing_output':'unregistered_raw_source');
}
let blockedRoutes=0,blockedLines=0;
for(const recipe of v3.recipes){
 const attempted=recipe.inputs.filter(x=>x.itemId.startsWith('EQ2_'));
 assert.ok(attempted.length>0,
  recipe.id+' must not bypass the proposed EQ2 source boundary');
 for(const input of attempted){
  const result=m.reviewEq2MaterialStack(input.itemId,input.quantity,true);
  assert.ok(result.identity,
   recipe.id+' has an unknown EQ2_ material source: '+input.itemId);
  assert.equal(result.mayStore,false);
  blockedLines++;
 }
 blockedRoutes++;
}
assert.equal(blockedRoutes,746);
assert.ok(blockedLines>=746);
const deny=(itemId,quantity,reason)=>{
 const result=m.reviewEq2MaterialStack(itemId,quantity,{serverVerified:true});
 assert.equal(result.reason,reason);
 assert.equal(result.mayMint,false);
 assert.equal(result.mayStore,false);
 assert.equal(result.mayTrade,false);
};
deny('EQ2_LAUNCH_T1_OATHPLATE_HELMET',1,'unregistered_or_equipment_identity');
deny('EQ2_WEAPON_FAKE_COPY',1,'unregistered_or_equipment_identity');
deny('EQ2_GEM_FAKE',1,'unregistered_or_equipment_identity');
deny('EQ2_BOGUS_COMBAT_MATERIAL',1,'unregistered_or_equipment_identity');
deny('EQ2_VERDANT_ESSENCE',1,'unregistered_or_equipment_identity');
deny('SUNSTONE_INGOT',1,'not_an_eq2_material');
deny('EQ2_BOAR_TUSK',0,'invalid_quantity');
deny('EQ2_BOAR_TUSK',1.5,'invalid_quantity');
deny('EQ2_BOAR_TUSK',Number.MAX_SAFE_INTEGER+1,'invalid_quantity');
deny('EQ2_BOAR_TUSK',NaN,'invalid_quantity');
deny('__proto__',1,'invalid_material_key');
deny('EQ2_BOAR_TUSK ',1,'invalid_material_key');
deny(null,1,'invalid_material_key');
const pending=m.reviewEq2PendingStackBalances({
 EQ2_BOAR_TUSK:3,EQ2_COPPER_BAR:2,IRONWOOD_FANG:5,
 EQ2_LAUNCH_T1_OATHPLATE_HELMET:1,
});
assert.equal(pending.mayCommit,false);
assert.equal(pending.pendingKnownMaterialCount,2);
assert.deepEqual(pending.invalidOrPendingKeys,
 ['EQ2_BOAR_TUSK','EQ2_COPPER_BAR','EQ2_LAUNCH_T1_OATHPLATE_HELMET']);
const poison=Object.create(null);
Object.defineProperty(poison,'__proto__',{value:1,enumerable:true});
assert.deepEqual(m.reviewEq2PendingStackBalances(poison).invalidOrPendingKeys,['__proto__']);
assert.deepEqual(m.reviewEq2PendingStackBalances([]).invalidOrPendingKeys,['<invalid_snapshot>']);
assert.deepEqual(m.reviewEq2PendingStackBalances({IRONWOOD_FANG:-1}).invalidOrPendingKeys,['IRONWOOD_FANG']);
assert.equal(v3.summary.authorizedItems,0);
assert.equal(v3.summary.authorizedRecipes,0);
console.log('PASS: exact V5 29-material draft registry (14 raw, 15 processed), '+blockedRoutes+
 ' blocked review routes, '+blockedLines+' EQ2 material lines; prototype, copy ID, optional rare, numeric and asserted-verification attacks denied; no grants.');
