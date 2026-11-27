/** Private transaction coordinator reference. No public registration, DB credentials,
 * or production adapter. The supplied store must run callback inside the existing
 * account lock and SAME database transaction as canonical gameplay settlement.
 */
export async function executeJournalTransactionReview({store,request,prepare}){
 const fail=reason=>({status:'rejected',reason,persisted:false,released:false});
 if(!request||typeof request.accountId!=='string'||!request.accountId||!/^[A-Za-z0-9_-]{8,128}$/.test(request.requestId)||!/^[a-f0-9]{64}$/.test(request.requestHash)||!Number.isSafeInteger(request.expectedRevision)||request.expectedRevision<0)return fail('invalid_request');
 return store.withLockedAccount(request.accountId,async tx=>{
  const prior=await tx.readReceipt(request.requestId);
  if(prior){
   if(prior.requestHash!==request.requestHash)return fail('request_conflict');
   return {status:'replay',response:prior.response,released:false};
  }
  const locked=await tx.load();
  if(locked.accountId!==request.accountId||locked.revision!==request.expectedRevision||locked.journal?.revision!==locked.revision||locked.journal?.accountId!==locked.accountId)return fail('stale_or_missing_journal');
  const proposal=await prepare(locked);
  if(proposal?.status!=='proposed'||proposal.released!==false||proposal.authorizesReward!==false||proposal.state?.accountId!==locked.accountId||proposal.state?.revision!==locked.revision+1||proposal.state?.catalogueVersion!==locked.journal.catalogueVersion)return fail('invalid_proposal');
  // The host is trusted and must resolve any wallet/inventory changes using the
  // canonical server policy. No caller-supplied reward payload is accepted here.
  const entitlement=proposal.entitlement;
  if(entitlement){
   if(entitlement.accountId!==locked.accountId||entitlement.revision!==proposal.state.revision||!locked.journal.characters.some(c=>c.characterId===entitlement.characterId)||typeof entitlement.questId!=='string'||!entitlement.questId)return fail('invalid_entitlement');
   if(await tx.hasEntitlement(entitlement.characterId,entitlement.questId))return fail('already_claimed');
  }
  // Existing gameplay receipt, wallet and journal writes must all roll back
  // together. The adapter returns a synthetic result until the real store exists.
  const response=await tx.commitCanonicalGame(proposal);
  await tx.writeJournal(proposal.state);
  if(entitlement)await tx.insertEntitlement(entitlement);
  await tx.writeReceipt(request.requestId,request.requestHash,response);
  return {status:'proposed',response,released:false,persisted:false};
 });
}
