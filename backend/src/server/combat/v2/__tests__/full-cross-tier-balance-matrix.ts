/**
 * Classes + Equipment + Enemies 2.0 cross-system synthetic calibration.
 * No player accounts, actual drops, live dungeons, final tier/rarity curves,
 * or implicit release-level DPS targets.
 *
 * 9 classes x 2 specs x 5 gear tiers x 2 quality/rarity profiles
 * x (normal,elite,boss) = 540 deterministic calibration encounters.
 * T1 uses generic enemy bridge ONLY: authored Enemy V2 kits currently require
 * equipmentTier >=2. This remains a marked, blocking coverage gap.
 */
import {strict as assert} from 'node:assert';
import type {CombatStats,CombatantDefinition} from '../../types';
import {launchPlayer} from '../../content/launch-combat';
import {CLASS_NAMES_V2,SKILL_IDENTITIES_V2,SPECIALIZATIONS_V2} from '../skill-catalog';
import {CLASS_ROLES_V2,type ClassIdV2} from '../build-contract';
import {simulateUnifiedEquipmentCombatV2,type TrustedEquipmentRuntimeV2} from '../unified-equipment-encounter';
import {prepareSoloEnemyKitsV2,type PersistedEnemyKitV2} from '../enemy-kit-composer';
import {equipmentQualityMultiplierV2} from '../equipment-scaling-policy';
import {RESOURCE_CAP_V2} from '../resource-runtime';
import type {VerifiedSkillBuildV2} from '../skill-effects';
import type {ServerAffixPolicyV2} from '../equipment-affixes';

type EncounterKind='normal'|'elite'|'boss';
type Profile={id:'low'|'high';quality:0|100;rarity:'common'|'rare'};
type Tier=1|2|3|4|5;
type GearTier=`T${Tier}`;
const profiles:readonly Profile[]=[
 {id:'low',quality:0,rarity:'common'},
 {id:'high',quality:100,rarity:'rare'},
];
const kinds:readonly EncounterKind[]=['normal','elite','boss'];
const tiers:readonly Tier[]=[1,2,3,4,5];
const stats:readonly (keyof CombatStats)[]=[
 'maxHp','attackPower','healingPower','defense','accuracy','evasion',
 'critChance','critMultiplier','haste',
];
const ceilings=Object.fromEntries(stats.map(stat=>[stat,1e8])) as Record<keyof CombatStats,number>;
const affixLimits=Object.fromEntries([
 'attack_pct','defense_pct','max_hp_pct','haste_pp','crit_rate_pp','crit_damage_pct',
 'accuracy_pp','evasion_pp','penetration_pp','ward_pp','shield_strength_pct',
 'class_healing_pct','hex_potency_pct',
].map(key=>[key,{min:.01,max:.10}])) as ServerAffixPolicyV2['limits'];
const region=(tier:Tier):'asterfall'|'sunscar'|'frostmarch'=>
 tier<=2?'asterfall':tier<=4?'sunscar':'frostmarch';
const bossByRegion={asterfall:'BOSS_EXP_ROOT',sunscar:'BOSS_EXP_SOLAR',
 frostmarch:'BOSS_EXP_BELLBEAST'} as const;
const roleCounts={tank:0,damage:0,support:0};
const resultRows:{
 classId:string;spec:string;role:string;tier:GearTier;
 profile:'low'|'high';kind:EncounterKind;
 enemyKit:'generic-t1'|'authored-v2';
 dps:number;hps:number;damageTaken:number;victory:boolean;
 durationMs:number;resourceEvents:number;mechanics:number;
 baseEquipmentStat:number;
}[]=[];
let authored=0,t1Gaps=0,deterministicChecks=0;
for(const classId of Object.keys(CLASS_NAMES_V2) as ClassIdV2[]){
 const role=CLASS_ROLES_V2[classId];
 const specs=SPECIALIZATIONS_V2.filter(spec=>spec.classId===classId);
 assert.equal(specs.length,2);
 for(const spec of specs){
  roleCounts[role]++;
  for(const tier of tiers){
   const level=tier*10;
   const selectedSkills=SKILL_IDENTITIES_V2.filter(skill=>
    skill.classId===classId&&skill.unlockLevel<=level).slice(0,2);
   assert.ok(selectedSkills.length>=1,
    'Every class must have an unlocked active skill at the tier level');
   const gearTier=`T${tier}` as GearTier;
   const actor=launchPlayer(CLASS_NAMES_V2[classId],level);
   const classStats={...actor.stats};
   const mainStat: keyof CombatStats =
    role==='tank'?'maxHp':role==='damage'?'attackPower':'healingPower';
   let beforeHigh:number|null=null;
   for(const profile of profiles){
    const instanceId='QAGEAR_'+classId+'_'+tier+'_'+profile.id;
    const characterId='QA_CHAR_'+classId;
    const itemId='QA_ITEM_'+classId+'_'+tier;
    const build:VerifiedSkillBuildV2={
     actor,verified:{classId,level,ownedInstanceIds:new Set([instanceId])},
     selected:{specializationId:spec.id,equipment:{helmet:instanceId},
      activeSkills:selectedSkills.map(s=>({skillId:s.id,variantId:s.variants[0].id})),
      talentRanks:{},signaturePassiveIds:[],capstoneId:level>=50?spec.capstoneId:null},
     ownedItemsById:{[instanceId]:{
      instanceId,slot:'helmet',tier:gearTier,eligibleRoles:[role],requiredLevel:1,
     }},setsById:{},
    };
    const runtime:TrustedEquipmentRuntimeV2={
     actorId:actor.id,characterId,
     classBaselinePolicy:{version:'synthetic-balance-q-only',profiles:{
      [classId]:{
       classId,minLevel:1,maxLevel:75,statsAtLevel:()=>({...classStats}),
       basicAttackMs:actor.basicAttackMs,basicAttackCoeff:actor.basicAttackCoeff,
       abilities:actor.abilities,
      },
     }},
     instancesById:{[instanceId]:{
      id:instanceId,itemId,tier:gearTier,rarity:profile.rarity,
      quality:profile.quality,ownerCharacterId:characterId,
     }},
     definitionsByItemId:{[itemId]:{
      itemId,tier:gearTier,slot:'helmet',
      primaryStats:{[mainStat]:tier*20},
     }},
     affixesByInstanceId:{[instanceId]:{
      instanceId,slot:'helmet',tier:gearTier,
      rarity:profile.rarity,quality:profile.quality,affixes:[],
     }},
     basePolicy:{
      rarityMultipliers:{common:1,rare:1.05},
      qualityMultiplier:equipmentQualityMultiplierV2,ceilings,
     },
     rarityPolicy:{version:'synthetic-rarity-curve',
      order:['common','rare'],multipliers:{common:1,rare:1.05}},
     setsPolicy:{effectsByThreshold:{},ceilings},
     affixPolicy:{
      limits:affixLimits,
      countsByTierRarity:{[`${gearTier}:${profile.rarity}`]:0},
      maxFinalHaste:1,maxFinalCritChance:1,maxFinalCritMultiplier:10,
     },
    };
    for(const kind of kinds){
     const locale=region(tier);
     const isBoss=kind==='boss';
     const enemyId=isBoss?bossByRegion[locale]:'QA_ENEMY_'+kind;
     const enemy:CombatantDefinition={
      id:enemyId,name:'Synthetic '+kind,team:'enemies',role:'enemy',
      level,stats:{
       maxHp:8000+tier*3500,attackPower:60+tier*40,healingPower:0,
       defense:90+tier*40,accuracy:700+tier*40,evasion:100+tier*10,
       critChance:.04,critMultiplier:1.5,haste:0,
      },
      basicAttackMs:2500,basicAttackCoeff:.7,
      abilities:[],boss:isBoss,
      tags:['pve:archetype:bruiser'],
     };
     const seed='v2-balance-'+classId+'-'+spec.id+'-'+tier+'-'+kind;
     const input={seed,players:[actor],enemies:[enemy],maxDurationMs:6000};
     const fixtureKit=tier===1?undefined:prepareSoloEnemyKitsV2([enemy],{
      ruleset:'enemy-v2-prototype-1',serverSeed:seed,
      encounterId:'QA_'+classId+'_'+tier+'_'+kind,
      region:locale,equipmentTier:tier,
      eliteEnemyIds:kind==='elite'?[enemyId]:[],
     });
     const trusted=fixtureKit?{
      snapshot:{...fixtureKit,source:'server-persisted-v2' as const,
       revision:1} as PersistedEnemyKitV2,
      verifyPersisted:(_snapshot:PersistedEnemyKitV2,digest:string)=>
       /^[0-9a-f]{64}$/.test(digest),
     }:undefined;
     // This fixture issues one synthetic trusted kit per encounter. The real
     // service still demands a persisted receipt; this is not a game route.
     const a=simulateUnifiedEquipmentCombatV2(input,[build],[runtime],true,trusted);
     const b=simulateUnifiedEquipmentCombatV2(input,[build],[runtime],true,trusted);
     assert.deepEqual(a,b,'Deterministic replay '+seed+' '+profile.id);
     deterministicChecks++;
     assert.equal(a.equipmentEvidence.length,1);
     assert.equal(a.equipmentEvidence[0].baseSources.length,1);
     assert.equal(a.equipmentEvidence[0].affixSources.length,0);
     assert.equal(a.equipmentEvidence[0].setEffects.length,0);
     const stages=a.equipmentEvidence[0].statStages;
     const baseStat=stages.afterItemBase[mainStat];
     assert.ok(Number.isFinite(baseStat)&&baseStat>stages.afterSkills[mainStat],
      'Verified tier gear must meaningfully increase selected base stat');
     if(kind==='normal'){
      if(profile.id==='low')beforeHigh=baseStat;
      if(profile.id==='high'){
       assert.ok(beforeHigh!==null&&baseStat>beforeHigh,
        'Rarity and quality must increase source-owned gear stat');
      }
     }
     assert.ok(a.combat.events.length<5000,'unbounded combat proc recursion');
     const p=a.combat.players[0];
     for(const value of [p.damageDone,p.healingDone,p.damageTaken,p.hp])
      assert.ok(Number.isFinite(value),'Nonfinite combat outcome');
     for(const evt of a.combat.events.filter(e=>
      e.type==='resource_gain'||e.type==='resource_spend')){
      assert.ok(evt.resource!==undefined);
      const cap=RESOURCE_CAP_V2[evt.resource!];
      assert.ok(Number.isInteger(evt.resourceAfter)&&
       evt.resourceAfter!>=0&&evt.resourceAfter!<=cap,
       'Resource overflow '+classId+' '+spec.id);
     }
     if(tier===1){t1Gaps++;assert.equal(trusted,undefined);}
     else{authored++;assert.ok(a.enemyMechanicLabels.length>0);}
     resultRows.push({
      classId,spec:spec.id,role,tier:gearTier,profile:profile.id,kind,
      enemyKit:tier===1?'generic-t1':'authored-v2',
      dps:Math.round(p.damageDone/Math.max(1,a.combat.durationMs)*1000),
      hps:Math.round(p.healingDone/Math.max(1,a.combat.durationMs)*1000),
      damageTaken:Math.round(p.damageTaken),
      victory:a.combat.victory,durationMs:a.combat.durationMs,
      resourceEvents:a.combat.events.filter(e=>
       e.type==='resource_gain'||e.type==='resource_spend').length,
      mechanics:a.enemyMechanicLabels.length,baseEquipmentStat:baseStat,
     });
    }
   }
  }
 }
}
assert.equal(roleCounts.tank,6);
assert.equal(roleCounts.damage,8);
assert.equal(roleCounts.support,4);
assert.equal(resultRows.length,540);
assert.equal(authored,432);
assert.equal(t1Gaps,108);
assert.equal(deterministicChecks,540);
const summary=Object.fromEntries(tiers.map(tier=>[
 'T'+tier,{
  cases:resultRows.filter(r=>r.tier==='T'+tier).length,
  avgDps:Math.round(resultRows.filter(r=>r.tier==='T'+tier)
   .reduce((sum,r)=>sum+r.dps,0)/108),
  victories:resultRows.filter(r=>r.tier==='T'+tier&&r.victory).length,
  authoredEnemyKit:tier>1,
 },
]));
console.log(JSON.stringify({fixture:'SYNTHETIC_NOT_RELEASE_BALANCE',
 scenarios:resultRows.length,deterministicChecks,roleCounts,
 authoredEnemyCases:authored,unapprovedT1KitCases:t1Gaps,
 summary,
 // Developer-only diagnostics, not player data or final DPS promises.
 results:resultRows,
}));
console.log('PASS: 9 classes / 18 specs / 5 tiers / 2 quality-rarity profiles / 3 enemy types; 540 deterministic full-pipeline synthetic encounters');
