import {createHash} from 'node:crypto';
/** Source-shaped original Forge receipt diagnostics. No issuer, authority,
 * writes or route. The source ledger must come from an independently locked
 * ORIGINAL account, not the current resale owner or client request. */
type Obj=Record<string,unknown>;
const obj=(v:unknown):v is Obj=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const id=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=180;
const count=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0;
function canonical(v:unknown,depth=0):string{
 if(depth>32)throw Error('snapshot_depth');
 if(v===null||typeof v==='boolean'||typeof v==='string')return JSON.stringify(v);
 if(typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=Number.MAX_SAFE_INTEGER)return JSON.stringify(v);
 if(Array.isArray(v))return '['+v.map(x=>canonical(x,depth+1)).join(',')+']';
 if(obj(v))return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k],depth+1)).join(',')+'}';
 throw Error('non_json_snapshot');
}
const digest=(v:unknown)=>createHash('sha256').update(canonical(v)).digest('hex');
type Input={originalAccountId:string;instanceId:string;itemId:string;expectedRevision:number;row:unknown;expectedOriginalDigest?:string};
export function inspectMarketForgeOrigin(input:Input){
 const deny=(reason:string)=>({reason,receiptMatch:false,marketAuthorized:false,canCommit:false});
 try{
  if(!input||!id(input.originalAccountId)||!id(input.instanceId)||!id(input.itemId)||!count(input.expectedRevision)||
     !obj(input.row)||input.row.account_id!==input.originalAccountId||input.row.revision!==input.expectedRevision||
     !obj(input.row.state)||!obj(input.row.state.account))return deny('account_or_revision');
  const meta=input.row.state.account.equipmentV2Hidden;
  if(!obj(meta)||meta.schemaVersion!=='eq2-hidden-game-state-v1'||!Array.isArray(meta.jobs)||
     !Array.isArray(meta.items)||!Array.isArray(meta.receipts)||!Array.isArray(meta.skillAwards))
   return deny('missing_ledger');
  const unique=(rows:unknown[],key:string)=>rows.every(x=>obj(x)&&id(x[key]))&&new Set(rows.map(x=>(x as Obj)[key])).size===rows.length;
  if(!unique(meta.jobs,'id')||!unique(meta.items,'id')||!unique(meta.receipts,'requestId')||!unique(meta.skillAwards,'jobId'))
   return deny('duplicate_or_invalid_ledger');
  const item=meta.items.find(x=>x.id===input.instanceId);
  if(!obj(item)||item.accountId!==input.originalAccountId||!id(item.ownerCharacterId)||!id(item.jobId)||
     !obj(item.exactItem)||!obj(item.outcome)||item.exactItem.pieceId!==input.itemId||
     item.outcome.pieceId!==input.itemId)return deny('missing_original_item');
  const job=meta.jobs.find(x=>x.id===item.jobId);
  if(!obj(job)||job.status!=='claimed'||job.accountId!==item.accountId||job.ownerCharacterId!==item.ownerCharacterId||
     job.resultId!==item.id||job.pieceId!==input.itemId||!id(job.recipeId)||!obj(job.craftContract)||
     !obj(job.craftContract.piece)||job.craftContract.piece.id!==job.pieceId||
     job.craftContract.recipeId!==job.recipeId||job.craftContract.manifestVersion!==item.exactItem.manifestVersion||
     job.craftContract.rulesVersion!==item.exactItem.rulesVersion||item.outcome.rulesVersion!==item.exactItem.rulesVersion||
     item.outcome.recipeId!==job.recipeId||!id(item.exactItem.manifestVersion)||!id(item.exactItem.rulesVersion)||
     !count(job.goldReserved)||!count(job.finishesAtMs)||!count(item.createdAtMs)||item.createdAtMs<job.finishesAtMs||
     !count(job.craftContract.xpAwarded)||!id(job.craftContract.profession))return deny('job_mismatch');
  const related=meta.receipts.filter(x=>obj(x.response)&&x.response.jobId===job.id);
  const started=related.filter(x=>x.response.kind==='started'),claimed=related.filter(x=>x.response.kind==='claimed');
  if(related.length!==2||started.length!==1||claimed.length!==1)return deny('missing_or_duplicate_receipt');
  const start=started[0],claim=claimed[0],s=start.response,c=claim.response;
  if(start.commandFingerprint!=='start:'+job.recipeId||claim.commandFingerprint!=='claim:'+job.id||
     s.recipeId!==job.recipeId||s.pieceId!==job.pieceId||s.finishesAtMs!==job.finishesAtMs||s.goldCharged!==job.goldReserved||
     c.instanceId!==item.id||c.xpAwarded!==job.craftContract.xpAwarded||c.profession!==job.craftContract.profession||
     !count(s.version)||!count(c.version)||s.version>=c.version||c.version>input.expectedRevision||
     digest(c.exactItem)!==digest(item.exactItem)||digest(c.outcome)!==digest(item.outcome))return deny('receipt_mismatch');
  const award=meta.skillAwards.find(x=>x.jobId===job.id);
  if(!obj(award)||award.characterId!==item.ownerCharacterId||award.profession!==c.profession||award.xp!==c.xpAwarded)return deny('award_mismatch');
  // Mirror the relationship checks of the pinned Equipment 2.0 hidden ledger
  // verifier. Its actual exact-template validator is still mandatory at the
  // eventual issuer boundary; this structural pass cannot replace it.
  const jobs=new Map(meta.jobs.map(x=>[x.id,x]));
  const itemsByJob=new Map<string,Obj>(),awardsByJob=new Map<string,Obj>();
  for(const entry of meta.items){
   if(!obj(entry)||!id(entry.jobId)||entry.accountId!==input.originalAccountId||
      itemsByJob.has(entry.jobId)||!jobs.has(entry.jobId))return deny('incoherent_account_ledger');
   itemsByJob.set(entry.jobId,entry);
  }
  for(const entry of meta.skillAwards){
   if(!obj(entry)||!id(entry.jobId)||!jobs.has(entry.jobId)||!count(entry.xp))
    return deny('incoherent_account_ledger');
   awardsByJob.set(entry.jobId,entry);
  }
  const starts=new Set<string>(),claims=new Set<string>();
  for(const entry of meta.receipts){
   if(!obj(entry)||!obj(entry.response)||!id(entry.response.jobId)||!count(entry.response.version))
    return deny('incoherent_account_ledger');
   const r=entry.response,j=jobs.get(r.jobId);
   if(!obj(j))return deny('incoherent_account_ledger');
   if(r.kind==='started'){
    if(starts.has(r.jobId)||entry.commandFingerprint!=='start:'+j.recipeId||
       r.recipeId!==j.recipeId||r.pieceId!==j.pieceId||r.finishesAtMs!==j.finishesAtMs||
       r.goldCharged!==j.goldReserved)return deny('incoherent_account_ledger');
    starts.add(r.jobId);
   }else if(r.kind==='claimed'){
    const linked=itemsByJob.get(r.jobId);
    if(claims.has(r.jobId)||entry.commandFingerprint!=='claim:'+j.id||j.status!=='claimed'||
       !linked||r.instanceId!==linked.id||!obj(j.craftContract)||
       r.xpAwarded!==j.craftContract.xpAwarded||r.profession!==j.craftContract.profession||
       digest(r.exactItem)!==digest(linked.exactItem)||digest(r.outcome)!==digest(linked.outcome))
     return deny('incoherent_account_ledger');
    claims.add(r.jobId);
   }else return deny('incoherent_account_ledger');
  }
  for(const entry of meta.jobs){
   if(!obj(entry)||!id(entry.id)||entry.accountId!==input.originalAccountId||
      !id(entry.ownerCharacterId)||!obj(entry.craftContract)||!obj(entry.craftContract.piece)||
      entry.craftContract.piece.id!==entry.pieceId||entry.craftContract.recipeId!==entry.recipeId||
      !count(entry.goldReserved)||!count(entry.craftContract.xpAwarded)||!count(entry.finishesAtMs)||
      !starts.has(entry.id))return deny('incoherent_account_ledger');
   const linked=itemsByJob.get(entry.id),xp=awardsByJob.get(entry.id);
   if(entry.status==='queued'){
    if(entry.resultId||linked||xp||claims.has(entry.id))return deny('incoherent_account_ledger');
   }else if(entry.status==='claimed'){
    if(!linked||!xp||!claims.has(entry.id)||linked.id!==entry.resultId||
       linked.ownerCharacterId!==entry.ownerCharacterId||!obj(linked.exactItem)||
       linked.exactItem.pieceId!==entry.pieceId||xp.characterId!==entry.ownerCharacterId||
       xp.profession!==entry.craftContract.profession||xp.xp!==entry.craftContract.xpAwarded)
     return deny('incoherent_account_ledger');
   }else return deny('incoherent_account_ledger');
  }
  const originalDigest=digest({generation:'equipment-2.0',source:'forge',accountId:item.accountId,
    characterId:item.ownerCharacterId,instanceId:item.id,jobId:job.id,claimRequestId:claim.requestId,
    claimVersion:c.version,exactItem:item.exactItem,outcome:item.outcome});
  if(input.expectedOriginalDigest!==undefined&&input.expectedOriginalDigest!==originalDigest)return deny('original_digest_mismatch');
  return {reason:'receipt_match_requires_canonical_issuer_and_physical_commit',receiptMatch:true,
    originalDigest,claimRequestId:claim.requestId,marketAuthorized:false,canCommit:false};
 }catch{return deny('invalid_snapshot');}
}
