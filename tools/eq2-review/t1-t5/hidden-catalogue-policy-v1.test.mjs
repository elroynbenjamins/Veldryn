import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EQUIPMENT_2_0_REVIEW_GUARDS,
  REVIEW_ONLY_EQUIPMENT_2_0_DENIED_ACTIONS,
  reviewEquipment2ReleaseDecision,
  publicEquipment2ReviewCatalogue,
  assertEquipment2ReviewCannotActivate
} from './hidden-catalogue-policy-v1.mjs';

const read=p=>readFileSync(p,'utf8');
const manifest=JSON.parse(read('docs/2-0/eq2-t1-t5-unified-hidden-review-catalogue-v1.json'));
const groups=x=>Object.fromEntries(Object.entries(Object.groupBy(x,x=>x.sourceGroup)).map(([k,v])=>[k,v.length]));
const tiers=x=>Object.fromEntries(Object.entries(Object.groupBy(x,x=>String(x.tier))).map(([k,v])=>[k,v.length]));
const requiredItemGroups={
  pinned_forge_169:169,expanded_48_set_204:204,
  inherited_rare_t5_10:10,
  regional_dungeon_premium:75,
  t5_bellwake_4:4,t5_combo_12:12,
  t5_crafted_armaments_13:13,
  t5_new_rare_10:10,t5_standard_51:51,
  unregistered_t2_t4_rare_blueprint_6:6
};
const requiredSetGroups={
  pinned_forge_169:15,expanded_48_set_204:48,
  inherited_rare_t5_10:2,
  regional_dungeon_premium:9,t5_bellwake_4:1,
  t5_combo_12:6,t5_new_rare_10:2,t5_standard_51:12
};
function validateCatalogue(data){
  assert.equal(data.releaseActivation,false);
  assert.equal(data.hideAllUntilCoordinatedV2,true);
  assert.equal(data.neverReadFromPublicRoutes,true);
  assert.equal(data.authority,'HIDDEN_REVIEW_DATA_ONLY_NOT_PLAYER_CATALOGUE');
  assert.equal(data.entries.length,554);
  assert.equal(data.sets.length,95);
  assert.deepEqual(groups(data.entries),requiredItemGroups);
  assert.deepEqual(groups(data.sets),requiredSetGroups);
  assert.deepEqual(tiers(data.entries),{'1':88,'2':121,'3':96,'4':124,'5':125});
  assert.deepEqual(tiers(data.sets),{'1':15,'2':18,'3':15,'4':21,'5':26});
  const used=new Set(),sets=new Map(),byId=new Map();
  for(const row of data.entries){
    assert.match(row.itemId,/^EQ2_[A-Z0-9_]+$/);
    assert.equal(used.has(row.itemId),false,'duplicate canonical item ID '+row.itemId);
    used.add(row.itemId);byId.set(row.itemId,row);
    assert(Number.isInteger(row.tier)&&row.tier>=1&&row.tier<=5);
    assert.equal(typeof row.name,'string'); assert(row.name.length>3);
    assert.equal(typeof row.slot,'string');assert(row.slot.length>=3);
    assert.equal(row.releaseState,'HIDDEN_REVIEW_ONLY');
    for(const k of ['canAppearInLiveCatalogue','mayMint','mayCraft','mayDrop','mayEquip','mayTrade','mayRenderInLiveUI','combatEnabled'])
      assert.equal(row[k],false,'releasing '+row.itemId+' via '+k);
    assert.equal(row.needsProductionSourceApproval,true);
    if(row.sourceType==='dungeon_boss_drop_only'){
      assert.match(row.dungeonId,/^EXP_00[135]$/);
      assert(row.bossName?.length>2);
      assert.equal(row.marketTradeCandidate,true);
      assert.equal(row.mayTrade,false);
    }
    if(row.sourceGroup==='expanded_48_set_204')assert.equal(row.sourceType,'structural_set_member_proposal');
    if(row.sourceGroup==='unregistered_t2_t4_rare_blueprint_6'){
      assert([2,3,4].includes(row.tier));
      assert.match(row.blueprintId,/^EQ2_BP_/);
    }
  }
  for(const set of data.sets){
    assert(!sets.has(set.setId),'duplicate set ID '+set.setId);
    sets.set(set.setId,set);
    assert.equal(set.itemCount,set.memberIds.length);
    assert.equal(set.setEffectsRuntime,false);
    assert.equal(new Set(set.memberIds).size,set.memberIds.length);
    for(const memberId of set.memberIds){
      const m=byId.get(memberId);
      assert(m,'orphan set member '+memberId);
      assert.equal(m.setId,set.setId);
      assert.equal(m.tier,set.tier);
      assert.equal(m.sourceGroup,set.sourceGroup);
    }
    if(set.sourceGroup==='expanded_48_set_204')
      assert.equal(set.status,'STRUCTURAL_ONLY_NO_AUTHORED_EQUIPMENT_SOURCE');
  }
  for(const [name,n] of Object.entries(requiredItemGroups)){
    assert.equal(data.summary.itemsBySource[name],n);
  }
  assert.equal(data.summary.totalReviewRows,554);
  assert.equal(data.summary.unregisteredItems,385);
  assert.equal(data.summary.totalSourceSetRecords,95);
  assert.equal(data.summary.zeroCanonicalIdCollisions,true);
  assert.equal(data.summary.allHidden,true);
  assert.equal(data.summary.allNonIssuable,true);
  return {itemCount:used.size,setCount:sets.size};
}
test('554 exact source item IDs, 95 structurally coherent set records, zero issued identities',()=>{
  assert.deepEqual(validateCatalogue(manifest),{itemCount:554,setCount:95});
});
test('source provenance metadata is pinned to actual remote source branch+blob, never inferred as approval',()=>{
  assert.equal(manifest.sources.length,4);
  for(const source of manifest.sources){
    assert.match(source.sha,/^[0-9a-f]{40}$/);
    assert(source.branch.startsWith('design/')||source.branch.startsWith('feature/'));
    assert(source.path.startsWith('docs/equipment-2-0/'));
    assert(Number(source.pr)>0);
  }
  assert(manifest.unresolved.some(x=>x.id==='ORIGINAL_15_VS_STRUCTURAL_48'));
  assert(manifest.unresolved.some(x=>x.id==='T5_TIER_RELEASE_DECISION'));
  assert(manifest.unresolved.some(x=>x.id==='SUNSCAR_T4_MARKET_V17_LEVEL_GATE'));
  assert(manifest.unresolved.some(x=>x.id==='RARITY_AFFIX_CP_SET_RUNTIME'));
  assert(manifest.unresolved.some(x=>x.id==='EXISTING_EQUIPMENT_GUARD'));
  assert(manifest.unresolved.some(x=>x.id==='OUT_OF_SCOPE_FUTURE_T7'&&x.excludedCount===25));
});
test('169 pinned Forge IDs appear in actual hidden independent server source files; none reminted',()=>{
 const originalServerFiles=[
  'backend/src/server/equipment/equipment-crafting-v2-manifest.ts',
  'backend/src/server/equipment/equipment-crafting-v2-expansion-manifest.ts',
  'backend/src/server/equipment/equipment-crafting-v2-armament-manifest.ts'
 ].map(read).join('\n');
 const pinned=manifest.entries.filter(x=>x.sourceGroup==='pinned_forge_169');
 assert.equal(pinned.length,169);
 for(const row of pinned){
  assert(originalServerFiles.includes('"'+row.itemId+'"')||originalServerFiles.includes("'"+row.itemId+"'"),
    'pinned original source identity no longer present '+row.itemId);
 }
});
test('compact Forge is not silently rewritten as 48 incompatible expanded families',()=>{
 const compact=manifest.sets.filter(x=>x.sourceGroup==='pinned_forge_169');
 const expanded=manifest.sets.filter(x=>x.sourceGroup==='expanded_48_set_204');
 assert.equal(compact.reduce((n,x)=>n+x.memberIds.length,0),42);
 assert.equal(expanded.reduce((n,x)=>n+x.memberIds.length,0),204);
 assert.equal(compact.filter(x=>x.tier===1).length,3);
 assert.equal(compact.filter(x=>x.tier===2).length,3);
 assert.equal(compact.filter(x=>x.tier===3).length,3);
 assert.equal(compact.filter(x=>x.tier===4).length,6);
 assert(expanded.every(x=>x.itemCount===3||x.itemCount===4||x.itemCount===6));
 for(const set of expanded)assert(!compact.some(x=>x.setId===set.setId));
});
test('T5 catalogue composition exactly 125 without double-counting new boss candidates',()=>{
 const t5=manifest.entries.filter(x=>x.tier===5);
 assert.deepEqual(groups(t5),{
  inherited_rare_t5_10:10,regional_dungeon_premium:25,
  t5_bellwake_4:4,t5_combo_12:12,t5_crafted_armaments_13:13,
  t5_new_rare_10:10,t5_standard_51:51
 });
 const t5Sets=manifest.sets.filter(x=>x.tier===5);
 assert.equal(t5Sets.length,26);
 assert.equal(t5Sets.filter(x=>x.sourceGroup==='regional_dungeon_premium').length,3);
 assert.equal(t5Sets.filter(x=>x.sourceGroup==='t5_standard_51').length,12);
 assert.equal(t5Sets.filter(x=>x.sourceGroup==='t5_new_rare_10'||x.sourceGroup==='inherited_rare_t5_10').length,4);
 assert.equal(t5Sets.filter(x=>x.sourceGroup==='t5_combo_12').length,6);
 assert.equal(t5Sets.filter(x=>x.sourceGroup==='t5_bellwake_4').length,1);
});
test('nine class weapons plus only four legal offhands in each proposed source',()=>{
 const dungeon=manifest.entries.filter(x=>x.sourceGroup==='regional_dungeon_premium');
 for(const id of ['EXP_001','EXP_003','EXP_005']){
   const items=dungeon.filter(x=>x.dungeonId===id);
   assert.equal(items.length,25);
   assert.equal(items.filter(x=>x.slot==='weapon').length,9);
   assert.equal(items.filter(x=>x.slot==='offhand').length,4);
   assert.equal(items.filter(x=>!['weapon','offhand'].includes(x.slot)).length,12);
   assert.deepEqual(items.filter(x=>x.slot==='offhand').map(x=>x.classId).sort(),
     ['BASTION','DAWNKEEPER','HEXWEAVER','IRONWARDEN']);
 }
 const craftedT5=manifest.entries.filter(x=>x.sourceGroup==='t5_crafted_armaments_13');
 assert.equal(craftedT5.filter(x=>x.slot==='weapon').length,9);
 assert.deepEqual(craftedT5.filter(x=>x.slot==='offhand').map(x=>x.classId).sort(),
   ['BASTION','DAWNKEEPER','HEXWEAVER','IRONWARDEN']);
 assert(!manifest.entries.some(x=>x.dungeonId==='EXP_007'||x.tier===7));
});
test('all equipment source operations are denied even if called with a known 2.0 item',()=>{
 const candidate=manifest.entries.find(x=>x.itemId==='EQ2_FIELDBORN_GUARD_HELMET');
 assert(candidate);
 assert.equal(Object.values(EQUIPMENT_2_0_REVIEW_GUARDS).some(x=>x!==false),false);
 assert.equal(EQUIPMENT_2_0_REVIEW_GUARDS.legacyEquipmentEverTradeable,false);
 assert.deepEqual(publicEquipment2ReviewCatalogue(),[]);
 for(const tier of [1,2,3,4,5]){
   for(const operation of REVIEW_ONLY_EQUIPMENT_2_0_DENIED_ACTIONS){
     const result=reviewEquipment2ReleaseDecision({tier,operation,itemId:candidate.itemId});
     assert.equal(result.allowed,false);
     assert.equal(result.reason,'equipment_2_0_not_released');
   }
 }
 assert.equal(reviewEquipment2ReleaseDecision({tier:7,operation:'equip'}).allowed,false);
 assert.equal(reviewEquipment2ReleaseDecision({tier:1,operation:'unsupported'}).allowed,false);
 assert.throws(()=>assertEquipment2ReviewCannotActivate('craft'),/equipment_2_0_not_released:craft/);
});
test('future rare/Market proposals never make legacy or original Forge QA copies tradeable',()=>{
 for(const x of manifest.entries.filter(x=>x.marketTradeCandidate===true)){
   assert.equal(x.mayTrade,false);
   assert.equal(x.mayEquip,false);
 }
 const serverGate=read('backend/src/server/equipment/equipment-crafting-v2-gate.ts');
 assert.match(serverGate,/export const EQUIPMENT_CRAFTING_V2_SERVER_RELEASED\s*=\s*false\s*;/);
 assert.match(serverGate,/throw new Error\('equipment_crafting_v2_not_released'\)/);
 const canonical=read('docs/2-0/EQUIPMENT_2_0_CANONICAL_APPROVAL_RECORD_20261124.md');
 assert(canonical.includes('REVIEW-ONLY, NON-ISSUABLE, NON-TRADEABLE, NON-EXECUTABLE'));
 assert(canonical.includes('Legacy/pre-2.0 equipment is permanently ineligible'));
 assert(canonical.includes('D10. Market eligibility contract'));
});
test('malformed catalogue clones are rejected by review validator',()=>{
 const altered=structuredClone(manifest);
 altered.entries[0].mayMint=true;
 assert.throws(()=>validateCatalogue(altered));
 const spoof=structuredClone(manifest);
 spoof.entries[3].itemId=spoof.entries[0].itemId;
 assert.throws(()=>validateCatalogue(spoof));
 const phantom=structuredClone(manifest);
 phantom.sets[0].memberIds.push('EQ2_FAKE_PIECE');
 phantom.sets[0].itemCount++;
 assert.throws(()=>validateCatalogue(phantom));
 const tampered=structuredClone(manifest);
 tampered.summary.unregisteredItems=384;
 assert.throws(()=>validateCatalogue(tampered));
 const exposed=structuredClone(manifest);
 exposed.hideAllUntilCoordinatedV2=false;
 assert.throws(()=>validateCatalogue(exposed));
});
console.log('EQ2 T1-T5 canonical hidden review: 554 distinct source IDs and 95 set records; no live mint/craft/equip/trade or UI authority.');
