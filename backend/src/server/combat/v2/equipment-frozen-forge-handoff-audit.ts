/**
 * HIDDEN / READ-ONLY: compare the authoritative Skills+Class stat baseline
 * against the shape of the genuine Equipment 2.0 frozen Forge combat evidence
 * exported by the separate Equipment 2.0 source branch (PR #1661).
 *
 * This is a CROSS-BRANCH STRUCTURAL CHECK, not the original Forge ledger,
 * authenticated account readback, mint receipt, item ownership proof, combat
 * permission, item grant or final balance/caps audit. It NEVER calls combat.
 * Frozen Forge baseStats ALREADY include rarity + quality — add ONCE.
 */
import type {CombatStats} from '../types';

export const FROZEN_FORGE_HANDOFF_EVIDENCE_V2=
 'EQ2_FROZEN_FORGE_PRE_SCALED_NO_DOUBLE_MULTIPLIER' as const;
export const FROZEN_FORGE_HANDOFF_SET_BLOCK_V2=
 'BLOCKED_PENDING_EXACT_EQ2_SET_RECONCILIATION' as const;
export const FROZEN_FORGE_HANDOFF_AFFIX_BLOCK_V2=
 'REJECTED_NOT_IGNORED' as const;

interface FrozenForgeHandoffItemV2{
 readonly instanceId:string;
 readonly pieceId:string;
 readonly tier:number;
 readonly rarity:string;
 readonly quality:number;
 readonly scaledBaseStats:Readonly<{attack:number;defense:number;hp:number}>;
}
interface FrozenForgeHandoffAffixV2{
 readonly instanceId:string;
 readonly id:string;
 readonly value:number;
 readonly unit:'relative_percent'|'percentage_points';
}
export interface FrozenForgeCombatHandoffEvidenceV2{
 readonly source:typeof FROZEN_FORGE_HANDOFF_EVIDENCE_V2;
 readonly actorId:string;
 readonly receiptDigest:string;
 readonly equippedInstanceIds:readonly string[];
 readonly items:readonly FrozenForgeHandoffItemV2[];
 readonly stages:Readonly<{
  afterSkills:CombatStats;
  afterFrozenBase:CombatStats;
  afterForgeAffixes:CombatStats;
 }>;
 readonly affixSources:readonly FrozenForgeHandoffAffixV2[];
 readonly setBonuses:typeof FROZEN_FORGE_HANDOFF_SET_BLOCK_V2;
 readonly unsupportedForgeAffixes:typeof FROZEN_FORGE_HANDOFF_AFFIX_BLOCK_V2;
}
export interface FrozenForgeCombatHandoffInspectionV2{
 readonly source:'EQ2_FORGE_SOURCE_SHAPE_REVIEW_ONLY';
 readonly actorId:string;
 readonly equipmentCount:number;
 readonly sourceReceiptDigest:string;
 readonly frozenBaseDelta:Readonly<{attack:number;defense:number;hp:number}>;
 readonly doubleScaled:false;
 readonly statStagesEqualOriginalFrozenSource:true;
 readonly canAuthorizeCombat:false;
 readonly canGrantLoot:false;
 readonly canListOnMarket:false;
 readonly releaseApproved:false;
 readonly requiresAuthenticatedForgeCustodyAndSetPolicy:true;
}
const fail=(reason:string):never=>{throw Error('combat_v2_forge_handoff_'+reason);};
const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
const integer=(v:unknown)=>Number.isSafeInteger(v)&&typeof v==='number';
const id=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=128&&
 /^[A-Za-z0-9_:-]+$/.test(v);
const stats:readonly (keyof CombatStats)[]=[
 'maxHp','attackPower','healingPower','defense','accuracy',
 'evasion','critChance','critMultiplier','haste',
];
const round=(x:number)=>Math.round(x*1e6)/1e6;
function validStats(value:CombatStats):boolean{
 return Boolean(value)&&typeof value==='object'&&!Array.isArray(value)&&
  stats.every(k=>finite(value[k])&&value[k]>=0)&&
  value.maxHp>0&&value.critMultiplier>=1;
}
function sameStats(actual:CombatStats,expected:CombatStats){
 return stats.every(k=>actual[k]===expected[k]);
}
/**
 * `expectedAfterSkills` MUST come from a separately server-compiled skills
 * build; `expectedEquippedCopyIds` MUST come from a trusted build selection.
 * This review checks their arithmetic alignment with the other branch's
 * exported evidence, but still NEVER authenticates that evidence itself.
 */
export function inspectFrozenForgeCombatHandoffV2(
 actorId:string,
 expectedEquippedCopyIds:readonly string[],
 expectedAfterSkills:CombatStats,
 evidence:FrozenForgeCombatHandoffEvidenceV2,
):FrozenForgeCombatHandoffInspectionV2{
 if(!id(actorId)||!Array.isArray(expectedEquippedCopyIds)||
  expectedEquippedCopyIds.length<1||expectedEquippedCopyIds.length>10||
  !expectedEquippedCopyIds.every(id)||!validStats(expectedAfterSkills))
  fail('invalid_server_compiled_build_reference');
 const expected=new Set(expectedEquippedCopyIds);
 if(expected.size!==expectedEquippedCopyIds.length)
  fail('duplicate_selected_equipment_copy');
 if(!evidence||evidence.source!==FROZEN_FORGE_HANDOFF_EVIDENCE_V2||
  evidence.actorId!==actorId||typeof evidence.receiptDigest!=='string'||
  !/^[a-f0-9]{64}$/.test(evidence.receiptDigest)||
  evidence.setBonuses!==FROZEN_FORGE_HANDOFF_SET_BLOCK_V2||
  evidence.unsupportedForgeAffixes!==FROZEN_FORGE_HANDOFF_AFFIX_BLOCK_V2)
  fail('unapproved_or_missing_forge_evidence');
 const items=evidence.items,ids=evidence.equippedInstanceIds;
 if(!Array.isArray(items)||!Array.isArray(ids)||
  items.length!==expected.size||ids.length!==expected.size||
  ids.some(x=>!id(x)||!expected.has(x))||
  new Set(ids).size!==ids.length)
  fail('forged_or_missing_source_item');
 const sources=new Set<string>();
 const sum={attack:0,defense:0,hp:0};
 for(const item of items){
  if(!item||!id(item.instanceId)||!expected.has(item.instanceId)||
   sources.has(item.instanceId)||!id(item.pieceId)||
   !integer(item.tier)||item.tier<1||item.tier>4||
   !id(item.rarity)||!integer(item.quality)||
   item.quality<0||item.quality>100||!item.scaledBaseStats)
   fail('invalid_frozen_mint_source');
  sources.add(item.instanceId);
  for(const key of ['attack','defense','hp'] as const){
   const value=item.scaledBaseStats[key];
   if(!finite(value)||value<0)
    fail('invalid_frozen_mint_stat');
   sum[key]=round(sum[key]+value);
  }
  if(item.scaledBaseStats.attack+item.scaledBaseStats.defense+
     item.scaledBaseStats.hp<=0)fail('empty_frozen_mint_stats');
 }
 if(!evidence.stages||
  !validStats(evidence.stages.afterSkills)||
  !validStats(evidence.stages.afterFrozenBase)||
  !validStats(evidence.stages.afterForgeAffixes)||
  !sameStats(expectedAfterSkills,evidence.stages.afterSkills))
  fail('verified_skill_baseline_mismatch');
 const afterFrozen:CombatStats={
  ...expectedAfterSkills,
  maxHp:round(expectedAfterSkills.maxHp+sum.hp),
  attackPower:round(expectedAfterSkills.attackPower+sum.attack),
  defense:round(expectedAfterSkills.defense+sum.defense),
 };
 if(!sameStats(afterFrozen,evidence.stages.afterFrozenBase))
  fail('frozen_forge_scaled_twice_or_stat_basis_drift');
 if(!Array.isArray(evidence.affixSources)||evidence.affixSources.some(row=>
  !row||!id(row.instanceId)||!sources.has(row.instanceId)||
  !id(row.id)||!finite(row.value)||row.value<0||row.value>1||
  !['relative_percent','percentage_points'].includes(row.unit)))
  fail('unverified_forge_affix_source_shape');
 // Affix policy and non-stat advanced effects can only be validated in the
 // ORIGINAL Forge source branch, never by this shape-only Skills review.
 return {
  source:'EQ2_FORGE_SOURCE_SHAPE_REVIEW_ONLY',
  actorId,equipmentCount:items.length,
  sourceReceiptDigest:evidence.receiptDigest,
  frozenBaseDelta:{...sum},
  doubleScaled:false,statStagesEqualOriginalFrozenSource:true,
  canAuthorizeCombat:false,canGrantLoot:false,canListOnMarket:false,
  releaseApproved:false,requiresAuthenticatedForgeCustodyAndSetPolicy:true,
 };
}
