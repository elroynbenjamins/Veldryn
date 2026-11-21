/**
 * Veldryn 2.0 only. Pure preview for optional, audited, one-time restoration
 * of Attack gems exchanged by the 1.0.x legacy conversion.
 *
 * The trusted server must supply:
 *   - legacyBefore: verified counts from private.legacy_gem_conversion_backup_v1
 *   - availableNow: up-to-date, locked inventory/pouch/bank quantities
 *   - alreadyRestored: cumulative receipts from a unique per-account ledger
 *
 * Never execute these plans in 1.0.x or grant without atomically consuming
 * inputs and recording an idempotent receipt.
 */
export type LegacyAttackGemIdV2='EMBER_SHARD'|'EMBERHEART_GEM';
export interface LegacyAttackExchangeV2{
  legacyId:LegacyAttackGemIdV2;
  legacyAttackPercent:number;
  convertedId:string;
  convertedCopies:number;
  restoredId:string;
  restoredCopies:1;
}
export const LEGACY_ATTACK_EXCHANGE_V2:Readonly<Record<LegacyAttackGemIdV2,LegacyAttackExchangeV2>>={
  // Original +2% ATK -> three G1 Might gems. Players may voluntarily
  // consolidate those into a single G3 Might gem (+2% ATK base).
  EMBER_SHARD:{
    legacyId:'EMBER_SHARD',legacyAttackPercent:.02,
    convertedId:'gem:stat_might:g1',convertedCopies:3,
    restoredId:'gem:stat_might:g3',restoredCopies:1,
  },
  // Old +5% ATK is stronger than even V2 G5 (+3.5% base).
  // Preserve its old, fully recognized identity and its 5% Attack stat.
  EMBERHEART_GEM:{
    legacyId:'EMBERHEART_GEM',legacyAttackPercent:.05,
    convertedId:'gem:stat_might:g3',convertedCopies:4,
    restoredId:'EMBERHEART_GEM',restoredCopies:1,
  },
};
export type LegacyRestorationStatusV2='not_eligible'|'already_restored'|'ready'|'manual_review';
export interface LegacyAttackRestorationRowV2{
  legacyId:LegacyAttackGemIdV2;
  status:LegacyRestorationStatusV2;
  originalCount:number;
  restoredCount:number;
  remainingEligible:number;
  canRestoreNow:number;
  consume:{itemId:string;quantity:number};
  grant:{itemId:string;quantity:number};
  /** Amount of original copies that cannot currently be reconciled safely. */
  needsReview:number;
}
function count(value:unknown):number{
  if(typeof value!=='number'||!Number.isSafeInteger(value)||value<0)throw new Error('invalid_legacy_gem_quantity');
  return value;
}
/**
 * Returns independent per-family plans. Output gems from one row must NOT be
 * reused as the inputs of another row in the same atomic transaction.
 * A 0-ready plan never creates currency/items without provenance.
 */
export function previewLegacyAttackGemRestorationV2(
  legacyBefore:Readonly<Partial<Record<LegacyAttackGemIdV2,number>>>,
  availableNow:Readonly<Record<string,number>>,
  alreadyRestored:Readonly<Partial<Record<LegacyAttackGemIdV2,number>>>={},
):readonly LegacyAttackRestorationRowV2[]{
  return (['EMBER_SHARD','EMBERHEART_GEM'] as const).map(legacyId=>{
    const mapping=LEGACY_ATTACK_EXCHANGE_V2[legacyId];
    const originalCount=count(legacyBefore[legacyId]??0);
    const restoredCount=count(alreadyRestored[legacyId]??0);
    if(restoredCount>originalCount)throw new Error('legacy_gem_receipt_exceeds_original');
    const remainingEligible=originalCount-restoredCount;
    const available=count(availableNow[mapping.convertedId]??0);
    const canRestoreNow=Math.min(remainingEligible,Math.floor(available/mapping.convertedCopies));
    const needsReview=remainingEligible-canRestoreNow;
    const status:LegacyRestorationStatusV2=originalCount===0?'not_eligible':
      remainingEligible===0?'already_restored':canRestoreNow>0?'ready':'manual_review';
    return {legacyId,status,originalCount,restoredCount,remainingEligible,canRestoreNow,
      consume:{itemId:mapping.convertedId,quantity:canRestoreNow*mapping.convertedCopies},
      grant:{itemId:mapping.restoredId,quantity:canRestoreNow},
      needsReview};
  });
}
