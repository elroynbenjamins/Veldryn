/** V94C: offline comparison only. Never replay a subset as a new event attempt.
 * Maximum matched-subset local damage is an unapproved diagnostic floor,
 * not a reward or World HP formula. All nonempty subsets must be present. */
import {enemyV2SnapshotDigest} from './enemy-engine-authority';
import type {simulateWorldBossSharedEngineReviewV2} from './unified-equipment-encounter';
type Raid=ReturnType<typeof simulateWorldBossSharedEngineReviewV2>;
const idKey=(ids:readonly string[])=>JSON.stringify([...ids].sort());
const base=(r:Raid)=>{
 const {members,rosterDigest,...scope}=r.binding.scope;
 return {scope,bossDefinitionDigest:r.binding.bossDefinitionDigest,reviewRulesDigest:r.reviewRulesDigest};
};
export function reviewWorldBossAccountFairnessV2(full:Raid,subsets:readonly Raid[]){
 if(!full||!Array.isArray(subsets))throw Error('world_boss_fairness_invalid_review');
 const fullMembers=full.binding.scope.members;
 if(fullMembers.length<1||fullMembers.length>3||subsets.length!==2**fullMembers.length-2)
  throw Error('world_boss_fairness_incomplete_subsets');
 const fullById=new Map(fullMembers.map(m=>[m.characterId,m]));
 const fullActors=new Map(full.compiledActorDigests.map(m=>[m.actorId,m.digest]));
 if(fullById.size!==fullMembers.length||fullActors.size!==fullMembers.length)
  throw Error('world_boss_fairness_duplicate_full_member');
 const baseDigest=enemyV2SnapshotDigest(base(full));
 const seen=new Set<string>();
 const raids:readonly Raid[]=[full,...subsets];
 const rows=raids.map(r=>{
  if(!r||r.persisted!==false||r.rewardGranted!==false||r.globalHpCredited!==0||
   r.releaseReady!==false||enemyV2SnapshotDigest(base(r))!==baseDigest||
   !Number.isFinite(r.localBossHpLoss)||r.localBossHpLoss<0||
   r.combat.enemies.length!==1||
   Math.abs(r.localBossHpLoss-(r.combat.enemies[0].definition.stats.maxHp-r.combat.enemies[0].hp))>1e-6)
   throw Error('world_boss_fairness_scope_mismatch');
  const members=r.binding.scope.members;
  const ids=members.map(m=>m.characterId),key=idKey(ids);
  if(!ids.length||new Set(ids).size!==ids.length||seen.has(key)||
   members.length!==r.compiledActorDigests.length||members.length!==r.combat.players.length||
   members.some(m=>!fullById.has(m.characterId)||
    enemyV2SnapshotDigest(m)!==enemyV2SnapshotDigest(fullById.get(m.characterId)))||
   members.some(m=>!r.compiledActorDigests.some(a=>a.actorId===m.actorId&&a.digest===fullActors.get(m.actorId)))||
   members.some(m=>!r.combat.players.some(p=>p.definition.id===m.actorId)))
   throw Error('world_boss_fairness_member_mismatch');
  seen.add(key);
  return {characterIds:[...ids].sort(),localHpLoss:r.localBossHpLoss};
 });
 const candidate=Math.max(...rows.map(x=>x.localHpLoss));
 return {fullRosterLocalHpLoss:full.localBossHpLoss,matchedSubsetMaximum:candidate,
  possibleFloorDelta:candidate-full.localBossHpLoss,comparisons:rows,
  policyApproved:false as const,extraAttemptsGranted:0 as const,globalHpCredited:0 as const,
  rewardGranted:false as const,releaseReady:false as const};
}
