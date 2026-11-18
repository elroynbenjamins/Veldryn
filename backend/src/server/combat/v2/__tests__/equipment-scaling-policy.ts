import {strict as assert} from 'node:assert';
import type {CombatStats} from '../../types';
import type {ApprovedEquipmentBasePolicyV2} from '../equipment-base-stats';
import {
 equipmentQualityMultiplierV2,auditEquipmentScalingV2,
 assertApprovedEquipmentScalingV2,type ApprovedRarityLadderV2,
 QUALITY_MIN_V2,QUALITY_MAX_V2,
} from '../equipment-scaling-policy';

assert.equal(QUALITY_MIN_V2,.75);
assert.equal(QUALITY_MAX_V2,1.25);
assert.equal(equipmentQualityMultiplierV2(0),.75);
assert.equal(equipmentQualityMultiplierV2(25),.875);
assert.equal(equipmentQualityMultiplierV2(50),1);
assert.equal(equipmentQualityMultiplierV2(75),1.125);
assert.equal(equipmentQualityMultiplierV2(80),1.15);
assert.equal(equipmentQualityMultiplierV2(100),1.25);
let last=-Infinity;
for(let q=0;q<=100;q++){
 const result=equipmentQualityMultiplierV2(q);
 assert.ok(Number.isFinite(result));
 assert.ok(result>last,'Approved quality curve must strictly increase at Q'+q);
 last=result;
}
for(const v of [-1,101,NaN,Infinity,45.5]){
 assert.throws(()=>equipmentQualityMultiplierV2(v),/invalid_quality_value/);
}
const statNames:readonly (keyof CombatStats)[]=[
 'maxHp','attackPower','healingPower','defense','accuracy','evasion',
 'critChance','critMultiplier','haste',
];
const ceilings=Object.fromEntries(statNames.map(x=>[x,100000])) as Record<keyof CombatStats,number>;
const policy:ApprovedEquipmentBasePolicyV2={
 rarityMultipliers:{common:1,rare:1.12,epic:1.27},
 qualityMultiplier:equipmentQualityMultiplierV2,ceilings,
};
const ladder:ApprovedRarityLadderV2={
 version:'synthetic-rarity-order',order:['common','rare','epic'],
 multipliers:{common:1,rare:1.12,epic:1.27},
};
const result=auditEquipmentScalingV2(policy,ladder);
assert.equal(result.valid,true,JSON.stringify(result.issues));
assert.equal(result.qualitySamplesChecked,101);
assert.equal(result.rarityStepsChecked,3);
assert.doesNotThrow(()=>assertApprovedEquipmentScalingV2(policy,ladder));
const badLadder={...ladder,multipliers:{...ladder.multipliers,rare:1.4}};
assert.equal(auditEquipmentScalingV2(policy,badLadder).valid,false);
assert.throws(()=>assertApprovedEquipmentScalingV2(policy,badLadder),
 /equipment_scaling_policy_rejected/);
assert.ok(auditEquipmentScalingV2({...policy,
 rarityMultipliers:{common:1,rare:1,epic:1.27}},ladder).issues
 .some(code=>code.includes('rarity_non_monotonic')));
assert.ok(auditEquipmentScalingV2({...policy,
 rarityMultipliers:{common:1,rare:1.12,epic:1.27,unapproved:99}},ladder).issues
 .includes('unapproved_rarity_key'));
const fakeCurve={...policy,qualityMultiplier:(q:number)=>1};
assert.ok(auditEquipmentScalingV2(fakeCurve,ladder).issues
 .some(code=>code.includes('quality_curve_mismatch')));
let calls=0;
const unstableCurve={...policy,qualityMultiplier:(q:number)=>{
 calls++;return equipmentQualityMultiplierV2(q)+(calls%2)*.01;
}};
assert.ok(auditEquipmentScalingV2(unstableCurve,ladder).issues
 .some(code=>code.includes('quality_curve_non_deterministic')||
   code.includes('quality_curve_mismatch')));
assert.throws(()=>assertApprovedEquipmentScalingV2(policy,{
 ...ladder,order:['common','common','epic'],
}),/equipment_scaling_policy_rejected/);
console.log('PASS: Q0–Q100 -25%/+25%, deterministic policy and versioned rarity monotonicity');
