/** Private exact-copy Forge + socket candidate handoff.
 * Never mount as a command or issue a runtime authority from this module.
 * Only exact compatible gem semantics are projected; all other families
 * remain blocked until their proposed migration rules are approved.
 */
import type {CombatantDefinition,CombatStats} from '../types';
import type {VerifiedSkillBuildV2} from './skill-effects';
import {compileRealFrozenForgeActorV2,type TrustedFrozenForgeCombatSourceV2} from './equipment-frozen-forge-bridge';
import {reviewPermanentGemSourcesV2} from './permanent-gem-source-review';
import {GEM_BALANCE_REVIEW_V2,type GemBalanceReviewPolicyV2} from '../../equipment/gems/gem-catalog-v1';
import type {V2GemSidecarState} from '../../equipment/equipment-crafting-v2-gem-sidecar-types';
import {enemyV2SnapshotDigest} from './enemy-engine-authority';

/** Candidate semantics, not an approved migration or combat authority.
 * Keep these mappings independently versioned from the approved magnitudes. */
export const FORGE_SOCKET_MECHANICS_REVIEW_V2='forge-socket-mechanics-review-v2-20261126' as const;
export interface ForgeSocketMechanicsReviewV2{
 readonly version:typeof FORGE_SOCKET_MECHANICS_REVIEW_V2;
 readonly maxFinalAttackPower:number;
}
export interface ForgeSocketReviewPolicyV2{
 readonly version:string;
 readonly gemBalancePolicy?:GemBalanceReviewPolicyV2;
 readonly mechanicsReview?:ForgeSocketMechanicsReviewV2;
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
 const mechanics=policy.mechanicsReview;
 if(mechanics!==undefined&&(!mechanics||mechanics.version!==FORGE_SOCKET_MECHANICS_REVIEW_V2||
  policy.gemBalancePolicy!==GEM_BALANCE_REVIEW_V2||!finite(mechanics.maxFinalAttackPower)||
  mechanics.maxFinalAttackPower<=0))fail('invalid_mechanics_review_policy');
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
 if(mechanics)for(const key of ['power:percent','ward:percent','critDamage:percent',
  'penetration:percentage_point','haste:percent','potency:percent','evasion:percentage_point','tenacity:percent'])
  supported.add(key);
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
 // Separate candidate interpretation of legacy units, based on the
 // pre-affix stage and original Forge rolls. Never modify frozen copies.
 // Savage adds to the crit multiplier; Swift multiplies base haste only.
 // Ward/Resolute are explicit proposed point conversions, Might maps to
 // attack, Potent to authored direct skill damage, not generic healing/DoT.
 if(mechanics){
  if(g('power:percent'))stats.attackPower=round(base.attackPower*(1+raw('attack_pct')+g('power:percent')));
  if(g('critDamage:percent'))stats.critMultiplier=round(base.critMultiplier*(1+raw('crit_damage_pct'))+g('critDamage:percent'));
  if(g('haste:percent'))stats.haste=round(base.haste*(1+g('haste:percent'))+raw('haste_pp'));
  if(g('ward:percent'))advanced.wardPp=round(raw('ward_pp')+g('ward:percent'));
  if(g('penetration:percentage_point'))advanced.penetrationPp=round(raw('penetration_pp')+g('penetration:percentage_point'));
  if(g('potency:percent'))advanced.abilityDamagePct=round(raw('ability_damage_pct')+g('potency:percent'));
  if(g('evasion:percentage_point'))advanced.evasionPp=round(raw('evasion_pp')+g('evasion:percentage_point'));
  if(g('tenacity:percent'))advanced.tenacityPp=round(raw('tenacity_pp')+g('tenacity:percent'));
  if(stats.attackPower>mechanics.maxFinalAttackPower||stats.haste>source.affixPolicy.maxFinalHaste||
    stats.critMultiplier>source.affixPolicy.maxFinalCritMultiplier||stats.critMultiplier<1)
   fail('combined_stat_cap');
  for(const key of ['wardPp','penetrationPp','abilityDamagePct','evasionPp','tenacityPp'] as const){
   const value=advanced[key]??0,cap=source.affixPolicy.maxAdvancedEffects?.[key];
   if(value>0&&(!finite(cap)||cap>1||value>cap))fail('combined_stat_cap');
  }
 }
 const accuracyCap=source.affixPolicy.maxAdvancedEffects?.accuracyPp;
 if(!Object.values(stats).every(finite)||stats.maxHp<=0||stats.maxHp>policy.maxFinalHp||
   stats.defense>policy.maxFinalDefense||stats.critChance>source.affixPolicy.maxFinalCritChance||
   (advanced.accuracyPp>0&&(!finite(accuracyCap)||advanced.accuracyPp>accuracyCap)))
  fail('combined_stat_cap');
 return {scope:'PRIVATE_EXACT_FORGE_SOCKET_PROJECTION_V1' as const,digest,
  equippedInstanceIds:ids,stats,advanced,gemSources:gems.statSources,
  deferredEffectSources:gems.effectSources,forgeEvidence:compiled.evidence,
  policyVersion:policy.version,...(mechanics?{mechanicsReview:mechanics.version,requiresMigrationApproval:true as const}:{}),
  canExecuteCombat:false as const,cpApproved:false as const,
  releaseEnabled:false as const};
}
