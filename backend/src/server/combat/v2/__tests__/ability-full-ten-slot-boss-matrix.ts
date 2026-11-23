/**
 * HIDDEN ONLY — all ten Combat 2.0 slots across genuine Skills/Enemy/Boss engine.
 * Uses clearly SYNTHETIC authored source policies, NOT production Item 2.0
 * or crafting pre-scaled receipts. Never proves final CP/balance.
 */
import {strict as assert} from 'node:assert';
import {launchPlayer} from '../../content/launch-combat';
import type {CombatInput,CombatStats,CombatantDefinition} from '../../types';
import {CLASS_NAMES_V2,SKILL_IDENTITIES_V2,SKILLS_V2,SPECIALIZATIONS_V2} from '../skill-catalog';
import {CLASS_ROLES_V2,GEAR_SLOTS_V2,type ClassIdV2,type GearSlotV2} from '../build-contract';
import {tieredSetV2} from '../set-catalog';
import {equipmentQualityMultiplierV2} from '../equipment-scaling-policy';
import {EQUIPMENT_AFFIXES_V2,type EquipmentAffixIdV2,type ServerAffixPolicyV2} from '../equipment-affixes';
import {prepareSoloEnemyKitsV2,type PersistedEnemyKitV2} from '../enemy-kit-composer';
import {ENEMY_V2_RULESET} from '../../enemy-v2-prototype';
import {simulateUnifiedEquipmentCombatV2,type TrustedEquipmentRuntimeV2,
 type TrustedPersistedEnemyKitV2} from '../unified-equipment-encounter';
import {compileExactEquipmentTraitSourceV2,EQ2_REVIEW_ROLL_POLICY,
 type FrozenEquipmentTraitItemReceiptV2,type NewEquipmentV2AffixId,
 type TrustedEquipmentTraitReceiptPortV2} from '../equipment-trait-exact-copy-adapter';
import type {VerifiedSkillBuildV2} from '../skill-effects';

const bosses=[
 {id:'BOSS_EXP_ROOT',name:'Asterfall Root',region:'asterfall',tier:2,level:25},
 {id:'BOSS_EXP_BELL',name:'Asterfall Bell',region:'asterfall',tier:2,level:25},
 {id:'BOSS_EXP_SOLAR',name:'The Buried Heliarch',region:'sunscar',tier:3,level:40},
 {id:'BOSS_EXP_SPHINX',name:'The Veiled Sphinx',region:'sunscar',tier:3,level:40},
 {id:'BOSS_EXP_BELLBEAST',name:'The Bellbeast of Shiverlake',region:'frostmarch',tier:4,level:60},
 {id:'BOSS_EXP_CANTOR',name:'The Frozen Cantor',region:'frostmarch',tier:4,level:60},
] as const;
type Boss=typeof bosses[number];
const stats:readonly (keyof CombatStats)[]=[
 'maxHp','attackPower','healingPower','defense','accuracy','evasion','critChance','critMultiplier','haste',
];
const ceilings=Object.fromEntries(stats.map(key=>[key,1e8])) as Record<keyof CombatStats,number>;
const rollLimits=Object.fromEntries(Object.keys(EQUIPMENT_AFFIXES_V2).map(id=>[
 id,{min:.01,max:.10},
])) as ServerAffixPolicyV2['limits'];
const affixIds=Object.keys(EQUIPMENT_AFFIXES_V2) as EquipmentAffixIdV2[];
const profiles=[
 {rarity:'common' as const,quality:0},
 {rarity:'epic' as const,quality:100},
];
function setup(classId:ClassIdV2,specIndex:0|1,boss:Boss,profile:typeof profiles[number]){
 const role=CLASS_ROLES_V2[classId],tier=('T'+boss.tier) as 'T2'|'T3'|'T4';
 const setFamily=role==='tank'?'citadel':role==='damage'?'breakerforge':'rootshield';
 const set=tieredSetV2(setFamily,tier);
 assert.ok(set);assert.deepEqual(set.thresholds,[2,4,6]);
 assert.equal(set.slots.length,6);
 const spec=SPECIALIZATIONS_V2.filter(s=>s.classId===classId)[specIndex];
 const actor={...launchPlayer(CLASS_NAMES_V2[classId],boss.level),
  id:'QA_10S_PLAYER_'+classId};
 const classOnly={...actor.stats};
 const skills=SKILL_IDENTITIES_V2.filter(s=>s.classId===classId&&
  SKILLS_V2.some(item=>item.id===s.id&&item.unlockLevel<=boss.level)).slice(0,2);
 assert.equal(skills.length,2);
 const owned:VerifiedSkillBuildV2['ownedItemsById'] extends infer X ? Record<string,any> : never={};
 const selected:Partial<Record<GearSlotV2,string>>={};
 const items:Record<string,TrustedEquipmentRuntimeV2['instancesById'][string]>={};
 const definitions:Record<string,TrustedEquipmentRuntimeV2['definitionsByItemId'][string]>={};
 const affixes:Record<string,TrustedEquipmentRuntimeV2['affixesByInstanceId'][string]>={};
 const receipts:Record<string,FrozenEquipmentTraitItemReceiptV2>={};
 const statName=role==='tank'?'defense':role==='damage'?'attackPower':'healingPower';
 const traitSlot:GearSlotV2=role==='tank'?'offhand':'weapon';
 const traitId=role==='tank'?'thornbound_riposte':
  role==='damage'?'echoing_strike':'restorative_bloom';
 const rollId:NewEquipmentV2AffixId=role==='tank'?'reflect_damage_pct':'ability_damage_pct';
 const pct=role==='tank'?{T2:.7,T3:1,T4:1.5}[tier]:
  {T2:2,T3:3,T4:3.5}[tier];
 const charId='QA_10S_CHAR_'+classId;
 const roleOffset=role==='tank'?0:role==='damage'?1:2;
 for(const [index,slot] of GEAR_SLOTS_V2.entries()){
  const copyId='QA_10S_'+classId+'_'+slot,definitionId='QA_DEF_'+classId+'_'+slot;
  const setPiece=set.slots.includes(slot);
  selected[slot]=copyId;
  owned[copyId]={instanceId:copyId,slot,tier,
   eligibleRoles:[role],requiredLevel:1,
   ...(setPiece?{setFamilyId:set.id}:{})};
  items[copyId]={id:copyId,itemId:definitionId,ownerCharacterId:charId,
   tier,rarity:profile.rarity,quality:profile.quality};
  definitions[definitionId]={
   itemId:definitionId,slot,tier,
   statSource:'authored-unscaled-v2',sourceSchema:'authored-unscaled-v2',
   rarityAndQualityAlreadyApplied:false,
   primaryStats:{[statName]:10+boss.tier*5+index},
  };
  const eligible=affixIds.filter(id=>EQUIPMENT_AFFIXES_V2[id].slots.includes(slot));
  assert.ok(eligible.length);
  const affixId=eligible[(specIndex+roleOffset+index)%eligible.length];
  affixes[copyId]={instanceId:copyId,slot,tier,rarity:profile.rarity,
   quality:profile.quality,affixes:slot===traitSlot?[]:[{id:affixId,value:.01}]};
  const acquisition=slot===traitSlot?
   (role==='tank'?'dungeon_boss_chest':'rare_blueprint_craft'):'ordinary_craft';
  receipts[copyId]={
   source:'server-persisted-exact-copy-v2',policy:EQ2_REVIEW_ROLL_POLICY,
   instanceId:copyId,itemId:definitionId,ownerCharacterId:charId,slot,tier,
   rarity:profile.rarity,quality:profile.quality,acquisition,
   newAffixRolls:slot===traitSlot?[{id:rollId,percent:pct}]:[],
   ...(slot===traitSlot?{signatureTraitId:traitId}:{}),
  };
 }
 const build:VerifiedSkillBuildV2={
  actor,verified:{classId,level:boss.level,
   ownedInstanceIds:new Set(Object.keys(selected).map(slot=>selected[slot as GearSlotV2]!))},
  selected:{specializationId:spec.id,equipment:selected,
   activeSkills:skills.map(s=>({skillId:s.id,variantId:s.variants[0].id})),
   talentRanks:{},signaturePassiveIds:[],
   capstoneId:boss.level>=50?spec.capstoneId:null},
  ownedItemsById:owned,setsById:{[set.id]:set},
 };
 const policy:ServerAffixPolicyV2={
  limits:rollLimits,countsByTierRarity:{[tier+':'+profile.rarity]:1},
  maxFinalHaste:10,maxFinalCritChance:10,maxFinalCritMultiplier:10,
  maxAdvancedEffects:{
   accuracyPp:1,evasionPp:1,penetrationPp:1,wardPp:1,
   shieldStrengthPct:1,hexPotencyPct:1,
  },
 };
 const runtime:TrustedEquipmentRuntimeV2={
  actorId:actor.id,characterId:charId,
  classBaselinePolicy:{version:'SYNTHETIC_10S_ONLY',profiles:{
   [classId]:{classId,minLevel:1,maxLevel:75,
    statsAtLevel:()=>({...classOnly}),basicAttackMs:actor.basicAttackMs,
    basicAttackCoeff:actor.basicAttackCoeff,abilities:actor.abilities},
  }},
  instancesById:items,definitionsByItemId:definitions,affixesByInstanceId:affixes,
  rarityPolicy:{version:'SYNTHETIC_10S_RARITY',order:['common','epic'],
   multipliers:{common:1,epic:1.2}},
  basePolicy:{rarityMultipliers:{common:1,epic:1.2},
   qualityMultiplier:equipmentQualityMultiplierV2,ceilings},
  setsPolicy:{ceilings,effectsByThreshold:Object.fromEntries(
   [2,4,6].map(n=>[
    set.id+':'+n,[{stat:statName,mode:'relative' as const,value:n/100}],
   ]))},
  affixPolicy:policy,
 };
 const traitPort:TrustedEquipmentTraitReceiptPortV2={
  accountId:'QA_10S_ACCOUNT_'+classId,characterId:charId,receiptRevision:1,
  receiptsByInstanceId:receipts,
  selectedTraitInstanceIds:[selected[traitSlot]!],verifyPersisted:()=>false,
 };
 const approvedSource=compileExactEquipmentTraitSourceV2(build,runtime,traitPort);
 const signedPort:TrustedEquipmentTraitReceiptPortV2={
  ...traitPort,
  verifyPersisted:(sources,hash)=>sources.length===1&&
   sources[0].equipmentReceiptDigest===approvedSource.equipmentReceiptDigest&&
   /^[a-f0-9]{64}$/.test(hash),
 };
 const baseEnemy:CombatantDefinition={
  id:boss.id,name:boss.name,team:'enemies',role:'enemy',boss:true,level:boss.level,
  stats:{maxHp:150000,attackPower:100,healingPower:0,defense:120,
   accuracy:1600,evasion:100,critChance:.05,critMultiplier:1.5,haste:0},
  basicAttackMs:2400,basicAttackCoeff:.8,abilities:[],tags:[],
 };
 const seed='QA_10S_ENC_'+classId+'_'+specIndex+'_'+boss.id;
 const input:CombatInput={seed,players:[actor],enemies:[baseEnemy],maxDurationMs:18000};
 const prepared=prepareSoloEnemyKitsV2(input.enemies,{
  ruleset:ENEMY_V2_RULESET,serverSeed:seed,
  encounterId:'QA_10S_'+classId+'_'+specIndex+'_'+boss.id,
  region:boss.region,equipmentTier:boss.tier,eliteEnemyIds:[],
 });
 const snapshot:PersistedEnemyKitV2={...prepared,source:'server-persisted-v2',revision:1};
 const trustedKit:TrustedPersistedEnemyKitV2={
  snapshot,verifyPersisted:(_row,digest)=>/^[a-f0-9]{64}$/.test(digest),
 };
 return {actor,build,runtime,signedPort,input,trustedKit,receipts,traitSlot,statName};
}
let runs=0,negativeChecks=0,traits=0,statInversions=0;
const observedAffixes=new Set<EquipmentAffixIdV2>();
const comparisons=new Map<string,{low:number;high:number}>();
for(const classId of Object.keys(CLASS_NAMES_V2) as ClassIdV2[]){
 for(const which of [0,1] as const){
  for(const boss of bosses){
   for(const [qualityIndex,profile] of profiles.entries()){
    const x=setup(classId,which,boss,profile);
    const before=JSON.stringify(x.input);
    const first=simulateUnifiedEquipmentCombatV2(
     x.input,[x.build],[x.runtime],true,x.trustedKit,x.signedPort);
    const again=simulateUnifiedEquipmentCombatV2(
     x.input,[x.build],[x.runtime],true,x.trustedKit,x.signedPort);
    assert.deepEqual(first,again,'Signed 10-slot combat replay must be stable');
    assert.equal(JSON.stringify(x.input),before,'No mutation of combat input');
    const evidence=first.equipmentEvidence[0];
    assert.equal(evidence.baseSources.length,10);
    assert.equal(evidence.affixSources.length,9);
    assert.deepEqual(evidence.setEffects.map(s=>s.thresholdId),
     [2,4,6].map(n=>x.build.ownedItemsById[x.build.selected.equipment.helmet!].setFamilyId+':'+n));
    assert.deepEqual(new Set(evidence.baseSources.map(s=>s.instanceId)).size,10);
    assert.equal(first.combat.players[0].definition.abilities.length,2);
    assert.ok(first.enemyMechanicLabels.length>0);
    assert.equal(first.combat.players[0].definition.combatV2?.version,2);
    assert.ok(first.combat.events.some(e=>e.type==='combat_start'));
    assert.ok(first.combat.events.length<8000);
    for(const a of evidence.affixSources)observedAffixes.add(a.id);
    traits+=first.combat.events.filter(e=>e.type==='equipment_trait_trigger').length;
    const key=classId+'|'+which+'|'+boss.id;
    const previous=comparisons.get(key)??{low:0,high:0};
    const finalStat=evidence.statStages.afterAffixes[x.statName];
    comparisons.set(key,qualityIndex===0?
     {...previous,low:finalStat}:{...previous,high:finalStat});
    runs++;
    if(classId==='IRONWARDEN'&&which===0&&boss.id==='BOSS_EXP_ROOT'&&qualityIndex===1){
     const firstSlot=x.build.selected.equipment.helmet!;
     const wrongOwner={...x.runtime,instancesById:{...x.runtime.instancesById,
      [firstSlot]:{...x.runtime.instancesById[firstSlot],ownerCharacterId:'BANK'}}};
     assert.throws(()=>simulateUnifiedEquipmentCombatV2(
      x.input,[x.build],[wrongOwner],true,x.trustedKit,x.signedPort),
      /missing_authoritative_equipment_snapshot/);negativeChecks++;
     const tamperReceipt={...x.signedPort,receiptsByInstanceId:{
      ...x.receipts,[firstSlot]:{...x.receipts[firstSlot],quality:44}}};
     assert.throws(()=>compileExactEquipmentTraitSourceV2(
      x.build,x.runtime,tamperReceipt),/item_copy_receipt_does_not_match_equipment/);
     negativeChecks++;
     const lostReceipt={...x.signedPort,receiptsByInstanceId:Object.fromEntries(
      Object.entries(x.receipts).filter(([id])=>id!==firstSlot))};
     assert.throws(()=>compileExactEquipmentTraitSourceV2(
      x.build,x.runtime,lostReceipt),/item_copy_receipt_does_not_match_equipment/);
     negativeChecks++;
     const bankReceipt={...x.signedPort,receiptsByInstanceId:{
      ...x.receipts,BANK:{...x.receipts[firstSlot],instanceId:'BANK'}}};
     assert.throws(()=>compileExactEquipmentTraitSourceV2(
      x.build,x.runtime,bankReceipt),/receipt_contains_banked_or_unequipped_copy/);
     negativeChecks++;
     const fakeRoll={...x.runtime,affixesByInstanceId:{
      ...x.runtime.affixesByInstanceId,[firstSlot]:{
       ...x.runtime.affixesByInstanceId[firstSlot],
       affixes:[{id:'max_hp_pct' as const,value:999}],
      }}};
     assert.throws(()=>simulateUnifiedEquipmentCombatV2(
      x.input,[x.build],[fakeRoll],true,x.trustedKit,x.signedPort),
      /roll_outside_approved_range/);negativeChecks++;
     const alteredDef=x.runtime.definitionsByItemId[x.runtime.instancesById[firstSlot].itemId];
     const scaled={...x.runtime,definitionsByItemId:{
      ...x.runtime.definitionsByItemId,[alteredDef.itemId]:{
       ...alteredDef,statSource:'craft-frozen-pre-scaled-v2' as const,
       rarityAndQualityAlreadyApplied:true},
     }};
     assert.throws(()=>simulateUnifiedEquipmentCombatV2(
      x.input,[x.build],[scaled],true,x.trustedKit,x.signedPort),
      /crafting_pre_scaled_item_requires_exact_adapter/);negativeChecks++;
     assert.throws(()=>simulateUnifiedEquipmentCombatV2(
      x.input,[x.build],[x.runtime],true,x.trustedKit,
      {...x.signedPort,verifyPersisted:()=>false}),
      /persisted_ledger_not_verified/);negativeChecks++;
    }
   }
  }
 }
}
assert.equal(runs,9*2*6*2);
assert.equal(comparisons.size,108);
for(const [key,row] of comparisons){
 assert.ok(row.high>row.low,'Better rarity/quality must add verified base stat: '+key);
}
assert.ok(traits>0,'Gear-linked traits should actually execute');
assert.equal(negativeChecks,7);
assert.equal(observedAffixes.size,13,
 'All 13 existing Combat V2 random affix channels must be exercised');
console.log('PASS: '+runs+' actual ten-slot Skills + 2/4/6 set + 13 affix + signed trait boss simulations; '+
 traits+' trait events, '+negativeChecks+' forbidden-source probes, '+
 comparisons.size+' quality/rarity directional checks (synthetic policies only)');
