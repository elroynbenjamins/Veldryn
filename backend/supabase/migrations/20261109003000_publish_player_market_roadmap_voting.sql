-- Expose the Player Market as a Community Roadmap voting proposal only.
-- The marketplace itself remains gated by PLAYER_MARKET_RELEASED=false.
-- This follows the earlier unpublished-player-market migration without changing it.
update public.community_roadmap_features
set published=true, updated_at=now()
where id='player_market' and published=false and status='considering';
