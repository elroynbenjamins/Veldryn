import assert from 'node:assert/strict';
import fs from 'node:fs';
import {EQ2_PREMIUM_RELEASED,reviewBossRewardSourceV6,reviewMarketBossOriginV6} from '../backend/online/eq2-dungeon-boss-source-preflight-v6.mjs';

const clone=x=>JSON.parse(JSON.stringify(x));
const owner='10000000-0000-4000-8000-000000000001';
const runId='20000000-0000-4000-8000-000000000002';
const entitlementId='30000000-0000-4000-8000-000000000003';
const characterId='40000000-0000-4000-8000-000000000004';
const copyId='50000000-0000-4000-8000-000000000005';
const bossRegistry=fs.readFileSync('backend/src/server/expeditions/content/dungeon-boss-rotation.ts','utf8');
const byExpedition={
 EXP_001:['BOSS_EXP_ROOT','BOSS_EXP_BELL'],
 EXP_003:['BOSS_EXP_SOLAR','BOSS_EXP_SPHINX'],
 EXP_005:['BOSS_EXP_BELLBEAST','BOSS_EXP_CANTOR'],
 EXP_007:['BOSS_EXP_FEN','BOSS_EXP_PRIME']
};
for(const [expeditionId,variants] of Object.entries(byExpedition)){
 const pattern=new RegExp(expeditionId+'\\s*:\\s*\\[([\\s\\S]*?)\\]');
 const section=bossRegistry.match(pattern);
 assert(section,'missing authored boss source '+expeditionId);
 for(const id of variants)assert(section[1].includes("bossId:'"+id+"'"),'unknown authored boss '+id);
}
const fixture=(dungeonId='EXP_001',bossId='BOSS_EXP_ROOT')=>({
 run:{
  id:runId,expedition_id:dungeonId,status:'completed',phase:'completed',
  completed_at:'2026-11-23T18:00:00Z',
  route_graph_json:{runId,expeditionId:dungeonId,bossNodeId:'BOSS_1',nodes:[
   {nodeId:'START',kind:'entry',contentId:'COOP_ENTRY'},
   {nodeId:'BOSS_1',kind:'boss',contentId:bossId},
   {nodeId:'BOSS_2',kind:'boss',contentId:bossId}
  ]}
 },
 entitlement:{
  id:entitlementId,run_id:runId,recipient_account_id:owner,character_id:characterId,
  entitlement_kind:'participant',reward_stage:'final',claimed_at:'2026-11-23T18:00:10Z',
  reward_json:{enhanced_reward:true,marks:50}
 },
 bossNodeResults:[{
  run_id:runId,node_id:'BOSS_2',success:true,committed_at:'2026-11-23T17:59:59Z',
  result_json:{kind:'combat',reason:'victory',eventDigest:'synthetic-not-real-proof'}
 }]
});
assert.equal(EQ2_PREMIUM_RELEASED,false);
for(const [dungeonId,bosses] of Object.entries(byExpedition)){
 for(const bossId of bosses){
  const reviewed=reviewBossRewardSourceV6(fixture(dungeonId,bossId));
  const currentlyPublished=['EXP_001','EXP_003'].includes(dungeonId);
  assert.equal(reviewed.eligibleInReview,currentlyPublished);
  assert.equal(reviewed.mintAuthorized,false);
  assert.equal(reviewed.marketAuthorized,false);
  if(currentlyPublished){
    assert.equal(reviewed.reason,'REVIEW_SOURCE_SHAPE_VALID');
    assert.equal(reviewed.source.bossId,bossId);
    assert.equal(reviewed.source.dungeonId,dungeonId);
    assert.equal(reviewed.source.entitlementId,entitlementId);
    assert.equal(reviewed.source.bossNodeId,'BOSS_2');
    assert.equal(reviewed.source.proposedEligibilityPolicy,'ENHANCED_BOSS_CLEAR_ONLY');
  } else assert.equal(reviewed.reason,'DUNGEON_NOT_PUBLISHED');
 }
}
for(const id of ['EXP_002','EXP_004','EXP_006','EXP_008']){
 const result=reviewBossRewardSourceV6(fixture(id));
 assert.equal(result.reason,'RETIRED_DUNGEON');
 assert.equal(result.mintAuthorized,false);
}
const negative=[
 ['missing entitlement',x=>{x.entitlement=null;},'SOURCE_ROWS_REQUIRED'],
 ['fake run ID',x=>{x.run.id='fake';},'BAD_CANONICAL_RECEIPT_ID'],
 ['run still active',x=>{x.run.status='active';},'RUN_NOT_COMPLETED'],
 ['failure phase',x=>{x.run.phase='failed';},'RUN_NOT_COMPLETED'],
 ['entitlement wrong run',x=>{x.entitlement.run_id='different';},'ENTITLEMENT_RUN_MISMATCH'],
 ['wrong recipient',x=>{x.entitlement.character_id='anonymous';},'NO_PHYSICAL_HUMAN_RECIPIENT'],
 ['echo NPC claim',x=>{x.entitlement.entitlement_kind='echo_assistance';},'NOT_HUMAN_FINAL_PARTICIPANT'],
 ['checkpoint claim',x=>{x.entitlement.reward_stage='clear';},'NOT_HUMAN_FINAL_PARTICIPANT'],
 ['unclaimed',x=>{x.entitlement.claimed_at=null;},'MISSING_OR_EARLY_CLAIM'],
 ['claim before completion',x=>{x.entitlement.claimed_at='2026-11-23T17:00:00Z';},'MISSING_OR_EARLY_CLAIM'],
 ['no enhanced reward',x=>{x.entitlement.reward_json.enhanced_reward=false;},'REQUIRES_ENHANCED_CHARGE'],
 ['fake string enhanced',x=>{x.entitlement.reward_json.enhanced_reward='true';},'REQUIRES_ENHANCED_CHARGE'],
 ['route incorrect run',x=>{x.run.route_graph_json.runId='wrong';},'ROUTE_IDENTITY_MISMATCH'],
 ['route incorrect dungeon',x=>{x.run.route_graph_json.expeditionId='EXP_003';},'ROUTE_IDENTITY_MISMATCH'],
 ['missing route',x=>{x.run.route_graph_json.nodes=[];},'MISSING_ROUTE_GRAPH'],
 ['missing pointer',x=>{x.run.route_graph_json.bossNodeId='NO_BOSS';},'UNVERIFIED_BOSS_ROUTE'],
 ['rerolled variant',x=>{x.run.route_graph_json.nodes[2].contentId='BOSS_EXP_BELL';},'BOSS_VARIANT_NOT_FROZEN'],
 ['made up boss',x=>{x.run.route_graph_json.nodes[1].contentId='BOSS_FAKE';x.run.route_graph_json.nodes[2].contentId='BOSS_FAKE';},'BOSS_NOT_IN_AUTHORED_VARIANTS'],
 ['duplicate boss node',x=>{x.run.route_graph_json.nodes[2].nodeId='BOSS_1';},'DUPLICATE_BOSS_NODE_ID'],
 ['boss result another run',x=>{x.bossNodeResults[0].run_id='mismatched';},'UNRELATED_BOSS_COMBAT_RESULT'],
 ['non boss node',x=>{x.bossNodeResults[0].node_id='START';},'UNRELATED_BOSS_COMBAT_RESULT'],
 ['boss defeat',x=>{x.bossNodeResults[0].result_json.reason='defeat';},'UNVERIFIED_BOSS_COMBAT_VICTORY'],
 ['missing combat digest',x=>{x.bossNodeResults[0].result_json.eventDigest='';},'UNVERIFIED_BOSS_COMBAT_VICTORY'],
 ['failed encounter',x=>{x.bossNodeResults[0].success=false;},'REQUIRES_EXACT_ONE_TERMINAL_BOSS_VICTORY'],
 ['two boss victories',x=>{x.bossNodeResults.push({...x.bossNodeResults[0],node_id:'BOSS_1'});},'REQUIRES_EXACT_ONE_TERMINAL_BOSS_VICTORY'],
 ['late boss result',x=>{x.bossNodeResults[0].committed_at='2026-11-23T18:05:00Z';},'BOSS_PROOF_NOT_COMMITTED_BEFORE_REWARD']
];
for(const [label,change,reason] of negative){
 const x=clone(fixture());change(x);
 const result=reviewBossRewardSourceV6(x);
 assert.equal(result.reason,reason,label);
 assert.equal(result.eligibleInReview,false,label);
 assert.equal(result.mintAuthorized,false,label);
}
const valid=reviewBossRewardSourceV6(fixture());
const copy={generation:'equipment_2_0',sourceKind:'dungeon_boss_terminal_victory',
 originalDungeonId:'EXP_001',originalBossId:'BOSS_EXP_ROOT',originalClaimReceiptId:entitlementId,
 instanceId:copyId,currentOwnerId:owner};
const custody={physicalInstanceId:copyId,currentOwnerId:owner,state:'inventory',escrowed:false,equipped:false};
const match=reviewMarketBossOriginV6(valid,copy,custody);
assert.equal(match.structurallyEligible,true);
assert.equal(match.marketAuthorized,false);
assert.equal(match.reason,'REQUIRES_DATABASE_VERIFIED_POSITIVE_EQ2_MARKET_BRIDGE');
const marketNegative=[
 [null,copy,custody,'UNTRUSTED_OR_MISSING_PREVIEW_SOURCE'],
 [{...valid,mintAuthorized:true},copy,custody,'UNTRUSTED_OR_MISSING_PREVIEW_SOURCE'],
 [reviewBossRewardSourceV6({...fixture(),entitlement:{...fixture().entitlement,reward_json:{enhanced_reward:false}}}),copy,custody,'SOURCE_DID_NOT_PASS_REVIEW'],
 [valid,null,custody,'MISSING_EXACT_PHYSICAL_COPY'],
 [valid,{...copy,generation:'v33'},custody,'NEVER_ADMIT_LEGACY_OR_ALTERNATE_SOURCE'],
 [valid,{...copy,sourceKind:'craft'},custody,'NEVER_ADMIT_LEGACY_OR_ALTERNATE_SOURCE'],
 [valid,{...copy,originalBossId:'BOSS_EXP_BELL'},custody,'SOURCE_ORIGIN_MISMATCH'],
 [valid,{...copy,originalClaimReceiptId:'other'},custody,'SOURCE_ORIGIN_MISMATCH'],
 [valid,copy,{...custody,equipped:true},'STALE_OR_NONPHYSICAL_CUSTODY'],
 [valid,copy,{...custody,escrowed:true},'STALE_OR_NONPHYSICAL_CUSTODY'],
 [valid,copy,{...custody,state:'bank'},'STALE_OR_NONPHYSICAL_CUSTODY'],
 [valid,copy,{...custody,physicalInstanceId:'different'},'STALE_OR_NONPHYSICAL_CUSTODY']
];
for(const [proof,item,state,reason] of marketNegative){
 const result=reviewMarketBossOriginV6(proof,item,state);
 assert.equal(result.reason,reason);
 assert.equal(result.marketAuthorized,false);
}
console.log('PASS V6: 8 authored boss IDs, enhanced + terminal victory source joins, '+negative.length+' invalid claim cases, '+marketNegative.length+' invalid Market cases; mint/trade both denied');
