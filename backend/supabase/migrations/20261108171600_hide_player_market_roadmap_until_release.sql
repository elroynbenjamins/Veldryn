-- Do not publish the unfinished market on the Community Roadmap.
-- This retains authoring metadata; the existing refund trigger releases votes.
update public.community_roadmap_features
set published=false,updated_at=now()
where id='player_market' and published;
