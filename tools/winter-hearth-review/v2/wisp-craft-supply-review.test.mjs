import test from 'node:test';
import assert from 'node:assert/strict';
import {winterHearthSupplyExpectation,winterHearthCraftQuote,WINTER_HEARTH_REVIEW_ONLY_RELEASED} from './wisp-craft-supply-review.mjs';
const stock={COPPER_ORE:4000,MOSS_FIBER:4000,DEWLEAF:2000,WISP_DUST:500};
const base={skillLevel:4,availableResources:stock,goldAvailable:15000,batches:1,nowMs:Date.parse('2026-12-16T12:00:00Z'),eventReleased:true};
test('full mixed guild target consumes only surplus existing resources',()=>{
 assert.deepEqual(winterHearthSupplyExpectation({smithingBatches:250,tailoringBatches:250}),{lights:2500,COPPER_ORE:2000,MOSS_FIBER:2000,DEWLEAF:2000,WISP_DUST:500,baseGold:15000,baseSeconds:20000,baseSmithingXp:8750,baseTailoringXp:8750,previewOnly:true,mayGrant:false});
 assert.equal(WINTER_HEARTH_REVIEW_ONLY_RELEASED,false);
});
test('both routes have identical output and base cost, distinct profession inputs',()=>{
 for(const [skillId,primary] of [['smithing','COPPER_ORE'],['tailoring','MOSS_FIBER']]){
 const q=changes=>winterHearthCraftQuote({...base,skillId,...changes});
 assert.equal(q().outputCount,5);
 assert.equal(q().baseXp,35);
 assert.equal(q().baseSeconds,40);
 assert.equal(q().baseGold,30);
 assert.equal(q().mayCraft,false);
 assert.equal(q({batches:500}).outputCount,2500);
 assert.equal(q({skillLevel:3}).reason,'insufficient-skill-level');
 assert.equal(q({availableResources:{...stock,[primary]:7}}).reason,'insufficient-'+primary);
 assert.equal(q({availableResources:{...stock,WISP_DUST:0}}).reason,'insufficient-WISP_DUST');
 assert.equal(q({eventReleased:false}).reason,'event-closed');
 assert.equal(q({nowMs:Date.parse('2026-12-27T00:00:00Z')}).reason,'event-closed');
 assert.equal(q({batches:0}).reason,'invalid-batch-count');
 }
 assert.equal(winterHearthCraftQuote({...base,skillId:'cooking'}).reason,'invalid-profession');
});
