import {strict as assert} from 'node:assert';
import type {CombatStats,CombatantDefinition} from '../../types';
import {launchPlayer} from '../../content/launch-combat';
import {CLASS_NAMES_V2,SKILL_IDENTITIES_V2,SPECIALIZATIONS_V2} from '../skill-catalog';
import {CLASS_ROLES_V2,type ClassIdV2} from '../build-contract';
import {simulateUnifiedEquipmentCombatV2,type TrustedEquipmentRuntimeV2} from '../unified-equipment-encounter';
import type {VerifiedSkillBuildV2} from '../skill-effects';
import type {ServerAffixPolicyV2} from '../equipment-affixes';

const statKeys:readonly (keyof CombatStats)[]=[
 'maxHp','attackPower','healingPower','defense','accuracy','evasion','critChance','critMultiplier','haste',
];
const ceilings=Object.fromEntries(statKeys.map(k=>[k,1e8])) as Record<keyof CombatStats,number>;
const affine=Object.fromEntries([
 'attack_pct','defense_pct','max_hp_pct','haste_pp','crit_rate_pp','crit_damage_pct',
 'accuracy_pp','evasion_pp','penetration_pp','ward_pp','shield_strength_pct',
 'class_healing_pct','hex_potency_pct',
].map(key=>[key,{min:.01,max:.10}])) as ServerAffixPolicyV2['limits'];
const target:CombatantDefinition={
 id:'TRAINING_ENEMY',name:'Synthetic training target',team:'enemies',role:'enemy',level:25,
 stats:{maxHp:150000,attackPower:80,healingPower:0,defense:90,
  accuracy:860,evasion:100,critChance:.03,critMultiplier:1.5,haste:0},
 basicAttackMs:2400,basicAttackCoeff:1,abilities:[],
};
const report:{classId:string;spec:string;role:string;damage:number;healing:number;taken:number}[]=[];
for(const classId of Object.keys(CLASS_NAMES_V2) as ClassIdV2[]){
 const role=CLASS_ROLES_V2[classId];
 const skills=SKILL_IDENTITIES_V2.filter(s=>s.classId===classId).slice(0,2);
 assert.equal(skills.length,2);
 for(const spec of SPECIALIZATIONS_V2.filter(s=>s.classId===classId)){
  const actor=launchPlayer(CLASS_NAMES_V2[classId],25);
  const classOnly={...actor,tags:[...(actor.tags??[]),'combat-v2-class-base-only']};
  const instanceId='SYNTHETIC_HELMET_'+classId,characterId='SYNTHETIC_'+classId;
  const itemId='V2_HELMET_'+classId;
  const build:VerifiedSkillBuildV2={
   actor:classOnly,
   verified:{classId,level:25,ownedInstanceIds:new Set([instanceId])},
   selected:{
    specializationId:spec.id,equipment:{helmet:instanceId},
    activeSkills:skills.map(s=>({skillId:s.id,variantId:s.variants[0].id})),
    talentRanks:{},signaturePassiveIds:[],capstoneId:null,
   },
   ownedItemsById:{
    [instanceId]:{
      instanceId,slot:'helmet',tier:'T1',eligibleRoles:[role],requiredLevel:1,
    },
   },
   setsById:{},
  };
  const runtime:TrustedEquipmentRuntimeV2={
   actorId:classOnly.id,characterId,
   instancesById:{[instanceId]:{id:instanceId,itemId,tier:'T1',
     ownerCharacterId:characterId,rarity:'common',quality:50}},
   definitionsByItemId:{[itemId]:{
     itemId,slot:'helmet',tier:'T1',
     primaryStats:role==='tank'?{maxHp:100}:role==='damage'?{attackPower:20}:{healingPower:20},
   }},
   affixesByInstanceId:{[instanceId]:{
     instanceId,slot:'helmet',tier:'T1',rarity:'common',quality:50,affixes:[],
   }},
   basePolicy:{rarityMultipliers:{common:1},qualityMultiplier:()=>1,ceilings},
   setsPolicy:{effectsByThreshold:{},ceilings},
   affixPolicy:{limits:affine,countsByTierRarity:{'T1:common':0},
     maxFinalHaste:1,maxFinalCritChance:1,maxFinalCritMultiplier:10},
  };
  const input={seed:'integrated-role-'+classId+'-'+spec.id,
    players:[classOnly],enemies:[target],maxDurationMs:15000};
  const before=JSON.stringify(classOnly);
  const a=simulateUnifiedEquipmentCombatV2(input,[build],[runtime],true);
  const b=simulateUnifiedEquipmentCombatV2(input,[build],[runtime],true);
  assert.deepEqual(a,b,'Combined class/gear/enemy replay must be deterministic '+spec.id);
  assert.equal(JSON.stringify(classOnly),before,'Never mutate the original class actor');
  const result=a.combat.players[0];
  assert.equal(result.definition.classId,classOnly.classId);
  assert.equal(result.definition.role,role);
  assert.ok(result.definition.tags?.includes('combat-v2-affixes-applied'));
  assert.equal(a.equipmentEvidence[0].baseSources.length,1);
  assert.equal(a.equipmentEvidence[0].affixSources.length,0);
  assert.equal(a.equipmentEvidence[0].setEffects.length,0);
  assert.ok(Number.isFinite(result.damageDone)&&result.damageDone>=0);
  assert.ok(Number.isFinite(result.healingDone)&&result.healingDone>=0);
  assert.ok(Number.isFinite(result.damageTaken)&&result.damageTaken>=0);
  assert.ok(a.combat.events.length<5000,'Unbounded proc recursion '+spec.id);
  report.push({classId,spec:spec.id,role,damage:Math.round(result.damageDone),
    healing:Math.round(result.healingDone),taken:Math.round(result.damageTaken)});
 }
}
assert.equal(report.length,18);
assert.equal(report.filter(x=>x.role==='tank').length,6);
assert.equal(report.filter(x=>x.role==='damage').length,8);
assert.equal(report.filter(x=>x.role==='support').length,4);
console.log('Synthetic full-pipeline role fixture (not final DPS tuning):');
console.log(JSON.stringify(report));
console.log('PASS: 9 classes, 18 specs, trusted 1-stat gear, and full-pipeline role/seed safeguards');
