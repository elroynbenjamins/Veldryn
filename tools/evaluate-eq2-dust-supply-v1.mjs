#!/usr/bin/env node
/**
 * Offline Glassbound Dust supply proposal simulator; never writes runtime data.
 *
 *   node tools/evaluate-eq2-dust-supply-v1.mjs
 *
 * Models an effective baseline gather cycle (before tools, buffs and device
 * progression) at a proposed T4-specific Sunscar mining source.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {simulateJointOreDust,verifyGatheringScenario} from './lib/eq2-joint-gathering-v1.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const policy=read('docs/equipment-2-0/t1-t4-drop-and-dust-policy-review-v1.json');
const economy=read('docs/equipment-2-0/t1-t4-economy-review-v1.json');
const draft=read('docs/equipment-2-0/t1-t4-economy-generated-recipes-v1.json');
const fail=message=>{throw Error('Review-only Dust audit blocked: '+message);};
if(policy.status!=='REVIEW_ONLY_DO_NOT_IMPORT_TO_RUNTIME'
  ||economy.status!=='REVIEW_ONLY_NO_RUNTIME'
  ||draft.status!=='REVIEW_ONLY_DO_NOT_IMPORT_TO_RUNTIME')fail('Unexpected activated policy');
if(economy.expected.ordinaryPieces!==169||draft.recipes.length!==338)fail('Catalog drift');
if(policy.normalDrops.length!==4)fail('Normal drop policy drift');
for(const tier of policy.normalDrops){
  const base=economy.tierSpecs.find(x=>x.tier===tier.tier);
  if(!base||tier.common.id!==base.items.common||tier.rare.id!==base.items.rare
    ||tier.common.finalChance!==base.drops.commonKill
    ||tier.rare.finalChance!==base.drops.scarceKill
    ||tier.eligibleEliteRareChance!==base.drops.scarceElite)fail('Tier drop policy differs from reviewed economy at '+tier.tier);
  for(const material of [tier.common,tier.rare]){
    if(!material.sources?.length)fail('Combat source missing');
    if(material.sources.some(s=>s.proposed2Unlock>base.levels.character||s.proposed2Unlock<1)
      &&!material.sources.some(s=>s.proposed2Unlock<=base.levels.character))
      fail('No entry-eligible source for '+material.id);
  }
}
const dust=policy.dust,access=dust.access;
if(dust.itemId!=='EQ2_GLASSBOUND_DUST'||access.regionId!=='SUNSCAR'
  ||access.areaId!=='ZONE_008'||access.minimumMiningSkillLevel>economy.tierSpecs[3].levels.profession
  ||access.areaMinimumCharacterLevel>economy.tierSpecs[3].levels.character)fail('Dust inaccessible at T4 entry');
if(!dust.scenarios.some(x=>x.id===dust.selectedForFurtherReview))fail('Selected scenario not present');
const demands=[
 {id:'proposed-v2-ingot-refining',ore:1870,dust:506,origin:'Review-only T4 ten-slot bill including existing Alchemy binders'},
 {id:'preserve-existing-ingot-recipe',ore:1264,dust:506,origin:'Same item bill using current authored Sunstone Ingot recipe'},
 {id:'player-already-owns-sunstone',ore:0,dust:506,origin:'Upper-bound dust-only material source scenario, not a claim of stored player supply'}
];
const reports=[];
for(const scenario of dust.scenarios){
  verifyGatheringScenario(scenario);
  reports.push({
    scenario:scenario.id,reason:scenario.reason,
    source:dust.nodeProposal.id,zone:access.regionId,areaId:access.areaId,
    primaryOrePerAction:scenario.orePerAction,
    finalDustProcChancePerGatherAction:scenario.bonusDustChance,
    dustPerSuccessfulProc:[scenario.bonusDustMin,scenario.bonusDustMax],
    baseSecondsPerAction:scenario.cycleSeconds,
    demand:demands.map((demand,index)=>({
      name:demand.id,origin:demand.origin,
      ...simulateJointOreDust({
        scenario,requiredOre:demand.ore,requiredDust:demand.dust,
        trials:2048,seed:20261121+index*33
      })
    }))
  });
}
console.log(JSON.stringify({
  status:'REVIEW_ONLY_NO_RUNTIME',
  selectedForFurtherReview:dust.selectedForFurtherReview,
  sourceCaution:'The proposed ZONE_008 two-reward mining node does NOT exist in the current gathering engine. Market, actual yield, tool effects, elite drops and bonus payout logic are NOT active.',
  method:'Seeded per-action Bernoulli bonus Dust roll and uniform 1-3 bonus quantity. 2,048 independent scenario trials; first action count satisfying both Ore and Dust demand. P50/P90/P95 nearest rank.',
  warnings:[
    'Counts are hypothetical once-per-action yields, not measured gathering rates',
    'A two-ore node could increase tradeable Sunstone market supply and must be monitored for price and legacy side effects',
    'Normal and elite monster drop rates must be enforced only in final server-owned reward settlement',
    'Existing SUNSTONE_INGOT recipe and new EQ2 draft output still conflict; this report does not choose one',
    'No NPC shop or Dungeon rewards grant Dust in this review, and no new Material item is registered',
    'No approval to change UI or production was given by this report'
  ],
  reports
},null,2));
