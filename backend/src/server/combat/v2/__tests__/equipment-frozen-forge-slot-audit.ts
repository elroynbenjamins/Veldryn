/** HIDDEN / source-only Equipment 2.0 ten-slot coverage regression. */
import {strict as assert} from 'node:assert';
import {auditRealForgeTenSlotsV2}
 from '../equipment-frozen-forge-slot-audit';
import {GEAR_SLOTS_V2,CLASS_ROLES_V2}
 from '../build-contract';
import {V2_SERVER_PIECES,V2_SERVER_RECIPES}
 from '../../../equipment/equipment-crafting-v2-manifest';
import {draftEquipmentV2Outcome,v2ServerAuthoredAffixChoices}
 from '../../../equipment/equipment-crafting-v2-rolls';
import {v2ServerCreateExactTemplate,v2ServerExactTemplateConsistent}
 from '../../../equipment/equipment-crafting-v2-instances';

const report=auditRealForgeTenSlotsV2();
assert.deepEqual(auditRealForgeTenSlotsV2(),report,'read-only inventory audit must replay');
assert.equal(report.scope,'EQ2_TEN_SLOT_SOURCE_AUDIT_NO_ITEM_AUTHORITY');
assert.equal(report.releaseReady,false);
assert.equal(report.slotCount,10);
assert.equal(report.authoredForgeTemplates,169);
assert.equal(report.authoredForgeRoutes,338);
assert.equal(report.classTierSlotCells,9*4*10);
assert.equal(report.cells.length,360);
assert.equal(report.setBonusesActivated,0);
assert.equal(report.actualPersistedCopiesExamined,0);
assert.equal(report.cellsMissingTemplates,20,
 'Missing 20 cells means class-specific offhand allocation, not missing art');
assert.equal(report.cellsReservedByTwoHandOrPairedWeapon,20);
assert.equal(report.cellsMissingRequiredTemplates,0,
 'No existing T1–T4 character class lacks a physically required slot');
const noOffhand=new Set([
 'DREADGUARD','WAYFINDER','RAVAGER','KNIFE_DANCER','STONECALLER',
]);
assert.deepEqual(new Set(report.cells.filter(r=>r.sourceCoverage==='reserved_offhand')
 .map(r=>r.classId)),noOffhand);
assert.equal(report.cells.filter(r=>r.requiredPhysicalCopy).length,340);
for(const classId of Object.keys(CLASS_ROLES_V2)){
 for(const tier of [1,2,3,4]){
  const group=report.cells.filter(r=>r.classId===classId&&r.tier===tier);
  assert.equal(group.length,10);
  assert.equal(group.filter(r=>r.requiredPhysicalCopy).length,
   noOffhand.has(classId)?9:10,
   'Two-handed and paired weapons occupy offhand budget, not a second item');
 }
}
assert.equal(new Set(report.cells.map(r=>[
 r.classId,r.tier,r.slot].join('|'))).size,360,'every class tier slot once');
assert.ok(report.cellsWithUnsafeRngCandidate>0,
 'The current Forge role RNG is not universally Combat slot safe');
assert.ok(report.cellsWithNoCompatibleAffix>0,
 'Never claim complete ten-slot combat without resolving source pool gaps');
assert.ok(report.cellsWithInsufficientMaximumRollPool>0,
 'Mythic/high rarity roll counts can exceed exact eligible source pools');
let verifiedTemplates=0;
for(const row of report.cells){
 assert.ok(GEAR_SLOTS_V2.includes(row.slot));
 assert.ok(row.tier>=1&&row.tier<=4);
 assert.ok(Object.prototype.hasOwnProperty.call(CLASS_ROLES_V2,row.classId));
 assert.equal(row.sourceCoverage,row.eligibleSourcePieceIds.length?'present':
  row.reservedByTwoHandOrPairedWeapon?'reserved_offhand':'missing_required');
 if(row.sourceCoverage==='reserved_offhand'){
  assert.equal(row.slot,'offhand');
  assert.equal(row.requiredPhysicalCopy,false);
  assert.equal(row.compatibilityAction,'none_reserved');
  assert.ok(!row.blockers.includes('NO_CLASS_ELIGIBLE_FORGE_TEMPLATE'),
   'Intentional no-offhand does not demand a fabricated shield');
 } else {
  assert.equal(row.requiredPhysicalCopy,true);
  assert.equal(row.reservedByTwoHandOrPairedWeapon,false);
 }
 assert.equal(row.itemCustodyVerified,false);
 assert.equal(row.combatEffectsActivated,false);
 assert.equal(row.exactForgeCompatibleAffixes.length+
  row.blockedOrOffSlotForgeAffixes.length,
  v2ServerAuthoredAffixChoices(CLASS_ROLES_V2[row.classId],row.slot).length,
  'All possible authored Forge role affixes must be classified');
 assert.equal(row.possibleAtMaximumRollCount,
  row.eligibleSourcePieceIds.length>0&&
  row.exactForgeCompatibleAffixes.length>=row.maximumAuthoredAffixRolls);
 if(!row.exactForgeCompatibleAffixes.length)
  assert.ok(row.blockers.includes('NO_COMPATIBLE_FORGE_AFFIX'));
 if(row.blockedOrOffSlotForgeAffixes.length)
  assert.ok(row.blockers.includes('FORGE_ROLE_RNG_MAY_PRODUCE_UNSUPPORTED_OR_OFFSLOT_AFFIX'));
 for(const id of row.eligibleSourcePieceIds){
  const piece=V2_SERVER_PIECES.find(x=>x.id===id);
  assert.ok(piece,'all source identities must be real Forge pieces');
  assert.equal(piece!.slot,row.slot);
  assert.equal(piece!.tier,row.tier);
  assert.equal(piece!.role,CLASS_ROLES_V2[row.classId]);
  const recipe=V2_SERVER_RECIPES.find(r=>
   r.pieceId===id&&r.route==='foundation');
  assert.ok(recipe);
  // Deterministic, local TEST-only roll. This generates a template but does
  // not create a job, auth session, claim, custody or persisted equipment.
  const candidate=draftEquipmentV2Outcome({
   recipeId:recipe!.id,pieceId:id,slot:piece!.slot,
   role:piece!.role,tier:piece!.tier,
  },_max=>0);
  const exact=v2ServerCreateExactTemplate(piece!,candidate);
  assert.ok(v2ServerExactTemplateConsistent(exact));
  assert.equal(exact.pieceId,id);
  verifiedTemplates++;
 }
}
const tankGloves=report.cells.find(c=>
 c.classId==='IRONWARDEN'&&c.tier===1&&c.slot==='gloves');
assert.ok(tankGloves);
assert.equal(tankGloves!.exactForgeCompatibleAffixes.length,0,
 'Tank glove role pool cannot satisfy original Combat glove slot mapping');
const damageHelm=report.cells.find(c=>
 c.classId==='WAYFINDER'&&c.tier===1&&c.slot==='helmet');
assert.ok(damageHelm);
assert.equal(damageHelm!.exactForgeCompatibleAffixes.length,0,
 'Damage helmet currently has no mapped role affix legal for Combat');
const supportCape=report.cells.find(c=>
 c.classId==='STONECALLER'&&c.tier===3&&c.slot==='cape');
assert.ok(supportCape?.blockedOrOffSlotForgeAffixes.includes('potency'),
 'Original ambiguous Forge Potency stays unconverted');
console.log(JSON.stringify({
 kind:report.scope,cells:report.cells.length,realTemplateChecks:verifiedTemplates,
 missingTemplates:report.cellsMissingTemplates,
 intentionalEmptyOffhand:report.cellsReservedByTwoHandOrPairedWeapon,
 unexpectedlyMissingTemplates:report.cellsMissingRequiredTemplates,
 realPhysicalSlots:report.cells.filter(c=>c.requiredPhysicalCopy).length,
 noLegalAffixOnPhysicalSlots:report.cellsWithNoCompatibleAffixOnPhysicalSlots,
 unsafeRngOnPhysicalSlots:report.cellsWithUnsafeRngCandidateOnPhysicalSlots,
 maxRarityPoolShortageOnPhysicalSlots:report.cellsWithInsufficientMaximumRollPoolOnPhysicalSlots,
 noLegalAffix:report.cellsWithNoCompatibleAffix,
 unsafeRng:report.cellsWithUnsafeRngCandidate,
 mythicRollPoolShortage:report.cellsWithInsufficientMaximumRollPool,
 executableSetBonuses:0,releaseReady:false,
}));
