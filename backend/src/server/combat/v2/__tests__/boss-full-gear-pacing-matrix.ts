/**
 * PRIVATE / SYNTHETIC ONLY. Six regional bosses × nine classes × two specs
 * × two verified three-slot equipment profiles = 216 combined V2 encounters.
 * Exercises actual class / skill / owned equipment / 2-piece set / affix /
 * persisted enemy pipeline. No live numbers, drops, player data or rollout.
 */
import {strict as assert} from 'node:assert';
import type {CombatStats,CombatantDefinition,CombatInput} from '../../types';
import {launchPlayer,rootboundHeartBoss,bellWardenBoss} from '../../content/launch-combat';
import {CLASS_NAMES_V2,SKILL_IDENTITIES_V2,SKILLS_V2,SPECIALIZATIONS_V2} from '../skill-catalog';
import {CLASS_ROLES_V2,type ClassIdV2,type GearSlotV2} from '../build-contract';
import {simulateUnifiedEquipmentCombatV2,type TrustedEquipmentRuntimeV2} from '../unified-equipment-encounter';
import {prepareSoloEnemyKitsV2,type PersistedEnemyKitV2} from '../enemy-kit-composer';
import {projectPersistedBossCounterplayV2} from '../boss-counterplay-contract';
import {observeBossPacingV2,aggregateBossPacingV2,
 type BossPacingObservationV2} from '../boss-pacing-diagnostics';
import {equipmentQualityMultiplierV2} from '../equipment-scaling-policy';
import {RESOURCE_CAP_V2} from '../resource-runtime';
import type {VerifiedSkillBuildV2} from '../skill-effects';
import type {ServerAffixPolicyV2} from '../equipment-affixes';

const bosses=[
 {id:'BOSS_EXP_ROOT',name:'Rootbound Heart',region:'asterfall',tier:'T2',level:25},
 {id:'BOSS_EXP_BELL',name:'Bell-Warden',region:'asterfall',tier:'T2',level:25},
 {id:'BOSS_EXP_SOLAR',name:'The Buried Heliarch',region:'sunscar',tier:'T3',level:35},
 {id:'BOSS_EXP_SPHINX',name:'The Veiled Sphinx',region:'sunscar',tier:'T3',level:35},
 {id:'BOSS_EXP_BELLBEAST',name:'The Bellbeast of Shiverlake',region:'frostmarch',tier:'T5',level:55},
 {id:'BOSS_EXP_CANTOR',name:'The Frozen Cantor',region:'frostmarch',tier:'T5',level:55},
] as const;
type Boss=(typeof bosses)[number];
type QualityProfile='low'|'high';
const profiles:readonly QualityProfile[]=['low','high'];
const slots=['helmet','chest','weapon'] as const satisfies readonly GearSlotV2[];
const statKeys:readonly (keyof CombatStats)[]=[
 'maxHp','attackPower','healingPower','defense','accuracy','evasion',
 'critChance','critMultiplier','haste',
];
const ceilings=Object.fromEntries(statKeys.map(k=>[k,1e8])) as Record<keyof CombatStats,number>;
const affixLimits=Object.fromEntries([
 'attack_pct','defense_pct','max_hp_pct','haste_pp','crit_rate_pp','crit_damage_pct',
 'accuracy_pp','evasion_pp','penetration_pp','ward_pp','shield_strength_pct',
 'class_healing_pct','hex_potency_pct',
].map(key=>[key,{min:.01,max:.10}])) as ServerAffixPolicyV2['limits'];
function baseBoss(b:Boss):CombatantDefinition{
 if(b.id==='BOSS_EXP_ROOT')return rootboundHeartBoss(b.level);
 if(b.id==='BOSS_EXP_BELL')return bellWardenBoss(b.level);
 return {
  id:b.id,name:b.name,team:'enemies',role:'enemy',boss:true,level:b.level,
  stats:{maxHp:26000,attackPower:220,healingPower:0,defense:240,
   accuracy:920,evasion:100,critChance:.02,critMultiplier:1.5,haste:0},
  basicAttackMs:2800,basicAttackCoeff:.65,abilities:[],tags:[],phases:[],
 };
}
function verifiedThreeSlotGear(
 classId:ClassIdV2,b:Boss,profile:QualityProfile,
 actor:CombatantDefinition,specId:string,capstoneId:string,
):{build:VerifiedSkillBuildV2;runtime:TrustedEquipmentRuntimeV2}{
 const role=CLASS_ROLES_V2[classId],high=profile==='high',tierNumber=Number(b.tier.slice(1));
 const quality=high?100:0,rarity=high?'rare':'common';
 const characterId='QA_BOSS_CHAR_'+classId;
 const setId='QA_BOSS_ARMOR_'+b.tier+'_'+role;
 const equipment:Partial<Record<GearSlotV2,string>>={};
 const ownedItemsById:Record<string,{
  instanceId:string;slot:GearSlotV2;tier:string;eligibleRoles:typeof role[];
  setFamilyId?:string;requiredLevel:number;
 }>={};
 const instances:Record<string,{
  id:string;itemId:string;tier:string;rarity:string;quality:number;ownerCharacterId:string;
 }>={};
 // Authoritative item definitions require a literal tier union, not string.
 const definitions:Record<string,{
  itemId:string;slot:GearSlotV2;tier:Boss['tier'];
  primaryStats:Partial<Record<keyof CombatStats,number>>;
 }>={};
 const affixes:Record<string,{
  instanceId:string;slot:GearSlotV2;tier:string;rarity:string;quality:number;
  affixes:{id:'max_hp_pct'|'attack_pct';value:number}[];
 }>={};
 for(const slot of slots){
  const instanceId='QA_BOSS_'+classId+'_'+b.tier+'_'+profile+'_'+slot;
  const itemId='QA_BOSS_ITEM_'+b.tier+'_'+slot;
  equipment[slot]=instanceId;
  ownedItemsById[instanceId]={
   instanceId,slot,tier:b.tier,eligibleRoles:[role],requiredLevel:1,
   ...(slot==='helmet'||slot==='chest'?{setFamilyId:setId}:{}),
  };
  instances[instanceId]={id:instanceId,itemId,tier:b.tier,rarity,quality,
   ownerCharacterId:characterId};
  definitions[itemId]={
   itemId,tier:b.tier,slot,
   primaryStats:slot==='helmet'?{maxHp:tierNumber*70}
    :slot==='chest'?{maxHp:tierNumber*90,defense:tierNumber*12}
    :{attackPower:tierNumber*24,healingPower:tierNumber*6},
  };
  affixes[instanceId]={instanceId,slot,tier:b.tier,rarity,quality,
   affixes:high&&slot==='weapon'?[{id:'attack_pct',value:.06}]:
    high&&slot==='helmet'?[{id:'max_hp_pct',value:.04}]:[],
  };
 }
 const selectedSkills=SKILL_IDENTITIES_V2.filter(s=>s.classId===classId&&
  SKILLS_V2.some(x=>x.id===s.id&&x.unlockLevel<=b.level)).slice(0,2);
 assert.equal(selectedSkills.length,2);
 const build:VerifiedSkillBuildV2={
  actor,verified:{classId,level:b.level,ownedInstanceIds:new Set(Object.values(equipment))},
  selected:{
   specializationId:specId,equipment,
   activeSkills:selectedSkills.map(s=>({skillId:s.id,variantId:s.variants[0].id})),
   talentRanks:{},signaturePassiveIds:[],capstoneId:b.level>=50?capstoneId:null,
  },
  ownedItemsById,
  setsById:{[setId]:{id:setId,role,slots:['helmet','chest'],thresholds:[2]}},
 };
 const stats={...actor.stats};
 const runtime:TrustedEquipmentRuntimeV2={
  actorId:actor.id,characterId,
  classBaselinePolicy:{version:'synthetic-boss-three-slot-v1',profiles:{
   [classId]:{
    classId,minLevel:1,maxLevel:75,statsAtLevel:()=>({...stats}),
    basicAttackMs:actor.basicAttackMs,basicAttackCoeff:actor.basicAttackCoeff,
    abilities:actor.abilities,
   },
  }},
  instancesById:instances,definitionsByItemId:definitions,
  affixesByInstanceId:affixes,
  basePolicy:{
   rarityMultipliers:{common:1,rare:1.05},
   qualityMultiplier:equipmentQualityMultiplierV2,ceilings,
  },
  rarityPolicy:{version:'synthetic-boss-rarity-v1',
   order:['common','rare'],multipliers:{common:1,rare:1.05}},
  setsPolicy:{effectsByThreshold:{
   [setId+':2']:[{stat:'maxHp',mode:'relative',value:.04}],
  },ceilings},
  affixPolicy:{
   limits:affixLimits,
   countsByTierRarity:{
    [b.tier+':common']:0,
    [b.tier+':rare']:1,
   },
   maxFinalHaste:1,maxFinalCritChance:1,maxFinalCritMultiplier:10,
  },
 };
 return {build,runtime};
}

type Measurement={
 bossId:string;classId:string;specId:string;profile:QualityProfile;
 finalAttack:number;finalHp:number;finalDefense:number;
 playerDamage:number;playerHealing:number;playerTaken:number;
 pacing:BossPacingObservationV2;
};
const report:Measurement[]=[];
let reconciledPairs=0,deterministicReplays=0;
for(const b of bosses){
 for(const classId of Object.keys(CLASS_NAMES_V2) as ClassIdV2[]){
  const specs=SPECIALIZATIONS_V2.filter(s=>s.classId===classId);
  assert.equal(specs.length,2);
  for(const spec of specs){
   const actor={...launchPlayer(CLASS_NAMES_V2[classId],b.level),
    id:'QA_BOSS_ACTOR_'+classId};
   const original=JSON.stringify(actor);
   const base=baseBoss(b);
   assert.equal(base.name,b.name);
   const seed='QA_BOSS_GEAR_'+b.id+'_'+classId+'_'+spec.id;
   const candidate=prepareSoloEnemyKitsV2([base],{
    ruleset:'enemy-v2-prototype-1',serverSeed:seed,
    encounterId:'QA_BOSS_GEAR_'+b.id+'_'+classId,
    region:b.region,equipmentTier:Number(b.tier.slice(1)),
    eliteEnemyIds:[],
   });
   const stored:PersistedEnemyKitV2={
    ...candidate,source:'server-persisted-v2',revision:1,
   };
   const previews=projectPersistedBossCounterplayV2([base],stored);
   assert.equal(previews.length,1);
   const input:CombatInput={
    seed,players:[actor],enemies:[base],tickMs:100,maxDurationMs:30000,
   };
   const results:Measurement[]=[];
   for(const profile of profiles){
    const {build,runtime}=verifiedThreeSlotGear(
     classId,b,profile,actor,spec.id,spec.capstoneId);
    // Synthetic authority only. It cannot sign a real persistent receipt.
    const trusted={
     snapshot:stored,verifyPersisted:(
      snapshot:PersistedEnemyKitV2,digest:string,
     )=>snapshot===stored&&/^[0-9a-f]{64}$/.test(digest),
    };
    const first=simulateUnifiedEquipmentCombatV2(input,[build],[runtime],true,trusted);
    const repeat=simulateUnifiedEquipmentCombatV2(input,[build],[runtime],true,trusted);
    assert.deepEqual(first,repeat,'Deterministic trusted gear/boss replay '+seed+' '+profile);
    deterministicReplays++;
    assert.equal(first.equipmentEvidence.length,1);
    const evidence=first.equipmentEvidence[0];
    assert.equal(evidence.baseSources.length,3);
    assert.equal(evidence.setEffects.length,1);
    assert.equal(evidence.affixSources.length,profile==='high'?2:0);
    assert.ok(evidence.statStages.afterAffixes.attackPower>=
      evidence.statStages.afterSets.attackPower);
    assert.equal(first.combat.enemies[0].definition.id,b.id);
    assert.deepEqual(first.enemyMechanicLabels,
     stored.preview.flatMap(p=>[
      ...p.abilityNames.map(x=>p.enemyId+': '+x),
      ...p.phaseNames.map(x=>p.enemyId+': '+x),
      ...p.traitIds.map(x=>p.enemyId+': '+x),
     ]));
    assert.ok(first.combat.events.length<10000);
    const player=first.combat.players[0],v2=player.combatV2;
    assert.ok(v2&&Number.isSafeInteger(v2.stacks)&&v2.stacks>=0&&
     v2.stacks<=RESOURCE_CAP_V2[v2.resource]);
    const preview=previews[0];
    const pacing=observeBossPacingV2({
     bossId:b.id,classId,specId:spec.id,
     casts:preview.casts.map(c=>({
      abilityId:c.abilityId,castMs:c.castMs,interruptible:c.interruptible,
     })),
     phases:preview.phases.map(p=>({
      phaseId:p.phaseId,hpPercent:p.hpPercent,
     })),
    },first.combat);
    const measurement:Measurement={
     bossId:b.id,classId,specId:spec.id,profile,
     finalAttack:evidence.statStages.afterAffixes.attackPower,
     finalHp:evidence.statStages.afterAffixes.maxHp,
     finalDefense:evidence.statStages.afterAffixes.defense,
     playerDamage:player.damageDone,playerHealing:player.healingDone,
     playerTaken:player.damageTaken,pacing,
    };
    results.push(measurement);report.push(measurement);
   }
   assert.equal(JSON.stringify(actor),original,'The QA launch actor must not be mutated');
   assert.equal(results.length,2);
   assert.ok(results[1].finalAttack>results[0].finalAttack,
    'High-roll server gear must improve attack in every class/spec');
   assert.ok(results[1].finalHp>results[0].finalHp,
    'High-roll server gear must improve maximum HP');
   assert.ok(results[1].finalDefense>results[0].finalDefense,
    'Rarity/quality scaling must increase defense');
   reconciledPairs++;
  }
 }
}
assert.equal(reconciledPairs,108);
assert.equal(report.length,216);
assert.equal(deterministicReplays,216);
const results=profiles.map(profile=>{
 const observations=report.filter(x=>x.profile===profile).map(x=>x.pacing);
 const perBoss=aggregateBossPacingV2(observations);
 assert.equal(perBoss.length,6);
 assert.ok(perBoss.every(row=>row.cases===18&&row.classSpecCount===18));
 return {profile,bosses:perBoss};
});
for(let i=0;i<6;i++){
 assert.equal(results[0].bosses[i].bossId,results[1].bosses[i].bossId);
}
// Pair the SAME immutable class/spec + boss + server seed. A high-roll build
// can expose mechanics differently from a weak build; collect the differences
// as evidence, never hard-code "every spec must clear" as a CI criterion.
const perBossComparison=results[0].bosses.map((low,i)=>{
 const high=results[1].bosses[i];
 return {
  bossId:low.bossId,
  lowWins:low.wins,highWins:high.wins,
  lowTimeouts:low.timeouts,highTimeouts:high.timeouts,
  lowPhase70:low.phase70Cases,highPhase70:high.phase70Cases,
  lowPhase35:low.phase35Cases,highPhase35:high.phase35Cases,
  lowMedianBossHpPercent:low.bossHpP50Percent,
  highMedianBossHpPercent:high.bossHpP50Percent,
  lowDurationP50Ms:low.durationP50Ms,highDurationP50Ms:high.durationP50Ms,
  highWinsBeforeTell:high.winsBeforeFirstTell,
  highWipesBeforeTell:high.wipesBeforeFirstTell,
  highHpWallTimeouts:high.timeoutsWithBossHpAbove70,
 };
});
assert.equal(perBossComparison.length,6);
// This is a diagnostic comparison, NEVER a release win rate or numeric goal.
console.log(JSON.stringify({
 type:'SYNTHETIC_THREE_SLOT_EQUIPMENT_V2_BOSS_PACING_NOT_RELEASE_TUNING',
 scenarios:report.length,pairs:reconciledPairs,deterministicReplays,
 itemsPerProfile:3,armorSetThreshold:2,
 highProfileAffixCount:2,lowProfileAffixCount:0,
 maxDurationMs:30000,results,perBossComparison,
}));
console.log('PASS: 216 private deterministic six-boss x 18-spec x low/high 3-slot set/affix/skills/gear/seeded-enemy encounters');
