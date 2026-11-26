/** HIDDEN review-only projection of exact-copy socket contributions.
 * No CombatStats mutation, CP, gem proc, mint, or release authority.
 * All units remain in the canonical gem catalogue's vocabulary.
 */
import {findStatGem,findEffectGem,gemItemId,type GemGrade,GEM_BALANCE_REVIEW_V2,type GemBalanceReviewPolicyV2,findStatGemReviewV2,findEffectGemReviewV2,RETIRED_STAT_GEM_FAMILIES_REVIEW_V2} from '../../equipment/gems/gem-catalog-v1';
import {reviewEffectGemResonanceV2} from './effect-gem-resonance-review';
import {verifyEquipmentV2GemSidecar} from '../../equipment/equipment-crafting-v2-gem-verifier';
import type {V2GemSidecarState} from '../../equipment/equipment-crafting-v2-gem-sidecar-types';
import {verifyEquipmentV2HiddenLedger} from '../../equipment/equipment-crafting-v2-delivery';
import {verifyEquipmentV2ReceiptNamespace} from '../../equipment/equipment-crafting-v2-receipt-coherence';
import {readEquipmentV2VirtualCustody} from '../../equipment/equipment-crafting-v2-virtual-history';
import {enemyV2SnapshotDigest} from './enemy-engine-authority';
import type {TrustedFrozenForgeCombatSourceV2} from './equipment-frozen-forge-bridge';

type GemDefinition=NonNullable<ReturnType<typeof findStatGem>>;
export type PermanentGemReviewSourceV2=Pick<TrustedFrozenForgeCombatSourceV2,
 'accountId'|'characterId'|'items'|'claims'|'jobs'|'awards'|'reservations'|
 'custodyReceipts'|'ledgerRevision'|'verifyPersisted'> & {
 readonly sidecar:V2GemSidecarState;
 readonly equippedInstanceIds:readonly string[];
};
const fail=(reason:string):never=>{throw Error('combat_v2_gem_review_'+reason);};
const id=(x:unknown):x is string=>typeof x==='string'&&x.length>0&&x.length<=128;
const round=(n:number)=>Math.round(n*1e9)/1e9;
export function reviewPermanentGemSourcesV2(source:PermanentGemReviewSourceV2,balancePolicy?:GemBalanceReviewPolicyV2){
 if(balancePolicy!==undefined&&balancePolicy!==GEM_BALANCE_REVIEW_V2)fail('unknown_balance_policy');
 if(!source||!id(source.accountId)||!id(source.characterId)||
   !Number.isSafeInteger(source.ledgerRevision)||source.ledgerRevision<1||
   typeof source.verifyPersisted!=='function'||
   !Array.isArray(source.equippedInstanceIds)||source.equippedInstanceIds.length>10||
   source.equippedInstanceIds.some(x=>!id(x))||
   new Set(source.equippedInstanceIds).size!==source.equippedInstanceIds.length)
  fail('invalid_scope');
 verifyEquipmentV2HiddenLedger(source.accountId,source.jobs,source.items,source.claims,source.awards);
 verifyEquipmentV2GemSidecar(source.items,source.sidecar);
 verifyEquipmentV2ReceiptNamespace({forge:source.claims,gems:source.sidecar.receipts,
  custody:source.custodyReceipts});
 if(source.items.some(x=>x.accountId!==source.accountId)||
   source.claims.some(x=>x.response.version>source.ledgerRevision)||
   source.custodyReceipts.some(x=>x.version>source.ledgerRevision)||
   source.sidecar.receipts.some(x=>x.version>source.ledgerRevision))
  fail('foreign_or_stale_ledger');
 const worn=readEquipmentV2VirtualCustody(source.items,source.reservations,source.custodyReceipts)
  .filter(x=>x.location==='equipped'&&x.holderCharacterId===source.characterId)
  .map(x=>x.instanceId).sort();
 const expectedWorn=[...source.equippedInstanceIds].sort();
 if(worn.length!==expectedWorn.length||worn.some((x,i)=>x!==expectedWorn[i]))
  fail('worn_copy_set_mismatch');
 const snapshotDigest=()=>enemyV2SnapshotDigest({...(balancePolicy?{balancePolicy}:{}),accountId:source.accountId,characterId:source.characterId,
  ledgerRevision:source.ledgerRevision,items:source.items,jobs:source.jobs,
  awards:source.awards,claims:source.claims,reservations:source.reservations,
  custodyReceipts:source.custodyReceipts,sidecar:source.sidecar,equippedInstanceIds:[...source.equippedInstanceIds].sort()});
 const digest=snapshotDigest();
 if(source.verifyPersisted(digest,source.ledgerRevision)!==true||snapshotDigest()!==digest)
  fail('unverified_persisted_snapshot');
 const statSources:{instanceId:string;gemId:string;stat:GemDefinition['stat'];
  unit:GemDefinition['unit'];grade:GemGrade;rollPercent:number;fraction:number}[]=[];
 const effectSources:{instanceId:string;gemId:string;familyId:string;grade:GemGrade;
  rollPercent:number;candidateFraction?:number;runtimeEnabled:false}[]=[];
 const slots=new Map(source.sidecar.slots.map(row=>[row.instanceId,row]));
 for(const instanceId of worn){
  const row=slots.get(instanceId);
  if(!row)continue;
  for(const kind of ['stat','effect'] as const){
   const gem=row[kind];if(!gem)continue;
   const match=/^gem:([a-z0-9_]+):g([1-5])$/.exec(gem.gemId);
   if(!match)throw Error('combat_v2_gem_review_invalid_catalogue_id');
   const grade=Number(match[2]) as GemGrade;
   if(gemItemId(match[1],grade)!==gem.gemId)fail('invalid_catalogue_id');
   if(kind==='stat'){
    if(balancePolicy&&RETIRED_STAT_GEM_FAMILIES_REVIEW_V2.includes(match[1]))
     fail('retired_stat_gem_requires_migration');
    const def=balancePolicy?findStatGemReviewV2(match[1]):findStatGem(match[1]);
    if(!def)throw Error('combat_v2_gem_review_missing_stat_definition');
    statSources.push({instanceId,gemId:gem.gemId,stat:def.stat,unit:def.unit,grade,
      rollPercent:gem.rollPercent,fraction:round(def.values[grade]*gem.rollPercent/100)});
   }else{
    const def=balancePolicy?findEffectGemReviewV2(match[1]):findEffectGem(match[1]);
    if(!def)throw Error('combat_v2_gem_review_missing_effect_definition');
    effectSources.push({instanceId,gemId:gem.gemId,familyId:def.familyId,grade,
      rollPercent:gem.rollPercent,...(balancePolicy?{candidateFraction:round(def.values[grade]*gem.rollPercent/100)}:{}),runtimeEnabled:false});
   }
  }
 }
 const totals:Record<string,number>={};
 for(const row of statSources){
  const key=row.stat+':'+row.unit;
  totals[key]=round((totals[key]??0)+row.fraction);
 }
 const resonance=balancePolicy?reviewEffectGemResonanceV2(effectSources,worn):undefined;
 return {receiptDigest:digest,statSources,effectSources,totals,...(balancePolicy?{balancePolicy,resonance}:{}),
  releaseEnabled:false as const,canApplyStats:false as const,canExecuteEffects:false as const,
  canContributeCP:false as const};
}
