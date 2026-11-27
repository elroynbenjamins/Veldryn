/** Transaction rehearsal only, never imported by the live command handler.
 * Caller must supply a server-owned locked snapshot and reviewed reward policy.
 * All outputs are synthetic proposed state; no authority or persistence.
 */
import {projectStoryReview,projectSideReview} from './story-journal-2-evidence-review.mjs';
const flags={released:false,authorizesReward:false,persisted:false};
const validId=s=>typeof s==='string'&&s.length>0&&s.length<=160;
const natural=n=>Number.isSafeInteger(n)&&n>=0;
const deny=reason=>({...flags,status:'rejected',reason});
export function rehearseQuestClaim({book,side,snapshot,expected,ledger,request,policy}){
 if(!snapshot||!expected||!ledger||!request||!policy||!validId(expected.accountId)||!validId(expected.characterId)||
  snapshot.accountId!==expected.accountId||snapshot.characterId!==expected.characterId||
  ledger.accountId!==expected.accountId||ledger.characterId!==expected.characterId)return deny('foreign_scope');
 if(policy.mode!=='synthetic_review'||policy.released!==false||policy.version!==request.policyVersion||!validId(policy.version)||
  !validId(request.requestId)||!validId(request.questId)||!natural(request.expectedRevision)||!natural(ledger.revision)||!natural(ledger.gold)||!Array.isArray(ledger.receipts)||!Array.isArray(ledger.claimedQuestIds))return deny('invalid_contract');
 if(new Set(ledger.claimedQuestIds).size!==ledger.claimedQuestIds.length||new Set(ledger.receipts.map(r=>r.requestId)).size!==ledger.receipts.length)return deny('invalid_ledger');
 const old=ledger.receipts.find(r=>r.requestId===request.requestId);
 if(old){
  if(old.questId!==request.questId||old.policyVersion!==request.policyVersion)return deny('request_conflict');
  return {...flags,status:'replay',receipt:{...old}};
 }
 if(ledger.revision!==request.expectedRevision||snapshot.revision!==ledger.revision)return deny('stale_revision');
 if(!Array.isArray(snapshot.claimedStoryIds)||ledger.claimedQuestIds.some(id=>!snapshot.claimedStoryIds.includes(id))||snapshot.claimedStoryIds.some(id=>!ledger.claimedQuestIds.includes(id)))return deny('claim_state_mismatch');
 if(!book||book.released!==false||!side||side.released!==false||book.regionId!==side.regionId)return deny('invalid_catalogue');
 const main=book.quests.find(q=>q.id===request.questId),optional=side.quests.find(q=>q.id===request.questId);
 if((main&&optional)||(!main&&!optional))return deny('unknown_or_pending_quest');
 if(main&&book.regionId==='ASTERFALL'&&ledger.migrationLane!=='fresh_v2_candidate')return deny('legacy_lane');
 if(optional?.scope==='account')return deny('account_claim_contract_pending');
 if(ledger.claimedQuestIds.includes(request.questId))return deny('already_claimed');
 const projection=main?projectStoryReview(book,snapshot,expected):projectSideReview(side,snapshot,expected);
 if(projection.status!=='review')return deny('unverified_progress');
 const quest=projection.quests.find(q=>q.id===request.questId);
 if(quest?.status!=='ready')return deny('quest_not_ready');
 const reward=policy.rewards?.find(r=>r.questId===request.questId);
 if(!reward||policy.rewards.filter(r=>r.questId===request.questId).length!==1||!natural(reward.gold))return deny('reward_policy_missing');
 if(!natural(ledger.gold+reward.gold)||!natural(ledger.revision+1))return deny('overflow');
 const receipt={requestId:request.requestId,questId:request.questId,policyVersion:policy.version,gold:reward.gold,revision:ledger.revision+1};
 return {...flags,status:'proposed',receipt,proposedLedger:{...ledger,revision:ledger.revision+1,gold:ledger.gold+reward.gold,claimedQuestIds:[...ledger.claimedQuestIds,request.questId],receipts:[...ledger.receipts,receipt]}};
}
