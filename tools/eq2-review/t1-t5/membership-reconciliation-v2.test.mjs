import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const read=p=>JSON.parse(readFileSync(p,'utf8'));
const previous=read('docs/2-0/eq2-t1-t5-unified-hidden-review-catalogue-v1.json');
const data=read('docs/2-0/eq2-t1-t5-canonical-membership-reconciliation-v2.json');
const replacement=read('docs/2-0/eq2-t4-replacement-recipe-review-v2.json');
const byId=new Map(data.entries.map(x=>[x.itemId,x]));
const bySet=new Map(data.sets.map(x=>[x.setId,x]));
const retired=new Set(data.retired.items.map(x=>x.itemId));
const retiredRoutes=new Set(data.retired.items.flatMap(x=>x.retiredRecipeIds));
const deny=['mayMint','mayCraft','mayDrop','mayEquip','mayTrade','combatEnabled','mayRenderInLiveUI','canAppearInLiveCatalogue'];

function inspectSyntheticWornSet(setId,items) {
  // TEST-ONLY slot membership counter, never production authority.
  const invalid=reason=>({valid:false,reason,thresholds:[],authority:false,mayApplyEffects:false});
  const set=bySet.get(setId);
  if(!set || !Array.isArray(items))return invalid('unknown_set');
  const seenId=new Set(),seenSlot=new Set();
  for(const id of items){
    const item=byId.get(id);
    if(!item||item.setId!==setId||item.tier!==set.tier||!set.memberIds.includes(id))return invalid('not_exact_member');
    if(seenId.has(id)||seenSlot.has(item.slot))return invalid('duplicate_copy_or_slot');
    seenId.add(id);seenSlot.add(item.slot);
  }
  return {valid:true,thresholds:set.reconciliation.thresholds.filter(n=>n<=items.length),authority:false,mayApplyEffects:false};
}
test('corrected roster preserves 554 current review rows, with two retired sets separated',()=>{
  assert.equal(data.releaseActivation,false);
  assert.equal(data.hideAllUntilCoordinatedV2,true);
  assert.equal(data.ownerRosterApproval,false);
  assert.equal(data.entries.length,554);
  assert.equal(byId.size,554);
  assert.equal(data.sets.length,95);
  assert.equal(bySet.size,95);
  assert.equal(retired.size,10);
  assert.equal(retiredRoutes.size,20);
  assert.equal(data.retired.sets.length,2);
  for(const row of data.retired.items){
    assert(!byId.has(row.itemId));
    assert(!bySet.has(row.setId));
    assert.equal(row.status,'RETIRED_DRAFT_DO_NOT_REGISTER');
    for(const k of ['mayMint','mayCraft','mayEquip','mayTrade','mayRenderInLiveUI'])assert.equal(row[k],false);
  }
  for(const row of previous.entries.filter(x=>!retired.has(x.itemId))){
    const next=byId.get(row.itemId);
    assert(next,row.itemId);
    for(const key of ['itemId','setId','tier','slot','sourceGroup'])assert.equal(next[key],row[key],row.itemId+': '+key);
  }
  assert.equal(data.summary.originalCompactMembers,42);
  assert.equal(data.summary.expandedMembers,204);
  assert.deepEqual(data.summary.byTier,{'1':88,'2':121,'3':96,'4':124,'5':125});
});
test('all 95 source sets have attainable exact member thresholds, no duplicate slots or active effects',()=>{
  let thresholds=0;
  for(const set of data.sets){
    const rows=set.memberIds.map(x=>byId.get(x));
    assert(rows.every(x=>x&&x.setId===set.setId&&x.tier===set.tier));
    assert.equal(new Set(rows.map(x=>x.slot)).size,rows.length);
    assert.equal(set.reconciliation.mayCountInCombat,false);
    assert.equal(set.reconciliation.mechanicsApproved,false);
    assert.equal(set.reconciliation.coefficientsApproved,false);
    assert.equal(set.setEffectsRuntime,false);
    const expected=set.reconciliation.thresholds;
    thresholds+=expected.length;
    for(let n=0;n<=rows.length;n++){
      const r=inspectSyntheticWornSet(set.setId,set.memberIds.slice(0,n));
      assert.deepEqual(r.thresholds,expected.filter(x=>x<=n));
      assert.equal(r.valid,true);assert.equal(r.mayApplyEffects,false);assert.equal(r.authority,false);
    }
    assert.equal(inspectSyntheticWornSet(set.setId,[set.memberIds[0],set.memberIds[0]]).valid,false);
    assert.equal(inspectSyntheticWornSet(set.setId,['EQ2_FAKE']).valid,false);
    const other=data.entries.find(x=>x.setId&&x.setId!==set.setId&&x.slot===rows[0].slot);
    assert(other);
    assert.equal(inspectSyntheticWornSet(set.setId,[other.itemId]).valid,false);
  }
  assert.equal(thresholds,195);
  assert.equal(inspectSyntheticWornSet('eq2_t4_citadel',[]).valid,false);
  assert.equal(inspectSyntheticWornSet('eq2_t4_bloodsteel',[]).valid,false);
});
test('746 distinct current T1-T4 recipe review routes, 20 retired historical routes never reusable',()=>{
  const recipes=data.entries.flatMap(x=>x.reconciliation.recipeIds??[]);
  assert.equal(recipes.length,746);
  assert.equal(new Set(recipes).size,746);
  assert(recipes.every(x=>!retiredRoutes.has(x)));
  assert.equal(data.entries.filter(x=>x.reconciliation.recipeIds?.length===2).length,373);
  assert.equal(replacement.routes.length,20);
  assert.equal(replacement.templates.length,10);
  for(const tpl of replacement.templates){
    const row=byId.get(tpl.itemId);
    assert(row);
    assert.equal(row.reconciliation.sourceStatus,'REPLACEMENT_TWO_NEW_REVIEW_ROUTES');
    assert.deepEqual(row.reconciliation.recipeIds,tpl.recipeIds);
    assert(retired.has(tpl.oldIdHistoricalReference));
    assert.equal(tpl.sourceCandidate,null);
    assert.deepEqual(tpl.fixedInnatePercentageStats,[]);
    assert.equal(tpl.registered,false);
    assert.equal(tpl.mayMint,false);
    assert.equal(tpl.craftable,false);
    const routes=replacement.routes.filter(x=>x.pieceId===tpl.itemId);
    assert.deepEqual(routes.map(x=>x.route).sort(),['alternate','foundation']);
    for(const route of routes){
      assert(retiredRoutes.has(route.referenceCostRecipeId));
      assert.equal(route.referenceIsHistoricalOnly,true);
      assert.equal(route.craftCombatLevelRequired,0);
      assert.equal(route.profession,'smithing');
      assert.equal(route.recipeFailureChance,0);
      assert.equal(route.mayMint,false);
      assert.equal(route.craftable,false);
      assert(route.inputs.some(x=>x.itemId==='EQ2_GLASSHEART_FRAGMENT'));
      assert(route.inputs.some(x=>x.itemId==='GLASSBOUND_BINDER'));
      assert(route.inputs.every(x=>Number.isSafeInteger(x.quantity)&&x.quantity>0));
    }
    for(const id of ['EQ2_GLASSHEART_FRAGMENT','GLASSBOUND_BINDER','EQ2_GLASSBOUND_PLATE'])
      assert.equal(routes[0].inputs.find(x=>x.itemId===id)?.quantity,routes[1].inputs.find(x=>x.itemId===id)?.quantity);
  }
});
test('all compatibility links are separate, unapproved, never original set membership',()=>{
  const candidates=data.entries.filter(x=>x.reconciliation.sourceCandidate);
  assert.equal(candidates.length,69);
  assert.equal(new Set(candidates.map(x=>x.reconciliation.sourceCandidate.canonicalForgeId)).size,69);
  for(const row of candidates){
    const c=row.reconciliation.sourceCandidate;
    const original=byId.get(c.canonicalForgeId);
    assert(original);
    assert.equal(original.sourceGroup,'pinned_forge_169');
    assert(!original.setId);
    assert.equal(original.tier,row.tier);
    assert.equal(original.slot,row.slot);
    assert.notEqual(original.itemId,row.itemId);
    assert.equal(c.approved,false);assert.equal(c.mayOverwrite,false);
    assert.equal(row.reconciliation.requiresDistinctNewItemIdentity,true);
  }
});
test('boss pool exact origin and T5 source splits remain candidates only',()=>{
  const bosses=data.entries.filter(x=>x.reconciliation.bossProof);
  assert.equal(bosses.length,79);
  for(const x of bosses){
    assert.equal(x.reconciliation.bossProof.dungeonId,x.dungeonId);
    assert.equal(x.reconciliation.bossProof.bossName,x.bossName);
    assert.equal(x.reconciliation.shopOrCraftAllowed,false);
    assert.deepEqual(x.reconciliation.recipeIds,[]);
    assert.equal(x.mayTrade,false);
  }
  for(const [id,n] of [['EXP_001',25],['EXP_003',25],['EXP_005',29]])
    assert.equal(bosses.filter(x=>x.dungeonId===id).length,n);
  assert.equal(data.entries.filter(x=>x.reconciliation.sourceStatus==='T5_TWO_DRAFT_RECIPE_METHODS').length,86);
  assert.equal(data.entries.filter(x=>x.reconciliation.sourceStatus==='T5_SINGLE_DRAFT_RECIPE_NEEDS_ALTERNATE').length,10);
  assert.equal(data.entries.filter(x=>x.reconciliation.sourceStatus==='BLUEPRINT_UNLOCK_AND_CANONICAL_RECIPE_MISSING').length,6);
});
test('every current and retired row remains closed for release',()=>{
  for(const row of data.entries){
    for(const k of deny)assert.equal(row[k],false,row.itemId+' '+k);
    assert.equal(row.reconciliation.authority,false);
    assert.equal(row.reconciliation.registered,false);
  }
  for(const source of data.sources)assert.match(source.blobSha,/^[a-f0-9]{40}$/);
  assert.equal(data.policy.retiredT4MayNeverMint,true);
  assert.equal(data.policy.noAutomaticAliasOrReroll,true);
  assert.equal(data.policy.professionOnlyCrafting,true);
  assert.equal(data.policy.recipeCostsAndEffectsUnapproved,true);
});
