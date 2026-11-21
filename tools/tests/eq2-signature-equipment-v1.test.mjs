import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {gatherNodes} from '../lib/eq2-source-introspection-v1.mjs';
import {geometricSuccessQuantiles,validateSignatureReview} from '../lib/eq2-signature-contract-v1.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const parse=file=>JSON.parse(read(file));
const config=parse('docs/equipment-2-0/t2-t4-signature-equipment-fishing-dungeon-v1.json');
const economy=parse('docs/equipment-2-0/t1-t4-economy-review-v1.json');
const clone=()=>JSON.parse(JSON.stringify(config));
function literalArray(file,name){
 const source=read(file),start=source.indexOf(name),a=source.indexOf('=[',start),b=source.indexOf('];',a);
 assert.ok(start>=0&&a>=0&&b>a,'missing hidden manifest '+name);
 return JSON.parse(source.slice(a+1,b+1));
}
const ordinary=[
 ['backend/src/server/equipment/equipment-crafting-v2-manifest.ts','V2_SERVER_CORE_PIECES'],
 ['backend/src/server/equipment/equipment-crafting-v2-expansion-manifest.ts','V2_SERVER_EXPANSION_PIECES'],
 ['backend/src/server/equipment/equipment-crafting-v2-armament-manifest.ts','V2_SERVER_ARMAMENT_PIECES']
].flatMap(([file,name])=>literalArray(file,name));
const bpSrc=read('backend/src/server/equipment/equipment-crafting-v2-blueprint-policy.mjs');
const marker='V2_RARE_BLUEPRINT_DRAFTS=Object.freeze(',bpStart=bpSrc.indexOf(marker),
  bpEnd=bpSrc.indexOf('].map(',bpStart);
assert.ok(bpStart>=0&&bpEnd>bpStart);
const existingBlueprints=JSON.parse(bpSrc.slice(bpStart+marker.length,bpEnd+1));
const fish=gatherNodes(read('apps/mobile/src/content/skills.ts'),'gathering').filter(x=>x.skillId==='fishing');
const check=proposal=>validateSignatureReview(proposal,{
 tierSpecs:economy.tierSpecs,fishingNodes:fish,
 ordinaryItemIds:ordinary.map(x=>x.id),rareBlueprintItemIds:existingBlueprints.map(x=>x.itemId)
});
test('source-derived hidden catalog stays 169 ordinary, 338 methods and six locked blueprint identities',()=>{
 assert.equal(ordinary.length,169);
 assert.equal(existingBlueprints.length,6);
 assert.equal(parse('docs/equipment-2-0/t1-t4-economy-generated-recipes-v1.json').recipes.length,338);
 assert.equal(check(config).validatedItems,6);
 assert.equal(check(config).fishingVariants,3);
 assert.equal(check(config).dungeonVariants,3);
});
test('signature item IDs and trait IDs are unique and do not overwrite original EQ2 or blueprints',()=>{
 const summary=check(config);
 assert.equal(new Set(summary.combatTraits).size,6);
 const existing=new Set([...ordinary,...existingBlueprints].map(x=>x.itemId||x.id));
 assert.ok(config.items.every(x=>!existing.has(x.id)));
 assert.ok(config.items.every(x=>x.materialQty===1));
});
test('rare fishing stays a secondary catch at real fishing nodes with meaningful rates',()=>{
 assert.deepEqual(config.materials.filter(x=>x.origin==='fishing_secondary_catch').map(x=>x.fishingNodeId),
 ['ROOTSTREAM_TROUT_POOL','OASIS_CARP_POOL','GLASSFIN_POOL']);
 assert.deepEqual(config.materials.filter(x=>x.origin==='fishing_secondary_catch').map(x=>x.baseFinalChance),
 [0.01,0.008,0.006]);
 assert.ok(config.materials.filter(x=>x.fishingNodeId).every(m=>m.doNotReplaceFishCatch===true));
 assert.equal(geometricSuccessQuantiles(.006).p90,383);
 assert.equal(geometricSuccessQuantiles(1).p50,1);
});
test('proposed completion resource is account-bound, never a chest-only item or shop exchange',()=>{
 for(const material of config.materials.filter(x=>x.origin==='dungeon_completion_material')){
   assert.equal(material.binding,'account');
   assert.equal(material.tradeMode,'non_tradeable');
   assert.ok(material.acceptedSource.includes('one completed authenticated regional dungeon reward claim'));
 }
 assert.ok(config.policy.trade.dungeonMaterial.includes('no Expedition Marks exchange'));
 assert.ok(config.policy.trade.earnedExclusiveGear.includes('never craftable'));
 assert.ok(config.policy.failedDungeon.includes('no rare completion material'));
 assert.equal(config.policy.frequency.includes('one server-authoritative roll'),true);
});
test('dungeon difficulty is independent from Equipment 2.0 tier and no reward certainty is claimed',()=>{
 const d=config.materials.filter(x=>x.origin==='dungeon_completion_material');
 assert.deepEqual(d.map(x=>[x.region,x.dungeonDifficulty,x.tier]),
 [['ASTERFALL',2,2],['SUNSCAR',1,3],['SUNSCAR',3,4]]);
 assert.deepEqual(d.map(x=>geometricSuccessQuantiles(x.baseFinalChance).p90),[9,12,15]);
 assert.ok(d.every(x=>x.baseFinalChance<1));
 assert.ok(config.policy.concurrency.includes('12-run/weekly marks'));
});
test('server-owned Combat 2.0 signature caps allow direct-hit bleed and one defensive passive',()=>{
 const out=config.items.find(x=>x.traitId==='riftfang_bleed');
 const guard=config.items.find(x=>x.traitId==='glassfin_guard');
 assert.equal(out.trait.chance,.10);
 assert.equal(out.trait.physicalBleedShareOfHit,.24);
 assert.equal(out.trait.cooldownSeconds,10);
 assert.equal(guard.trait.damageReductionFraction,.03);
 assert.equal(config.combatContract.mitigation.unconditionalSignatureCapFraction,.03);
 assert.equal(config.combatContract.maxSignatureTraitsEquipped,2);
 assert.equal(config.combatContract.procsNotProccingProcs,true);
 assert.ok(config.combatContract.bleed.bossRule.includes('50%'));
});
test('any release flag must fail closed before a candidate enters a build',()=>{
 const v=clone();v.release.combatProcsEnabled=true;
 assert.throws(()=>check(v),/release_flag_enabled/);
});
test('cannot recast signature variants as ordinary items or bypass blueprints',()=>{
 const v=clone();v.items[0].id=existingBlueprints[0].itemId;
 assert.throws(()=>check(v),/existing_item_id_collision/);
 const w=clone();w.policy.rareBlueprints='any fish can unlock';
 assert.throws(()=>check(w),/blueprint_bypass/);
});
test('fishing material cannot claim to come from unregistered fishing activity',()=>{
 const v=clone();v.materials[0].fishingNodeId='MISSING_TEST_NODE';
 assert.throws(()=>check(v),/fishing_node_or_skill/);
});
test('dungeon resource may not be market tradeable, and failed runs cannot grant materials',()=>{
 const v=clone();v.materials[1].tradeMode='proposed_market_tradeable';
 assert.throws(()=>check(v),/dungeon_bound_material/);
 const w=clone();w.policy.failedDungeon='failed run awards component';
 assert.throws(()=>check(w),/failed_dungeon_reward/);
});
test('combat trait magnitude, cooldowns and source-family exclusivity fail closed',()=>{
 const a=clone();a.items[5].trait.chance=.75;
 assert.throws(()=>check(a),/bleed_chance_cap/);
 const b=clone();b.items[4].trait.damageReductionFraction=.05;
 assert.throws(()=>check(b),/passive_mitigation_cap/);
 const c=clone();c.items[5].trait.cooldownSeconds=0;
 assert.throws(()=>check(c),/bleed_duration_or_cooldown/);
 const d=clone();d.combatContract.familyCaps.offensive=3;
 assert.throws(()=>check(d),/family_caps/);
 const e=clone();e.items[0].traitId=e.items[5].traitId;
 assert.throws(()=>check(e),/duplicate_traits/);
});
test('the six separate elite/boss rare blueprints remain origin-locked',()=>{
 assert.ok(existingBlueprints.every(x=>!config.materials.some(m=>m.id===x.blueprintId)));
 assert.equal(config.scope.existingRareBlueprintsUntouched,6);
 assert.equal(config.release.craftRoutesEnabled,false);
});
