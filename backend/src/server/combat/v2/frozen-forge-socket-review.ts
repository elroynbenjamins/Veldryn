/** Private exact-copy Forge + socket candidate handoff.
 * Never mount as a command or issue a runtime authority from this module.
 * Only exact compatible gem semantics are projected; all other families
 * remain blocked until their proposed migration rules are approved.
 */
import type {CombatantDefinition,CombatStats} from '../types';
import type {VerifiedSkillBuildV2} from './skill-effects';
import {compileRealFrozenForgeActorV2,type TrustedFrozenForgeCombatSourceV2} from './equipment-frozen-forge-bridge';
import {reviewPermanentGemSourcesV2} from './permanent-gem-source-review';
import type {GemBalanceReviewPolicyV2} from '../../equipment/gems/gem-catalog-v1';
import type {V2GemSidecarState} from '../../equipment/equipment-crafting-v2-gem-sidecar-types';
import {enemyV2SnapshotDigest} from './enemy-engine-authority';

export interface ForgeSocketReviewPolicyV2{
 readonly version:string;
 readonly gemBalancePolicy?:GemBalanceReviewPolicyV2;
 readonly maxFinalHp:number;
 readonly maxFinalDefense:number;
}
const fail=(why:string):never=>{throw Error('combat_v2_forge_socket_review_'+why);};
const round=(n:number)=>Math.round(n*100000)/100000;
const finite=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
export function reviewFrozenForgeSocketsV2(
 actor:CombatantDefinition,build:VerifiedSkillBuildV2,
 source:TrustedFrozenForgeCombatSourceV2,sidecar:V2GemSidecarState,
 policy:ForgeSocketReviewPolicyV2,
){
 if(!policy||!policy.version||!finite(policy.maxFinalHp)||policy.maxFinalHp<=0||
   !finite(policy.maxFinalDefense))fail('invalid_policy');
 // The generic persisted digest intentionally rejects Set and executable
 // objects. Project only the two known non-JSON fields; never relax that
 // digest or stringify arbitrary source objects. The selected class profile
 // is the only profile read by the Forge compiler.
 const classId=build.verified.classId;
 const classPolicy=source.classBaselinePolicy;
 const profile=classPolicy.profiles[classId];
 const levelCurve=profile?.statsAtLevel;
 const owned=build.verified.ownedInstanceIds;
 if(!profile||typeof levelCurve!=='function'||!(owned instanceof Set)||
    Object.getPrototypeOf(owned)!==Set.prototype)throw Error('combat_v2_forge_socket_review_invalid_snapshot');
 const snapshot=()=>{
  if(source.classBaselinePolicy!==classPolicy||classPolicy.profiles[classId]!==profile||
     profile.statsAtLevel!==levelCurve||build.verified.classId!==classId||
     build.verified.ownedInstanceIds!==owned)fail('mutated_source');
  const {verifyPersisted:_verify,classBaselinePolicy:_policy,...data}=source;
  const {statsAtLevel:_curve,...profileData}=profile;
  const ownedIds=[...owned];
  if(ownedIds.some(id=>typeof id!=='string'||!id))fail('invalid_snapshot');
  return enemyV2SnapshotDigest({actor,build:{...build,verified:{...build.verified,
    ownedInstanceIds:ownedIds.sort()}},source:{...data,classBaselinePolicy:{
    version:classPolicy.version,profile:profileData,
    levelStats:levelCurve.call(profile,build.verified.level)}},sidecar,policy});
 };
 const original=snapshot();
 const verify=source.verifyPersisted;
 if(typeof verify!=='function')fail('invalid_verifier');
 const guardedSource={...source,verifyPersisted:(digest:string,revision:number)=>{
  if(snapshot()!==original||source.verifyPersisted!==verify)fail('mutated_source');
  const accepted=verify.call(source,digest,revision)===true;
  if(snapshot()!==original||source.verifyPersisted!==verify)fail('mutated_source');
  return accepted;
 }};
 const compiled=compileRealFrozenForgeActorV2(actor,build,guardedSource);
 const ids=[...compiled.evidence.equippedInstanceIds].sort();
 const gems=reviewPermanentGemSourcesV2({...guardedSource,sidecar,equippedInstanceIds:ids},policy.gemBalancePolicy);
 // Both independent verifiers read the same source object/revision. Bind the
 // two complete digests and the policy into one additional readback proof.
 const digest=enemyV2SnapshotDigest({source:'QA_FORGE_SOCKET_COMBINED_V1',
  accountId:source.accountId,characterId:source.characterId,actorId:actor.id,
  revision:source.ledgerRevision,worn:ids,forge:compiled.evidence.receiptDigest,
  gems:gems.receiptDigest,policy});
 if(guardedSource.verifyPersisted(digest,source.ledgerRevision)!==true)fail('unverified_combined_snapshot');
 const supported=new Set(['maxHp:percent','armor:percent','critRate:percentage_point','accuracy:percentage_point']);
 const unsupported=gems.statSources.filter(s=>!supported.has(s.stat+':'+s.unit));
 if(unsupported.length)fail('unreconciled_stat_gem');
 const base=compiled.evidence.stages.afterFrozenBase;
 const prior=compiled.actor.stats;
 const rawTotals=new Map<string,number>();
 for(const row of compiled.evidence.affixSources)rawTotals.set(row.id,(rawTotals.get(row.id)??0)+row.value);
 const raw=(id:string)=>rawTotals.get(id)??0;
 const g=(key:string)=>gems.totals[key]??0;
 const stats:CombatStats={...prior};
 // Reconstruct affected stats from the pre-affix base and summed RAW rolls,
 // rather than multiplying a gem into the already affixed result.
 if(g('maxHp:percent'))stats.maxHp=round(base.maxHp*(1+raw('max_hp_pct')+g('maxHp:percent')));
 if(g('armor:percent'))stats.defense=round(base.defense*(1+raw('defense_pct')+g('armor:percent')));
 if(g('critRate:percentage_point'))stats.critChance=round(base.critChance+raw('crit_rate_pp')+g('critRate:percentage_point'));
 const effects=compiled.actor.combatV2?.equipmentEffects;
 if(!effects)throw Error('combat_v2_forge_socket_review_missing_effects');
 const advanced={...effects};
 if(g('accuracy:percentage_point'))advanced.accuracyPp=round(raw('accuracy_pp')+g('accuracy:percentage_point'));
 const accuracyCap=source.affixPolicy.maxAdvancedEffects?.accuracyPp;
 if(!Object.values(stats).every(finite)||stats.maxHp<=0||stats.maxHp>policy.maxFinalHp||
   stats.defense>policy.maxFinalDefense||stats.critChance>source.affixPolicy.maxFinalCritChance||
   (advanced.accuracyPp>0&&(!finite(accuracyCap)||advanced.accuracyPp>accuracyCap)))
  fail('combined_stat_cap');
 return {scope:'PRIVATE_EXACT_FORGE_SOCKET_PROJECTION_V1' as const,digest,
  equippedInstanceIds:ids,stats,advanced,gemSources:gems.statSources,
  deferredEffectSources:gems.effectSources,forgeEvidence:compiled.evidence,
  policyVersion:policy.version,canExecuteCombat:false as const,cpApproved:false as const,
  releaseEnabled:false as const};
}
