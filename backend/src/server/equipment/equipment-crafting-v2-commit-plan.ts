import {v2ServerExactTemplateConsistent} from './equipment-crafting-v2-instances';
import {
 resolveEquipmentV2DraftCommand,V2DraftCraftError,
 type V2DraftCommand,type V2DraftContext,type V2DraftItem,type V2DraftJob,
 type V2DraftReceiptResponse,type V2DraftResolution,type V2DraftSnapshot,type V2DraftSkillAward,
} from './equipment-crafting-v2-transaction';

/** Draft-only bridge contract for the EXISTING atomic online gameplay commit.
 * This planner never calls a database and must never be mounted on public
 * routes without the disabled backend gate, authentication and custody checks.
 *
 * The live online service still owns the account version, character_wallets,
 * inventory/Bank JSON, game state and idempotent receipt. It must persist all
 * changes through ONE commit_online_game_guild_pve_v1 transaction, not through
 * an additional Gold/gear ledger or the staging shadow tables.
 */
export interface V2MaterialDebit {itemId:string;quantity:number}
export interface V2AtomicCommitPlan {
 accountId:string;authenticatedCharacterId:string;
 expectedVersion:number;nextVersion:number;
 requestId:string;commandKind:V2DraftCommand['kind'];
 replayed:boolean;response:V2DraftReceiptResponse;
 /** Source of truth is loaded.walletGold; this field is a CAS precondition. */
 expectedWalletGold:number;
 nextWalletGold:number;
 debitedMaterialsFromCharacter:readonly V2MaterialDebit[];
 debitedMaterialsFromBank:readonly V2MaterialDebit[];
 createdJob?:V2DraftJob;
 claimedJobId?:string;
 createdItem?:V2DraftItem;
 awardedXp?:V2DraftSkillAward;
 /** Application is prohibited until all legacy V33 instances and Forge jobs
  * have been represented in the same transactional account state. */
 needsLegacyCoexistenceAdapter:true;
}
const fail=(reason:string):never=>{throw new V2DraftCraftError(reason);};
const safe=(n:number)=>Number.isSafeInteger(n)&&n>=0;
const equal=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
function differences(before:Readonly<Record<string,number>>,after:Readonly<Record<string,number>>){
 const results:V2MaterialDebit[]=[];
 const ids=new Set([...Object.keys(before),...Object.keys(after)]);
 for(const itemId of ids){
  const prior=before[itemId]??0,next=after[itemId]??0;
  if(!safe(prior)||!safe(next)||next>prior)fail('invalid_atomic_material_delta');
  if(prior!==next)results.push({itemId,quantity:prior-next});
 }
 return results.sort((a,b)=>a.itemId.localeCompare(b.itemId));
}
function expectedDebits(job:V2DraftJob,source:'fromInventory'|'fromBank'){
 const totals=new Map<string,number>();
 for(const input of job.materialsReserved){
  const n=input[source];
  if(!safe(n)||!safe(input.quantity)||input.quantity!==input.fromInventory+input.fromBank)
   fail('invalid_atomic_reservation');
  totals.set(input.itemId,(totals.get(input.itemId)??0)+n);
 }
 return [...totals].filter(([,quantity])=>quantity>0)
  .map(([itemId,quantity])=>({itemId,quantity}))
  .sort((a,b)=>a.itemId.localeCompare(b.itemId));
}
/** Creates and validates a SINGLE-commit settlement proposal. All state
 * effects remain hypothetical until the existing online commit accepts them.
 * No client may supply or edit a resolved delta after this function returns.
 */
export function planEquipmentV2AtomicCommit(
 old:V2DraftSnapshot,command:V2DraftCommand,ctx:V2DraftContext,
):{plan:V2AtomicCommitPlan;resolution:V2DraftResolution}{
 const result=resolveEquipmentV2DraftCommand(old,command,ctx);
 const next=result.next;
 const oldActive=old.characters[ctx.characterId];
 const nextActive=next.characters[ctx.characterId];
 if(!oldActive||!nextActive||!safe(oldActive.gold)||!safe(nextActive.gold))
  fail('invalid_atomic_wallet');
 const baseline={
  accountId:old.accountId,authenticatedCharacterId:ctx.characterId,
  expectedVersion:old.version,nextVersion:next.version,
  requestId:command.requestId,commandKind:command.kind,
  replayed:result.replayed,response:result.response,
  expectedWalletGold:oldActive.gold,nextWalletGold:nextActive.gold,
  needsLegacyCoexistenceAdapter:true as const,
 };
 if(result.replayed){
  if(next!==old||!equal(result.response,old.receipts.find(r=>r.requestId===command.requestId)?.response))
   fail('invalid_atomic_replay');
  return {plan:{...baseline,debitedMaterialsFromCharacter:[],debitedMaterialsFromBank:[]},resolution:result};
 }
 if(next.version!==old.version+1||next.receipts.length!==old.receipts.length+1
  ||!equal(next.receipts.slice(0,-1),old.receipts)
  ||next.receipts.at(-1)?.requestId!==command.requestId
  ||!equal(next.receipts.at(-1)?.response,result.response)
  ||next.accountId!==old.accountId
  ||next.activeCharacterId!==old.activeCharacterId
  ||next.forgeSlotCapacity!==old.forgeSlotCapacity
  ||!equal(Object.keys(next.characters).sort(),Object.keys(old.characters).sort()))
  fail('invalid_atomic_account_transition');

 const changedInventory=differences(oldActive.inventory,nextActive.inventory);
 const bankChanges=differences(old.bank,next.bank);
 for(const id of Object.keys(old.characters)){
  if(id===ctx.characterId)continue;
  if(!equal(old.characters[id],next.characters[id]))
   fail('unrelated_character_modified');
 }
 if(oldActive.level!==nextActive.level
  ||!equal(oldActive.professionLevels,nextActive.professionLevels))
  fail('invalid_atomic_character_transition');

 if(command.kind==='start'){
  if(result.response.kind!=='started'
   ||next.jobs.length!==old.jobs.length+1
   ||!equal(next.jobs.slice(0,-1),old.jobs)
   ||!equal(next.equipment,old.equipment)
   ||!equal(next.skillAwards,old.skillAwards))
   fail('invalid_atomic_start_transition');
  const job=next.jobs.at(-1)!;
  if(job.id!==result.response.jobId
   ||job.ownerCharacterId!==ctx.characterId
   ||job.recipeId!==command.recipeId||job.status!=='queued'
   ||oldActive.gold-nextActive.gold!==job.goldReserved
   ||job.goldReserved!==result.response.goldCharged
   ||!equal(changedInventory,expectedDebits(job,'fromInventory'))
   ||!equal(bankChanges,expectedDebits(job,'fromBank')))
   fail('invalid_atomic_start_debits');
  return {resolution:result,plan:{...baseline,createdJob:job,
   debitedMaterialsFromCharacter:changedInventory,debitedMaterialsFromBank:bankChanges}};
 }
 if(result.response.kind!=='claimed'
  ||next.jobs.length!==old.jobs.length
  ||next.equipment.length!==old.equipment.length+1
  ||next.skillAwards.length!==old.skillAwards.length+1
  ||oldActive.gold!==nextActive.gold||changedInventory.length||bankChanges.length)
  fail('invalid_atomic_claim_transition');
 const beforeJob=old.jobs.find(j=>j.id===command.jobId);
 const afterJob=next.jobs.find(j=>j.id===command.jobId);
 const otherJobs=old.jobs.filter(j=>j.id!==command.jobId);
 const afterOtherJobs=next.jobs.filter(j=>j.id!==command.jobId);
 const item=next.equipment.at(-1)!;
 const xp=next.skillAwards.at(-1)!;
 if(!beforeJob||!afterJob||!equal(otherJobs,afterOtherJobs)
  ||beforeJob.status!=='queued'||afterJob.status!=='claimed'
  ||afterJob.resultId!==item.id
  ||!equal(next.equipment.slice(0,-1),old.equipment)
  ||!equal(next.skillAwards.slice(0,-1),old.skillAwards)
  ||!v2ServerExactTemplateConsistent(item.exactItem)
  ||item.jobId!==command.jobId||item.ownerCharacterId!==beforeJob.ownerCharacterId
  ||item.id!==result.response.instanceId
  ||!equal(item.exactItem,result.response.exactItem)
  ||xp.jobId!==command.jobId||xp.characterId!==beforeJob.ownerCharacterId
  ||xp.xp!==result.response.xpAwarded||xp.profession!==result.response.profession)
  fail('invalid_atomic_claim_receipt');
 return {resolution:result,plan:{...baseline,claimedJobId:command.jobId,
  createdItem:item,awardedXp:xp,
  debitedMaterialsFromCharacter:[],debitedMaterialsFromBank:[]}};
}
