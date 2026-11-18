import {strict as assert} from 'node:assert';
import {launchPlayer} from '../../content/launch-combat';
import {CLASS_NAMES_V2} from '../skill-catalog';
import {CLASS_ROLES_V2,type ClassIdV2} from '../build-contract';
import {issueClassOnlyActorV2,type ApprovedClassBaselinePolicyV2} from '../class-baseline';

const keys=Object.keys(CLASS_NAMES_V2) as ClassIdV2[];
assert.equal(keys.length,9);
const syntheticStats={
 maxHp:1200,attackPower:52,healingPower:40,defense:80,
 accuracy:650,evasion:130,critChance:.06,critMultiplier:1.5,haste:.03,
};
for(const cls of keys){
 const source=launchPlayer(CLASS_NAMES_V2[cls],25);
 const sourceBefore=JSON.stringify(source);
 const altered={
  ...source,
  stats:{...source.stats,attackPower:999999,maxHp:999999},
  effectGems:[{id:'poison-from-untrusted-gear'}] as unknown as typeof source.effectGems,
  alchemyModifiers:{outgoing:99,incoming:99,healing:99,shielding:99},
  tags:['legacy-equipment-applied','legacy-buff'],
 };
 const profile={
  classId:cls,minLevel:1,maxLevel:75,
  statsAtLevel:(level:number)=>({...syntheticStats,maxHp:syntheticStats.maxHp+level*10}),
  basicAttackMs:2100,basicAttackCoeff:.55,
  abilities:source.abilities,
 };
 const policy:ApprovedClassBaselinePolicyV2={
  version:'staging-test-profile-v1',profiles:{[cls]:profile},
 };
 const verified={classId:cls,level:25,ownedInstanceIds:new Set<string>()};
 const result=issueClassOnlyActorV2(altered,verified,policy);
 assert.equal(result.id,source.id);
 assert.equal(result.classId,CLASS_NAMES_V2[cls]);
 assert.equal(result.role,CLASS_ROLES_V2[cls]);
 assert.equal(result.level,25);
 assert.equal(result.stats.attackPower,52,'Source gear-inflated attack must be discarded');
 assert.equal(result.stats.maxHp,1450,'Authoritative level curve must be the sole stat source');
 assert.equal(result.basicAttackMs,2100);
 assert.equal(result.basicAttackCoeff,.55);
 assert.equal(result.combatV2?.version,2);
 assert.deepEqual(result.tags,['combat-v2-class-base-only']);
 assert.equal(result.effectGems,undefined,'Never copy legacy gem effects');
 assert.equal(result.alchemyModifiers,undefined,'Never carry legacy alchemy into new base');
 assert.deepEqual(result.abilities,source.abilities,'Only server-catalogue abilities are copied');
 assert.notEqual(result.abilities[0],source.abilities[0],'Ability identity must be detached');
 assert.notEqual(result.abilities[0].effects[0],source.abilities[0].effects[0]);
 assert.equal(JSON.stringify(source),sourceBefore);
 assert.throws(()=>issueClassOnlyActorV2(result,verified,policy),
  /source_already_compiled/,'Reissuing a compiled actor must be rejected');
 assert.throws(()=>issueClassOnlyActorV2({...source,level:24},verified,policy),
  /actor_identity_mismatch/);
 assert.throws(()=>issueClassOnlyActorV2(source,{...verified,level:76},policy),
  /actor_identity_mismatch|approved_class_level_missing/);
 assert.throws(()=>issueClassOnlyActorV2(source,verified,{
  version:'staging-test-profile-v1',profiles:{},
 }),/approved_class_level_missing/);
 const broken:ApprovedClassBaselinePolicyV2={
  version:'staging-test-profile-v1',
  profiles:{[cls]:{...profile,statsAtLevel:()=>({...syntheticStats,defense:NaN})}},
 };
 assert.throws(()=>issueClassOnlyActorV2(source,verified,broken),
  /invalid_class_level_stats/);
 assert.throws(()=>issueClassOnlyActorV2({...source,
  combatV2:{version:2,resource:'guard',specializationId:'injected'},
 },verified,policy),/source_already_compiled/);
 assert.throws(()=>issueClassOnlyActorV2({...source,
  tags:['combat-v2-class-base-only'],
 },verified,policy),/source_already_compiled/);
}
console.log('PASS: nine class-only baseline profiles discard legacy stats, gems, alchemy and forged tags');
