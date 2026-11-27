/** Private canonical Forge progression audit. Source windows below are
 * design requirements, NOT evidence that a gathering node or drop exists. */
import {strict as assert} from 'node:assert';
import {V2_SERVER_PIECES,V2_SERVER_RECIPES} from '../../../equipment/equipment-crafting-v2-manifest';
import {REGIONAL_BANDS_V2,TIER_PREPARATION_V2,regionalProgressionAtV2,regionalPressureReviewV2} from './regional-progression-review';
export function runRegionalProgressionReviewV2(){
 const expected=[1,2,2,3,3,4,5,5];
 assert.deepEqual(REGIONAL_BANDS_V2.flatMap(r=>[r.entryTier,r.upgradeTier]),expected);
 for(const [i,r] of REGIONAL_BANDS_V2.entries()){
  assert.equal(r.start,25*i+1);assert.equal(r.end,25*(i+1));assert.equal(r.bossLevel,r.end);
  assert.equal(r.midpoint,r.start+12);assert.equal(r.launch,i<3);
  assert.equal(regionalProgressionAtV2(r.start).expectedTier,r.entryTier);
  assert.equal(regionalProgressionAtV2(r.midpoint-1).expectedTier,r.entryTier);
  assert.equal(regionalProgressionAtV2(r.midpoint).expectedTier,r.upgradeTier);
  assert.equal(regionalProgressionAtV2(r.end).stage,'boss_checkpoint');
  assert.equal(regionalProgressionAtV2(r.end).regionLaunchEligible,r.launch);
 }
 for(let level=1;level<=100;level++){
  const p=regionalPressureReviewV2(level);
  assert.equal(p.releaseEnabled,false);assert.equal(p.cpApproved,false);
  if(level>1){
   const prev=regionalPressureReviewV2(level-1);
   for(const k of ['hp','attack','defense'] as const)assert.ok(p[k]>=prev[k]);
  }
 }
 for(const r of REGIONAL_BANDS_V2){
  const before=regionalPressureReviewV2(r.midpoint-1),after=regionalPressureReviewV2(r.midpoint);
  const end=regionalPressureReviewV2(r.end),boss=regionalPressureReviewV2(r.end,true);
  for(const k of ['hp','attack','defense'] as const){
   assert.ok(after[k]>before[k]);assert.ok(boss[k]>end[k]);
   if(r.start>1){
    const pre=regionalPressureReviewV2(r.start-1),entry=regionalPressureReviewV2(r.start);
    assert.ok(entry[k]/pre[k]>after[k]/before[k]);
   }
  }
 }
 for(const invalid of [0,101,12.5,NaN])assert.throws(()=>regionalProgressionAtV2(invalid));
 assert.throws(()=>regionalPressureReviewV2(12,true));
 assert.ok(regionalProgressionAtV2(88).optimizationOnly);
 for(let l=76;l<=100;l++)assert.equal(regionalProgressionAtV2(l).expectedTier,5);
 const requirements=new Map<string,{firstTier:number;neededBy:number;candidateSourceBy:number;recipes:number;tiers:Set<number>}>();
 const rows=TIER_PREPARATION_V2.map(p=>{
  const pieces=V2_SERVER_PIECES.filter(x=>x.tier===p.tier);
  const recipes=V2_SERVER_RECIPES.filter(x=>x.tier===p.tier);
  assert.equal(recipes.length,pieces.length*2);
  if(p.tier!==5)assert.ok(pieces.length>0&&p.prepareFrom<p.expectedFrom||p.tier===1);
  for(const piece of pieces){
   const routes=recipes.filter(r=>r.pieceId===piece.id);
   assert.equal(routes.length,2);
   assert.equal(new Set(routes.map(r=>r.route)).size,2);
  }
  for(const recipe of recipes){
   assert.ok(recipe.inputs.length>0&&recipe.inputs.every(i=>i.quantity>0&&Number.isSafeInteger(i.quantity)));
   for(const input of recipe.inputs){
    const row=requirements.get(input.itemId)??{firstTier:p.tier,neededBy:p.expectedFrom,candidateSourceBy:p.prepareFrom,recipes:0,tiers:new Set<number>()};
    row.recipes++;row.tiers.add(p.tier);requirements.set(input.itemId,row);
   }
  }
  const wear=[...new Set(recipes.map(r=>r.characterLevel))];
  const professions=[...new Set(recipes.map(r=>r.professionLevel))];
  return {tier:p.tier,pieces:pieces.length,recipes:recipes.length,manifestWearLevels:wear,professionLevels:professions,
   proposedWearLevel:p.wearCandidate,prepareFrom:p.prepareFrom,expectedFrom:p.expectedFrom,
   wearMismatch:wear.some(n=>n!==p.wearCandidate),sourceAvailability:'UNVERIFIED',
   catalogueReady:pieces.length>0,launch:p.launch};
 });
 assert.equal(rows.reduce((n,r)=>n+r.recipes,0),V2_SERVER_RECIPES.length);
 assert.equal(rows[4].pieces,0,'T5 catalogue has not been reconciled; do not silently promote it');
 // Proposed routing only: categorization of canonical ingredient IDs, not
 // invented drops. Common foundation components must never depend on the
 // boss that the resulting gear is intended to beat.
 const routing:Readonly<Record<string,'gather'|'refine'|'ordinary_combat'|'crafted_component'|'unresolved'>>={
  GREENWOOD_LOG:'gather',MOSS_FIBER:'gather',CLOTH_BINDINGS:'crafted_component',
  VERDANT_BINDING_RESIN:'crafted_component',BOAR_HIDE:'ordinary_combat',METAL_CLASPS:'crafted_component',
  IRONWOOD_LOG:'gather',WOLF_PELT:'ordinary_combat',PADDED_LININGS:'crafted_component',
  IRONWOOD_BINDING_RESIN:'crafted_component',THORN_SAP:'unresolved',REINFORCED_BUCKLES:'crafted_component',
  SUNSCALE:'ordinary_combat',DUNEWOOD:'gather',AMBERGLASS:'refine',ARMOR_RIVETS:'crafted_component',
  SUNSCAR_DUNE_BINDER:'crafted_component',SUNSTONE_ORE:'gather',REINFORCED_STRAPS:'crafted_component',
  SUNSTONE_INGOT:'refine',ASTRAL_SCRIPT:'unresolved',GLASSBOUND_BINDER:'crafted_component',
 };
 const materialRows=[...requirements].map(([itemId,r])=>({itemId,...r,tiers:[...r.tiers],
  routeCandidate:routing[itemId]??'unresolved',sourceStatus:'NEEDS_VERIFIED_GATHER_DROP_OR_COMPONENT_RECIPE',
  mustHavePreCheckpointNonBossPath:true,independentProfessionAccess:true}));
 assert.equal(materialRows.length,new Set(V2_SERVER_RECIPES.flatMap(r=>r.inputs.map(i=>i.itemId))).size);
 console.log('REGIONAL_PROGRESSION_REVIEW '+JSON.stringify({checkpoints:REGIONAL_BANDS_V2,levels:100,
  pressure:REGIONAL_BANDS_V2.flatMap(r=>[regionalPressureReviewV2(r.start),regionalPressureReviewV2(r.midpoint-1),
   regionalPressureReviewV2(r.midpoint),regionalPressureReviewV2(r.end,true)]),
  tiers:rows,materialRequirements:materialRows,recipeCount:V2_SERVER_RECIPES.length,
  region4Enabled:false,releaseEnabled:false}));
}
