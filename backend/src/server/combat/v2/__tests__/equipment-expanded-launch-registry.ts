import {strict as assert} from 'node:assert';
import {V2_SERVER_PIECES,V2_SERVER_RECIPES} from '../../../equipment/equipment-crafting-v2-manifest';
import {SET_FAMILIES_V2,TIERED_SETS_V2} from '../set-catalog';
import {
 EQUIPMENT_COMBAT_V2_LAUNCH_SCOPE,
 PLANNED_T1_T4_SETS_V2,PLANNED_T1_T4_MEMBERS_V2,
 auditUnifiedSetLaunchV2,
} from '../equipment-expanded-launch-registry';

const audit=auditUnifiedSetLaunchV2();
assert.equal(audit.policy,EQUIPMENT_COMBAT_V2_LAUNCH_SCOPE);
assert.equal(SET_FAMILIES_V2.length,12);
assert.equal(TIERED_SETS_V2.length,60);
assert.equal(audit.launchTieredSetConcepts,48);
assert.equal(audit.futureT5SetConcepts,12);
assert.equal(audit.launchMemberConcepts,204);
assert.equal(audit.launchBonusConcepts,108);
assert.equal(audit.existingForgeItems,169);
assert.equal(audit.existingForgeRecipes,338);
assert.equal(audit.existingForgeNamedSets,15);
assert.equal(audit.existingForgeSetMemberPieces,42);
assert.equal(audit.existingForgeWithoutSet,127);
assert.equal(audit.unresolvedCanonicalSetIds,48);
assert.equal(audit.launchDraftItemIdCollisions,0);
assert.equal(audit.status,'BLOCKED_UNTIL_ITEM_SOURCES_AND_EFFECTS');
assert.equal(V2_SERVER_PIECES.length,169);
assert.equal(V2_SERVER_RECIPES.length,338);

const actual=new Set(V2_SERVER_PIECES.map(p=>p.id));
const staged=new Set(PLANNED_T1_T4_MEMBERS_V2.map(p=>p.id));
assert.equal(staged.size,204,'204 unique member IDs, not repeated alternative routes');
for(const item of PLANNED_T1_T4_MEMBERS_V2){
 assert.equal(item.stage,'UNISSUED_CONCEPT');
 assert.equal(item.combatReady,false);
 assert.equal(item.craftable,false);
 assert.equal(item.lootEligible,false);
 assert.equal(item.equippable,false);
 assert.ok(!actual.has(item.id),'Never reuse an existing Forge piece ID to rebrand its set');
 assert.ok(/^EQ2_LAUNCH_T[1-4]_[A-Z0-9_]+$/.test(item.id));
 assert.ok(item.setId.startsWith('eq2_'+item.tier.toLowerCase()+'_'));
}
const seen=new Set<string>();
for(const set of PLANNED_T1_T4_SETS_V2){
 assert.ok(!seen.has(set.id),'Tiered sets must not duplicate');
 seen.add(set.id);
 assert.ok(set.stage==='UNISSUED_CONCEPT'&&!set.combatReady);
 assert.ok(!set.id.includes('t5'),'T5 is a future structural tier');
 assert.ok(set.memberIds.every(id=>staged.has(id)));
 assert.ok(set.bonusConcepts.length===set.thresholds.length);
 assert.ok(set.thresholds.every(t=>t>=2&&t<=set.memberIds.length));
 assert.ok(set.bonusConcepts.every(b=>b.runtime==='unimplemented'&&
  b.coefficients==='unset_pending_benchmark'));
}
const perTier=Object.fromEntries(['T1','T2','T3','T4'].map(t=>[
 t,PLANNED_T1_T4_MEMBERS_V2.filter(x=>x.tier===t).length,
]));
assert.deepEqual(perTier,{T1:51,T2:51,T3:51,T4:51});
for(const role of ['tank','damage','support']){
 for(const tier of ['T1','T2','T3','T4']){
  assert.equal(PLANNED_T1_T4_MEMBERS_V2.filter(x=>x.tier===tier&&x.role===role).length,17);
 }
}
const six=PLANNED_T1_T4_SETS_V2.filter(x=>x.memberIds.length===6);
assert.equal(six.length,12,'3 six-piece concepts at each of 4 tiers');
assert.ok(six.every(s=>s.thresholds.includes(6)));
assert.equal(new Set(PLANNED_T1_T4_SETS_V2.map(x=>x.familyId)).size,12);
assert.ok(PLANNED_T1_T4_SETS_V2.some(s=>s.bonusConcepts.some(x=>
 x.mechanic==='reflect_direct_hp_loss'&&s.familyId==='bloodsteel')));
assert.ok(PLANNED_T1_T4_SETS_V2.some(s=>s.bonusConcepts.some(x=>
 x.mechanic==='party_ward_credited'&&s.familyId==='rootshield')));
assert.ok(PLANNED_T1_T4_SETS_V2.some(s=>s.bonusConcepts.some(x=>
 x.mechanic==='burst_window_direct_cast'&&s.familyId==='breakerforge')));

console.log('PASS: 169 real old EQ2 craft templates + 48 T1-T4 structural set concepts, '+
 '204 unique unissued draft set-piece identities, 108 unfinished bonus concepts; '+
 'zero item/bonus/loot issuance');
