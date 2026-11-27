/**
 * Hidden V87: authoritative, SQL-only Party Event chest source reader.
 *
 * V23 worker replay attestations expressly grant NO rewards. Do not turn
 * "settled", a Day 8 candidate, or an unverified tier into a chest grant.
 * An independently reviewed V87 settlement certificate AND frozen account
 * tier certificate must exist before ANY V61 evidence is constructed.
 *
 * SQL is executed on the caller's pinned V70 SERIALIZABLE connection.
 * No client JSON, alternate Supabase connection, RPC, route, or payout.
 * Neither V87 certificate producer nor these tables are deployed.
 */
import type {
 ChestSqlV70,ChestPhysicalPortsV70,
} from '../loot/chest-postgres-store-v70';
import {
 resolveTrustedPartyChestSourceV77,
} from './weekly-party-event-chest-source-v77';
import type {PrivatePartyRewardProofV61} from './weekly-party-event-proof-v61';

export const PARTY_EVENT_CANONICAL_PG_V87_RELEASED=false;
export const PARTY_EVENT_CANONICAL_PG_V87_VERSION='party-event-canonical-pg-v87' as const;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SOURCE=/^party-event:(\d{13}):([0-9a-f-]{36}):(participation|preparation|finale)$/;

/**
 * Preparation uses Stage 2, matching the V2 planner. Preserve the existing
 * personal donation + all frozen optional orders complete policy for review.
 * Source PK is the V11 roster+week, not any client claim payload. The
 * account/week conditions and ALL joins use exact account/party/week identity.
 * The V87 worker certificates are the missing independent victory/tier
 * authority: until those review-only tables and their producer exist,
 * this SQL fails closed rather than inventing a proof.
 */
export const PARTY_EVENT_CANONICAL_SOURCE_SQL_V87=[
 'SELECT jsonb_build_object(',
 "'source','private_party_event_settlement_join_v61',",
 "'week',jsonb_build_object(",
 " 'partyId',w.party_id::text,",
 " 'eventStartsAtUtcMs',floor(extract(epoch from w.event_starts_at)*1000)::bigint,",
 " 'eventEndsAtUtcMs',floor(extract(epoch from w.event_ends_at)*1000)::bigint,",
 " 'settledAtUtcMs',floor(extract(epoch from cert.settled_at)*1000)::bigint,",
 " 'status',w.status,'family',w.family,'difficulty',w.difficulty),",
 "'roster',jsonb_build_object(",
 " 'partyId',r.party_id::text,'accountId',r.account_id::text,",
 " 'eventStartsAtUtcMs',floor(extract(epoch from r.event_starts_at)*1000)::bigint,",
 " 'rosterSize',(SELECT count(*)::integer FROM private.party_event_roster_v11 members",
 " WHERE members.party_id=r.party_id AND members.event_starts_at=r.event_starts_at),",
 " 'frozenCharacterId',r.character_id::text),",
 "'activity',jsonb_build_object(",
 " 'partyId',r.party_id::text,'accountId',r.account_id::text,",
 " 'eventStartsAtUtcMs',floor(extract(epoch from r.event_starts_at)*1000)::bigint,",
 " 'activityPoints',coalesce(activity.activity_points,0),",
 " 'sourceVersion','party_event_member_progress_v14'),",
 "'preparation',CASE WHEN donation.id IS NULL THEN NULL",
 " ELSE jsonb_build_object(",
 " 'partyId',r.party_id::text,'accountId',r.account_id::text,",
 " 'eventStartsAtUtcMs',floor(extract(epoch from r.event_starts_at)*1000)::bigint,",
 " 'committedDonationId',donation.id::text,",
 " 'optionalSupplyGoalReceiptId',CASE WHEN optional.goal_count>0",
 " AND optional.all_complete IS TRUE AND seal.party_id IS NOT NULL",
 " THEN optional.goal_id::text ELSE NULL END,",
 " 'optionalGoalFrozen',optional.goal_count>0",
 " AND optional.all_complete IS TRUE AND seal.party_id IS NOT NULL) END,",
 "'finale',CASE WHEN cert.independently_verified_victory",
 " THEN jsonb_build_object(",
 " 'partyId',w.party_id::text,",
 " 'eventStartsAtUtcMs',floor(extract(epoch from w.event_starts_at)*1000)::bigint,",
 " 'canonicalFinaleReceiptId',att.reservation_id::text,",
 " 'serverVerifiedVictory',true) ELSE NULL END,",
 "'tier',jsonb_build_object(",
 " 'partyId',r.party_id::text,'accountId',r.account_id::text,",
 " 'eventStartsAtUtcMs',floor(extract(epoch from r.event_starts_at)*1000)::bigint,",
 " 'eligibleGearTier',tier.eligible_gear_tier,",
 " 'sourceVersion',tier.tier_rules_version)",
 ") AS proof",
 'FROM private.party_event_roster_v11 r',
 'JOIN private.party_event_weeks_v11 w',
 ' ON w.party_id=r.party_id AND w.event_starts_at=r.event_starts_at',
 'JOIN private.party_event_settlement_certificates_v87 cert',
 ' ON cert.party_id=w.party_id AND cert.event_starts_at=w.event_starts_at',
 'JOIN private.party_event_boss_replay_attestations_v23 att',
 ' ON att.reservation_id=cert.reservation_id',
 ' AND att.party_id=w.party_id AND att.event_starts_at=w.event_starts_at',
 ' AND att.source_digest=cert.source_digest',
 ' AND att.tiers_cleared=cert.verified_tiers_cleared',
 'JOIN private.party_event_member_tier_certificates_v87 tier',
 ' ON tier.party_id=r.party_id AND tier.event_starts_at=r.event_starts_at',
 ' AND tier.account_id=r.account_id',
 ' AND tier.frozen_character_id=r.character_id',
 'JOIN private.party_event_boss_loadouts_v18 loadout',
 ' ON loadout.party_id=r.party_id AND loadout.event_starts_at=r.event_starts_at',
 ' AND loadout.account_id=r.account_id',
 ' AND loadout.character_id=tier.frozen_character_id',
 ' AND loadout.character_level=tier.frozen_level',
 ' AND loadout.snapshot_hash=tier.frozen_loadout_hash',
 'LEFT JOIN private.party_event_member_progress_v14 activity',
 ' ON activity.party_id=r.party_id AND activity.event_starts_at=r.event_starts_at',
 ' AND activity.account_id=r.account_id',
 'LEFT JOIN LATERAL (SELECT d.id',
 ' FROM private.party_event_supply_donations_v16 d',
 ' JOIN private.party_event_supply_orders_v16 o ON o.id=d.order_id',
 ' WHERE d.party_id=r.party_id AND d.event_starts_at=r.event_starts_at',
 ' AND d.account_id=r.account_id AND o.stage=2',
 ' AND o.party_id=r.party_id AND o.event_starts_at=r.event_starts_at',
 ' AND d.created_at>=w.event_starts_at AND d.created_at<w.event_ends_at',
 ' ORDER BY d.created_at,d.id LIMIT 1) donation ON TRUE',
 'LEFT JOIN LATERAL (SELECT min(o.id::text)::uuid AS goal_id,',
 ' count(*)::integer AS goal_count,',
 ' coalesce(bool_and(o.donated_quantity=o.target_quantity),false) AS all_complete',
 ' FROM private.party_event_supply_orders_v16 o',
 ' WHERE o.party_id=r.party_id AND o.event_starts_at=r.event_starts_at',
 " AND o.stage=2 AND o.kind='optional') optional ON TRUE",
 'LEFT JOIN private.party_event_stage_seals_v17 seal',
 ' ON seal.party_id=w.party_id AND seal.event_starts_at=w.event_starts_at',
 ' AND seal.stage=2 AND seal.sealed_at>=w.event_starts_at AND seal.sealed_at<w.event_ends_at',
 'WHERE r.account_id=$1::uuid',
 ' AND w.event_starts_at=to_timestamp($2::double precision/1000)',
 " AND w.status='settled' AND w.active_stage=3",
 " AND cert.settled_at>=w.event_ends_at+interval '1 hour'",
 ' AND att.worker_attested_at<=cert.settled_at',
 ' AND loadout.saved_at<w.event_ends_at',
 ' AND tier.tier_rules_version=$3',
 ' AND att.rewards_granted=false AND att.reward_entitlement_created=false',
 ' AND (NOT cert.independently_verified_victory OR',
 ' cert.verified_tiers_cleared>0)',
 'FOR SHARE OF r,w,cert,att,tier,loadout',
].join(' ');

function authorizedSource(accountId:string,sourceKey:string):number{
 if(typeof accountId!=='string'||!UUID.test(accountId)||
  typeof sourceKey!=='string')
  throw Error('party_event_v87_invalid_authenticated_identity');
 const m=SOURCE.exec(sourceKey);
 if(!m||m[2]!==accountId)
  throw Error('party_event_v87_foreign_or_invalid_source');
 const week=Number(m[1]);
 if(!Number.isSafeInteger(week)||week%86400000!==0||
  new Date(week).getUTCDay()!==1)
  throw Error('party_event_v87_invalid_week');
 return week;
}
function gate(qaEnabled:boolean):void{
 if(!qaEnabled||PARTY_EVENT_CANONICAL_PG_V87_RELEASED||
  process.env.NODE_ENV==='production')
  throw Error('party_event_v87_source_unreleased');
}
export function createPartyEventCanonicalSourcePortsV87(qaEnabled=false):
 Pick<ChestPhysicalPortsV70,'readCanonicalSource'>{
 return {
  async readCanonicalSource(tx:ChestSqlV70,accountId:string,sourceKey:string){
   gate(qaEnabled);
   const week=authorizedSource(accountId,sourceKey);
   const rows=(await tx.query<{proof:unknown}>(
    PARTY_EVENT_CANONICAL_SOURCE_SQL_V87,
    [accountId,week,'server_level_snapshot_v2'],
   )).rows;
   if(rows.length!==1||!rows[0]?.proof)
    throw Error('party_event_v87_settlement_certificate_missing_or_ambiguous');
   const raw=typeof rows[0]!.proof==='string'?
    JSON.parse(rows[0]!.proof as string) as unknown:rows[0]!.proof;
   if(!raw||typeof raw!=='object'||Array.isArray(raw))
    throw Error('party_event_v87_invalid_db_proof');
   const proof=raw as PrivatePartyRewardProofV61;
   return resolveTrustedPartyChestSourceV77({
    authenticatedAccountId:accountId,sourceKey,proof,
   });
  },
 };
}
