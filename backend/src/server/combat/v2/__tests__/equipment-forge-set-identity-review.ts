import {strict as assert} from 'node:assert';
import {V2_SERVER_PIECES,V2_SERVER_RECIPES} from '../../../equipment/equipment-crafting-v2-manifest';
import {
 auditRealForgeSetIdentityV2,reviewWornForgeSetSourcesV2,
} from '../equipment-forge-set-identity-review';
import {
 PLANNED_T1_T4_SETS_V2,PLANNED_T1_T4_MEMBERS_V2,
} from '../equipment-expanded-launch-registry';

const audit=auditRealForgeSetIdentityV2();
assert.deepEqual(audit,auditRealForgeSetIdentityV2(),'source audit must be deterministic');
assert.equal(audit.actualForgeTemplates,169);
assert.equal(audit.actualForgeRecipes,338);
assert.equal(audit.originalForgeSetFamilies,15);
assert.equal(audit.originalForgeSetMembers,42);
assert.equal(audit.expandedCombatSetConcepts,48);
assert.equal(audit.expandedCombatMemberConcepts,204);
assert.equal(audit.unresolvedCombatMappings,63);
assert.equal(audit.status,'BLOCKED_NO_APPROVED_COMBAT_SET_EFFECT_OR_AUTHORITATIVE_MEMBERSHIP');
const actualSets=audit.forgeSetEvidence;
assert.equal(new Set(actualSets.map(s=>s.forgeSetId)).size,15);
assert.equal(new Set(actualSets.flatMap(s=>s.members.map(m=>m.pieceId))).size,42);
assert.ok(actualSets.every(s=>s.combatSetId===null&&
 s.effectiveBonuses.length===0&&
 s.status==='FORGE_IDENTITY_VERIFIED_EFFECTS_UNRECONCILED'));
assert.ok(actualSets.every(s=>s.members.length>=2&&
 s.members.every(m=>m.setId===s.forgeSetId&&m.tier===s.tier&&m.role===s.role)));
assert.ok(actualSets.every(s=>
 s.members.every(m=>V2_SERVER_RECIPES.some(r=>r.id===m.foundationRecipeId&&
 r.pieceId===m.pieceId&&r.route==='foundation'))));
assert.ok(actualSets.every(s=>
 new Set(s.members.map(m=>m.slot)).size===s.members.length),
 'no two pieces from one real Forge set may occupy the same equipment slot');
assert.equal(PLANNED_T1_T4_SETS_V2.length,48);
assert.equal(PLANNED_T1_T4_MEMBERS_V2.length,204);
const original=new Set(V2_SERVER_PIECES.map(p=>p.id));
for(const concept of PLANNED_T1_T4_MEMBERS_V2){
 assert.equal(original.has(concept.id),false,'draft item is NOT a persisted Forge item');
 assert.equal(concept.equippable,false);
 assert.equal(concept.combatReady,false);
 assert.equal(concept.craftable,false);
}
const first=actualSets[0];
const pair=first.members.slice(0,2).map(m=>m.pieceId);
assert.equal(pair.length,2);
const partial=reviewWornForgeSetSourcesV2(pair.slice(0,1));
const two=reviewWornForgeSetSourcesV2(pair);
assert.equal(partial.activeSetCounts[0].pieces,1);
assert.equal(two.activeSetCounts[0].pieces,2);
assert.equal(two.activeSetCounts[0].forgeSetId,first.forgeSetId);
assert.equal(two.activeSetCounts[0].combatSetId,null);
assert.equal(two.activeSetCounts[0].bonusUnlocks.length,0,
 'even two genuine set members grant NO unapproved authored Combat effects');
assert.equal(two.combatEffectsApplied,false);
assert.equal(two.requiresFullSetAndEffectSource,true);
assert.deepEqual(reviewWornForgeSetSourcesV2(pair),two);
const standAlone=V2_SERVER_PIECES.find(p=>!p.setId&&
 !first.members.some(m=>m.slot===p.slot));
if(!standAlone)throw Error('source fixture must have a distinct-slot standalone');
const mixed=reviewWornForgeSetSourcesV2([...pair.slice(0,1),standAlone.id]);
assert.equal(mixed.activeSetCounts[0].pieces,1,
 'nonset gear cannot count as an original Forge set member');
assert.throws(()=>reviewWornForgeSetSourcesV2([...pair,pair[0]]),
 /invalid_worn_snapshot/,'duplicate physical item copy must be rejected');
assert.throws(()=>reviewWornForgeSetSourcesV2(['EQ2_LAUNCH_T1_OATHPLATE_HELMET']),
 /unknown_or_conflicting_worn_piece/,
 'expanded unissued 204 proposed member IDs must never be equipment');
assert.throws(()=>reviewWornForgeSetSourcesV2(['EQ2_LEGACY_FAKE_ITEM']),
 /unknown_or_conflicting_worn_piece/,'legacy-lookalike cannot be rebranded EQ2');
const matchingSlot=V2_SERVER_PIECES.find(x=>x.id!==pair[0]&&
 x.slot===first.members[0].slot);
if(!matchingSlot)throw Error('need separate legitimate same-slot item fixture');
assert.throws(()=>reviewWornForgeSetSourcesV2([pair[0],matchingSlot.id]),
 /unknown_or_conflicting_worn_piece/,'two mutually exclusive slots cannot stack set counts');
const single=reviewWornForgeSetSourcesV2([standAlone.id]);
assert.equal(single.activeSetCounts.length,0);
assert.equal(single.combatEffectsApplied,false);
assert.throws(()=>reviewWornForgeSetSourcesV2(
 Array.from({length:11},()=>standAlone.id)),
 /invalid_worn_snapshot/,'above 10 slots forbidden');
console.log(JSON.stringify({
 scope:audit.scope,status:audit.status,
 realForgeSets:15,realForgeMembers:42,plannedCombatSets:48,
 plannedUnissuableMembers:204,unresolvedSetMappings:63,
 approvedLiveCombatSetBonuses:0,
 copyOrLegacySourcePromotions:0,
 releaseEligible:false,
}));
