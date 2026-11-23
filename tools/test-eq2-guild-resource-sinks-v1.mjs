#!/usr/bin/env node
/**
 * Veldryn 2.0 hidden economy REVIEW checks.
 * This is not a server endpoint, a donation writer, or recipe registration.
 * Usage: node tools/test-eq2-guild-resource-sinks-v1.mjs
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const policy = JSON.parse(read('docs/2-0/resource-sinks-equipment-guild-v1.json'));
const recipes = JSON.parse(read('docs/equipment-2-0/t1-t4-48-set-unified-recipe-review-v3.json'));
const progression = read('backend/src/server/guild/progression.ts');

assert.equal(policy.schema, 'veldryn-eq2-guild-resource-sink-review-v1');
assert.equal(policy.releaseState, 'HIDDEN_REVIEW_ONLY');
const p = policy.safeguards;
for (const key of ['mayCharge','mayMint','mayRegisterNewMaterials','mayActivateGuildProjects',
  'mayAlterLiveRecipes','mayCreateExtraWeeklyProjectSlots']) assert.equal(p[key], false, key);
for (const key of ['requiresServerOwnedInventoryAndBankProof','requiresAtomicDonationDebitAndReceipt',
  'requiresFutureSourceRegistrationForEq2Outputs','professionIndependence','playerMarketLegacyGearExcluded']) {
  assert.equal(p[key], true, key);
}
assert.equal(p.activeMembersFloor, 2);
assert.equal(p.activeMembersCeiling, 20);
assert.equal(policy.rules.requirementMode, 'ALL_BASKETS_WITH_ALTERNATIVE_MATERIALS_WITHIN_EACH');
assert.equal(policy.rules.weeklySlots, 'use_existing_standard_plus_voted_choice_only');

function quotas(total, baskets) {
  const values = baskets.map((b,i) => ({index:i, fraction:total*b.shareBps/10000}));
  const result = values.map(v => Math.floor(v.fraction));
  let left = total - result.reduce((a,b)=>a+b, 0);
  const order = values.slice().sort((a,b) =>
    (b.fraction - Math.floor(b.fraction)) - (a.fraction - Math.floor(a.fraction)) ||
    a.index - b.index);
  for(let i=0;i<left;i++)result[order[i].index]++;
  assert.equal(result.reduce((a,b)=>a+b,0), total);
  return result;
}

function checkPlan(plan, kind) {
  assert(Number.isSafeInteger(plan.weightedBase) && plan.weightedBase > 0);
  assert(Number.isSafeInteger(plan.weightedPerMember) && plan.weightedPerMember >= 0);
  assert(Array.isArray(plan.baskets) && plan.baskets.length >= 3);
  assert.equal(plan.baskets.reduce((s,b)=>s+b.shareBps,0),10000,
    kind + ':' + plan.unlockKey);
  const allIds = new Set();
  for (const basket of plan.baskets) {
    assert(/^[a-z_]+$/.test(basket.id));
    assert(Number.isSafeInteger(basket.shareBps) && basket.shareBps > 0);
    assert(Array.isArray(basket.options) && basket.options.length > 0);
    assert(basket.options.some(o=>o.registration === 'existing_inventory_identity'),
      'no usable existing inventory option for '+basket.id);
    for (const option of basket.options) {
      assert(/^[A-Z0-9_]+$/.test(option.itemId), option.itemId);
      assert(Number.isSafeInteger(option.credit) && option.credit >= 1 && option.credit <= 8);
      assert(!allIds.has(option.itemId), 'double-credit item across baskets: '+option.itemId);
      allIds.add(option.itemId);
      assert(['existing_inventory_identity','unregistered_eq2_output'].includes(option.registration));
      if (option.registration === 'unregistered_eq2_output') {
        assert(option.itemId.startsWith('EQ2_'));
        assert(!p.mayRegisterNewMaterials);
      }
    }
  }
  const tenMemberWeighted = plan.weightedBase + 10 * plan.weightedPerMember;
  for (const members of [2,3,10,20]) {
    const weighted = plan.weightedBase + plan.weightedPerMember * members;
    assert(Number.isSafeInteger(weighted) && weighted >= tenMemberWeighted / 3);
    quotas(weighted,plan.baskets);
  }
  return {weightedAtTen:tenMemberWeighted,timberAtTen:quotas(tenMemberWeighted,plan.baskets)[plan.baskets.findIndex(b=>b.id==='timber')]};
}

assert.equal(policy.guildDevelopmentGates.length, 6);
assert.equal(policy.weeklySupplyCandidates.length, 3);
const sourceRe = /\\{unlockKey:GUILD_TREE_DEVELOPMENT_UNLOCKS\\.(\\w+),branch:'(\\w+)',tier:(\\d+),requiredGuildLevel:(\\d+),baseGold:(\\d+),goldPerActiveMember:(\\d+),baseWeightedResources:(\\d+),weightedResourcesPerActiveMember:(\\d+)/g;
const source = Array.from(progression.matchAll(sourceRe),match=>({
  sourceRef:match[1],branch:match[2],tier:Number(match[3]),
  requiredGuildLevel:Number(match[4]),goldBase:Number(match[5]),
  goldPerMember:Number(match[6]),weightedBase:Number(match[7]),
  weightedPerMember:Number(match[8]),
}));
assert.equal(source.length,6,'guild development source format changed; re-audit before adjusting costs');
const seen = new Set();
for (const gate of policy.guildDevelopmentGates) {
  assert(!seen.has(gate.unlockKey));seen.add(gate.unlockKey);
  const own = source.find(s=>s.branch===gate.branch && s.tier===gate.tier);
  assert(own,'unmapped guild gate');
  assert.equal(gate.unlockKey, 'guild.tree.' + gate.branch + '.tier' + gate.tier);
  for(const key of ['requiredGuildLevel','goldBase','goldPerMember','weightedBase','weightedPerMember'])
    assert.equal(gate[key],own[key],gate.unlockKey+':'+key);
  checkPlan(gate, 'development');
}
const titles = new Set();
for(const weekly of policy.weeklySupplyCandidates){
  assert(!titles.has(weekly.id));titles.add(weekly.id);
  assert(['standard','enhanced','prestige'].includes(weekly.difficulty));
  assert(weekly.minGuildLevel >= 3 && weekly.minGuildLevel <= 10);
  checkPlan(weekly,'weekly');
}

// Prevent accidental reuse of pseudo-items as real inputs or removal of the Forge
// hard-combat ingredient gate. This consumes the authoritative REVIEW JSON only.
assert.equal(recipes.recipes.length, policy.equipmentRecipePolicy.routeTotal);
assert.equal(recipes.summary.totalDistinctDraftPieceIds,policy.equipmentRecipePolicy.sourceGroupCount);
const byPiece = new Map();
let woodRoutes = 0;
for (const r of recipes.recipes) {
  assert.equal(r.reviewOnly,true,r.id);
  assert.equal(r.craftable,false,r.id);
  assert.equal(r.mayMint,false,r.id);
  assert.equal(r.craftCombatLevelRequired,0,r.id);
  assert(r.inputs.length>=4,r.id);
  assert(r.inputs.some(i=>i.itemId.includes('BINDER') || i.itemId.includes('BINDING_RESIN')),
    'missing binder: '+r.id);
  const routes = byPiece.get(r.pieceId) ?? new Set();
  assert(!routes.has(r.route),'duplicate route for '+r.pieceId);
  routes.add(r.route);byPiece.set(r.pieceId,routes);
  if(r.inputs.some(i => /_LOG$|_PLANK$|DUNEWOOD/.test(i.itemId))) woodRoutes++;
}
assert.equal(byPiece.size,373);
for(const [piece,routes] of byPiece)assert.deepEqual([...routes].sort(),['alternate','foundation'],piece);
assert.equal(woodRoutes,policy.equipmentRecipePolicy.alreadyContainsWoodInRoutes,
  'wood audit changed: rebalance, do not silently multiply');

for(const [output,inputs] of Object.entries(policy.equipmentRecipePolicy.keepNewRefiningInputs)){
  const matches=recipes.processingReview.filter(p=>p.output===output);
  assert.equal(matches.length,1,'missing or duplicate refining route '+output);
  assert.deepEqual(matches[0].inputs,inputs,'refining drift '+output);
  assert.equal(matches[0].reviewOnly,true);
}
assert.equal(policy.equipmentRecipePolicy.noBlanketCraftCostMultiplier,true);
assert.equal(policy.equipmentRecipePolicy.retainRareEnemyDropPerFinishedEquipment,true);
console.log('PASS: 6 guild gate projections, 3 weekly candidates, 746 non-minting recipes, 6 refining inputs, 472 timber-containing routes');
