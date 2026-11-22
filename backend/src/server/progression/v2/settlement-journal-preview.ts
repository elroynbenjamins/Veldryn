/**
 * Pure in-memory test contract for a future server-owned, atomic XP journal.
 *
 * NOT an authentication mechanism, persistence driver or production awarder.
 * Its callers MUST verify source receipts from the DB (including owner,
 * status and source-specific entitlement), then settle source+receipt+XP
 * inside one database transaction with a GLOBAL source uniqueness key.
 */
import {
  type ProfessionIdV2,
  proposeTrustedActivityXpV2,
  type ProposedActivityXpV2,
} from './character-progression';

export type ValidSettlementSourceV2 =
  'combat_reward'|'gathering_claim'|'craft_claim'|'processing_claim';

export interface ServerSettlementProofV2 {
  readonly source: ValidSettlementSourceV2;
  /** Canonical server receipt, NOT a client-selected retry/idempotency key. */
  readonly sourceId: string;
  readonly ownerCharacterId: string;
  readonly receivingCharacterId: string;
  readonly completed: boolean;
  readonly professionId?: ProfessionIdV2;
  readonly baseEffortSeconds: number;
  readonly difficultyBasisPoints: 2500|5000|10000|12500;
}

export interface JournalAwardV2 {
  readonly canonicalKey: string;
  readonly fingerprint: string;
  readonly characterId: string;
  readonly award: ProposedActivityXpV2;
}
export interface JournalSnapshotV2 {
  readonly overallXpByCharacter: Readonly<Record<string,number>>;
  /** Key is global across characters; a finished job cannot be replayed on an alt. */
  readonly receipts: Readonly<Record<string,JournalAwardV2>>;
}
export interface JournalPreviewResultV2 {
  readonly status:'applied'|'replayed';
  readonly state:JournalSnapshotV2;
  readonly receipt:JournalAwardV2;
}
const GATHERING: ReadonlySet<string> = new Set(['mining','woodcutting','fishing','herbalism']);
const CRAFTING: ReadonlySet<string> = new Set(['smithing','tailoring','cooking','alchemy','enchanting','forge']);
const SAFE_ID = /^[a-zA-Z0-9_-]{8,80}$/;
const hasOwn=(object:object,key:string)=>Object.prototype.hasOwnProperty.call(object,key);

/** Validate shape AFTER DB source ownership and completion have been verified. */
export function projectServerSettlementV2(proof:ServerSettlementProofV2):JournalAwardV2 {
  if(!proof || !SAFE_ID.test(proof.sourceId) || !SAFE_ID.test(proof.ownerCharacterId) ||
     !SAFE_ID.test(proof.receivingCharacterId) ||
     proof.ownerCharacterId!==proof.receivingCharacterId || proof.completed!==true)
    throw new Error('journal_v2_unverified_source');
  if(!['combat_reward','gathering_claim','craft_claim','processing_claim'].includes(proof.source))
    throw new Error('journal_v2_invalid_source');
  const combat=proof.source==='combat_reward';
  const gathering=proof.source==='gathering_claim';
  if(combat ? proof.professionId!==undefined :
     !proof.professionId ||
     (gathering && !GATHERING.has(proof.professionId)) ||
     (!gathering && !CRAFTING.has(proof.professionId)))
    throw new Error('journal_v2_invalid_skill_source');
  const canonicalKey=proof.source+':'+proof.sourceId;
  const award=proposeTrustedActivityXpV2({
    settlementId:canonicalKey,
    kind:combat?'combat':'profession',
    ...(combat?{}:{professionId:proof.professionId}),
    baseEffortSeconds:proof.baseEffortSeconds,
    difficultyBasisPoints:proof.difficultyBasisPoints,
  });
  const fingerprint=JSON.stringify([
    proof.source,proof.sourceId,proof.ownerCharacterId,proof.professionId??null,
    proof.baseEffortSeconds,proof.difficultyBasisPoints,
  ]);
  return {canonicalKey,fingerprint,characterId:proof.receivingCharacterId,award};
}

/**
 * Models serial execution only. Production must have a UNIQUE(source,source_id)
 * constraint and lock/transaction to make this behavior concurrency safe.
 */
export function previewApplyJournalAwardV2(state:JournalSnapshotV2,receipt:JournalAwardV2):JournalPreviewResultV2 {
  if (!state || !state.receipts || !state.overallXpByCharacter)
    throw new Error('journal_v2_invalid_state');
  const existing=hasOwn(state.receipts,receipt.canonicalKey)?state.receipts[receipt.canonicalKey]:undefined;
  if(existing){
    if(existing.fingerprint!==receipt.fingerprint || existing.characterId!==receipt.characterId)
      throw new Error('journal_v2_receipt_collision');
    return {status:'replayed',state,receipt:existing};
  }
  const balance=hasOwn(state.overallXpByCharacter,receipt.characterId)
    ?state.overallXpByCharacter[receipt.characterId]:0;
  if(!Number.isSafeInteger(balance)||balance<0 ||
    !Number.isSafeInteger(receipt.award.overallCharacterXp) || receipt.award.overallCharacterXp<0 ||
    !Number.isSafeInteger(balance+receipt.award.overallCharacterXp))
    throw new Error('journal_v2_overflow_or_invalid_balance');
  const updated:JournalSnapshotV2={
    overallXpByCharacter:{...state.overallXpByCharacter,
      [receipt.characterId]:balance+receipt.award.overallCharacterXp},
    receipts:{...state.receipts,[receipt.canonicalKey]:receipt},
  };
  return {status:'applied',state:updated,receipt};
}
