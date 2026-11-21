import {strict as assert} from 'node:assert';
import type {CombatInput,CombatantDefinition,CombatStats} from '../../types';
import {launchPlayer} from '../../content/launch-combat';
import {CLASS_NAMES_V2,SKILL_IDENTITIES_V2,SKILLS_V2,SPECIALIZATIONS_V2} from '../skill-catalog';
import {CLASS_ROLES_V2,type ClassIdV2,type GearSlotV2} from '../build-contract';
import {equipmentQualityMultiplierV2} from '../equipment-scaling-policy';
import {
 simulateUnifiedEquipmentCombatV2,type TrustedEquipmentRuntimeV2,
 type TrustedPersistedEnemyKitV2
} from '../unified-equipment-encounter';
import {prepareSoloEnemyKitsV2,type PersistedEnemyKitV2} from '../enemy-kit-composer';
import {ENEMY_V2_RULESET} from '../../enemy-v2-prototype';
import {
 compileExactEquipmentTraitSourceV2,EQ2_REVIEW_ROLL_POLICY,
 type FrozenEquipmentTraitItemReceiptV2,type TrustedEquipmentTraitReceiptPortV2
} from '../equipment-trait-exact-copy-adapter';
import type {VerifiedSkillBuildV2} from '../skill-effects';

const bosses=[
 {id:'BOSS_EXP_ROOT',region:'asterfall',name:'Asterfall Root',tier:2,level:25},
 {id:'BOSS_EXP_BELL',region:'asterfall',name:'Asterfall Bell',tier:2,level:25},
 {id:'BOSS_EXP_SOLAR',region:'sunscar',name:'The Buried Heliarch',tier:3,level:40},
 {id:'BOSS_EXP_SPHINX',region:'sunscar',name:'The Veiled Sphinx',tier:3,level:40},
 {id:'BOSS_EXP_BELLBEAST',region:'frostmarch',name:'The Bellbeast of Shiverlake',tier:4,level:60},
 {id:'BOSS_EXP_CANTOR',region:'frostmarch',name:'The Frozen Cantor',tier:4,level:60},
] as const;
const keys:readonly (keyof CombatStats)[]=[
 'maxHp','attackPower','healingPower','defense','accuracy','evasion','critChance','critMultiplier','haste',
];
const ceilings=Object.fromEntries(keys.map(key=>[key,1e8])) as Record<keyof CombatStats,number>;
const pctLimits=Object.fromEntries([
 'attack_pct','defense_pct','max_hp_pct','haste_pp','crit_rate_pp','crit_damage_pct',
 'accuracy_pp','evasion_pp','penetration_pp','ward_pp','shield_strength_pct',
 'class_healing_pct','hex_potency_pct',
].map(id=>[id,{min:0,max:.10}])) as TrustedEquipmentRuntimeV2['affixPolicy']['limits'];
const enemy=(info:typeof bosses[number]):CombatantDefinition=>({
 id:info.id,name:info.name,team:'enemies',role:'enemy',level:info.level,boss:true,
 stats:{maxHp:150000,attackPower:100,healingPower:0,defense:120,
  accuracy:1600,evasion:100,critChance:.05,critMultiplier:1.5,haste:0},
 basicAttackMs:2400,basicAttackCoeff:.8,abilities:[],tags:[],
});
function fixture(classId:ClassIdV2,which:0|1,boss:typeof bosses[number]){
 const role=CLASS_ROLES_V2[classId],tier='T'+boss.tier as 'T2'|'T3'|'T4';
 const actor={...launchPlayer(CLASS_NAMES_V2[classId],boss.level),id:'QA_PLAYER_'+classId};
 const stats={...actor.stats};
 const spec=SPECIALIZATIONS_V2.filter(s=>s.classId===classId)[which];
 const selectedSkills=SKILL_IDENTITIES_V2.filter(s=>s.classId===classId&&
  SKILLS_V2.some(item=>item.id===s.id&&item.unlockLevel<=boss.level)).slice(0,2);
 const slot:GearSlotV2=role==='tank'?'offhand':'weapon';
 const copyId='QA_ITEM_'+classId, itemId='QA_EQUIP_'+classId, characterId='QA_CHAR_'+classId;
 const build:VerifiedSkillBuildV2={
  actor,verified:{classId,level:boss.level,ownedInstanceIds:new Set([copyId])},
  selected:{specializationId:spec.id,
   equipment:{[slot]:copyId},
   activeSkills:selectedSkills.map(s=>({skillId:s.id,variantId:s.variants[0].id})),
   talentRanks:{},signaturePassiveIds:[],capstoneId:boss.level>=50?spec.capstoneId:null,
  },
  ownedItemsById:{[copyId]:{
   instanceId:copyId,slot,tier,eligibleRoles:[role],requiredLevel:1,
  }},setsById:{},
 };
 const runtime:TrustedEquipmentRuntimeV2={
  actorId:actor.id,characterId,
  classBaselinePolicy:{version:'QA_CLASS_BOSS_PROFILE',profiles:{
   [classId]:{classId,minLevel:1,maxLevel:75,
    statsAtLevel:()=>({...stats}),basicAttackMs:actor.basicAttackMs,
    basicAttackCoeff:actor.basicAttackCoeff,abilities:actor.abilities,
   },
  }},
  instancesById:{[copyId]:{
   id:copyId,itemId,ownerCharacterId:characterId,tier,rarity:'epic',quality:65,
  }},
  definitionsByItemId:{[itemId]:{
   itemId,tier,slot,primaryStats:role==='tank'?{defense:boss.tier*20}:
    role==='support'?{healingPower:boss.tier*20}:{attackPower:boss.tier*20},
  }},
  affixesByInstanceId:{[copyId]:{
   instanceId:copyId,slot,tier,rarity:'epic',quality:65,affixes:[],
  }},
  basePolicy:{rarityMultipliers:{common:1,epic:1.2},
   qualityMultiplier:equipmentQualityMultiplierV2,ceilings},
  rarityPolicy:{version:'QA_APPROVED_LADDER',order:['common','epic'],
   multipliers:{common:1,epic:1.2}},
  setsPolicy:{effectsByThreshold:{},ceilings},
  affixPolicy:{limits:pctLimits,countsByTierRarity:{[tier+':epic']:0},
   maxFinalHaste:10,maxFinalCritChance:10,maxFinalCritMultiplier:10},
 };
 const kind=role==='tank'?'reflect_damage_pct':'ability_damage_pct';
 const amounts={T2:{reflect_damage_pct:.8,ability_damage_pct:2},
  T3:{reflect_damage_pct:1.1,ability_damage_pct:3},
  T4:{reflect_damage_pct:1.5,ability_damage_pct:3.5}};
 const percent=amounts[tier][kind];
 const signatureTraitId=role==='tank'?'thornbound_riposte':
  role==='damage'?'echoing_strike':'restorative_bloom';
 const acquisition=role==='tank'?'dungeon_boss_chest':'rare_blueprint_craft';
 const receipt:FrozenEquipmentTraitItemReceiptV2={
  source:'server-persisted-exact-copy-v2',policy:EQ2_REVIEW_ROLL_POLICY,
  instanceId:copyId,itemId,ownerCharacterId:characterId,slot,tier,
  rarity:'epic',quality:65,acquisition,
  newAffixRolls:[{id:kind,percent}],signatureTraitId,
 };
 const port:TrustedEquipmentTraitReceiptPortV2={
  accountId:'QA_ACCOUNT_'+classId,characterId,receiptRevision:1,
  receiptsByInstanceId:{[copyId]:receipt},
  selectedTraitInstanceIds:[copyId],
  verifyPersisted:()=>false,
 };
 const predicted=compileExactEquipmentTraitSourceV2(build,runtime,port);
 const verifiedPort={...port,verifyPersisted:(sources:readonly typeof predicted[],digest:string)=>
  sources.length===1&&sources[0].equipmentReceiptDigest===predicted.equipmentReceiptDigest&&
  /^[a-f0-9]{64}$/.test(digest)};
 const baseEnemy=enemy(boss);
 const seed='QA_EQ2_'+classId+'_'+which+'_'+boss.id;
 const input:CombatInput={seed,players:[actor],enemies:[baseEnemy],maxDurationMs:7000};
 const candidate=prepareSoloEnemyKitsV2([baseEnemy],{
  ruleset:ENEMY_V2_RULESET,serverSeed:seed,encounterId:'QA_ENC_'+classId+'_'+which,
  region:boss.region,equipmentTier:boss.tier,eliteEnemyIds:[],
 });
 const snapshot:PersistedEnemyKitV2={...candidate,source:'server-persisted-v2',revision:1};
 const storedKit:TrustedPersistedEnemyKitV2={
  snapshot,verifyPersisted:(_row,digest)=>/^[0-9a-f]{64}$/.test(digest),
 };
 return {build,runtime,port:verifiedPort,input,storedKit,receipt,expected:predicted};
}
let runs=0,traitEvents=0,sourceTests=0;
for(const classId of Object.keys(CLASS_NAMES_V2) as ClassIdV2[]){
 for(const which of [0,1] as const){
  for(const boss of bosses){
   const {build,runtime,port,input,storedKit,expected}=fixture(classId,which,boss);
   const before=JSON.stringify(input);
   const first=simulateUnifiedEquipmentCombatV2(input,[build],[runtime],true,storedKit,port);
   const second=simulateUnifiedEquipmentCombatV2(input,[build],[runtime],true,storedKit,port);
   assert.deepEqual(first,second,'same signed inputs must replay exactly '+classId+boss.id);
   assert.equal(JSON.stringify(input),before,'source input must not mutate');
   assert.equal(first.combat.players[0].definition.combatV2?.version,2);
   assert.equal(first.equipmentEvidence.length,1);
   assert.ok(first.enemyMechanicLabels.length>=1,'authored regional boss kit must be used');
   assert.ok(first.combat.events.some(e=>e.type==='combat_start'));
   assert.ok(first.combat.events.some(e=>e.actorId===input.players[0].id&&
    (e.type==='damage'||e.type==='cast_start'||e.type==='cast_complete')),
    'Real class should execute original attacks or authored abilities');
   assert.equal(expected.equipmentReceiptDigest.length,64);
   traitEvents+=first.combat.events.filter(e=>e.type==='equipment_trait_trigger').length;
   runs++;if(which!==0||classId!=='IRONWARDEN')continue;
   const tampered={...port,receiptsByInstanceId:{
     ...port.receiptsByInstanceId,
     [Object.keys(port.receiptsByInstanceId)[0]]:{
      ...Object.values(port.receiptsByInstanceId)[0],ownerCharacterId:'BANK',
     },
   }};
   assert.throws(()=>compileExactEquipmentTraitSourceV2(build,runtime,tampered),
    /item_copy_receipt_does_not_match_equipment/);sourceTests++;
   const badStrength={...port,receiptsByInstanceId:{
    [Object.keys(port.receiptsByInstanceId)[0]]:{
     ...Object.values(port.receiptsByInstanceId)[0],
     newAffixRolls:[{id:'reflect_damage_pct' as const,percent:999}],
    },
   }};
   assert.throws(()=>compileExactEquipmentTraitSourceV2(build,runtime,badStrength),
    /invalid_new_affix_slot_or_strength/);sourceTests++;
   assert.throws(()=>simulateUnifiedEquipmentCombatV2(input,[build],[runtime],false,
    storedKit,port),/trait_port_requires_complete_v2/);sourceTests++;
   assert.throws(()=>simulateUnifiedEquipmentCombatV2(input,[build],[runtime],true,
    undefined,port),/trait_requires_persisted_solo_enemy_and_gear/);sourceTests++;
   const denied={...port,verifyPersisted:()=>false};
   assert.throws(()=>simulateUnifiedEquipmentCombatV2(input,[build],[runtime],true,
    storedKit,denied),/persisted_ledger_not_verified/);sourceTests++;
  }
 }
}
assert.equal(runs,9*2*6);
assert.ok(traitEvents>0,'At least some real skill or reflect event should trigger');
assert.equal(sourceTests,30);
console.log('PASS: '+runs+' genuine hidden V2 class-spec-regional boss encounters, '+traitEvents+
 ' gated trait events, '+sourceTests+' fail-closed exact-copy checks (test-only ledgers)');
