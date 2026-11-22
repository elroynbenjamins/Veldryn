/**
 * V92 full-source QA: two truly compiled class+skill+Equipment V2 builds,
 * then real equipped trait issuer and canonical V90 Party boss combat.
 * Synthetic persisted verifiers are intentional non-production fixtures.
 */
import {strict as assert} from 'node:assert';
import {launchPlayer} from '../../combat/content/launch-combat';
import type {CombatantDefinition,CombatInput,CombatStats} from '../../combat/types';
import type {VerifiedSkillBuildV2} from '../../combat/v2/skill-effects';
import {
 CLASS_ROLES_V2,type ClassIdV2,type GearSlotV2,
} from '../../combat/v2/build-contract';
import {
 CLASS_NAMES_V2,SKILLS_V2,SKILL_IDENTITIES_V2,SPECIALIZATIONS_V2,
} from '../../combat/v2/skill-catalog';
import {equipmentQualityMultiplierV2} from '../../combat/v2/equipment-scaling-policy';
import type {TrustedEquipmentRuntimeV2} from '../../combat/v2/unified-equipment-encounter';
import {
 EQ2_REVIEW_ROLL_POLICY,type TrustedEquipmentTraitReceiptPortV2,
 type FrozenEquipmentTraitItemReceiptV2,
} from '../../combat/v2/equipment-trait-exact-copy-adapter';
import {enemyV2SnapshotDigest} from '../../combat/v2/enemy-engine-authority';
import {preparePartyEventBossTraitKitV90,PARTY_EVENT_BOSS_TRAITS_V90_VERSION}
 from '../weekly-party-boss-traits-v90';
import {
 PARTY_EVENT_EQ2_TRAIT_V92_VERSION,
 prepareFullyEquippedPartyV92,
 simulateFrozenPartyEventEquipmentV92,
 simulateCompiledPartyEventEquipmentV92,
 type TrustedPartyV92BuildInput,
 type FrozenPartyEventV92Witness,
} from '../weekly-party-event-eq2-traits-v92';

const keys:(keyof CombatStats)[]=[
 'maxHp','attackPower','healingPower','defense','accuracy','evasion',
 'critChance','critMultiplier','haste',
];
const ceilings=Object.fromEntries(keys.map(key=>[key,100000000])) as
 Record<keyof CombatStats,number>;
const ids=[
 'attack_pct','defense_pct','max_hp_pct','haste_pp','crit_rate_pp',
 'crit_damage_pct','accuracy_pp','evasion_pp','penetration_pp','ward_pp',
 'shield_strength_pct','class_healing_pct','hex_potency_pct',
];
const pctLimits=Object.fromEntries(ids.map(id=>[id,{min:0,max:.10}])) as
 TrustedEquipmentRuntimeV2['affixPolicy']['limits'];
function participant(classId:ClassIdV2,i:number):TrustedPartyV92BuildInput{
 const role=CLASS_ROLES_V2[classId],tier='T2' as const;
 const actor={...launchPlayer(CLASS_NAMES_V2[classId],25),id:'QA_PV92_ACTOR_'+i};
 const classStats={...actor.stats};
 const spec=SPECIALIZATIONS_V2.find(row=>row.classId===classId)!;
 const skillIds=SKILL_IDENTITIES_V2.filter(x=>x.classId===classId&&
  SKILLS_V2.some(s=>s.id===x.id&&s.unlockLevel<=25)).slice(0,2);
 const slot:GearSlotV2=role==='tank'?'offhand':'weapon';
 const instanceId='QA_PV92_ITEM_'+i,itemId='QA_PV92_DEFINITION_'+i;
 const characterId='QA_PV92_CHAR_'+i;
 const build:VerifiedSkillBuildV2={
  actor,verified:{classId,level:25,ownedInstanceIds:new Set([instanceId])},
  selected:{
   specializationId:spec.id,equipment:{[slot]:instanceId},
   activeSkills:skillIds.map(s=>({skillId:s.id,variantId:s.variants[0].id})),
   talentRanks:{},signaturePassiveIds:[],capstoneId:null,
  },
  ownedItemsById:{[instanceId]:{
   instanceId,slot,tier,eligibleRoles:[role],requiredLevel:1,
  }},setsById:{},
 };
 const equipment:TrustedEquipmentRuntimeV2={
  actorId:actor.id,characterId,
  classBaselinePolicy:{version:'QA_PARTY_CLASS_V92',profiles:{
   [classId]:{classId,minLevel:1,maxLevel:75,statsAtLevel:()=>({...classStats}),
    basicAttackMs:actor.basicAttackMs,basicAttackCoeff:actor.basicAttackCoeff,
    abilities:actor.abilities},
  }},
  instancesById:{[instanceId]:{
   id:instanceId,itemId,ownerCharacterId:characterId,tier,
   rarity:'epic',quality:65,
  }},
  definitionsByItemId:{[itemId]:{
   itemId,tier,slot,primaryStats:role==='tank'?
    {defense:45}:{attackPower:45},
  }},
  affixesByInstanceId:{[instanceId]:{
   instanceId,slot,tier,rarity:'epic',quality:65,affixes:[],
  }},
  basePolicy:{rarityMultipliers:{common:1,epic:1.2},
   qualityMultiplier:equipmentQualityMultiplierV2,ceilings},
  rarityPolicy:{version:'QA_PV92_RARITY',order:['common','epic'],
   multipliers:{common:1,epic:1.2}},
  setsPolicy:{effectsByThreshold:{},ceilings},
  affixPolicy:{limits:pctLimits,countsByTierRarity:{'T2:epic':0},
   maxFinalHaste:10,maxFinalCritChance:10,maxFinalCritMultiplier:10},
 };
 const receipt:FrozenEquipmentTraitItemReceiptV2={
  source:'server-persisted-exact-copy-v2',policy:EQ2_REVIEW_ROLL_POLICY,
  instanceId,itemId,ownerCharacterId:characterId,slot,tier,
  rarity:'epic',quality:65,
  acquisition:role==='tank'?'dungeon_boss_chest':'rare_blueprint_craft',
  newAffixRolls:role==='tank'?
   [{id:'reflect_damage_pct',percent:.8}]:
   [{id:'ability_damage_pct',percent:2}],
  signatureTraitId:role==='tank'?'thornbound_riposte':'echoing_strike',
 };
 const exactTraitReceipts:TrustedEquipmentTraitReceiptPortV2={
  accountId:'QA_PV92_ACCOUNT_'+i,characterId,receiptRevision:2,
  receiptsByInstanceId:{[instanceId]:receipt},
  selectedTraitInstanceIds:[instanceId],
  verifyPersisted:()=>false,
 };
 return {actor,build,equipment,exactTraitReceipts};
}
const party=[participant('IRONWARDEN',0),participant('WAYFINDER',1)];
const compiled=prepareFullyEquippedPartyV92(party,true);
assert.equal(compiled.players.length,2);
assert.equal(compiled.sources.length,2);
assert.equal(compiled.evidence.length,2);
assert.ok(compiled.players.every(actor=>actor.combatV2?.version===2));
assert.ok(compiled.evidence.every(row=>row.baseSources.length===1));
assert.equal(compiled.sources[0].reflectDamagePct,.8);
assert.equal(compiled.sources[1].abilityDamagePct,2);
assert.deepEqual(compiled.sources.map(s=>s.traits[0].traitId),
 ['thornbound_riposte','echoing_strike']);
assert.ok(compiled.players[0].stats.defense>party[0].actor.stats.defense);
assert.ok(compiled.players[1].stats.attackPower>party[1].actor.stats.attackPower);

const boss:CombatantDefinition={
 id:'PARTY_EVENT_BOSS',name:'Roadbreaker Captain',team:'enemies',
 role:'enemy',boss:true,level:25,
 stats:{maxHp:10800,attackPower:355,healingPower:0,defense:520,
  accuracy:750,evasion:110,critChance:.045,critMultiplier:1.4,haste:.03},
 basicAttackMs:2700,basicAttackCoeff:.8,
 abilities:[
  {id:'PE_BOSS_SLAM',name:'Overwhelming Strike',cooldownMs:6900,
   castTimeMs:400,target:'current_target',priority:80,
   effects:[{kind:'damage',coeff:1.15}]},
  {id:'PE_BOSS_PULSE',name:'Rising Threat',cooldownMs:12000,
   castTimeMs:900,target:'all_enemies',priority:85,interruptible:true,
   effects:[{kind:'damage',coeff:.41}]},
 ],
 phases:[{id:'ENRAGE',hpPct:.35,target:'self',
  effects:[{kind:'buff',tag:'damage_done',value:.085,durationMs:90000}]}],
};
const v90=preparePartyEventBossTraitKitV90(boss,'broken_caravan',1,true);
const seed='QA_PV92_FULL_ITEM_BUILD';
const combat:CombatInput={
 seed,players:[...compiled.players],enemies:[v90],maxDurationMs:90000,
};
const weekStartsAtMs=Date.UTC(2026,10,9);
const weekEndsAtMs=weekStartsAtMs+7*86400000;
const witness:FrozenPartyEventV92Witness={
 source:'server-persisted-party-boss-v92',ruleset:PARTY_EVENT_EQ2_TRAIT_V92_VERSION,
 phaseKitVersion:PARTY_EVENT_BOSS_TRAITS_V90_VERSION,
 mode:'new-run-only',encounterId:'QA_PV92_FULL',
 eventId:'QA_PV92_EVENT',partyId:'QA_PV92_PARTY',family:'broken_caravan',
 difficulty:'standard',tier:1,revision:1,seed,
 weekStartsAtMs,weekEndsAtMs,frozenAtMs:weekEndsAtMs-1000,
 settlementAtMs:weekEndsAtMs+3600000,
 roster:compiled.sources.map(s=>({
  accountId:s.accountId,characterId:s.characterId,actorId:s.actorId,
  receiptRevision:s.revision,equipmentReceiptDigest:s.equipmentReceiptDigest,
 })),
};
const input={witness,combat,sources:compiled.sources,
 ports:{verifyPersisted:(w:FrozenPartyEventV92Witness,
  sources:typeof compiled.sources,digest:string)=>
   digest===enemyV2SnapshotDigest({
    witness:w,combatDigest:enemyV2SnapshotDigest(combat),sources,
   })},
};
const strictInput={prepared:compiled,witness,boss:v90,ports:input.ports};
const result=simulateCompiledPartyEventEquipmentV92(strictInput,true);
const replay=simulateCompiledPartyEventEquipmentV92(strictInput,true);
assert.deepEqual(result,replay);
assert.ok(result.events.some(e=>e.type==='combat_start'));
assert.ok(result.players.some(p=>p.damageDone>0));
assert.ok(result.enemies.length===1);
assert.throws(()=>prepareFullyEquippedPartyV92(
 [party[0],{...party[1],equipment:{
  ...party[1].equipment,characterId:'WRONG_OWNER',
 }}],true),/untrusted_complete_item_build/);
assert.throws(()=>prepareFullyEquippedPartyV92(party),
 /party_event_v92_unreleased/);
const old=process.env.NODE_ENV;
try{
 process.env.NODE_ENV='production';
 assert.throws(()=>prepareFullyEquippedPartyV92(party,true),
  /party_event_v92_unreleased/);
}finally{process.env.NODE_ENV=old}
console.log('PARTY_EVENT_V92_FULL_SOURCE_OK: two genuine EQ2 class/skill/base/rarity/affix/trait source compilations, 90s-cap real engine, same-seed replay; QA fake persistence only');
