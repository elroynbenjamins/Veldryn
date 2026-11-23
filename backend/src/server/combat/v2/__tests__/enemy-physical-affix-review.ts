import {strict as assert} from 'node:assert';
import {launchPlayer} from '../../content/launch-combat';
import type {CombatInput,CombatantDefinition} from '../../types';
import {issueEnemyV2EngineAuthority,ENEMY_V2_ENGINE_RULESET} from '../enemy-engine-authority';
import {issueAuthoredEnemyPhysicalResistancesV2,authorizeAuthoredEnemyPhysicalResistancesV2,REVIEW_BOSS_PHYSICAL_RESISTANCE_V2} from '../enemy-physical-resistance-authority';
import {reviewPhysicalAffixEligibilityV2,PHYSICAL_AFFIX_ACTIVATED_V2} from '../equipment-physical-affix-review';
import {V2_SERVER_PIECES} from '../../../equipment/equipment-crafting-v2-manifest';

const bossIds=['BOSS_EXP_ROOT','BOSS_EXP_BELL','BOSS_EXP_SOLAR','BOSS_EXP_SPHINX','BOSS_EXP_BELLBEAST','BOSS_EXP_CANTOR'] as const;
assert.deepEqual(Object.keys(REVIEW_BOSS_PHYSICAL_RESISTANCE_V2).sort(),[...bossIds].sort());
const player:CombatantDefinition={...launchPlayer('Ironwarden',30),id:'P_AUTH',combatV2:{version:2,resource:'guard',specializationId:'test-only'},tags:['combat-v2']};
const base:CombatantDefinition={id:'BOSS_EXP_ROOT',name:'Root',team:'enemies',role:'enemy',level:30,boss:true,
 stats:{maxHp:1e6,attackPower:20,healingPower:0,defense:250,accuracy:300,evasion:0,critChance:0,critMultiplier:1.5,haste:0},
 abilities:[],basicAttackMs:3000,basicAttackCoeff:.5,
 tags:['enemy-v2:kit:v1','enemy-v2:boss-profile:asterfall-1']};
const fight:CombatInput={seed:'long-persisted-test-seed',players:[player],enemies:[base]};
function authorized(input:CombatInput) {
 return issueEnemyV2EngineAuthority({source:'server-persisted-v2',version:2,
  ruleset:ENEMY_V2_ENGINE_RULESET,mode:'solo',encounterId:'TEST_ENCOUNTER',revision:1,
  seed:input.seed,playerIds:[player.id],enemyIds:input.enemies.map(e=>e.id),
  bossIds:input.enemies.filter(e=>e.boss).map(e=>e.id)},input,
  ()=>true /* QA-only synthetic approved store; never install this on a route */);
}
const token=issueAuthoredEnemyPhysicalResistancesV2(fight,authorized(fight));
const profile=authorizeAuthoredEnemyPhysicalResistancesV2(fight,token);
assert.equal(profile(base.id).blunt,-.10);
assert.equal(profile(base.id).slashing,.08);
assert.deepEqual(profile('UNLISTED'),{slashing:0,piercing:0,blunt:0});
assert.throws(()=>authorizeAuthoredEnemyPhysicalResistancesV2({...fight,seed:'changed'},token),/stale_or_forged/);
assert.throws(()=>issueAuthoredEnemyPhysicalResistancesV2({...fight,seed:'changed'},authorized(fight)),/scope_does_not_match_combat_input/);
assert.throws(()=>issueAuthoredEnemyPhysicalResistancesV2({...fight,enemies:[{...base,tags:[]}]},authorized({...fight,enemies:[{...base,tags:[]}]})),/missing_authenticated_kit_tag/);
assert.throws(()=>issueAuthoredEnemyPhysicalResistancesV2({...fight,enemies:[{...base,id:'BOSS_INVENTED'}]},authorized({...fight,enemies:[{...base,id:'BOSS_INVENTED'}]})),/boss_not_authored/);
assert.throws(()=>issueAuthoredEnemyPhysicalResistancesV2({...fight,enemies:[{...base,tags:['enemy-v2:kit:v1','enemy-v2:boss-profile:regional-1']}]},authorized({...fight,enemies:[{...base,tags:['enemy-v2:kit:v1','enemy-v2:boss-profile:regional-1']}]})),/boss_profile_tag_mismatch/);
assert.equal(PHYSICAL_AFFIX_ACTIVATED_V2,false);
assert.equal(V2_SERVER_PIECES.length,169);
for(const item of V2_SERVER_PIECES)for(const type of ['blunt','slashing','piercing'] as const){
 const off=reviewPhysicalAffixEligibilityV2(item.id,'physical_type_damage_pct',type);
 if(off){assert.equal(item.slot,'weapon');assert.ok(off.minPercent>0&&off.maxPercent<=5);assert.equal(off.competingExistingAffixRequired,true);}
 const def=reviewPhysicalAffixEligibilityV2(item.id,'physical_type_resistance_pct',type);
 if(def){assert.ok(['helmet','chest','legs','boots','cape','offhand'].includes(item.slot));assert.ok(def.minPercent>0&&def.maxPercent<=3);}
}
assert.equal(reviewPhysicalAffixEligibilityV2('EQ2_WEAPON_T1_HEXWEAVER','physical_type_damage_pct','blunt'),null);
assert.equal(reviewPhysicalAffixEligibilityV2('EQ2_LAUNCH_T1_OATHPLATE_HELMET','physical_type_resistance_pct','blunt'),null);
assert.equal(reviewPhysicalAffixEligibilityV2('EQ2_RARE_T5_CITADEL_HELMET','physical_type_resistance_pct','blunt'),null);
assert.equal(reviewPhysicalAffixEligibilityV2('NOT_REAL','physical_type_damage_pct','piercing'),null);
console.log('PASS enemy subtype signed-scope and six authored boss candidates; Forge physical affix candidate eligibility only');
