begin;

-- Guild Quest hardening v11.
-- The v1 settlement function predates the curated rarity board and must never
-- award legacy 500/500/700 Activity alongside current rarity-specific rewards.
create or replace function public.guild_quest_settle_v1(p_guild_id uuid,p_week date)
returns void language plpgsql security definer set search_path=public as $$
begin
  -- Compatibility no-op. Current settlement is performed exclusively by
  -- guild_quest_state_v1 against the stable five-slot rarity board.
  return;
end $$;
revoke all on function public.guild_quest_settle_v1(uuid,date) from public,anon,authenticated;
grant execute on function public.guild_quest_settle_v1(uuid,date) to service_role;

-- Prevent stale pre-rarity completion rows from being interpreted as current board completions.
delete from public.guild_quest_completions
where quest_key in ('combat_front','skilling_drive','united_effort');

comment on function public.guild_quest_settle_v1(uuid,date) is
 'Legacy compatibility no-op. v11+ Guild Quest rewards settle only through rarity-specific curated board state.';
commit;