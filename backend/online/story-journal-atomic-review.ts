/** Account-revision atomic persistence rehearsal. Not a DB writer or public handler.
 * Every committed gameplay command advances the account revision, including
 * commands with no quest evidence and roster switches. Character ownership
 * remains attached to each event; current active character is not its owner.
 */
export const JOURNAL_ATOMIC_REVIEW_RELEASED=false;
type Event={accountId:string;characterId:string;receiptId:string;sequence:number;kind:'kill'|'gather';targetId:string;quantity:number;skillId?:string;status:'staged'|'settled'};
type Packet={accountId:string;characterId:string;requestId:string;previousRevision:number;nextRevision:number;events:readonly Event[]};
type Receipt={requestId:string;requestHash:string;sourceCharacterId:string;selectedCharacterId:string|null;revision:number};
type Ledger={accountId:string;revision:number;receipts:readonly Receipt[];events:readonly Event[]};
type Commit={accountId:string;requestId:string;requestHash:string;previousRevision:number;committedRevision:number;sourceCharacterId:string;selectedCharacterId:string|null;packet?:Packet};
const id=(s:unknown):s is string=>typeof s==='string'&&s.length>0&&s.length<=160;
const natural=(x:unknown):x is number=>Number.isSafeInteger(x)&&Number(x)>=0;
const hash=(s:unknown)=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const reject=(reason:string)=>({status:'rejected' as const,reason,persisted:false as const,rewardsGranted:false as const});
export function planJournalAccountCommitReview(ledger:Ledger,commit:Commit){
 if(!id(ledger?.accountId)||commit?.accountId!==ledger.accountId||!id(commit.requestId)||!hash(commit.requestHash)||!id(commit.sourceCharacterId)||!(commit.selectedCharacterId===null||id(commit.selectedCharacterId))||!natural(ledger.revision)||!natural(commit.previousRevision)||!natural(commit.committedRevision)||commit.committedRevision!==commit.previousRevision+1)return reject('invalid_scope_or_commit');
 if(!Array.isArray(ledger.receipts)||!Array.isArray(ledger.events)||new Set(ledger.receipts.map(r=>r.requestId)).size!==ledger.receipts.length||new Set(ledger.events.map(e=>e.receiptId)).size!==ledger.events.length)return reject('invalid_ledger');
 const old=ledger.receipts.find(r=>r.requestId===commit.requestId);
 if(old){
  if(old.requestHash!==commit.requestHash||old.sourceCharacterId!==commit.sourceCharacterId||old.selectedCharacterId!==commit.selectedCharacterId||old.revision!==commit.committedRevision)return reject('request_conflict');
  return {status:'replay' as const,receipt:{...old},persisted:false as const,rewardsGranted:false as const};
 }
 if(ledger.revision!==commit.previousRevision)return reject('revision_gap');
 const p=commit.packet;
 const events:Event[]=[];
 if(p){
  if(p.accountId!==ledger.accountId||p.characterId!==commit.sourceCharacterId||p.requestId!==commit.requestId||p.previousRevision!==commit.previousRevision||p.nextRevision!==commit.committedRevision||!Array.isArray(p.events))return reject('packet_mismatch');
  const used=new Set(ledger.events.map(e=>e.receiptId));
  for(const [index,e] of p.events.entries()){
   if(e.accountId!==p.accountId||e.characterId!==p.characterId||e.receiptId!==p.requestId+':'+index||used.has(e.receiptId)||e.sequence!==p.nextRevision||e.status!=='staged'||!id(e.targetId)||!natural(e.quantity)||e.quantity===0||!['kill','gather'].includes(e.kind)||(e.kind==='gather'&&!id(e.skillId)))return reject('invalid_event');
   used.add(e.receiptId);events.push({...e,status:'settled'});
  }
 }
 const receipt:Receipt={requestId:commit.requestId,requestHash:commit.requestHash,sourceCharacterId:commit.sourceCharacterId,selectedCharacterId:commit.selectedCharacterId,revision:commit.committedRevision};
 return {status:'proposed' as const,receipt,ledger:{...ledger,revision:commit.committedRevision,receipts:[...ledger.receipts,receipt],events:[...ledger.events,...events]},persisted:false as const,rewardsGranted:false as const};
}
export function journalCharacterEventsReview(ledger:Ledger,accountId:string,characterId:string){
 if(ledger.accountId!==accountId||!id(characterId))return [];
 return ledger.events.filter(e=>e.accountId===accountId&&e.characterId===characterId&&e.status==='settled').map(e=>({...e}));
}
/** Deliberately unavailable pending actual account-locked SQL writer and review. */
export async function persistJournalAccountCommitReview():Promise<never>{throw Error('journal_atomic_writer_not_released');}
