import {strict as assert} from 'node:assert';
import type {CombatStats} from '../../types';
import {inspectFrozenForgeCombatHandoffV2,
 type FrozenForgeCombatHandoffEvidenceV2,
 FROZEN_FORGE_HANDOFF_EVIDENCE_V2,
 FROZEN_FORGE_HANDOFF_SET_BLOCK_V2,
 FROZEN_FORGE_HANDOFF_AFFIX_BLOCK_V2,
} from '../equipment-frozen-forge-handoff-audit';

const stats:CombatStats={
 maxHp:1100,attackPower:170,healingPower:50,defense:75,
 accuracy:1000,evasion:40,critChance:.05,critMultiplier:1.5,haste:0,
};
const ids=['REAL_SOURCE_SAMPLE_A','REAL_SOURCE_SAMPLE_B'];
const evidence:FrozenForgeCombatHandoffEvidenceV2={
 source:FROZEN_FORGE_HANDOFF_EVIDENCE_V2,
 actorId:'SERVER_PLAYER_IRONWARDEN',
 receiptDigest:'a'.repeat(64),
 equippedInstanceIds:[...ids],
 items:[
  {instanceId:ids[0],pieceId:'EQ2_FIELDBORN_GUARD_HELMET',
   tier:1,rarity:'rare',quality:85,
   scaledBaseStats:{attack:0,defense:41.55,hp:0}},
  {instanceId:ids[1],pieceId:'EQ2_FIELDBORN_GUARD_CHEST',
   tier:1,rarity:'rare',quality:85,
   scaledBaseStats:{attack:10.125,defense:0,hp:180.4}},
 ],
 stages:{
  afterSkills:{...stats},
  afterFrozenBase:{...stats,maxHp:1280.4,attackPower:180.125,defense:116.55},
  afterForgeAffixes:{...stats,maxHp:1280.4,attackPower:180.125,defense:122.3775},
 },
 affixSources:[{instanceId:ids[0],id:'defense_pct',value:.05,
  unit:'relative_percent'}],
 setBonuses:FROZEN_FORGE_HANDOFF_SET_BLOCK_V2,
 unsupportedForgeAffixes:FROZEN_FORGE_HANDOFF_AFFIX_BLOCK_V2,
};
const check=(item:FrozenForgeCombatHandoffEvidenceV2=evidence,
 expectedIds:readonly string[]=ids,base:CombatStats=stats,
 actorId=evidence.actorId)=>inspectFrozenForgeCombatHandoffV2(
 actorId,expectedIds,base,item);
const a=check(),b=check();
assert.deepEqual(a,b);
assert.deepEqual(a.frozenBaseDelta,{attack:10.125,defense:41.55,hp:180.4});
assert.equal(a.equipmentCount,2);
assert.equal(a.doubleScaled,false);
assert.equal(a.canAuthorizeCombat,false);
assert.equal(a.canGrantLoot,false);
assert.equal(a.canListOnMarket,false);
assert.equal(a.releaseApproved,false);
assert.equal(a.requiresAuthenticatedForgeCustodyAndSetPolicy,true);
assert.deepEqual(check({...evidence,
 equippedInstanceIds:[...ids].reverse(),
 items:[...evidence.items].reverse(),
}),a,'Reordering proven item identities must preserve source arithmetic');
const deny=(source:FrozenForgeCombatHandoffEvidenceV2,err:RegExp)=>
 assert.throws(()=>check(source),err);
deny({...evidence,source:'legacy_gear' as typeof evidence.source},
 /unapproved_or_missing_forge_evidence/);
deny({...evidence,receiptDigest:'not-authenticated'},/unapproved_or_missing_forge_evidence/);
deny({...evidence,actorId:'OTHER_ACTOR'},/unapproved_or_missing_forge_evidence/);
deny({...evidence,setBonuses:'ENABLED' as typeof evidence.setBonuses},
 /unapproved_or_missing_forge_evidence/);
deny({...evidence,unsupportedForgeAffixes:'IGNORED' as typeof evidence.unsupportedForgeAffixes},
 /unapproved_or_missing_forge_evidence/);
deny({...evidence,equippedInstanceIds:[ids[0],ids[0]]},
 /forged_or_missing_source_item/);
deny({...evidence,equippedInstanceIds:[ids[0],'FOREIGN_BANK_COPY']},
 /forged_or_missing_source_item/);
deny({...evidence,items:[evidence.items[0],evidence.items[0]]},
 /invalid_frozen_mint_source/);
deny({...evidence,items:[{...evidence.items[0],tier:6},evidence.items[1]]},
 /invalid_frozen_mint_source/);
deny({...evidence,items:[{...evidence.items[0],quality:101},evidence.items[1]]},
 /invalid_frozen_mint_source/);
deny({...evidence,items:[{...evidence.items[0],
 scaledBaseStats:{attack:NaN,defense:20,hp:0}},evidence.items[1]]},
 /invalid_frozen_mint_stat/);
deny({...evidence,items:[{...evidence.items[0],
 scaledBaseStats:{attack:0,defense:0,hp:0}},evidence.items[1]]},
 /empty_frozen_mint_stats/);
deny({...evidence,stages:{...evidence.stages,afterSkills:{
 ...stats,attackPower:180,
}}},/verified_skill_baseline_mismatch/);
// Double applying rarity/quality is NOT allowed even if numerically small.
deny({...evidence,stages:{...evidence.stages,afterFrozenBase:{
 ...evidence.stages.afterFrozenBase,defense:118.225,
}}},/frozen_forge_scaled_twice_or_stat_basis_drift/);
deny({...evidence,stages:{...evidence.stages,afterFrozenBase:{
 ...evidence.stages.afterFrozenBase,healingPower:55,
}}},/frozen_forge_scaled_twice_or_stat_basis_drift/);
deny({...evidence,affixSources:[{instanceId:'BANKED',
 id:'defense_pct',value:.05,unit:'relative_percent'}]},
 /unverified_forge_affix_source_shape/);
deny({...evidence,affixSources:[{instanceId:ids[0],
 id:'defense_pct',value:5,unit:'relative_percent'}]},
 /unverified_forge_affix_source_shape/);
assert.throws(()=>check(evidence,[ids[0],ids[0]]),/duplicate_selected_equipment_copy/);
assert.throws(()=>check(evidence,['UNOWNED_A',ids[1]]),
 /forged_or_missing_source_item/);
assert.throws(()=>check(evidence,ids,{...stats,maxHp:1200}),
 /verified_skill_baseline_mismatch/);
assert.throws(()=>check(evidence,ids,stats,'OTHER_ACTOR'),
 /unapproved_or_missing_forge_evidence/);
assert.throws(()=>check(evidence,[]),/invalid_server_compiled_build_reference/);
// A purely syntactically matching digest does NOT authorize the account,
// item sale, rewards, live encounter, or equip itself.
console.log('PASS: frozen Forge pre-scaled cross-branch source arithmetic, identical skills baseline, 2-copy receipt shape and 22+ fail-closed reviews; release authorization always FALSE');
