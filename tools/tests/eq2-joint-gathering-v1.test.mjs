import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {simulateJointOreDust,verifyGatheringScenario} from '../lib/eq2-joint-gathering-v1.mjs';
import {monsterSources} from '../lib/eq2-source-introspection-v1.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const cfg=JSON.parse(read('docs/equipment-2-0/t1-t4-economy-review-v1.json'));
const draft=JSON.parse(read('docs/equipment-2-0/t1-t4-economy-generated-recipes-v1.json'));
const policy=JSON.parse(read('docs/equipment-2-0/t1-t4-drop-and-dust-policy-review-v1.json'));
const selected=policy.dust.scenarios.find(x=>x.id===policy.dust.selectedForFurtherReview);

test('joint gathering model is deterministic and gives ordered P50/P90/P95',()=>{
  const args={scenario:selected,requiredOre:1264,requiredDust:506,trials:512,seed:123};
  const a=simulateJointOreDust(args);
  assert.deepEqual(a,simulateJointOreDust(args));
  assert.ok(a.actions.p50<=a.actions.p90&&a.actions.p90<=a.actions.p95);
  assert.ok(a.actions.p50>=632);
  assert.equal(a.scenarioId,'balanced-coupled');
  assert.ok(a.expectedSecondaryDustPerHour>0);
});
test('100% dust chance gives exact action counts for a fixed yield',()=>{
  const scenario={id:'certainty',orePerAction:2,bonusDustChance:1,bonusDustMin:2,bonusDustMax:2,cycleSeconds:120};
  const r=simulateJointOreDust({scenario,requiredOre:10,requiredDust:6,trials:512,seed:1});
  assert.deepEqual(r.actions,{p50:5,p90:5,p95:5});
  assert.deepEqual(r.baseHours,{p50:0.17,p90:0.17,p95:0.17});
  assert.deepEqual(r.surplusAtStop.dust,{p50:4,p90:4,p95:4});
});
test('0 ore but Dust demand still forces actual mining activity',()=>{
  const r=simulateJointOreDust({scenario:selected,requiredOre:0,requiredDust:12,trials:512,seed:88});
  assert.ok(r.actions.p50>0);
  assert.ok(r.surplusAtStop.ore.p50>0);
});
test('malformed or impossible scenarios fail closed',()=>{
  assert.throws(()=>simulateJointOreDust({scenario:{...selected,bonusDustChance:0},requiredOre:0,requiredDust:1}),/cannot be acquired/);
  assert.throws(()=>verifyGatheringScenario({...selected,bonusDustChance:2}),/proc chance/);
  assert.throws(()=>verifyGatheringScenario({...selected,orePerAction:-1}),/orePerAction/);
  assert.throws(()=>verifyGatheringScenario({...selected,bonusDustMin:4,bonusDustMax:1}),/quantity range/);
  assert.throws(()=>simulateJointOreDust({scenario:selected,requiredOre:300,requiredDust:0,trials:100}),/Trials/);
  assert.throws(()=>simulateJointOreDust({scenario:selected,requiredOre:1000,requiredDust:0,trials:512,maxActions:1}),/action ceiling/);
});
test('proposed final 2.0 normal + elite rates match approved-for-review economy numbers only',()=>{
  assert.equal(policy.status,'REVIEW_ONLY_DO_NOT_IMPORT_TO_RUNTIME');
  assert.equal(policy.normalDrops.length,4);
  assert.equal(draft.status,'REVIEW_ONLY_DO_NOT_IMPORT_TO_RUNTIME');
  assert.equal(draft.recipes.length,338);
  for(const tier of policy.normalDrops){
    const t=cfg.tierSpecs.find(x=>x.tier===tier.tier);
    assert.ok(t);
    assert.equal(tier.common.id,t.items.common);
    assert.equal(tier.rare.id,t.items.rare);
    assert.equal(tier.common.finalChance,t.drops.commonKill);
    assert.equal(tier.rare.finalChance,t.drops.scarceKill);
    assert.equal(tier.eligibleEliteRareChance,t.drops.scarceElite);
    assert.ok(tier.common.sources.some(s=>s.proposed2Unlock<=t.levels.character));
    assert.ok(tier.rare.sources.some(s=>s.proposed2Unlock<=t.levels.character));
  }
  assert.equal(policy.elitePolicy.noClientProvidedRng,true);
});
test('source candidates preserve authored monster IDs and require only the explicit early boar override',()=>{
  const sources=monsterSources(read('apps/mobile/src/content/monsters.ts'));
  const monsterIds=new Set(sources.map(x=>x.monsterId));
  let overrides=0;
  for(const tier of policy.normalDrops){
    for(const material of [tier.common,tier.rare]){
      for(const source of material.sources){
        assert.ok(monsterIds.has(source.monsterId),'unknown candidate '+source.monsterId);
        assert.ok(source.proposed2Unlock>0);
        if(source.requiresEnemy2Change){
          overrides++;
          assert.equal(source.monsterId,'ROADSIDE_BOAR');
          assert.equal(source.sourceUnlockNow,3);
          assert.equal(source.proposed2Unlock,2);
        }else{
          assert.equal(source.sourceUnlockNow,source.proposed2Unlock);
        }
        // No proposed item is yet a live monster reward.
        assert.equal(sources.some(row=>row.monsterId===source.monsterId&&row.itemId===material.id),false);
      }
    }
  }
  assert.equal(overrides,1);
});
test('Dust comes from a specifically level-accessible late-Sunscar proposal, not a made-up existing live node',()=>{
  const dust=policy.dust;
  const areas=read('apps/mobile/src/content/regional-areas.ts');
  assert.ok(areas.includes("id:'ZONE_008',regionId:'SUNSCAR'"));
  assert.equal(dust.access.areaId,'ZONE_008');
  assert.equal(dust.access.areaMinimumCharacterLevel,38);
  assert.equal(dust.access.minimumEquipmentTier,4);
  assert.ok(dust.access.minimumMiningSkillLevel<=cfg.tierSpecs[3].levels.profession);
  assert.equal(dust.nodeProposal.bonusItemId,'EQ2_GLASSBOUND_DUST');
  assert.equal(dust.nodeProposal.primaryItemId,'SUNSTONE_ORE');
  assert.equal(read('apps/mobile/src/content/skills.ts').includes(dust.nodeProposal.id),false);
  assert.equal(dust.noCreationOrDropsAuthorized,true);
  assert.deepEqual(dust.scenarios.map(x=>x.id),['slow-base','balanced-coupled','rare-dust']);
});
