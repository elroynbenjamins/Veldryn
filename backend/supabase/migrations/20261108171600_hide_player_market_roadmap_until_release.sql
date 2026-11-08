-- The market is under development. Keep it off the Community Roadmap
-- (including all voting/status tabs) until the complete feature is released.
-- This preserves the idea metadata; the established trigger refunds any votes.
begin;
update public.community_roadmap_features
set published=false, updated_at=now()
where id='player_market' and published;
commit;
