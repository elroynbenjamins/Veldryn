/** HIDDEN: test source-only proposal for class-independent bonus stat rolls. */
import {strict as assert} from 'node:assert';
import {V2_SERVER_PIECES,V2_SERVER_RECIPES}
 from '../../../equipment/equipment-crafting-v2-manifest';
import {
 UNIVERSAL_FORGE_AFFIX_REVIEW_VERSION,UNIVERSAL_FORGE_BONUS_STAT_POOL_V2,
 previewClassIndependentOriginalForgeAffixesV2,
} from '../../../equipment/equipment-crafting-v2-universal-affix-preview';
import {V2_SERVER_AFFIX_RANGES,V2_SERVER_RARITY_BANDS,
 V2_SERVER_RARITY_BASE_MULTIPLIER} from '../../../equipment/equipment-crafting-v2-rolls';
import {ORIGINAL_FORGE_COMBAT_AFFIX_MAP_V2}
 from '../equipment-affixes';

const rng=(seed:number)=>(max:number)=>{
 // Deterministic PRNG solely for CI; NOT secure, server-authorized or used
 // for minting. Include the max only as a bound, not as a role/slot factor.
 seed=(Math.imul(seed,1664525)+1013904223)>>>0;
 return seed%max;
};
const sourceCases=V2_SERVER_PIECES.filter(p=>
 p.tier>=1&&p.tier<=4);
const byId=new Map(V2_SERVER_RECIPES.map(r=>[r.pieceId,r]));
let snapshots=0,sourceVariants=0;
const uniqueStats=new Set<string>();
const roles=new Set<string>();
const slots=new Set<string>();
const tiers=new Set<number>();
const samplesByTier=new Map<number,number>();
for(const piece of sourceCases){
 const recipe=byId.get(piece.id);
 assert.ok(recipe,'original piece must have a pinned recipe');
 roles.add(piece.role);slots.add(piece.slot);tiers.add(piece.tier);
 const before=JSON.stringify(piece);
 for(let seed=1;seed<=20;seed++){
  const result=previewClassIndependentOriginalForgeAffixesV2(
   piece.id,recipe.id,rng(seed));
  const repeat=previewClassIndependentOriginalForgeAffixesV2(
   piece.id,recipe.id,rng(seed));
  assert.deepEqual(result,repeat);
  assert.equal(result.proposalVersion,UNIVERSAL_FORGE_AFFIX_REVIEW_VERSION);
  assert.equal(result.originalManifestPieceId,piece.id);
  assert.equal(result.originalRecipeId,recipe.id);
  assert.equal(result.originalSlot,piece.slot);
  assert.equal(result.originalRole,piece.role);
  assert.equal(result.originalClassRestriction,piece.classRestriction);
  assert.equal(result.canMint,false);
  assert.equal(result.canEquip,false);
  assert.equal(result.canAuthorizeCombat,false);
  assert.equal(result.canListOnMarket,false);
  assert.equal(result.grantsRewards,false);
  assert.equal(result.releaseApproved,false);
  const band=V2_SERVER_RARITY_BANDS.find(b=>b.rarity===result.rarity);
  assert.ok(band);
  const count=piece.tier>=3?band.affixesHighTier:band.affixesLowTier;
  assert.equal(result.bonusStats.length,count);
  assert.equal(new Set(result.bonusStats.map(r=>r.stat)).size,count);
  assert.ok(Math.abs(result.baseStatMultiplier-
   V2_SERVER_RARITY_BASE_MULTIPLIER[result.rarity]*
    (.75+result.quality*.005))<1e-10);
  for(const rolled of result.bonusStats){
   const [low,high]=V2_SERVER_AFFIX_RANGES[rolled.stat][piece.tier-1];
   assert.ok(rolled.percent>=low-1e-9&&rolled.percent<=high+1e-9);
   assert.ok(rolled.grade>=0&&rolled.grade<=100);
   assert.ok(ORIGINAL_FORGE_COMBAT_AFFIX_MAP_V2[rolled.stat],
    'Proposed universal pool cannot mint an unsupported mechanic');
   uniqueStats.add(rolled.stat);
  }
  snapshots++;
  samplesByTier.set(piece.tier,(samplesByTier.get(piece.tier)??0)+1);
 }
 assert.equal(JSON.stringify(piece),before,
  'Next-generation bonus preview must NOT mutate real canonical Forge pieces');
 sourceVariants++;
}
// Verify class, role, equipment slot and innate weapon restriction do not
// enter RNG selection: with the same tier/seed, BONUS rolls must be identical.
let crossRoleEqual=0;
for(const tier of [1,2,3,4] as const){
 const candidates=sourceCases.filter(p=>p.tier===tier);
 const onePerRole=['tank','damage','support'].map(role=>
  candidates.find(p=>p.role===role));
 assert.ok(onePerRole.every(Boolean));
 for(let seed=1;seed<=90;seed++){
  const rolls=onePerRole.map(piece=>{
   const r=byId.get(piece!.id)!;
   return previewClassIndependentOriginalForgeAffixesV2(
    piece!.id,r.id,rng(seed)).bonusStats;
  });
  assert.deepEqual(rolls[0],rolls[1]);
  assert.deepEqual(rolls[1],rolls[2]);
  crossRoleEqual++;
 }
}
assert.equal(roles.size,3);
assert.equal(slots.size,10);
assert.equal(tiers.size,4);
assert.equal(UNIVERSAL_FORGE_BONUS_STAT_POOL_V2.length,11);
assert.equal(new Set(UNIVERSAL_FORGE_BONUS_STAT_POOL_V2).size,11);
assert.ok(!UNIVERSAL_FORGE_BONUS_STAT_POOL_V2.includes('potency'));
assert.ok(uniqueStats.size>=7,'Review RNG should explore diverse independent stats');
// A class-specific INNATE authored weapon restriction remains intact in the
// source manifest but has NO bearing on bonus rolls.
const classRestricted=sourceCases.find(p=>Boolean(p.classRestriction));
assert.ok(classRestricted);
const restrictedRecipe=byId.get(classRestricted.id)!;
const restricted=previewClassIndependentOriginalForgeAffixesV2(
 classRestricted.id,restrictedRecipe.id,rng(1234));
assert.equal(restricted.originalClassRestriction,classRestricted.classRestriction);
let denied=0;
for(const [pieceId,recipeId,draw] of [
 ['LEGACY_T0_ITEM',restrictedRecipe.id,rng(1)],
 [restrictedRecipe.id,restrictedRecipe.id,rng(1)],
 [classRestricted.id,'FORGED_WRONG_RECIPE',rng(1)],
] as const){
 assert.throws(()=>previewClassIndependentOriginalForgeAffixesV2(
  pieceId,recipeId,draw),/unknown_or_mismatched_original_forge_recipe/);
 denied++;
}
for(const bad of [(_max:number)=>-1,(_max:number)=>1e8,
 (_max:number)=>NaN,(_max:number)=>.3]){
 assert.throws(()=>previewClassIndependentOriginalForgeAffixesV2(
  classRestricted.id,restrictedRecipe.id,bad),/invalid_server_draw/);
 denied++;
}
console.log('PASS: '+snapshots+' non-mintable original Forge universal-affix previews, '+
 sourceVariants+' source pieces, '+crossRoleEqual+
 ' role-independent matching seeded roll triples, '+uniqueStats.size+
 ' supported random stat identities and '+denied+
 ' forged/invalid RNG tests; original rarities/quality/innates unchanged, zero grants');
