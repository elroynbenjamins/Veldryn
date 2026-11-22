/**
 * Hidden read-only bridge from *persisted* private online_career_reward_sources_v2
 * to the isolated V2 XP settlement policy.
 *
 * This parser is NOT DB authorization. A future trusted transaction repository
 * must SELECT both the proof and the original online_game_v1 receipt, verify
 * account/ownership/cutover under the same transaction, and never trust rows
 * or account IDs submitted by an app client.
 */
import {type ServerSettlementProofV2} from './settlement-journal-preview';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA=/^[0-9a-f]{64}$/;
const REQUEST=/^[A-Za-z0-9_-]{8,128}$/;
const GATHER:ReadonlySet<string>=new Set(['mining','woodcutting','fishing','herbalism']);
const CRAFT:ReadonlySet<string>=new Set(['smithing','tailoring','cooking','alchemy','enchanting']);
function isIntBetween(v:unknown,lo:number,hi:number):v is number {
  return typeof v==='number'&&Number.isSafeInteger(v)&&v>=lo&&v<=hi;
}
function timeFromDb(v:unknown):number {
  if(typeof v!=='string'||!(/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}(?::?\d{2})?)$/i).test(v))
    throw Error('committed_proof_v2_invalid_db_time');
  const time=Date.parse(v);
  if(!Number.isSafeInteger(time)||time<0)
    throw Error('committed_proof_v2_invalid_db_time');
  return time;
}
export interface PersistedCareerProofRowV2 {
  readonly source_kind:unknown;
  readonly source_id:unknown;
  readonly account_id:unknown;
  readonly request_id:unknown;
  readonly request_hash:unknown;
  readonly segment_index:unknown;
  readonly expected_game_revision:unknown;
  readonly character_id:unknown;
  readonly profession_id:unknown;
  readonly claimed_elapsed_seconds:unknown;
  readonly base_effort_seconds:unknown;
  readonly difficulty_basis_points:unknown;
  readonly completed_at:unknown;
}
export interface PersistedOnlineGameReceiptLinkV2 {
  readonly accountId:string;
  readonly action:'online_game_v1';
  readonly requestId:string;
  readonly requestHash:string;
  readonly committedRevision:number;
  readonly committedCharacterId:string;
}
/** Every linked value is obtained from service-owned persisted DB records. */
export function recoverCommittedCareerProofV2(
  proof:PersistedCareerProofRowV2,
  linked:PersistedOnlineGameReceiptLinkV2,
):ServerSettlementProofV2 {
  if(!proof||!linked||
     !['gathering_claim','combat_reward','craft_claim'].includes(proof.source_kind as string)||
     typeof proof.source_id!=='string'||!SHA.test(proof.source_id)||
     typeof proof.account_id!=='string'||!UUID.test(proof.account_id)||
     typeof proof.character_id!=='string'||!UUID.test(proof.character_id)||
     typeof proof.request_id!=='string'||!REQUEST.test(proof.request_id)||
     typeof proof.request_hash!=='string'||!SHA.test(proof.request_hash)||
     !isIntBetween(proof.segment_index,0,63)||
     !isIntBetween(proof.expected_game_revision,1,Number.MAX_SAFE_INTEGER)||
     !isIntBetween(proof.claimed_elapsed_seconds,0,86400)||
     !isIntBetween(proof.base_effort_seconds,1,108000)||
     !(
       (proof.source_kind==='gathering_claim' &&
         GATHER.has(proof.profession_id as string) &&
         (proof.claimed_elapsed_seconds as number)>0 &&
         (proof.base_effort_seconds as number)<=86400)
       || (proof.source_kind==='combat_reward' &&
         proof.profession_id===null &&
         proof.claimed_elapsed_seconds===0 &&
         (proof.base_effort_seconds as number)<=86400)
       || (proof.source_kind==='craft_claim' &&
         CRAFT.has(proof.profession_id as string) &&
         proof.claimed_elapsed_seconds===0 &&
         (proof.base_effort_seconds as number)<=10800)
     )||
     ![2500,5000,10000].includes(proof.difficulty_basis_points as number))
    throw Error('committed_proof_v2_invalid_source');
  if(typeof linked.accountId!=='string'||!UUID.test(linked.accountId)||
     typeof linked.requestId!=='string'||!REQUEST.test(linked.requestId)||
     typeof linked.requestHash!=='string'||!SHA.test(linked.requestHash)||
     !isIntBetween(linked.committedRevision,1,Number.MAX_SAFE_INTEGER)||
     typeof linked.committedCharacterId!=='string'||!UUID.test(linked.committedCharacterId))
    throw Error('committed_proof_v2_invalid_commit_link');
  if(linked.action!=='online_game_v1'||
     linked.accountId.toLowerCase()!==proof.account_id.toLowerCase()||
     linked.requestId!==proof.request_id||
     linked.requestHash!==proof.request_hash||
     linked.committedRevision!==proof.expected_game_revision||
     linked.committedCharacterId.toLowerCase()!==proof.character_id.toLowerCase())
    throw Error('committed_proof_v2_unlinked_game_commit');

  return {
    source:proof.source_kind as 'gathering_claim'|'combat_reward'|'craft_claim',
    sourceId:proof.source_id,
    ownerCharacterId:proof.character_id.toLowerCase(),
    receivingCharacterId:proof.character_id.toLowerCase(),
    completed:true,
    ...(proof.source_kind==='combat_reward'?{}:{
      professionId:proof.profession_id as 'mining'|'woodcutting'|'fishing'|'herbalism'|
        'smithing'|'tailoring'|'cooking'|'alchemy'|'enchanting',
    }),
    ...(proof.source_kind==='gathering_claim'
      ?{claimedElapsedSeconds:proof.claimed_elapsed_seconds as number}:{}),
    baseEffortSeconds:proof.base_effort_seconds as number,
    difficultyBasisPoints:proof.difficulty_basis_points as 2500|5000|10000,
    completedAtMs:timeFromDb(proof.completed_at),
  };
}
