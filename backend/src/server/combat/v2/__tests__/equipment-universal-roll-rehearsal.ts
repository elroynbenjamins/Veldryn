import {strict as assert} from 'node:assert';
import {V2_SERVER_PIECES} from '../../../equipment/equipment-crafting-v2-manifest';
import {
 V2_SERVER_RARITY_BANDS,V2_SERVER_AFFIX_RANGES,
} from '../../../equipment/equipment-crafting-v2-rolls';
import {EQUIPMENT_AFFIXES_V2} from '../equipment-affixes';
import {
 PROPOSED_FORGE_NEXT_MINT_ROLL_POLICY_V2,reviewNextMintAffixPieceV2,
} from '../equipment-forge-next-mint-roll-policy-review';
import {
 UNIVERSAL_EQ2_ROLL_REHEARSAL_V2,rehearseUniversalForgeRollV2,
 type RehearsalDrawV2,
} from '../equipment-universal-roll-rehearsal';
import {
 reviewAuthoredClassInnatesV2,reviewClassInnateForPinnedPieceV2,
} from '../equipment-authored-innate-percent-review';

function controlledRng(rarityOffset:number,qualityOrGradeHigh:boolean):RehearsalDrawV2{
 let calls=0;
 return limit=>{
  if(calls++===0){assert.equal(limit,1000000);return rarityOffset;}
  if(limit===1000000)return qualityOrGradeHigh?999999:0;
  if(limit===10001)return qualityOrGradeHigh?10000:0;
  return 0; // equal class-neutral candidate index, no class weighting
 };
}
let sampleCount=0,verifiedRollCount=0,minRolls=Infinity,maxRolls=0;
let classRestrictedExamples=0,samplesWithThree=0,highGradeDifferences=0;
let rarityStart=0;
for(const band of V2_SERVER_RARITY_BANDS){
 for(const piece of V2_SERVER_PIECES){
  const low=rehearseUniversalForgeRollV2(piece.id,controlledRng(rarityStart,false));
  const high=rehearseUniversalForgeRollV2(piece.id,controlledRng(rarityStart,true));
  const same=rehearseUniversalForgeRollV2(piece.id,controlledRng(rarityStart,false));
  const policy=reviewNextMintAffixPieceV2(piece.id,band.rarity);
  assert.deepEqual(low,same,'same source + same draws = same review result');
  assert.equal(low.version,UNIVERSAL_EQ2_ROLL_REHEARSAL_V2);
  assert.equal(low.candidatePolicy,PROPOSED_FORGE_NEXT_MINT_ROLL_POLICY_V2);
  assert.equal(low.pieceId,piece.id);
  assert.equal(low.tier,piece.tier);
  assert.equal(low.rarity,band.rarity);
  assert.equal(high.rarity,band.rarity);
  assert.equal(low.rollCount,policy.exactExistingRarityCount);
  assert.equal(high.rollCount,policy.exactExistingRarityCount);
  assert.equal(low.randomRolls.length,low.rollCount);
  assert.equal(high.randomRolls.length,high.rollCount);
  assert.equal(low.quality,0);
  assert.ok(high.quality>low.quality);
  assert.equal(low.classOrRoleInfluencesRng,false);
  assert.equal(low.innateEffectIncluded,false);
  assert.equal(low.canMint,false);
  assert.equal(low.canPersist,false);
  assert.equal(low.canEquip,false);
  assert.equal(low.canTrade,false);
  assert.equal(low.status,'REVIEW_ONLY_NONISSUABLE');
  assert.equal(low.randomBonusSelection,'PROPOSED_UNIFORM_WITHOUT_REPLACEMENT');
  assert.ok(Object.isFrozen(low)&&Object.isFrozen(low.randomRolls));
  for(const key of ['accountId','characterId','ownerCharacterId','instanceId',
   'custody','receipt','jobId','claimId','mintId'])
   assert.equal(Object.prototype.hasOwnProperty.call(low,key),false,
    'preview must never masquerade as a real item or receipt');
  for(const outcome of [low,high]){
   assert.equal(new Set(outcome.randomRolls.map(x=>x.forgeStat)).size,outcome.rollCount,
    'one roll per unique stat; no duplicated or bonus fourth roll');
   for(const roll of outcome.randomRolls){
    assert.ok(Object.isFrozen(roll)&&Object.isFrozen(roll.originalTierRange));
    assert.ok(policy.candidates.some(x=>x.forgeStat===roll.forgeStat));
    assert.ok(EQUIPMENT_AFFIXES_V2[roll.combatAffixId].slots.includes(piece.slot));
    assert.ok(Number.isFinite(roll.sourcePercent)&&Number.isInteger(roll.grade));
    const [min,max]=V2_SERVER_AFFIX_RANGES[roll.forgeStat][piece.tier-1];
    assert.deepEqual(roll.originalTierRange,[min,max]);
    assert.ok(roll.sourcePercent>=min-0.0051&&roll.sourcePercent<=max+0.0051);
    assert.ok(roll.grade>=0&&roll.grade<=100);
    assert.equal(roll.randomAffixNotInnate,true);
    verifiedRollCount++;
   }
  }
  for(let i=0;i<low.rollCount;i++){
   assert.equal(low.randomRolls[i].forgeStat,high.randomRolls[i].forgeStat);
   assert.ok(high.randomRolls[i].sourcePercent>=low.randomRolls[i].sourcePercent);
   if(high.randomRolls[i].sourcePercent>low.randomRolls[i].sourcePercent)
    highGradeDifferences++;
  }
  assert.ok(low.rollCount>=1&&low.rollCount<=3);
  if(low.rollCount===3)samplesWithThree++;
  minRolls=Math.min(minRolls,low.rollCount);
  maxRolls=Math.max(maxRolls,low.rollCount);
  if(piece.classRestriction)classRestrictedExamples++;
  sampleCount++;
 }
 rarityStart+=band.buckets;
}
assert.equal(rarityStart,1000000,'original rarity distribution must sum to 100%');
assert.equal(sampleCount,169*6);
assert.equal(minRolls,1);
assert.equal(maxRolls,3);
assert.ok(samplesWithThree>0&&verifiedRollCount>=sampleCount*2);
assert.ok(highGradeDifferences>0&&classRestrictedExamples>0);

// Same slot/tier + same RNG = same affix/rarity/quality, even with different
// source class or Tank/Damage/Support role, and even with a rare innate concept.
const groups=new Map<string,typeof V2_SERVER_PIECES[number][]>();
for(const piece of V2_SERVER_PIECES){
 const key=piece.tier+'|'+piece.slot;
 const rows=groups.get(key)??[];
 rows.push(piece);groups.set(key,rows);
}
let crossRolePairs=0,independentInnatePairs=0;
for(const group of groups.values()){
 const first=group[0];
 for(const second of group.slice(1)){
  if(second.role===first.role)continue;
  const a=rehearseUniversalForgeRollV2(first.id,controlledRng(0,true));
  const b=rehearseUniversalForgeRollV2(second.id,controlledRng(0,true));
  assert.equal(a.rarity,b.rarity);
  assert.equal(a.quality,b.quality);
  assert.deepEqual(a.randomRolls,b.randomRolls,
   'roll preview must not change based on source class, role or set family');
  crossRolePairs++;
  if(reviewClassInnateForPinnedPieceV2(first.id)||
     reviewClassInnateForPinnedPieceV2(second.id))
   independentInnatePairs++;
 }
}
assert.ok(crossRolePairs>=50&&independentInnatePairs>0);
const innateReport=reviewAuthoredClassInnatesV2();
assert.ok(innateReport.classWeaponCandidates>=9);
assert.equal(innateReport.approvedPercentCoefficients,0);
assert.equal(innateReport.canModifyBonusRolls,false);
// Candidate stat sampling probability is class-neutral; only the proposed
// slot-filtered pool length matters, NOT the class or role.
for(const piece of V2_SERVER_PIECES.slice(0,15)){
 const pool=reviewNextMintAffixPieceV2(piece.id,'common').candidates;
 for(let i=0;i<pool.length;i++){
  let n=0;
  const roll=rehearseUniversalForgeRollV2(piece.id,limit=>{
   if(n++===0)return 0;
   if(limit===1000000)return 0;
   if(limit===10001)return 0;
   return Math.min(i,limit-1);
  });
  assert.equal(roll.randomRolls[0].forgeStat,pool[i].forgeStat,
   'each eligible stat must be reachable by the proposed draw');
 }
}
for(const invalid of ['', 'OLD_EQUIPMENT_T1', 'EQ2_WEAPON_T6_IRONWARDEN']){
 assert.throws(()=>rehearseUniversalForgeRollV2(invalid),/unknown_pinned_equipment/);
}
const good=V2_SERVER_PIECES[0].id;
for(const bad of [(-1),1000000,1.5,NaN,Infinity]){
 assert.throws(()=>rehearseUniversalForgeRollV2(good,()=>bad),
  /untrusted_or_invalid_rng/,'invalid random source must fail closed');
}
let calls=0;
assert.throws(()=>rehearseUniversalForgeRollV2(good,limit=>{
 calls++;
 return calls===1?0:limit;
}),/untrusted_or_invalid_rng/);
assert.ok(calls>=2,'failure also tested after rarity draw');
console.log('PASS universal frozen Forge roll rehearsal',JSON.stringify({
 scenarios:sampleCount,lowHighGradeRollSamples:verifiedRollCount,
 classRestrictedScenarios:classRestrictedExamples,
 crossRoleSameSlotEqualResults:crossRolePairs,
 crossRoleWithPotentialInnate:independentInnatePairs,
 rarityBands:6,maxRolls,samplesWithThree,
 gradeLucksDiffer:highGradeDifferences,
 classWeightedBonuses:false,persistenceEnabled:false,
 originalForgeRngUnchanged:true,innateEffectsNotActivated:true,
}));
