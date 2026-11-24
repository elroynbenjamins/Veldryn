import {strict as assert} from 'node:assert';
import {EQUIPMENT_AFFIXES_V2} from '../equipment-affixes';
import {
 AUDITED_FORGE_RULESET_V2,FROZEN_FORGE_AUDIT_VERSION_V2,
 auditUntrustedForgeRollCrosswalkV2,findForgeCombatSlotConflictsV2,
 type UntrustedForgeSnapshotV2,
} from '../equipment-forge-crosswalk-review';

const base:UntrustedForgeSnapshotV2={
 rulesVersion:AUDITED_FORGE_RULESET_V2,
 instanceId:'EQ2_SNAPSHOT_REVIEW_1',
 slot:'weapon',tier:3,rarity:'rare',quality:74,
 frozenPrimaryStatsAlreadyScaled:true,
 rolls:[{stat:'critRate',percent:1.25,grade:50}],
};
const audited=auditUntrustedForgeRollCrosswalkV2(base);
assert.equal(audited.auditVersion,FROZEN_FORGE_AUDIT_VERSION_V2);
assert.equal(audited.activateInCombat,false);
assert.equal(audited.fromUnverifiedSnapshot,true);
assert.deepEqual(audited.candidates,[{
 from:'critRate',id:'crit_rate_pp',value:.0125,sourcePercent:1.25,unit:'percentage_points',
}]);
assert.ok(audited.issues.some(issue=>issue.code==='snapshot_untrusted'));
assert.ok(audited.issues.some(issue=>issue.code==='range_policy_unreconciled'));
assert.equal(Object.keys(EQUIPMENT_AFFIXES_V2).length,13,
 'Do not pretend the new 17-stat proposal is an already-active compiler');

const copied=(patch:Partial<UntrustedForgeSnapshotV2>)=>({...base,...patch});
const slot=auditUntrustedForgeRollCrosswalkV2(copied({slot:'boots'}));
assert.ok(slot.issues.some(issue=>issue.code==='slot_ineligible'&&issue.stat==='critRate'));
assert.equal(slot.candidates.length,0,'Never reclassify a valid Forge off-slot stat');

const ambiguous=auditUntrustedForgeRollCrosswalkV2(copied({
 rolls:[{stat:'potency',percent:1.25,grade:50}],
}));
assert.ok(ambiguous.issues.some(issue=>issue.code==='ambiguous_semantics'));
assert.equal(ambiguous.candidates.length,0,'Generic potency is not Hex Potency');
for(const stat of ['armor','maxHp','ward','healingPower']){
 const review=auditUntrustedForgeRollCrosswalkV2(copied({
  rolls:[{stat,percent:1,grade:50}],
 }));
 assert.ok(review.issues.some(issue=>issue.code==='ambiguous_semantics'&&issue.stat===stat),
  'No silent legacy roll mapping: '+stat);
}
for(const stat of ['tenacity','abilityDamage']){
 const review=auditUntrustedForgeRollCrosswalkV2(copied({
  rolls:[{stat,percent:1,grade:50}],
 }));
 assert.ok(review.issues.some(issue=>issue.code==='engine_extension_pending'&&issue.stat===stat));
 assert.equal(review.candidates.length,0);
}
for(const [stat,id,unit] of [
 ['critDamage','crit_damage_pct','relative_percent'],
 ['haste','haste_pp','percentage_points'],
 ['penetration','penetration_pp','percentage_points'],
 ['accuracy','accuracy_pp','percentage_points'],
] as const){
 const review=auditUntrustedForgeRollCrosswalkV2(copied({
  rolls:[{stat,percent:1.5,grade:50}],
 }));
 assert.equal(review.candidates[0]?.id,id);
 assert.equal(review.candidates[0]?.unit,unit);
 assert.equal(review.candidates[0]?.value,.015);
}

assert.ok(auditUntrustedForgeRollCrosswalkV2(copied({
 rulesVersion:'forge-unknown',
})).issues.some(issue=>issue.code==='unapproved_forge_version'));
assert.ok(auditUntrustedForgeRollCrosswalkV2(copied({
 frozenPrimaryStatsAlreadyScaled:false,
})).issues.some(issue=>issue.code==='primary_scaling_unverified'));
assert.ok(auditUntrustedForgeRollCrosswalkV2(copied({
 rolls:[{stat:'critRate',percent:1.1,grade:4},{stat:'haste',percent:1.3,grade:10}],
})).issues.some(issue=>issue.code==='over_approved_count'));
const mythic=auditUntrustedForgeRollCrosswalkV2(copied({
 tier:4,rarity:'mythic',rolls:[
  {stat:'critRate',percent:1.1,grade:40},
  {stat:'critDamage',percent:3,grade:60},
  {stat:'accuracy',percent:1.1,grade:40},
 ],
}));
assert.equal(mythic.candidates.length,3,'T4 Mythic allows three distinct Forge rolls for review');

for(const patch of [
 {instanceId:'!invalid'},
 {quality:101},
 {tier:5},
 {slot:'unknown'},
 {rolls:[{stat:'evasion',percent:1,grade:50}]},
 {rolls:[{stat:'critRate',percent:1.1,grade:30},{stat:'critRate',percent:1.2,grade:40}]},
 {rolls:[{stat:'critRate',percent:Infinity,grade:20}]},
 {rolls:[{stat:'critRate',percent:1.2345,grade:20}]},
 {rolls:[{stat:'critRate',percent:1,grade:-1}]},
]){
 assert.throws(()=>auditUntrustedForgeRollCrosswalkV2(copied(
  patch as Partial<UntrustedForgeSnapshotV2>,
 )),/combat_v2_forge_audit_/);
}
const conflicts=findForgeCombatSlotConflictsV2();
assert.ok(conflicts.length>0);
assert.ok(conflicts.some(row=>row.role==='damage'&&row.slot==='boots'&&
 row.forgeStat==='critRate'&&row.combatStat==='crit_rate_pp'));
assert.ok(conflicts.some(row=>row.role==='damage'&&row.slot==='offhand'&&
 row.forgeStat==='critDamage'));
assert.ok(conflicts.some(row=>row.role==='support'&&row.slot==='helmet'&&
 row.forgeStat==='haste'));
assert.ok(conflicts.every(row=>row.issue==='forge_may_roll_ineligible_slot'));

console.log('PASS: unmounted Forge/Combat review rejects ambiguous/off-slot/forged rolls, '+
 conflicts.length+' potential role×slot×stat conflict combinations; NO combat activation');
