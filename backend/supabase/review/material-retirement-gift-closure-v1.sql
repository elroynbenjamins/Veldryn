-- REVIEW ONLY. No live deployment. Execute only in an isolated database fixture.
-- This closure must precede compensation; archived campaign history is preserved.
begin;
do $$
declare
 release_cleared constant boolean := false;
begin
 if not release_cleared then raise exception 'review_only_gift_closure_disabled'; end if;
 -- Freeze preview/send operations during the closure. No historical campaign or
 -- existing mail is deleted. Any unsent or unclaimed affected reward blocks.
 lock table private.reward_gift_catalog_v1, private.reward_gift_campaigns_v1, private.reward_inbox_v1 in access exclusive mode;
 if exists(select 1 from private.reward_gift_campaigns_v1 where sent_at is null and attachments::text ~* 'ECHO_BAT_WING|ITEM_0077') then raise exception 'pending_gift_campaign'; end if;
 if exists(select 1 from private.reward_inbox_v1 where claimed_at is null and attachments::text ~* 'ECHO_BAT_WING|ITEM_0077') then raise exception 'pending_gift_inbox'; end if;
 delete from private.reward_gift_catalog_v1 where id in ('ECHO_BAT_WING','ITEM_0077') or resource_id in ('ECHO_BAT_WING','ITEM_0077');
end $$;
rollback;
