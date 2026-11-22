/**
 * HIDDEN, isolated 4-player Equipment + Skills 2.0 compiler integration.
 *
 * Exactly one tank, two damage, one support, each with a separately owned item
 * copy and independently verified class-only baseline. Three genuine tactics
 * face the exact same seeded boss: generic, tank interrupt, support cleanse.
 *
 * This is NOT a connected party/dungeon session, authenticated inventory read,
 * signed trait execution, persistent HP/Cooldown adapter or a CP comparison.
 * The known solo-only trait and persisted-encounter guards remain enforced.
 */
import {strict as assert} from 'node:assert';
import {launchPlayer} from '../../content/launch-combat';
import type {CombatInput,CombatantDefinition,CombatStats} from '../../types';
import {CLASS_ROLES_V2,type ClassIdV2} from '../build-contract';
import {CLASS_NAMES_V2,SKILL_IDENTITIES_V2,SPECIALIZATIONS_V2} from '../skill-catalog';
import {equipmentQualityMultiplierV2} from '../equipment-scaling-policy';
import {
 simulateUnifiedEquipmentCombatV2,type TrustedEquipmentRuntimeV2,
} from '../unified-equipment-encounter';
import type {TrustedEquipmentTraitReceiptPortV2} from '../equipment-trait-exact-copy-adapter';
import type {VerifiedSkillBuildV2} from '../skill-effects';

const classIds:readonly ClassIdV2[]=[
 'IRONWARDEN','WAYFINDER','HEXWEAVER','STONECALLER',
];
const powerKeys:readonly (keyof CombatStats)[]=[
 'maxHp','attackPower','healingPower','defense','accuracy',
 'evasion','critChance','critMultiplier','haste',
];
const ceilings=Object.fromEntries(powerKeys.map(k=>[k,1e8])) as Record<keyof CombatStats,number>;
const limits=Object.fromEntries([
 'attack_pct','defense_pct','max_hp_pct','haste_pp','crit_rate_pp','crit_damage_pct',
 'accuracy_pp','evasion_pp','penetration_pp','ward_pp','shield_strength_pct',
 'class_healing_pct','hex_potency_pct',
].map(k=>[k,{min:.01,max:.1}])) as TrustedEquipmentRuntimeV2['affixPolicy']['limits'];
const actualRoles=classIds.map(c=>CLASS_ROLES_V2[c]);
assert.deepEqual(actualRoles,['tank','damage','damage','support']);

type PartyTactic='generic'|'tank_interrupt'|'support_cleanse';
function prepared(tactic:PartyTactic){
 const players:CombatantDefinition[]=[];
 const builds:VerifiedSkillBuildV2[]=[];
 const gear:TrustedEquipmentRuntimeV2[]=[];
 for(const classId of classIds){
  const base=launchPlayer(CLASS_NAMES_V2[classId],35);
  const actor:CombatantDefinition={...base,id:'QA_GROUP_'+classId};
  const stats={...actor.stats};
  const role=CLASS_ROLES_V2[classId];
  const copyId='QA_COPIED_HELMET_'+classId;
  const itemId='QA_HELMET_'+classId,characterId='QA_CHARACTER_'+classId;
  const skillName=classId==='IRONWARDEN'?
    tactic==='tank_interrupt'?'Rune Bash':'Rune Challenge':
    classId==='STONECALLER'?'River Stone':
    classId==='WAYFINDER'?'Windshot':'Black Thread';
  const skill=SKILL_IDENTITIES_V2.find(s=>s.classId===classId&&s.name===skillName);
  const spec=SPECIALIZATIONS_V2.find(s=>s.classId===classId);
  assert.ok(skill&&spec);
  const variant=classId==='STONECALLER'&&tactic==='support_cleanse'?1:0;
  const build:VerifiedSkillBuildV2={
   actor,verified:{classId,level:35,ownedInstanceIds:new Set([copyId])},
   selected:{specializationId:spec.id,equipment:{helmet:copyId},
    activeSkills:[{skillId:skill.id,variantId:skill.variants[variant].id}],
    talentRanks:{},signaturePassiveIds:[],capstoneId:null},
   ownedItemsById:{[copyId]:{instanceId:copyId,slot:'helmet',tier:'T1',
    eligibleRoles:[role],requiredLevel:1}},setsById:{},
  };
  const runtime:TrustedEquipmentRuntimeV2={
   actorId:actor.id,characterId,
   classBaselinePolicy:{version:'QA_FOUR_PLAYER_CLASS_ONLY',profiles:{
    [classId]:{classId,minLevel:1,maxLevel:75,
     statsAtLevel:()=>({...stats}),basicAttackMs:actor.basicAttackMs,
     basicAttackCoeff:actor.basicAttackCoeff,abilities:actor.abilities},
   }},
   instancesById:{[copyId]:{id:copyId,itemId,ownerCharacterId:characterId,
    tier:'T1',rarity:'common',quality:50}},
   definitionsByItemId:{[itemId]:{itemId,slot:'helmet',tier:'T1',
    primaryStats:role==='tank'?{maxHp:100}:role==='damage'?
     {attackPower:30}:{healingPower:30}}},
   affixesByInstanceId:{[copyId]:{instanceId:copyId,slot:'helmet',tier:'T1',
    rarity:'common',quality:50,affixes:[]}},
   basePolicy:{rarityMultipliers:{common:1,rare:1.05},
    qualityMultiplier:equipmentQualityMultiplierV2,ceilings},
   rarityPolicy:{version:'QA_APPROVED_LADDER',order:['common','rare'],
    multipliers:{common:1,rare:1.05}},
   setsPolicy:{effectsByThreshold:{},ceilings},
   affixPolicy:{limits,countsByTierRarity:{'T1:common':0},
    maxFinalHaste:1,maxFinalCritChance:1,maxFinalCritMultiplier:10},
  };
  players.push(actor);builds.push(build);gear.push(runtime);
 }
 return {players,builds,gear};
}
const boss:CombatantDefinition={
 id:'QA_GROUP_HEX_BOSS',name:'QA Storm Hexer',team:'enemies',
 role:'enemy',level:35,boss:true,
 stats:{maxHp:400000,attackPower:250,healingPower:0,defense:150,
  accuracy:1400,evasion:90,critChance:0,critMultiplier:1.5,haste:0},
 basicAttackMs:100000,basicAttackCoeff:0,
 abilities:[{
  id:'QA_GROUP_WITHERING_CAST',name:'Withering Storm',priority:180,
  cooldownMs:30000,castTimeMs:1400,interruptible:true,target:'all_enemies',
  effects:[
   {kind:'debuff',tag:'damage_done',value:-.2,durationMs:5000},
   {kind:'dot',tag:'storm',coeff:.22,damageType:'nature',durationMs:5000,tickMs:1000},
  ],
 }],
};
function fight(tactic:PartyTactic){
 const {players,builds,gear}=prepared(tactic);
 const input:CombatInput={seed:'QA_GROUP_EQUIP_COUNTERPLAY',players,enemies:[boss],
  maxDurationMs:4700};
 const frozen=JSON.stringify(input);
 const first=simulateUnifiedEquipmentCombatV2(input,builds,gear,true);
 const replay=simulateUnifiedEquipmentCombatV2(input,builds,gear,true);
 assert.deepEqual(first,replay,'identical private sources must produce exact replay');
 assert.equal(JSON.stringify(input),frozen,'input must not mutate');
 assert.equal(first.equipmentEvidence.length,4);
 assert.deepEqual(first.combat.players.map(p=>p.definition.role),actualRoles);
 assert.ok(first.equipmentEvidence.every(e=>e.baseSources.length===1&&
  e.affixSources.length===0&&e.setEffects.length===0),'one compiled worn copy per member');
 assert.ok(first.enemyMechanicLabels.length>0,'private authored enemy bridge must be used');
 assert.ok(first.combat.events.length<5000,'no reactive recursion');
 assert.throws(()=>simulateUnifiedEquipmentCombatV2(
  {...input,initialPlayerState:{[players[0].id]:{
   hp:1000,downed:false,cooldownRemainingMs:{},basicAttackRemainingMs:0,
  }}},builds,gear,true),/persistent_state_adapter_required/,
 'legacy dungeon/party HP snapshots may never be silently reused');
 assert.throws(()=>simulateUnifiedEquipmentCombatV2(input,builds,gear,true,
  undefined,{} as TrustedEquipmentTraitReceiptPortV2),
  /trait_requires_persisted_solo_enemy_and_gear/,
  'solo-only signed trait authority must reject all four-player encounters');
 const foreign=gear.map((entry,i)=>i?entry:{
  ...entry,instancesById:Object.fromEntries(
   Object.entries(entry.instancesById).map(([id,copy])=>[
    id,{...copy,ownerCharacterId:'QA_BANKED_OTHER_CHARACTER'},
   ]),
  ),
 });
 assert.throws(()=>simulateUnifiedEquipmentCombatV2(input,builds,foreign,true),
  /missing_authoritative_equipment_snapshot/,
  'foreign-owned items must be rejected across a party');
 return first;
}
const generic=fight('generic'),interrupt=fight('tank_interrupt'),
 cleanse=fight('support_cleanse');
assert.deepEqual(generic.equipmentEvidence,interrupt.equipmentEvidence);
assert.deepEqual(generic.equipmentEvidence,cleanse.equipmentEvidence);
assert.deepEqual(generic.enemyMechanicLabels,interrupt.enemyMechanicLabels);
assert.deepEqual(generic.enemyMechanicLabels,cleanse.enemyMechanicLabels);
assert.ok(generic.combat.events.some(e=>e.type==='status_apply'&&
 e.abilityId==='QA_GROUP_WITHERING_CAST'&&e.statusKind==='debuff'));
assert.ok(generic.combat.events.some(e=>e.type==='dot_tick'&&
 e.abilityId==='QA_GROUP_WITHERING_CAST'),'generic path faces actual DoT pressure');
assert.equal(generic.combat.events.filter(e=>e.type==='status_remove'&&
 e.statusKind==='debuff').length,0);
assert.ok(interrupt.combat.events.some(e=>e.type==='interrupt'&&
 e.actorId==='QA_GROUP_IRONWARDEN'&&e.interruptedAbilityId==='QA_GROUP_WITHERING_CAST'),
 'the tank has an independent authored interrupt route');
assert.ok(!interrupt.combat.events.some(e=>e.type==='status_apply'&&
 e.abilityId==='QA_GROUP_WITHERING_CAST'),
 'interruption prevents a completed party-wide curse');
assert.ok(cleanse.combat.events.some(e=>e.type==='status_apply'&&
 e.abilityId==='QA_GROUP_WITHERING_CAST'&&e.statusKind==='debuff'),
 'support cure option must face the real completed curse');
const cures=cleanse.combat.events.filter(e=>e.type==='status_remove'&&
 e.actorId==='QA_GROUP_STONECALLER');
assert.equal(cures.filter(e=>e.statusKind==='dot').length,1,
 'authored single-target cure must not silently become party-wide');
assert.equal(cures.filter(e=>e.statusKind==='debuff').length,1,
 'one chosen ally receives weakening removal, without duplicating cures');
assert.equal(new Set(cures.map(e=>e.targetId)).size,1,
 'DoT and debuff must be removed from the same actual chosen ally');
assert.ok(generic.combat.players.every(p=>p.definition.combatV2?.version===2));
assert.ok([generic,interrupt,cleanse].every(r=>
 r.combat.players.every(p=>Number.isFinite(p.damageDone)&&
  Number.isFinite(p.hp)&&Number.isFinite(p.healingDone))));
console.log(JSON.stringify({kind:'SYNTHETIC_FOUR_PLAYER_GEAR_COMPILE_NOT_LIVE',
 characters:4,setsOfCompiledGear:3,equipmentReceipts:'test-only',
 genericDebuffs:generic.combat.events.filter(e=>e.type==='status_apply'&&
  e.abilityId==='QA_GROUP_WITHERING_CAST'&&e.statusKind==='debuff').length,
 tankInterrupts:interrupt.combat.events.filter(e=>e.type==='interrupt'&&
  e.actorId==='QA_GROUP_IRONWARDEN').length,
 supportDebuffsCleansed:cures.filter(e=>e.statusKind==='debuff').length,
 signedTraits:'SOLO_ONLY_REJECTED',persistentPartyState:'REJECTED'}));
