import {strict as assert} from 'node:assert';
import {SET_FAMILIES_V2,TIERED_SETS_V2} from '../set-catalog';
import {
 PINNED_FORGE_SETS_V2,FORGE_SET_RECONCILIATION_SOURCE_V2,
 auditForgeAndCombatSetsV2,
} from '../equipment-set-catalogue-reconciliation-review';

const report=auditForgeAndCombatSetsV2();
assert.equal(report.mode,'REVIEW_ONLY_NO_COMBAT_AUTHORITY');
assert.equal(report.familyDefinitions,12);
assert.equal(report.structuralTieredSets,60);
assert.equal(report.structuralT1ToT4Sets,48);
assert.equal(report.structuralT5Sets,12);
assert.equal(report.structuralSixPieceSets,15);
assert.equal(report.structuralT1ToT4RequiredSetPieceSlots,204);
assert.equal(report.forgeNamedSets,15);
assert.equal(report.forgeTotalSetPieces,42);
assert.deepEqual(report.forgeSetsBySize,{'2':6,'3':6,'4':3});
assert.equal(report.forgeSixPieceSets,0);
assert.equal(report.exactIdMatches,0,'No forged mapping across distinct set IDs');
assert.equal(report.structuralIdsWithoutSameIdForgeMembership.length,60);
assert.equal(report.hypotheticalMinAdditionalPiecesForAllT1ToT4,162,
 '204 conceptual slots minus original 42 items is NOT approval to mint 162 new items');
assert.equal(SET_FAMILIES_V2.length,12);
assert.equal(TIERED_SETS_V2.length,60);
assert.equal(PINNED_FORGE_SETS_V2.length,15);
assert.equal(FORGE_SET_RECONCILIATION_SOURCE_V2.forgeManifestBlob.length,40);
const large=SET_FAMILIES_V2.filter(row=>row.slots.length===6).map(row=>row.id).sort();
assert.deepEqual(large,['breakerforge','citadel','rootshield']);
for(const family of SET_FAMILIES_V2){
 assert.ok(family.thresholds.every(t=>t<=family.slots.length));
 const ids=new Set(family.slots);
 assert.equal(ids.size,family.slots.length);
}
for(const row of PINNED_FORGE_SETS_V2){
 assert.ok(row.slots.length<6,'Original Forge has no 6-piece crafted set');
 assert.ok(/^EQ2_SET_/.test(row.id));
}
console.log('PASS: 12 Combat set concepts across 5 tiers = 60 structural sets; '+
 '15 old Forge sets / 42 actual set pieces; no invented cross-catalogue mapping');
