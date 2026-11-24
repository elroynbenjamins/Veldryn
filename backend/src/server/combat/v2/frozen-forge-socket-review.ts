/** Private exact-copy Forge + socket candidate handoff.
 * Never mount as a command or issue a runtime authority from this module.
 * Only exact compatible gem semantics are projected; all other families
 * remain blocked until their proposed migration rules are approved.
 */
import type {CombatantDefinition,CombatStats} from '../types';
import type {VerifiedSkillBuildV2} from './skill-effects';
import {compileRealFrozenForgeActorV2,type TrustedFrozenForgeCombatSourceV2} from './equipment-frozen-forge-bridge';
import {reviewPermanentGemSourcesV2} from './permanent-gem-source-review';
import type {V2GemSidecarState} from '../../equipment/equipment-crafting-v2-gem-sidecar-types';
import {enemyV2SnapshotDigest} from './enemy-engine-authority';

export interface ForgeSocketReviewPolicyV2{
 readonly version:string;
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
 const compiled=compileRealFrozenForgeActorV2(actor,build,source);
 const ids=[...compiled.evidence.equippedInstanceIds].sort();
 const gems=reviewPermanentGemSourcesV2({...source,sidecar,equippedInstanceIds:ids});
 // Both independent verifiers read the same source object/revision. Bind the
 // two complete digests and the policy into one additional readback proof.
 const digest=enemyV2SnapshotDigest({source:'QA_FORGE_SOCKET_COMBINED_V1',
  accountId:source.accountId,characterId:source.characterId,actorId:actor.id,
  revision:source.ledgerRevision,worn:ids,forge:compiled.evidence.receiptDigest,
  gems:gems.receiptDigest,policy});
 if(source.verifyPersisted(digest,source.ledgerRevision)!==true)fail('unverified_combined_snapshot');
 const supported=new Set(['maxHp:percent','armor:percent','critRate:percentage_point','accuracy:percentage_point']);
 const unsupported=gems.statSources.filter(s=>!supported.has(s.stat+':'+s.unit));
 if(unsupported.length)fail('unreconciled_stat_gem');
 const base=compiled.evidence.stages.afterFrozenBase;
 const prior=compiled.actor.stats;
 const raw=(id:string)=>compiled.evidence.affixSources.filter(s=>s.id===id).reduce((n,s)=>n+s.value,0);
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
