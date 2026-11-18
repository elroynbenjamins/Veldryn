/**
 * Hidden Party Events v27: ONE account-scoped, read-only PostgreSQL snapshot.
 * Only use with a trusted internal DB handle after authenticating the user.
 * No HTTP route, public RPC, insert, update, claim or reward transfer.
 */
import type {
  PrivatePartyEventEvidenceV27,
  TrustedPrivatePartyEvidenceReaderV27,
} from '../src/server/party/weekly-party-settlement-evidence-v27';

export const PARTY_EVENT_EVIDENCE_SQL_V27_RELEASED=false;
export const PARTY_EVENT_EVIDENCE_SELECT_V27=`
select jsonb_build_object(
 'offerId',o.id,'accountId',o.account_id,
 'partyId',o.party_id,'reservationId',o.reservation_id,
 'eventStartsAt',o.event_starts_at,
 'frozenCharacterId',r.character_id,
 'activeCharacterId',g.character_id,
 'savedCharacterId',g.state#>>'{character,id}',
 'characterOwned',c.id is not null,'rosterRole',r.role,
 'difficulty',w.difficulty,'weekStatus',w.status,
 'weekStage',w.active_stage,
 'settlementWindowOpen',now()>=w.event_ends_at+interval '1 hour',
 'eligibility',o.eligibility,'personalPoints',o.personal_points,
 'rewardBand',o.reward_band,'rewardModel',o.reward_model,
 'lockedChoice',ch.choice,
 'choiceOwned',case when ch.offer_id is null then null
   else ch.account_id=o.account_id end,
 'choicePayoutFlagsDisabled',case when ch.offer_id is null then null
   else not ch.claimable and not ch.granted end,
 'batchCandidateHash',b.candidate_hash,'batchReplayHash',b.replay_hash,
 'attestedCandidateHash',a.candidate_hash,'attestedReplayHash',a.replay_hash,
 'attestedRewardBand',a.reward_band,'attestedRuleset',a.ruleset,
 'attestedResourceAudit',a.resource_audit,
 'attestedGrantsDisabled',not a.rewards_granted
   and not a.reward_entitlement_created,
 'batchGrantsDisabled',not b.reward_grants_enabled,
 'offerGrantsDisabled',not o.claimable and not o.granted,
 'onlineRevision',g.revision,
 'walletGold',wallet.gold::text,
 'projectedCharacterGold',c.gold::text,
 'savedCharacterGold',g.state#>>'{character,gold}',
 'intent',case when i.id is null then null else jsonb_build_object(
   'offerId',i.offer_id,'accountId',i.account_id,
   'characterId',i.character_id,'reservationId',i.reservation_id,
   'eventStartsAt',i.event_starts_at,'rewardKind',i.reward_kind,
   'rewardModel',i.reward_model,'quote',i.reward_quote,
   'quoteHash',i.quote_hash,'onlineRevision',i.online_revision,
   'walletBefore',i.wallet_gold_before::text,
   'grantsDisabled',i.state='blocked_unreleased'
     and not i.claimable and not i.claimed
     and not i.rewards_granted and not i.entitlement_created
 ) end,
 'preflight',case when p.offer_id is null then null else jsonb_build_object(
   'offerId',p.offer_id,'accountId',p.account_id,
   'characterId',p.character_id,'reservationId',p.reservation_id,
   'eventStartsAt',p.event_starts_at,'difficulty',p.difficulty,
   'rewardKind',p.reward_kind,'rewardModel',p.reward_model,
   'quote',p.reward_json,'quoteHash',p.reward_hash,
   'sourceCandidateHash',p.source_candidate_hash,
   'sourceReplayHash',p.source_replay_hash,
   'onlineRevision',p.inventory_revision,
   'grantsDisabled',not p.authorized_for_payout and not p.claimed
     and not p.currency_credited and not p.inventory_credited
 ) end,
 'claimQuote',case when q.offer_id is null then null else jsonb_build_object(
   'offerId',q.offer_id,'accountId',q.account_id,
   'characterId',q.character_id,'reservationId',q.reservation_id,
   'eventStartsAt',q.event_starts_at,'difficulty',q.difficulty,
   'rewardKind',q.reward_kind,'rewardModel',q.reward_model,
   'quote',q.reward_json,'quoteHash',q.reward_hash,
   'grantsDisabled',not q.claimable and not q.claimed
     and not q.economy_applied and not q.inbox_delivered
 ) end
) as proof
from private.party_event_reward_offers_v24 o
left join private.party_event_roster_v11 r
  on r.party_id=o.party_id and r.event_starts_at=o.event_starts_at
  and r.account_id=o.account_id
left join private.party_event_weeks_v11 w
  on w.party_id=o.party_id and w.event_starts_at=o.event_starts_at
left join private.party_event_reward_batches_v24 b
  on b.reservation_id=o.reservation_id
  and b.party_id=o.party_id and b.event_starts_at=o.event_starts_at
left join private.party_event_boss_replay_attestations_v23 a
  on a.reservation_id=o.reservation_id
  and a.party_id=o.party_id and a.event_starts_at=o.event_starts_at
left join private.party_event_reward_choices_v24 ch
  on ch.offer_id=o.id
left join private.party_event_claim_intents_v25 i
  on i.offer_id=o.id
left join private.party_event_claim_preflights_v25 p
  on p.offer_id=o.id
left join private.party_event_reward_claim_quotes_v25 q
  on q.offer_id=o.id
left join public.characters c on c.id=r.character_id
  and c.account_id=o.account_id
left join public.character_wallets wallet on wallet.character_id=r.character_id
left join public.online_game_states g on g.account_id=o.account_id
where o.id=$1::uuid and o.account_id=$2::uuid
` as const;
export interface TrustedPrivateEvidenceSqlV27{
  queryOne(sql:typeof PARTY_EVENT_EVIDENCE_SELECT_V27,
    params:readonly [string,string]):Promise<{proof:unknown}|null>;
}
export function createPrivatePartyEvidenceReaderV27(
 db:TrustedPrivateEvidenceSqlV27,
):TrustedPrivatePartyEvidenceReaderV27{
 return {
  async readEvidence(offerId,trustedAccountId){
   const row=await db.queryOne(PARTY_EVENT_EVIDENCE_SELECT_V27,
    [offerId,trustedAccountId]);
   if(!row||!row.proof||typeof row.proof!=='object'
     ||Array.isArray(row.proof))
     throw new Error('party_event_v27_evidence_not_found');
   return row.proof as PrivatePartyEventEvidenceV27;
  },
 };
}
