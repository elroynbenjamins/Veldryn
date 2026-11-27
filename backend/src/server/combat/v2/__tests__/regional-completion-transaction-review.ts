/** Private transaction boundary contract, not production implementation.
 * All storage operations MUST execute in one DB transaction, with current
 * ownership and ledger row locked (or equivalent serializable CAS).
 * No RPC exposure, client-supplied result, reward grant, or travel mutation. */
import {reviewCompletionVictoryV2,completionAccessReviewV2,type CompletionLedgerReviewV2,type CompletionVictoryEvidenceV2} from './regional-completion-ledger-review';
type Identity={accountId:string;characterId:string};
type StoredLedger={revision:number;ledger:CompletionLedgerReviewV2};
export interface CompletionTransactionReviewV2 {
 lockOwnedCharacter(identity:Identity):Promise<boolean>;
 loadLedger(identity:Identity):Promise<StoredLedger>;
 loadTerminalVictory(receiptId:string):Promise<CompletionVictoryEvidenceV2|undefined>;
 // Unique across ALL characters, including later rematch receipts.
 reserveReceiptIdentity(receiptId:string,identity:Identity,bossId:string,inputDigest:string,eventDigest:string):Promise<'inserted'|'same'|'conflict'>;
 compareAndSetLedger(identity:Identity,expectedRevision:number,next:CompletionLedgerReviewV2):Promise<boolean>;
}
export interface CompletionTransactionStoreReviewV2 {
 // Roll back EVERY operation on rejection, including receipt reservation.
 transaction<T>(work:(tx:CompletionTransactionReviewV2)=>Promise<T>):Promise<T>;
}
export async function settleCompletionTransactionReviewV2(store:CompletionTransactionStoreReviewV2,authenticated:Identity,receiptId:string){
 if(!authenticated.accountId||!authenticated.characterId||!receiptId)throw Error('invalid_completion_request');
 const identity=Object.freeze({...authenticated});
 return store.transaction(async tx=>{
  if(!await tx.lockOwnedCharacter(identity))throw Error('completion_character_not_owned');
  const current=await tx.loadLedger(identity);
  if(current.ledger.accountId!==identity.accountId||current.ledger.characterId!==identity.characterId||
   !Number.isSafeInteger(current.revision)||current.revision<0)throw Error('completion_ledger_identity_or_revision');
  const stored=await tx.loadTerminalVictory(receiptId);
  if(!stored||stored.receiptId!==receiptId)throw Error('completion_receipt_not_found');
  const evidence=Object.freeze({...stored});
  // Only terminal stored server evidence, never a request body. The
  // adapter must verify the reservation/input/result provenance before load.
  const next=reviewCompletionVictoryV2(current.ledger,evidence,x=>Object.keys(evidence).every(k=>
   x[k as keyof CompletionVictoryEvidenceV2]===evidence[k as keyof CompletionVictoryEvidenceV2]));
  const reserved=await tx.reserveReceiptIdentity(receiptId,identity,evidence.bossId,evidence.inputDigest,evidence.eventDigest);
  if(reserved==='conflict')throw Error('completion_receipt_identity_conflict');
  const changed=next.ledger!==current.ledger;
  if((reserved==='same')===changed)throw Error('completion_ledger_receipt_inconsistent');
  if(changed&&!await tx.compareAndSetLedger(identity,current.revision,next.ledger))throw Error('completion_revision_conflict');
  return {duplicate:next.duplicate,revision:current.revision+Number(changed),
   access:completionAccessReviewV2(next.ledger),grant:false as const,releaseEnabled:false as const};
 });
}
