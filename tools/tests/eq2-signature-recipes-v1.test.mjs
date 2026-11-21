import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileSignatureDraftRecipes} from '../lib/eq2-signature-recipes-v1.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const json=file=>JSON.parse(read(file));
const design=json('docs/equipment-2-0/t2-t4-signature-equipment-fishing-dungeon-v1.json');
const anchors=json('docs/equipment-2-0/t2-t4-signature-recipe-anchors-v1.json');
const economy=json('docs/equipment-2-0/t1-t4-economy-review-v1.json');
const ordinary=json('docs/equipment-2-0/t1-t4-economy-generated-recipes-v1.json');
const saved=json('docs/equipment-2-0/t2-t4-signature-generated-recipes-v1.json');
const clone=x=>JSON.parse(JSON.stringify(x));
function parsePieces(file,name){
 const src=read(file),p=src.indexOf(name),a=src.indexOf('=[',p),b=src.indexOf('];',a);
 assert.ok(p>=0&&a>=0&&b>=0);
 return JSON.parse(src.slice(a+1,b+1));
}
const paths=['equipment-crafting-v2-manifest.ts','equipment-crafting-v2-expansion-manifest.ts','equipment-crafting-v2-armament-manifest.ts'];
const refs=['V2_SERVER_CORE_PIECES','V2_SERVER_EXPANSION_PIECES','V2_SERVER_ARMAMENT_PIECES'];
const pieces=paths.flatMap((p,i)=>parsePieces('backend/src/server/equipment/'+p,refs[i]));
const compile=(overrides={})=>compileSignatureDraftRecipes({
 design,economy,ordinary,pieces,anchors,...overrides
});
const mapped=compile();
const recipeFor=id=>mapped.signatureRecipes.find(r=>r.pieceId===id);

test('the frozen six-item recipe file has exact regenerated non-runtime content',()=>{
 assert.deepEqual(mapped,saved);
 assert.equal(mapped.status,'REVIEW_ONLY_DO_NOT_IMPORT_TO_RUNTIME');
 assert.equal(mapped.noActualSourceGrant,true);
 assert.equal(mapped.noRealItemMint,true);
 assert.equal(mapped.approvedForGameplay,false);
 assert.equal(mapped.ordinaryItemsUnaffected,169);
 assert.equal(mapped.ordinaryRecipesUnaffected,338);
 assert.equal(mapped.signatureRecipes.length,6);
});
test('one distinct source-locked signature catalyst per tier and Fishing/Dungeon output',()=>{
 const names=new Set();
 for(const r of mapped.signatureRecipes){
  assert.ok(!names.has(r.pieceId));
  names.add(r.pieceId);
  const source=design.items.find(i=>i.id===r.pieceId);
  assert.equal(r.inputs.filter(i=>i.itemId===source.materialId).length,1);
  assert.equal(r.inputs.find(i=>i.itemId===source.materialId).quantity,1);
  assert.equal(r.materialOrigin,source.origin);
  assert.equal(r.previewOnly,true);
  assert.equal(r.usableInRealForge,false);
  assert.equal(r.ownership,source.origin==='dungeon_completion_material'
    ?'account_bound':'tradeable_only_after_market_approval');
 }
});
test('T2–T4 crafted foundation ingredients retain the same common, scarce and binder requirements',()=>{
 for(const r of mapped.signatureRecipes){
  const tier=economy.tierSpecs.find(t=>t.tier===r.tier);
  const base=ordinary.recipes.find(i=>i.id===r.baseRecipeId);
  for(const id of [tier.items.common,tier.items.rare,tier.items.binder]){
   const expected=base.inputs.find(i=>i.itemId===id)?.quantity||0;
   const actual=r.inputs.find(i=>i.itemId===id)?.quantity||0;
   assert.equal(actual,expected,'source bypass '+r.pieceId+' '+id);
  }
  assert.ok(r.inputs.some(i=>i.itemId===tier.items.common));
  assert.ok(r.inputs.some(i=>i.itemId===tier.items.binder));
 }
});
test('source-owned refined inputs increase 25%, Gold rounds up 1.5x and queue time 1.25x without XP shortcuts',()=>{
 for(const r of mapped.signatureRecipes){
  const tier=economy.tierSpecs.find(t=>t.tier===r.tier);
  const refined=new Set([tier.items.metal,tier.items.timber,tier.items.leather,tier.items.cloth,tier.items.gem]);
  const base=ordinary.recipes.find(i=>i.id===r.baseRecipeId);
  for(const input of base.inputs){
   assert.equal(r.inputs.find(i=>i.itemId===input.itemId).quantity,
    refined.has(input.itemId)?Math.ceil(input.quantity*1.25):input.quantity);
  }
  assert.equal(r.gold,Math.ceil(base.gold*1.5/100)*100);
  assert.equal(r.xp,base.xp);
  assert.equal(r.seconds,Math.ceil(base.seconds*1.25));
  assert.equal(r.profession,base.profession);
  assert.equal(r.characterLevel,base.characterLevel);
  assert.equal(r.professionLevel,base.professionLevel);
 }
});
test('T4 signature gear retains 1 Glassheart fragment and 1 binder each in addition to new source catalyst',()=>{
 for(const id of ['EQ2_SIG_T4_GLASSFIN_MANTLE','EQ2_SIG_T4_RIFTFANG_PENDANT']){
  const r=recipeFor(id);
  assert.equal(r.inputs.find(x=>x.itemId==='EQ2_GLASSHEART_FRAGMENT').quantity,1);
  assert.equal(r.inputs.find(x=>x.itemId==='GLASSBOUND_BINDER').quantity,1);
  assert.equal(r.inputs.find(x=>x.itemId==='EQ2_GLASSBOUND_PLATE')!==undefined,true);
 }
 assert.equal(recipeFor('EQ2_SIG_T4_GLASSFIN_MANTLE').gold,12800);
 assert.equal(recipeFor('EQ2_SIG_T4_RIFTFANG_PENDANT').gold,9800);
});
test('signature recipes do not overwrite or relabel any of the original 169 pieces or 338 crafting methods',()=>{
 const existing=new Set(pieces.map(p=>p.id));
 const existingRecipe=new Set(ordinary.recipes.map(r=>r.id));
 assert.ok(mapped.signatureRecipes.every(r=>!existing.has(r.pieceId)));
 assert.ok(mapped.signatureRecipes.every(r=>!existingRecipe.has(r.id)));
 assert.ok(mapped.signatureRecipes.every(r=>r.route==='signature'));
 assert.ok(mapped.signatureRecipes.every(r=>r.id.endsWith('_SIGNATURE')));
 assert.ok(mapped.signatureRecipes.every(r=>r.baseRecipeId.endsWith('_FOUNDATION')));
});
test('changing a canonical source role/slot or switching to its alternate route fails closed',()=>{
 const a=clone(anchors);a.anchors[0].pieceId=a.anchors[1].pieceId;
 assert.throws(()=>compile({anchors:a}),/invalid_source_anchor/);
 const b=clone(anchors);b.anchors[0].recipeId='EQ2_IRONWOOD_STALKER_GLOVES_ALTERNATE';
 assert.throws(()=>compile({anchors:b}),/invalid_source_anchor/);
});
test('malformed source ingredient or missing mandatory combat material fails closed',()=>{
 const a=clone(ordinary);a.recipes.find(r=>r.id===anchors.anchors[0].recipeId).inputs
  .find(i=>i.itemId==='WOLF_FANG').itemId='UNKNOWN_INGREDIENT';
 assert.throws(()=>compile({ordinary:a}),/base_recipe_missing_required_material/);
 const b=clone(ordinary);b.recipes.find(r=>r.id===anchors.anchors[0].recipeId).inputs
  .push({itemId:'CHEAT_FREE_MATERIAL',quantity:99});
 assert.throws(()=>compile({ordinary:b}),/unknown_base_ingredient/);
});
test('disabled runtime and catalog count gates cannot be bypassed by editing the proposal',()=>{
 const a=clone(design);a.release.craftRoutesEnabled=true;
 assert.throws(()=>compile({design:a}),/not_in_review_mode/);
 const b=clone(anchors);b.policy.refinedInputsFactor=1;
 assert.throws(()=>compile({anchors:b}),/unsupported_cost_policy/);
 const c=clone(ordinary);c.recipes.pop();
 assert.throws(()=>compile({ordinary:c}),/catalog_counts/);
 const d=clone(anchors);d.anchors[0].signatureItemId=d.anchors[1].signatureItemId;
 assert.throws(()=>compile({anchors:d}),/anchor_mismatch/);
});
