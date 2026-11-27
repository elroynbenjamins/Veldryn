import assert from 'node:assert/strict';
import {executeJournalTransactionReview} from './story-journal-2-transaction-review.mjs';
import {soloFinaleRequirementsReview,soloFinaleEvidenceReview} from './story-journal-2-solo-finale-review.mjs';
const request={accountId:'a',requestId:'request-01',requestHash:'a'.repeat(64),expectedRevision:7};
let durable={accountId:'a',revision:7,gold:100,journal:{accountId:'a',revision:7,catalogueVersion:'v1',characters:[{characterId:'hero'}]},receipts:{},entitlements:[]};
let injectFailure=false;
const store={async withLockedAccount(accountId,fn){
 const draft=structuredClone(durable);
 const tx={
  readReceipt:async id=>draft.receipts[id],
  load:async()=>structuredClone(draft),
  hasEntitlement:async(c,q)=>draft.entitlements.some(e=>e.characterId===c&&e.questId===q),
  commitCanonicalGame:async proposal=>{draft.gold+=proposal.candidateGold;draft.revision=proposal.state.revision;return {gold:draft.gold,revision:draft.revision};},
  writeJournal:async j=>{draft.journal=j;},
  insertEntitlement:async e=>{if(injectFailure)throw Error('injected_failure');draft.entitlements.push(e);},
  writeReceipt:async(id,requestHash,response)=>{draft.receipts[id]={requestHash,response};},
 };
 const result=await fn(tx);durable=draft;return result;
}};
const prepare=locked=>({status:'proposed',released:false,authorizesReward:false,state:{...locked.journal,revision:locked.revision+1},candidateGold:40,entitlement:{accountId:'a',characterId:'hero',questId:'q1',revision:locked.revision+1,policyVersion:'v1'}});
injectFailure=true;
await assert.rejects(executeJournalTransactionReview({store,request,prepare}),/injected_failure/);
assert.equal(durable.gold,100);assert.equal(durable.revision,7);assert.equal(durable.entitlements.length,0);assert.equal(Object.keys(durable.receipts).length,0);
injectFailure=false;
const claim=await executeJournalTransactionReview({store,request,prepare});
assert.equal(claim.status,'proposed');assert.equal(durable.gold,140);assert.equal(durable.journal.revision,8);
assert.equal((await executeJournalTransactionReview({store,request,prepare})).status,'replay');assert.equal(durable.gold,140);
assert.equal((await executeJournalTransactionReview({store,request:{...request,requestHash:'b'.repeat(64)},prepare})).reason,'request_conflict');
assert.equal((await executeJournalTransactionReview({store,request:{...request,requestId:'request-02',expectedRevision:8},prepare})).reason,'already_claimed');
assert.equal(durable.gold,140);
const expected={accountId:'a',characterId:'hero',revision:9};
const facts={...expected,level:25,claimedQuestIds:['story2:asterfall:13'],soloVictory:{...expected,encounterId:'FALLEN_KNIGHT',mode:'story_solo',status:'settled',won:true}};
assert.equal(soloFinaleEvidenceReview({regionId:'ASTERFALL',expected,facts}).complete,true);
assert.equal(soloFinaleEvidenceReview({regionId:'ASTERFALL',expected,facts:{...facts,soloVictory:{...facts.soloVictory,mode:'dungeon'}}}).reason,'verified_solo_victory_required');
for(const [regionId,level,tier] of [['SUNSCAR',50,4],['FROSTMARCH',75,5]]){
 const q=soloFinaleRequirementsReview(regionId);
 assert.equal(q.level,level);assert.equal(q.candidateTier,tier);assert.equal(q.recommendedTierOnly,true);assert.equal(q.encounterId,null);
 assert.equal(soloFinaleEvidenceReview({regionId,expected,facts}).reason,'solo_runtime_binding_pending');
}
console.log('Atomic rollback, replay, entitlement uniqueness and solo-only finale gates: PASS');
