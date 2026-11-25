/**
 * Hidden Veldryn 2.0 XP settlement *integration contract* (no production wiring).
 *
 * Only server-validated account identity and a repository that reads canonical
 * completed source receipts INSIDE one DB transaction may call this.
 * The caller never supplies XP, difficulty, profession, elapsed time or owner.
 *
 * A real repository MUST implement:
 * 1. Atomic transaction/rollback for source read, UNIQUE source award insert,
 *    and balance increment; no independent REST writes.
 * 2. Source receipt ownership/completion checks from persisted source tables.
 * 3. Unique (source_kind, source_id) across every character/account.
 * 4. A single authoritative server-side actor for XP and source receipts.
 *
 * No auth route, SQL executor, Supabase client or feature flag imports this.
 */
import {
  type JournalAwardV2,
  type ServerSettlementProofV2,
  type ValidSettlementSourceV2,
  projectServerSettlementV2,
} from './settlement-journal-preview';

const SAFE_ID = /^[A-Za-z0-9_-]{8,128}$/;

export interface TrustedAccountPrincipalV2 {
  /** Server-derived from an authenticated session, NEVER a request JSON field. */
  readonly accountId: string;
}
export interface CanonicalSourceLocatorV2 {
  readonly source: ValidSettlementSourceV2;
  /** Canonical receipt ID from a completed server settlement, not retry key. */
  readonly sourceId: string;
}
export interface ProgressionV2Transaction {
  /** Returns persisted account_id from public.characters for this character ID. */
  characterAccountId(characterId: string): Promise<string|null>;
  /** Epoch of 2.0 backfill/activation for this exact character, server-owned. */
  characterXpActivatedAtMs(characterId: string): Promise<number|null>;
  /** Returns source evidence from persisted, completed, character-bound claim. */
  completedSource(locator: CanonicalSourceLocatorV2): Promise<ServerSettlementProofV2|null>;
  /** Must read by a globally unique source key, not scoped to character/account. */
  findAward(canonicalKey: string): Promise<JournalAwardV2|null>;
  /** INSERT ON CONFLICT DO NOTHING of the global source-key receipt. */
  insertAwardOnce(award: JournalAwardV2): Promise<boolean>;
  /** Increment the NEW bank only; never mutate legacy combat or skill XP. */
  incrementOverallXp(characterId: string, amount: number): Promise<void>;
}
export interface ProgressionV2TransactionStore {
  /** Backend implementation must use a *single real DB transaction*. */
  transaction<T>(fn: (tx: ProgressionV2Transaction) => Promise<T>): Promise<T>;
}
export interface ProgressionV2SettlementResult {
  readonly status: 'applied'|'replayed';
  readonly receipt: JournalAwardV2;
}

function assertEquivalent(existing:JournalAwardV2, proposed:JournalAwardV2): void {
  if(existing.canonicalKey!==proposed.canonicalKey ||
     existing.characterId!==proposed.characterId ||
     existing.fingerprint!==proposed.fingerprint ||
     JSON.stringify(existing.award)!==JSON.stringify(proposed.award))
    throw new Error('progression_v2_receipt_collision');
}
/**
 * Transactional handshake: receipt insertion is the only valid gate to
 * incrementing the new XP bank. A losing racer MUST NOT increment it.
 */
export async function settleCharacterCareerXpV2(
  store:ProgressionV2TransactionStore,
  principal:TrustedAccountPrincipalV2,
  requestedCharacterId:string,
  locator:CanonicalSourceLocatorV2,
):Promise<ProgressionV2SettlementResult>{
  if(!store || typeof store.transaction!=='function' ||
     !principal || typeof principal.accountId!=='string' || !SAFE_ID.test(principal.accountId) ||
     typeof requestedCharacterId!=='string' || !SAFE_ID.test(requestedCharacterId) ||
     !locator || typeof locator.sourceId!=='string' || !SAFE_ID.test(locator.sourceId) ||
     !['combat_reward','gathering_claim','craft_claim','processing_claim'].includes(locator.source))
    throw new Error('progression_v2_invalid_request');
  return store.transaction(async tx=>{
    // Never infer ownership from the supplied character ID or source payload.
    const persistedAccount=await tx.characterAccountId(requestedCharacterId);
    if(persistedAccount!==principal.accountId)
      throw new Error('progression_v2_unauthorized_character');

    // Backfilled players must not receive new XP twice for pre-release actions.
    const activatedAtMs=await tx.characterXpActivatedAtMs(requestedCharacterId);
    if(typeof activatedAtMs!=='number'||!Number.isSafeInteger(activatedAtMs)||activatedAtMs<0)
      throw new Error('progression_v2_character_not_activated');

    const verified=await tx.completedSource(locator);
    if(!verified || verified.source!==locator.source || verified.sourceId!==locator.sourceId ||
       verified.ownerCharacterId!==requestedCharacterId ||
       verified.receivingCharacterId!==requestedCharacterId ||
       verified.completed!==true)
      throw new Error('progression_v2_unverified_source');
    if(typeof verified.completedAtMs!=='number' ||
       !Number.isSafeInteger(verified.completedAtMs) ||
       verified.completedAtMs<=activatedAtMs)
      throw new Error('progression_v2_pre_activation_source');

    const proposed=projectServerSettlementV2(verified);
    const existing=await tx.findAward(proposed.canonicalKey);
    if(existing){
      assertEquivalent(existing,proposed);
      return {status:'replayed',receipt:existing};
    }

    // The DB UNIQUE(source_kind,source_id) resolves cross-process races.
    // A conflicting receipt must be re-read and checked, never blindly accepted.
    const inserted=await tx.insertAwardOnce(proposed);
    if(!inserted){
      const concurrentWinner=await tx.findAward(proposed.canonicalKey);
      if(!concurrentWinner)throw new Error('progression_v2_race_visibility_failure');
      assertEquivalent(concurrentWinner,proposed);
      return {status:'replayed',receipt:concurrentWinner};
    }

    // Still inside the same transaction. A failure here rolls back the receipt.
    await tx.incrementOverallXp(requestedCharacterId,proposed.award.overallCharacterXp);
    return {status:'applied',receipt:proposed};
  });
}
