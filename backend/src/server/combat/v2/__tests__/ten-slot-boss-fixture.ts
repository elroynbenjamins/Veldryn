/** Hidden synthetic 10-slot Skills/Equipment/Boss fixture. NEVER an approved Forge receipt. */
/**
 * HIDDEN ONLY — all ten Combat 2.0 slots across genuine Skills/Enemy/Boss engine.
 * Uses clearly SYNTHETIC authored source policies, NOT production Item 2.0
 * or crafting pre-scaled receipts. Never proves final CP/balance.
 */
import {strict as assert} from 'node:assert';
import {launchPlayer} from '../../content/launch-combat';
import type {CombatInput,CombatStats,CombatantDefinition} from '../../types';
import {CLASS_NAMES_V2,SKILL_IDENTITIES_V2,SKILLS_V2,SPECIALIZATIONS_V2} from '../skill-catalog';
import {CLASS_ROLES_V2,GEAR_SLOTS_V2,type ClassIdV2,type GearSlotV2,type EquipmentInstanceV2} from '../build-contract';
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

export const bosses=[
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
// Keep the historical 13-channel synthetic matrix stable; the additional Forge
// effect channels require a separate explicit-cap matched calibration fixture.
const affixIds=(Object.keys(EQUIPMENT_AFFIXES_V2) as EquipmentAffixIdV2[]).filter(id=>
 !['tenacity_pp','ability_damage_pct','forge_healing_power_pct'].includes(id));
export const profiles=[
 {rarity:'common' as const,quality:0},
 {rarity:'epic' as const,quality:100},
];
export function setup(classId:ClassIdV2,specIndex:0|1,boss:Boss,profile:typeof profiles[number]){
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
 const owned:Record<string,EquipmentInstanceV2>={};
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
  const bossOffset=bosses.findIndex(b=>b.id===boss.id);
  const affixId=eligible[(specIndex+roleOffset+index+bossOffset)%eligible.length];
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
