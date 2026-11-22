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
let pairedVariantRuns=0,observedEventDifferences=0;
const variantByBoss=new Map<string,{samples:number;differentEvents:number;variantSkillCasts:number}>();
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
   // Same exact-copy item ledger, rarity, quality, original class and specialization;
   // switch only the first verified ability variant, not gear, stats or CP weights.
   // This measures authored-variant responsiveness on ALL 108 regional boss
   // matchups, not equal-CP advantages or final counter-build win rates.
   const chosen=build.selected.activeSkills[0];
   const identity=SKILL_IDENTITIES_V2.find(s=>s.id===chosen.skillId&&s.classId===classId);
   assert.ok(identity&&identity.variants.length===3,'authoritative variant identity');
   const alternate:VerifiedSkillBuildV2={
    ...build,selected:{...build.selected,activeSkills:[
      {skillId:chosen.skillId,variantId:identity.variants[1].id},
      ...build.selected.activeSkills.slice(1),
    ]},
   };
   const alternateResult=simulateUnifiedEquipmentCombatV2(
    input,[alternate],[runtime],true,storedKit,port);
   assert.deepEqual(alternateResult.equipmentEvidence,first.equipmentEvidence,
    'Ability variant must not alter persisted equipped copies or compiler stat stages');
   assert.deepEqual(alternateResult.enemyMechanicLabels,first.enemyMechanicLabels,
    'Both tactical choices must face exactly the same authored boss');
   assert.equal(compileExactEquipmentTraitSourceV2(alternate,runtime,port).equipmentReceiptDigest,
    expected.equipmentReceiptDigest,'selected gear receipts must remain identical');
   assert.ok(alternateResult.combat.events.length<5000);
   const changed=JSON.stringify(first.combat.events)!==JSON.stringify(alternateResult.combat.events);
   const casts=alternateResult.combat.events.filter(e=>e.actorId===input.players[0].id&&
    e.abilityId?.endsWith(':v2:1')&&(e.type==='cast_start'||e.type==='cast_complete'||
     e.type==='damage'||e.type==='shield'||e.type==='heal')).length;
   const bucket=variantByBoss.get(boss.id)??{samples:0,differentEvents:0,variantSkillCasts:0};
   bucket.samples++;bucket.differentEvents+=Number(changed);bucket.variantSkillCasts+=casts;
   variantByBoss.set(boss.id,bucket);
   observedEventDifferences+=Number(changed);pairedVariantRuns++;
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
assert.equal(pairedVariantRuns,runs,'all class/spec/boss runs need a trusted-gear variant pair');
assert.equal(variantByBoss.size,6,'one pair coverage group per authored regional boss');
assert.ok([...variantByBoss.values()].every(x=>x.samples===18),
 'every regional boss must face all 18 class specializations');
assert.ok(observedEventDifferences>0,
 'at least one ability variant changes real combat events in signed gear simulation');
console.log(JSON.stringify({kind:'EQUIPMENT_BACKED_VARIANT_SENSITIVITY_NOT_EQUAL_CP',
 matchedPairs:pairedVariantRuns,changedEventStreams:observedEventDifferences,
 byBoss:Object.fromEntries([...variantByBoss.entries()].sort(([a],[b])=>a.localeCompare(b)))}));
assert.ok(traitEvents>0,'At least some real skill or reflect event should trigger');
assert.equal(sourceTests,30);

// Four distinct authored V2 class interrupts vs the same six persisted boss
// identities. This is a tactical MECHANIC demonstration with identical
// equipped item copies and class stat budgets, never a CP/win-rate claim.
// The sidecar verifier is still synthetic and this path is SOLO only.
const interruptClasses:readonly [ClassIdV2,string][]=[
 ['IRONWARDEN','Rune Bash'],['BASTION','Fortress Rebuff'],
 ['DREADGUARD','Binding Chain'],['HEXWEAVER','Null Script'],
];
let interruptionPairs=0,successfulInterruptionPairs=0;
const interruptionByBoss=new Map<string,{attempts:number;successful:number;classes:Set<string>}>();
for(const [classId,skillName] of interruptClasses){
 const identity=SKILL_IDENTITIES_V2.find(s=>s.classId===classId&&s.name===skillName);
 assert.ok(identity,'authored interrupt skill missing for '+classId);
 for(const which of [0,1] as const){
  for(const boss of bosses){
   const {build,runtime,port,input,storedKit,expected}=fixture(classId,which,boss);
   // Single-slot loadouts avoid confounding higher-priority damage skills;
   // all comparison metadata, class/spec, same seed and exact gear are fixed.
   const generic:VerifiedSkillBuildV2={
    ...build,selected:{...build.selected,
     activeSkills:[build.selected.activeSkills[0]],
    },
   };
   const counter:VerifiedSkillBuildV2={
    ...build,selected:{...build.selected,activeSkills:[
     {skillId:identity.id,variantId:identity.variants[0].id},
    ]},
   };
   const before=JSON.stringify(input);
   const noCounter=simulateUnifiedEquipmentCombatV2(
    input,[generic],[runtime],true,storedKit,port);
   const withCounter=simulateUnifiedEquipmentCombatV2(
    input,[counter],[runtime],true,storedKit,port);
   assert.equal(JSON.stringify(input),before,'tactical source input mutated');
   assert.deepEqual(noCounter.equipmentEvidence,withCounter.equipmentEvidence,
    'Tactical interruption must not add, substitute or reroll gear stats');
   assert.deepEqual(noCounter.enemyMechanicLabels,withCounter.enemyMechanicLabels);
   assert.equal(compileExactEquipmentTraitSourceV2(counter,runtime,port).equipmentReceiptDigest,
    expected.equipmentReceiptDigest,'new counter build must use same persisted copy');
   assert.equal(noCounter.combat.events.filter(e=>e.type==='interrupt').length,0,
    'generic no-interrupt choice unexpectedly interrupted enemy');
   const tactical=withCounter.combat.events.filter(e=>
    e.type==='interrupt'&&e.actorId===input.players[0].id&&e.targetId===boss.id);
   const row=interruptionByBoss.get(boss.id)??{
    attempts:0,successful:0,classes:new Set<string>(),
   };
   row.attempts++;
   if(tactical.length){row.successful++;row.classes.add(classId);}
   interruptionByBoss.set(boss.id,row);
   interruptionPairs++;
   successfulInterruptionPairs+=Number(tactical.length>0);
  }
 }
}
assert.equal(interruptionPairs,4*2*6);
assert.equal(interruptionByBoss.size,6);
assert.ok([...interruptionByBoss.values()].every(row=>
 row.attempts===8&&row.classes.size>=2),
 'every authored boss requires interrupt coverage from multiple distinct classes');
console.log(JSON.stringify({kind:'SIGNED_GEAR_SOLO_INTERRUPT_MECHANICS_NOT_EQUAL_CP',
 pairs:interruptionPairs,successful:successfulInterruptionPairs,
 byBoss:Object.fromEntries([...interruptionByBoss.entries()].sort(([a],[b])=>a.localeCompare(b))
  .map(([id,row])=>[id,{attempts:row.attempts,successful:row.successful,
   classes:[...row.classes].sort()}]))}));
// Real, authored status bosses: weakening from Bell Soul Curse and Cantor
// Deep Dissonance is countered by VERIFIED V2 support abilities with the SAME
// item/rarity/quality/spec and boss snapshot. This supplements the low-level
// synthetic debuff-only regression with actual class and enemy compilers.
const cureScenarios:readonly {
 classId:ClassIdV2;bossId:string;technique:string;variant:0|1
}[]=[
 {classId:'STONECALLER',bossId:'BOSS_EXP_BELL',technique:'River Stone',variant:1},
 {classId:'STONECALLER',bossId:'BOSS_EXP_CANTOR',technique:'River Stone',variant:1},
 {classId:'DAWNKEEPER',bossId:'BOSS_EXP_CANTOR',technique:'Purifying Light',variant:0},
];
let authoredCurePairs=0;
for(const scenario of cureScenarios){
 const boss=bosses.find(b=>b.id===scenario.bossId);
 const technique=SKILL_IDENTITIES_V2.find(s=>s.classId===scenario.classId&&
  s.name===scenario.technique);
 assert.ok(boss&&technique,'review boss or approved class skill missing');
 for(const which of [0,1] as const){
  const {build,runtime,port,input,storedKit,expected}=fixture(scenario.classId,which,boss);
  const genericSlot=scenario.classId==='STONECALLER'
   ?{skillId:technique.id,variantId:technique.variants[0].id}
   :build.selected.activeSkills[0];
  const baseline:VerifiedSkillBuildV2={...build,selected:{...build.selected,
   activeSkills:[genericSlot]}};
  const tactical:VerifiedSkillBuildV2={...build,selected:{...build.selected,
   activeSkills:[{skillId:technique.id,variantId:technique.variants[scenario.variant].id}]}};
  const generic=simulateUnifiedEquipmentCombatV2(
   input,[baseline],[runtime],true,storedKit,port);
  const cured=simulateUnifiedEquipmentCombatV2(
   input,[tactical],[runtime],true,storedKit,port);
  assert.deepEqual(generic.equipmentEvidence,cured.equipmentEvidence,
   'Support cure may not alter compiled item stats or copy ownership');
  assert.deepEqual(generic.enemyMechanicLabels,cured.enemyMechanicLabels);
  assert.equal(compileExactEquipmentTraitSourceV2(tactical,runtime,port).equipmentReceiptDigest,
   expected.equipmentReceiptDigest);
  const bossDebuffs=generic.combat.events.filter(e=>e.type==='status_apply'&&
   e.actorId===boss.id&&e.statusKind==='debuff'&&e.targetId===input.players[0].id);
  assert.ok(bossDebuffs.length>=1,'original authored boss must apply a real debuff');
  assert.equal(generic.combat.events.filter(e=>e.type==='status_remove'&&
   e.statusKind==='debuff'&&e.actorId===input.players[0].id).length,0,
   'generic build unexpectedly cleansed a hostile debuff');
  assert.ok(cured.combat.events.some(e=>e.type==='status_remove'&&
   e.statusKind==='debuff'&&e.actorId===input.players[0].id&&
   e.targetId===input.players[0].id),
   'compiled Support counter must remove boss weakening '+scenario.classId+' '+boss.id);
  authoredCurePairs++;
 }
}
assert.equal(authoredCurePairs,6);
console.log('PASS: '+authoredCurePairs+
 ' equipped/verified authored boss debuff-cure pairs from Stonecaller and Dawnkeeper (test-only receipt verifier)');
console.log('PASS: '+runs+' genuine hidden V2 class-spec-regional boss encounters, '+traitEvents+
 ' gated trait events, '+sourceTests+' fail-closed exact-copy checks (test-only ledgers)');
