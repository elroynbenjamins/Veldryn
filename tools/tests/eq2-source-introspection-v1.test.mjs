import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  authoredChanceForFinal,between,catalogIds,effectiveNormalMaterialChance,
  existingAlchemyOutputs,existingSmelting,gatherNodes,monsterSources
} from '../lib/eq2-source-introspection-v1.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const base='apps/mobile/src/content/';
const source=name=>read(base+name);
const itemFiles=['items.ts','herbalism.ts','alchemy.ts','cross-profession-components.ts','guild-components.ts','novice-sets.ts','gathering-tools.ts','gems-v1.ts'];
const catalogs=Object.fromEntries(itemFiles.map(name=>[name,source(name)]));
const defs=catalogIds(catalogs);
const gathers=[...gatherNodes(source('skills.ts'),'gathering'),...gatherNodes(source('herbalism.ts'),'herbalism')];
const mobs=monsterSources(source('monsters.ts'));
const smith=existingSmelting(source('skills.ts'));
const alchemy=existingAlchemyOutputs(source('alchemy.ts'));
const config=JSON.parse(read('docs/equipment-2-0/t1-t4-economy-review-v1.json'));
const tier=id=>config.tierSpecs.find(x=>x.tier===id);
const hasMonster=id=>mobs.some(x=>x.itemId===id);
const hasGather=id=>gathers.some(x=>x.itemId===id);
const isRegistered=id=>defs.has(id);

test('static source boundaries are strict and untrusted TS is not evaluated',()=>{
  assert.throws(()=>between('bad','OPEN','CLOSE'),/Missing source boundary/);
  assert.throws(()=>between('OPEN with no ending','OPEN','CLOSE'),/Missing end boundary/);
  assert.ok(gathers.length>=40);
  assert.ok(mobs.length>=100);
  assert.ok(smith.length>=5);
  assert.ok(alchemy.length>=8);
});
test('all four chosen 2.0 binding resins already have registered Alchemy recipes',()=>{
  for(const t of config.tierSpecs){
    assert.ok(isRegistered(t.items.binder),t.items.binder+' missing from item catalog');
    assert.ok(alchemy.some(r=>r.outputId===t.items.binder),t.items.binder+' has no Alchemy recipe');
  }
});
test('Sunstone Ingot review chain conflicts with the preexisting recipe and must remain blocked',()=>{
  const existing=smith.find(x=>x.outputId==='SUNSTONE_INGOT');
  const proposed=tier(3).processing.find(x=>x.output==='SUNSTONE_INGOT');
  assert.deepEqual(existing.inputs,[{itemId:'SUNSTONE_ORE',quantity:6},{itemId:'DUNEWOOD',quantity:4}]);
  assert.equal(existing.outputQuantity,3);
  assert.equal(existing.xp,520);
  assert.equal(existing.seconds,180);
  assert.deepEqual(proposed.inputs,{SUNSTONE_ORE:3});
  assert.equal(proposed.quantity,1);
  assert.notEqual(existing.seconds,proposed.seconds);
});
test('Sunscale is a real herb, not automatically a monster scale loot identity',()=>{
  assert.equal(isRegistered('SUNSCALE'),true);
  assert.equal(hasGather('SUNSCALE'),true);
  assert.ok(gathers.some(x=>x.itemId==='SUNSCALE'&&x.skillId==='herbalism'));
  assert.equal(hasMonster('EQ2_SUNSCAR_SCALE'),false);
  assert.equal(isRegistered('EQ2_SUNSCAR_SCALE'),false);
});
test('candidate wolf fang and Glassheart IDs cannot alias existing combat items',()=>{
  assert.equal(isRegistered('IRONWOOD_FANG'),true);
  assert.equal(hasMonster('IRONWOOD_FANG'),true);
  assert.equal(isRegistered('WOLF_FANG'),false);
  assert.equal(hasMonster('WOLF_FANG'),false);
  assert.equal(isRegistered('GLASSBOUND_CORE'),true);
  assert.equal(hasMonster('GLASSBOUND_CORE'),true);
  assert.equal(isRegistered('EQ2_GLASSHEART_FRAGMENT'),false);
  assert.equal(hasMonster('EQ2_GLASSHEART_FRAGMENT'),false);
});
test('all proposed common and scarce sources still require explicit source selection',()=>{
  for(const t of config.tierSpecs){
    for(const id of [t.items.common,t.items.rare]){
      assert.equal(hasMonster(id),false,'existing source discovered: revise eligibility policy for '+id);
    }
  }
  assert.equal(hasMonster('EQ2_BOAR_TUSK'),false);
});
test('the existing normal-material scaling halves and cuts sub-100% authored drops',()=>{
  assert.ok(Math.abs(effectiveNormalMaterialChance(0.14)-0.0665)<1e-12);
  assert.ok(Math.abs(effectiveNormalMaterialChance(0.0025)-0.0011875)<1e-12);
  assert.equal(effectiveNormalMaterialChance(1),0.5);
  assert.ok(Math.abs(authoredChanceForFinal(0.0025)-0.005263157894736843)<1e-12);
  assert.ok(Math.abs(effectiveNormalMaterialChance(authoredChanceForFinal(0.14))-0.14)<1e-12);
  assert.throws(()=>authoredChanceForFinal(0.55),/Cannot express/);
  assert.throws(()=>effectiveNormalMaterialChance(-0.1),/Invalid/);
});
test('review-only data never declares an active production release',()=>{
  const proposal=JSON.parse(read('docs/equipment-2-0/t1-t4-economy-generated-recipes-v1.json'));
  assert.equal(config.status,'REVIEW_ONLY_NO_RUNTIME');
  assert.equal(proposal.status,'REVIEW_ONLY_DO_NOT_IMPORT_TO_RUNTIME');
  assert.equal(proposal.recipes.length,338);
  assert.ok(proposal.recipes.every(x=>x.reviewOnly===true));
});
