import {strict as assert} from 'node:assert';
import {V2_SERVER_PIECES} from '../../../equipment/equipment-crafting-v2-manifest';
import {
 V2_SERVER_AFFIX_RANGES,V2_SERVER_RARITY_BANDS,v2OriginalForgeRoleAffixEligible,
 type V2Affix,type V2Rarity,type V2Role,
} from '../../../equipment/equipment-crafting-v2-rolls';
import {
 reviewPhysicalAffixReplacementV2,reviewPhysicalAffixBuildV2,
 type PhysicalReplacementDraftV2,
} from '../equipment-physical-affix-budget-review';
import {reviewPhysicalAffixEligibilityV2} from '../equipment-physical-affix-review';

const originals:Readonly<Record<V2Role,readonly V2Affix[]>>={
 tank:['armor','maxHp','ward','tenacity'],
 damage:['critRate','critDamage','haste','penetration','abilityDamage','accuracy','potency'],
 support:['potency','healingPower','ward','haste','maxHp','tenacity'],
};
for(const [role,affixes] of Object.entries(originals) as [V2Role,readonly V2Affix[]][]){
 for(const stat of Object.keys(V2_SERVER_AFFIX_RANGES) as V2Affix[])
  assert.equal(v2OriginalForgeRoleAffixEligible(role,stat),affixes.includes(stat));
}
const inputFor=(piece:typeof V2_SERVER_PIECES[number],rarity:V2Rarity,stat:'physical_type_damage_pct'|'physical_type_resistance_pct',subtype:'slashing'|'piercing'|'blunt')=>{
 const band=V2_SERVER_RARITY_BANDS.find(b=>b.rarity===rarity)!;
 const n=piece.tier>=3?band.affixesHighTier:band.affixesLowTier;
 const rolls=originals[piece.role].slice(0,n).map(old=>({
  stat:old,percent:V2_SERVER_AFFIX_RANGES[old][piece.tier-1][0],
 }));
 const range=reviewPhysicalAffixEligibilityV2(piece.id,stat,subtype);
 if(!range)throw Error('ineligible_fixture');
 return {mintStatus:'FUTURE_NEW_EQ2_TEMPLATE_UNISSUED_REVIEW_ONLY' as const,
  pieceId:piece.id,rarity,sourceRolls:rolls,replaceIndex:0,
  proposedStat:stat,subtype,proposedPercent:range.minPercent};
};
const eligibles:ReturnType<typeof reviewPhysicalAffixReplacementV2>[]=[];
let permutations=0;
for(const piece of V2_SERVER_PIECES){
 for(const type of ['slashing','piercing','blunt'] as const){
  for(const stat of ['physical_type_damage_pct','physical_type_resistance_pct'] as const){
   if(!reviewPhysicalAffixEligibilityV2(piece.id,stat,type))continue;
   for(const band of V2_SERVER_RARITY_BANDS){
    const input=inputFor(piece,band.rarity,stat,type);
    const before=JSON.stringify(input);
    const proposed=reviewPhysicalAffixReplacementV2(input);
    assert.equal(JSON.stringify(input),before,'no source roll or item mutation');
    assert.equal(proposed.extraRollsAllowed,0);
    assert.equal(proposed.existingRollCount,proposed.proposedRollCount);
    assert.equal(proposed.currentItemsMayBeModified,false);
    assert.equal(proposed.originalForgeMintAllowed,false);
    assert.equal(proposed.proposedStat,stat);
    eligibles.push(proposed);permutations++;
   }
  }
 }
}
assert.ok(permutations>300,'audit every tier/rarity/source-eligible proposed subtype');
const arm=V2_SERVER_PIECES.find(x=>x.id==='EQ2_WEAPON_T4_WAYFINDER')!;
const armor=V2_SERVER_PIECES.find(x=>x.id==='EQ2_FIELDBORN_GUARD_HELMET')!;
assert.ok(arm&&armor);
const offensive=inputFor(arm,'mythic','physical_type_damage_pct','piercing');
const defensive=inputFor(armor,'rare','physical_type_resistance_pct','blunt');
assert.equal(offensive.sourceRolls.length,3);
assert.equal(defensive.sourceRolls.length,1);
assert.throws(()=>reviewPhysicalAffixReplacementV2({...offensive,mintStatus:'legacy' as any}),/cannot_retrofit_original_items/);
assert.throws(()=>reviewPhysicalAffixReplacementV2({...offensive,sourceRolls:[...offensive.sourceRolls,...offensive.sourceRolls]}),/forge_original_roll_budget_mismatch/);
assert.throws(()=>reviewPhysicalAffixReplacementV2({...offensive,sourceRolls:[offensive.sourceRolls[0],offensive.sourceRolls[0],offensive.sourceRolls[2]]}),/invalid_original_forge_roll_source/);
assert.throws(()=>reviewPhysicalAffixReplacementV2({...offensive,sourceRolls:[{stat:'armor',percent:1},...offensive.sourceRolls.slice(1)]}),/invalid_original_forge_roll_source/);
assert.throws(()=>reviewPhysicalAffixReplacementV2({...offensive,sourceRolls:[{...offensive.sourceRolls[0],percent:999},...offensive.sourceRolls.slice(1)]}),/original_roll_outside_source_tier_range/);
assert.throws(()=>reviewPhysicalAffixReplacementV2({...offensive,proposedPercent:100}),/proposed_roll_outside_eligible_tier_range/);
assert.throws(()=>reviewPhysicalAffixReplacementV2({...offensive,pieceId:'LEGACY_1_0_GEAR'}),/unregistered_piece/);
assert.throws(()=>reviewPhysicalAffixReplacementV2({...offensive,rarity:'divine' as any}),/unknown_original_forge_rarity/);
assert.throws(()=>reviewPhysicalAffixReplacementV2({...offensive,subtype:'blunt'}),/proposed_subtype_not_eligible/);
const p1=reviewPhysicalAffixReplacementV2(offensive),p2=reviewPhysicalAffixReplacementV2(defensive);
const build=reviewPhysicalAffixBuildV2([p1,p2]);
assert.equal(build.pieceCount,2);assert.equal(build.netOutgoingPct.piercing,offensive.proposedPercent/100);
assert.equal(build.netResistancePct.blunt,defensive.proposedPercent/100);
assert.equal(build.noExtraRolls,true);
assert.throws(()=>reviewPhysicalAffixBuildV2([p1,p1]),/tampered_or_duplicate_equipment_budget/);
assert.throws(()=>reviewPhysicalAffixBuildV2([{...p1,proposedRollCount:4}]),/tampered_or_duplicate_equipment_budget/);
assert.throws(()=>reviewPhysicalAffixBuildV2([p1,{...p2,originalForgeMintAllowed:true} as unknown as typeof p2]),/tampered_or_duplicate_equipment_budget/);
assert.throws(()=>reviewPhysicalAffixBuildV2(Array(11).fill(p1)),/overfull_equipment_build/);
console.log('PASS EQ2 subtype replacement audit:',permutations,
 'source-tier/rarity/role/slot combinations; zero additional rolls, no original item mutations.');
