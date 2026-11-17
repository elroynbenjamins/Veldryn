-- V41 REVIEW-ONLY. Load after V17/V22/V27/V28 in disposable PostgreSQL.
-- DO NOT install in Supabase staging/production. No route or user grants.
-- One STABLE invocation reads a statement-consistent event/account snapshot,
-- without freezing War Camp, spending a resource, or issuing Sigils.
BEGIN;
CREATE FUNCTION private.world_boss_v41_overview(p_event uuid,p_account uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=''
AS $overview$
DECLARE
 e private.world_boss_events_v17%ROWTYPE;
 w private.world_boss_war_camps_v27%ROWTYPE;
 at_utc timestamptz:=statement_timestamp();
 phase text;
 used_count bigint;
 reserved_count bigint;
 committed_count bigint;
 supply_count bigint;
 wallet_balance bigint;
 wallet_revision bigint;
 event_earned bigint;
BEGIN
 IF p_event IS NULL OR p_account IS NULL OR
    NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_account)
 THEN RAISE EXCEPTION 'WB41_INVALID_PRIVATE_IDENTITY'; END IF;
 SELECT * INTO e FROM private.world_boss_events_v17 WHERE id=p_event;
 IF NOT FOUND THEN RAISE EXCEPTION 'WB41_EVENT_MISSING'; END IF;
 IF e.ends_at<>e.starts_at+interval '7 days' OR
    private.world_boss_v22_window_at(e.starts_at,e.starts_at+interval '5 days') IS DISTINCT FROM 0
 THEN RAISE EXCEPTION 'WB41_INVALID_EVENT_CALENDAR'; END IF;
 SELECT * INTO w FROM private.world_boss_war_camps_v27 WHERE event_id=p_event;
 IF NOT FOUND THEN RAISE EXCEPTION 'WB41_CAMP_MISSING'; END IF;
 phase:=CASE
  WHEN at_utc<e.starts_at THEN 'upcoming'
  WHEN at_utc<e.starts_at+interval '5 days' THEN 'preparation'
  WHEN at_utc<e.ends_at THEN 'raid'
  WHEN at_utc<e.starts_at+interval '14 days' THEN 'cooldown'
  ELSE 'expired' END;
 SELECT count(*) FILTER (WHERE status IN('reserved','committed')),
        count(*) FILTER (WHERE status='reserved'),
        count(*) FILTER (WHERE status='committed')
 INTO used_count,reserved_count,committed_count
 FROM private.world_boss_attempts_v17
 WHERE event_id=p_event AND account_id=p_account;
 SELECT count(*) INTO supply_count FROM private.world_boss_war_donations_v27
 WHERE event_id=p_event AND account_id=p_account;
 SELECT coalesce(balance,0),coalesce(revision,0)
 INTO wallet_balance,wallet_revision
 FROM private.world_boss_wallet_v28 WHERE account_id=p_account;
 SELECT coalesce(sum(amount),0) INTO event_earned
 FROM private.world_boss_reward_ledger_v28
 WHERE event_id=p_event AND account_id=p_account;
 RETURN jsonb_build_object(
  'eventId',p_event::text,'accountId',p_account::text,
  'bossId',e.boss_id,'status',e.status,'phase',phase,
  'startsAtUtcMs',floor(extract(epoch FROM e.starts_at)*1000)::bigint,
  'endsAtUtcMs',floor(extract(epoch FROM e.ends_at)*1000)::bigint,
  'readAtUtcMs',floor(extract(epoch FROM at_utc)*1000)::bigint,
  'maxHp',e.max_hp,'remainingHp',e.remaining_hp,'eventRevision',e.revision,
  'attemptsUsed',used_count,'attemptsReserved',reserved_count,
  'attemptsCommitted',committed_count,'donationsUsed',supply_count,
  'warCamp',jsonb_build_object(
   'eventId',p_event::text,'revision',w.revision,
   'contributions',jsonb_build_object(
    'fortifications',w.fortifications,'fieldProvisions',w.field_provisions,
    'siegecraft',w.siegecraft),
   'goals',jsonb_build_object(
    'fortifications',jsonb_build_object('tier1At',w.fort_tier1,'tier2At',w.fort_tier2),
    'fieldProvisions',jsonb_build_object('tier1At',w.field_tier1,'tier2At',w.field_tier2),
    'siegecraft',jsonb_build_object('tier1At',w.siege_tier1,'tier2At',w.siege_tier2)),
   'frozen',w.frozen_snapshot IS NOT NULL,'snapshot',w.frozen_snapshot),
  'rewards',jsonb_build_object(
   'balance',coalesce(wallet_balance,0),
   'walletRevision',coalesce(wallet_revision,0),
   'claimedThisEvent',event_earned,'eventCap',100));
END
$overview$;
REVOKE ALL ON FUNCTION private.world_boss_v41_overview(uuid,uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.world_boss_v41_overview(uuid,uuid) TO service_role;
COMMIT;
