/** Shared, pure validation for the non-destructive account deletion request intake.
 * An intake receipt must never be interpreted as proof that an account was erased.
 */
export const ACCOUNT_DELETION_CONFIRMATION='DELETE ACCOUNT';
export const ACCOUNT_DELETION_CANCELLATION='KEEP ACCOUNT';

export type AccountDeletionRequestStatus='none'|'pending_review'|'cancelled'|'reviewing'|'erasure_blocked';
export type AccountDeletionRequestSnapshot={
 status:AccountDeletionRequestStatus;
 requestId?:string;
 requestedAtMs?:number;
 erasureCompleted:false;
};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIVE_STATUSES:readonly AccountDeletionRequestStatus[]=['pending_review','reviewing','erasure_blocked'];
const ALL_STATUSES:readonly AccountDeletionRequestStatus[]=['none','pending_review','cancelled','reviewing','erasure_blocked'];

export function validAccountDeletionConfirmation(text:string):boolean{
 return text===ACCOUNT_DELETION_CONFIRMATION;
}
export function normalizeAccountDeletionRequest(data:unknown):AccountDeletionRequestSnapshot{
 if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Invalid account deletion response.');
 const row=data as Record<string,unknown>;
 const status=row.status as AccountDeletionRequestStatus;
 if(!ALL_STATUSES.includes(status)||row.erasureCompleted!==false)
  throw new Error('Invalid account deletion response.');
 const requestId=row.requestId;
 const requestedAtMs=row.requestedAtMs;
 if(requestId!==undefined&&(typeof requestId!=='string'||!UUID.test(requestId)))
  throw new Error('Invalid account deletion response.');
 if(requestedAtMs!==undefined&&(!Number.isSafeInteger(requestedAtMs)||!(Number(requestedAtMs)>0)))
  throw new Error('Invalid account deletion response.');
 if(ACTIVE_STATUSES.includes(status)&&(!requestId||requestedAtMs===undefined))
  throw new Error('Incomplete account deletion request receipt.');
 return {status,erasureCompleted:false,
  ...(typeof requestId==='string'?{requestId}:{}),
  ...(typeof requestedAtMs==='number'?{requestedAtMs}:{})};
}
