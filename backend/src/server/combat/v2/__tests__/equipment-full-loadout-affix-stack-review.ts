import {strict as assert} from 'node:assert';
import {V2_SERVER_PIECES} from '../../../equipment/equipment-crafting-v2-manifest';
import {V2_SERVER_RARITY_BANDS,V2_SERVER_AFFIX_RANGES}
 from '../../../equipment/equipment-crafting-v2-rolls';
import {CLASS_ROLES_V2,GEAR_SLOTS_V2,type ClassIdV2} from '../build-contract';
import {reviewNextMintAffixPieceV2} from '../equipment-forge-next-mint-roll-policy-review';
import {
 EQ2_FULL_LOADOUT_STACK_REVIEW_V2,reviewSourceLoadoutAffixStacksV2,
 reviewFullLoadoutAffixStacksV2,
} from '../equipment-full-loadout-affix-stack-review';

const all=reviewFullLoadoutAffixStacksV2();
assert.deepEqual(all,reviewFullLoadoutAffixStacksV2());
assert.equal(all.version,EQ2_FULL_LOADOUT_STACK_REVIEW_V2);
assert.equal(all.scenarios,216);
assert.equal(all.classCount,9);
assert.equal(all.tierCount,4);
assert.equal(all.rarityCount,6);
assert.equal(all.rows.length,216);
assert.equal(all.calculatedFinalCombatPower,false);
assert.equal(all.approvedStackCaps,0);
assert.equal(all.releaseReady,false);
assert.ok(Object.isFrozen(all)&&Object.isFrozen(all.rows));
assert.ok(all.tenSlotScenarios>0&&all.nineSlotScenarios>0);
assert.equal(all.tenSlotScenarios+all.nineSlotScenarios,216);
assert.equal(all.maximumIndividualSourceRolls,30);

let seen=0,maxStatPercent=0,maxItemSlotCount=0,eligibleAffixTotals=0;
let twoHandCases=0,dualCases=0,oneHandCases=0;
const matchedClasses=new Set<string>();
const statNames=new Set<string>();
for(const row of all.rows){
 assert.ok(Object.isFrozen(row)&&Object.isFrozen(row.sourceSlots));
 assert.ok(Object.isFrozen(row.byAffix));
 assert.equal(row.canEquip,false);
 assert.equal(row.canModifyItems,false);
 assert.equal(row.noSyntheticCombatPower,true);
 assert.equal(row.innatePercentEffectsExcluded,true);
 assert.equal(row.setBonusesExcluded,true);
 assert.equal(row.status,'POTENTIAL_BOUNDS_NOT_REAL_SIMULTANEOUS_STATS');
 assert.ok(row.slotCount===9||row.slotCount===10);
 assert.equal(row.sourceSlots.length,row.slotCount);
 assert.equal(new Set(row.sourceSlots.map(x=>x.slot)).size,row.slotCount);
 assert.equal(row.absentOffhandDueToHands,row.weaponHands!=='one');
 assert.equal(row.sourceSlots.some(x=>x.slot==='offhand'),row.weaponHands==='one');
 const expectedSlots=GEAR_SLOTS_V2.filter(x=>x!=='offhand'||row.weaponHands==='one');
 assert.deepEqual(row.sourceSlots.map(x=>x.slot),expectedSlots);
 if(row.weaponHands==='two')twoHandCases++;
 if(row.weaponHands==='dual')dualCases++;
 if(row.weaponHands==='one')oneHandCases++;
 matchedClasses.add(row.classId);
 let budget=0;
 const pieceIds=new Set<string>();
 for(const slot of row.sourceSlots){
  assert.ok(Object.isFrozen(slot));
  assert.ok(!pieceIds.has(slot.sourcePieceId));
  pieceIds.add(slot.sourcePieceId);
  const source=V2_SERVER_PIECES.find(p=>p.id===slot.sourcePieceId);
  assert.ok(source);
  assert.equal(source!.slot,slot.slot);
  assert.equal(source!.tier,row.tier);
  assert.equal(source!.role,CLASS_ROLES_V2[row.classId]);
  if(source!.classRestriction)assert.equal(source!.classRestriction,row.classId);
  assert.equal(slot.classRestriction,source!.classRestriction??null);
  assert.equal(slot.sourceSetId,source!.setId??null);
  assert.equal(slot.hands,source!.hands??null);
  const pool=reviewNextMintAffixPieceV2(source!.id,row.rarity);
  assert.equal(slot.bonusCandidateCount,pool.candidates.length);
  assert.equal(slot.possibleRollCount,pool.exactExistingRarityCount);
  assert.ok(slot.possibleRollCount<=slot.bonusCandidateCount);
  budget+=slot.possibleRollCount;
 }
 assert.equal(row.totalRandomRollBudget,budget);
 const rarity=V2_SERVER_RARITY_BANDS.find(x=>x.rarity===row.rarity)!;
 const expectedPerPiece=row.tier>=3?rarity.affixesHighTier:rarity.affixesLowTier;
 assert.equal(budget,row.slotCount*expectedPerPiece);
 const ids=new Set<string>();
 for(const stat of row.byAffix){
  assert.ok(Object.isFrozen(stat));
  assert.ok(!ids.has(stat.combatAffixId));
  ids.add(stat.combatAffixId);statNames.add(stat.combatAffixId);
  assert.equal(stat.sourceUnit,'PERCENT_OR_PERCENTAGE_POINTS_PER_STAT_DEFINITION');
  assert.equal(stat.simultaneousWithOtherStatMaxima,false);
  assert.equal(stat.approvedFinalStackCap,null);
  assert.equal(stat.actualEquippedRollTotal,null);
  assert.ok(Object.isFrozen(stat.eligibleSourceSlots));
  assert.equal(stat.eligibleSourceSlots.length,stat.distinctItemSlots);
  assert.ok(stat.distinctItemSlots>0&&stat.distinctItemSlots<=row.slotCount);
  assert.equal(new Set(stat.eligibleSourceSlots).size,stat.distinctItemSlots);
  let low=0,high=0;
  for(const slot of row.sourceSlots){
   const pool=reviewNextMintAffixPieceV2(slot.sourcePieceId,row.rarity);
   const candidate=pool.candidates.find(x=>x.combatAffixId===stat.combatAffixId);
   if(candidate){
    assert.ok(stat.eligibleSourceSlots.includes(slot.slot));
    const [min,max]=V2_SERVER_AFFIX_RANGES[candidate.forgeStat][row.tier-1];
    low+=Math.round((min+(max-min)*rarity.low)*100)/100;
    high+=Math.round((min+(max-min)*rarity.high)*100)/100;
   }else assert.ok(!stat.eligibleSourceSlots.includes(slot.slot));
  }
  assert.equal(stat.minimumSumPercentIfEveryEligibleItemRolledStat,Math.round(low*100)/100);
  assert.equal(stat.maximumSumPercentIfEveryEligibleItemRolledStat,Math.round(high*100)/100);
  assert.ok(stat.maximumSumPercentIfEveryEligibleItemRolledStat>=
   stat.minimumSumPercentIfEveryEligibleItemRolledStat);
  maxStatPercent=Math.max(maxStatPercent,stat.maximumSumPercentIfEveryEligibleItemRolledStat);
  maxItemSlotCount=Math.max(maxItemSlotCount,stat.distinctItemSlots);
  eligibleAffixTotals+=stat.distinctItemSlots;
 }
 assert.equal(row.byAffix.length,statNames.size,
  'all source-combat mapped stat identities appear in every review');
 seen++;
}
assert.equal(seen,216);
assert.equal(matchedClasses.size,9);
assert.equal(statNames.size,11);
assert.equal(oneHandCases+twoHandCases+dualCases,216);
assert.ok(twoHandCases>0&&dualCases>0&&oneHandCases>0);
assert.ok(maxItemSlotCount>1,
 'multiple separate equipment pieces must allow the SAME bonus to stack');
assert.ok(maxStatPercent>0);
// Two-handed and dual blades block offhand in this MODEL. The audit does NOT
// grant a ninth/tenth equipped bonus to an impossible extra-hand item.
for(const id of ['DREADGUARD','WAYFINDER','RAVAGER','STONECALLER','KNIFE_DANCER'] as ClassIdV2[]){
 const row=reviewSourceLoadoutAffixStacksV2(id,4,'mythic');
 assert.equal(row.slotCount,9);
 assert.equal(row.sourceSlots.some(x=>x.slot==='offhand'),false);
}
for(const id of ['IRONWARDEN','BASTION','HEXWEAVER','DAWNKEEPER'] as ClassIdV2[]){
 const row=reviewSourceLoadoutAffixStacksV2(id,4,'mythic');
 assert.equal(row.slotCount,10);
 assert.equal(row.sourceSlots.some(x=>x.slot==='offhand'),true);
}
const mythic4=reviewSourceLoadoutAffixStacksV2('IRONWARDEN',4,'mythic');
const common4=reviewSourceLoadoutAffixStacksV2('IRONWARDEN',4,'common');
assert.equal(mythic4.totalRandomRollBudget,30);
assert.equal(common4.totalRandomRollBudget,10);
assert.ok(mythic4.byAffix.find(x=>x.combatAffixId==='crit_rate_pp')!
 .maximumSumPercentIfEveryEligibleItemRolledStat>
 common4.byAffix.find(x=>x.combatAffixId==='crit_rate_pp')!
 .maximumSumPercentIfEveryEligibleItemRolledStat);
assert.throws(()=>reviewSourceLoadoutAffixStacksV2('UNAPPROVED_CLASS' as never,4,'mythic'),
 /unknown_source_class_tier_or_rarity/);
assert.throws(()=>reviewSourceLoadoutAffixStacksV2('IRONWARDEN',5 as never,'mythic'),
 /unknown_source_class_tier_or_rarity/);
assert.throws(()=>reviewSourceLoadoutAffixStacksV2('IRONWARDEN',4,'SYNTHETIC' as never),
 /unknown_source_class_tier_or_rarity/);
console.log('PASS original class-legal full-loadout affix stacking envelope',JSON.stringify({
 scenarios:seen,classes:matchedClasses.size,tiers:4,rarities:6,
 tenSlotScenarios:all.tenSlotScenarios,nineSlotScenarios:all.nineSlotScenarios,
 twoHandCases,dualCases,oneHandCases,
 potentialStatChannels:statNames.size,
 maxSourceRandomRolls:all.maximumIndividualSourceRolls,
 maximumSingleStatSourcePercentEnvelope:maxStatPercent,
 maximumEligiblePiecesForOneStat:maxItemSlotCount,
 eligibleAffixSlotOccurrences:eligibleAffixTotals,
 actualCombatPowerCalculated:false,liveCapsApproved:0,
 simultaneousAllStatMaxima:false,innateEffectGranted:false,
 }));
