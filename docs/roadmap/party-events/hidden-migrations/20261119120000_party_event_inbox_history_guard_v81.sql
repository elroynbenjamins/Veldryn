-- Party Events V81: REVIEW-ONLY compatibility guard for legacy Inbox.
-- NOT a deployable migration. No source-kind/claim handler changes.
-- Requires existing private.reward_inbox_v1 from 20261003202408.
-- The legacy 'party' Inbox claim route calls claim_party_contract_reward_v16.
-- Party Event chests must NEVER enter that route or become claimable again.
BEGIN;
CREATE OR REPLACE FUNCTION private.party_event_inbox_history_guard_v81()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $$
BEGIN
 IF TG_OP='UPDATE' THEN
  IF OLD.source_key LIKE 'party-event:%' THEN
   RAISE EXCEPTION 'PARTY_EVENT_V81_INBOX_HISTORY_IMMUTABLE';
  END IF;
 END IF;
 IF NEW.source_key LIKE 'party-event:%' THEN
  IF NEW.source_key !~ '^party-event:[0-9]{13}:[0-9a-f-]{36}:(participation|preparation|finale)$'
   OR position(':'||NEW.account_id::text||':' in NEW.source_key)=0
   OR NEW.source_kind<>'gift'
   OR NEW.claimed_at IS NULL
   OR NEW.attachments<>'[]'::jsonb
   OR NEW.title<>'Party Event chest received'
   OR NEW.body<>'Rewards were credited when this chest was opened. No additional Inbox claim is required.'
  THEN
   RAISE EXCEPTION 'PARTY_EVENT_V81_INBOX_MUST_BE_NONCLAIMABLE';
  END IF;
 END IF;
 RETURN NEW;
END
$$;
DROP TRIGGER IF EXISTS party_event_v81_inbox_history_guard
 ON private.reward_inbox_v1;
CREATE TRIGGER party_event_v81_inbox_history_guard
 BEFORE INSERT OR UPDATE ON private.reward_inbox_v1
 FOR EACH ROW EXECUTE FUNCTION private.party_event_inbox_history_guard_v81();
REVOKE ALL ON FUNCTION private.party_event_inbox_history_guard_v81()
 FROM PUBLIC,anon,authenticated,service_role;
COMMENT ON FUNCTION private.party_event_inbox_history_guard_v81() IS
 'REVIEW-ONLY historical Party Event Inbox guard. No live migration or claim writer.';
COMMIT;
