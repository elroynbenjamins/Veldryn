import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {readAuthoritativeBaseline,auditExpansion} from './audit-equipment-v2-expansion.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=()=>JSON.parse(readFileSync(resolve(root,'docs/equipment-2-0/t1-t4-expansion-design.json'),'utf8'));
const baseline=readAuthoritativeBaseline();
test('unreleased T1-T4 expansion fully covers exactly 96 role-slot cells',()=>{
 const report=auditExpansion(read(),baseline);
 assert.deepEqual(report.errors,[]);
 assert.equal(report.coverageCompleteAfter,true);
 assert.equal(report.totals.additional,57);
 assert.equal(report.totals.combined,175);
 assert.deepEqual(report.totals.byTier,[24,32,32,35]);
});
test('one missing coverage item fails rather than treating any 24 T4 pieces as complete',()=>{
 const doc=read();
 doc.items=doc.items.filter(x=>x.id!=='EQ2_EXP_T4_TANK_RING');
 assert.ok(auditExpansion(doc,baseline).errors.some(s=>s.includes('role_slot_gaps_not_filled_exactly')));
});
test('new T5 items and uncontrolled stronger variants are rejected',()=>{
 const doc=read();doc.items[0].tier=5;
 doc.items.find(x=>x.kind==='alternative_statline').baseBudgetMultiplier=1.20;
 const errors=auditExpansion(doc,baseline).errors;
 assert.ok(errors.some(s=>s.includes('bad_tier')));
 assert.ok(errors.some(s=>s.includes('variant_cost_or_tier_wrong')));
});
test('variant must be an actual different permitted stat profile',()=>{
 const doc=read();
 const v=doc.items.find(x=>x.kind==='alternative_statline'&&x.tier===2&&x.role==='tank'&&x.slot==='chest');
 v.profile='defense_health';
 const errors=auditExpansion(doc,baseline).errors;
 assert.ok(errors.some(s=>s.includes('same_stats_as_existing_item')));
});
test('exclusive reward cannot enter NPC shop, currency exchange or player market',()=>{
 const doc=read();
 doc.rewards.universalPolicy.deny=doc.rewards.universalPolicy.deny.filter(x=>x!=='world_boss_shop'&&x!=='player_market_purchase');
 const errors=auditExpansion(doc,baseline).errors;
 assert.ok(errors.some(s=>s.includes('restricted_purchase_source_missing:world_boss_shop')));
 assert.ok(errors.some(s=>s.includes('restricted_purchase_source_missing:player_market_purchase')));
});
test('World Boss gathering items cannot be changed into stronger combat armor',()=>{
 const doc=read();doc.rewards.worldBoss.equipmentType='combat_boost';
 const errors=auditExpansion(doc,baseline).errors;
 assert.ok(errors.includes('world_gathering_gear_changed_to_combat'));
});
test('rare-blueprint item requires drop-only unlock, trait review and spend',()=>{
 const doc=read();const rare=doc.items.find(x=>x.kind==='rare_blueprint');
 rare.blueprintDropSources.push('npc_shop');
 rare.trait.implementationStatus='implemented';
 rare.craftMaterialCostMultiplier=0.7;
 const errors=auditExpansion(doc,baseline).errors;
 assert.ok(errors.some(s=>s.includes('blueprint_not_earned')));
 assert.ok(errors.some(s=>s.includes('rare_trait_not_draft_gated')));
 assert.ok(errors.some(s=>s.includes('rare_material_cost_out_of_band')));
});
test('hidden EQ2 release gates cannot be flipped by an art/content expansion',()=>{
 const doc=read();doc.releaseGates.client=true;
 assert.ok(auditExpansion(doc,baseline).errors.includes('hidden_release_fence_changed'));
});
