-- Server-derived, presentation-only Guild PvE attempt timeline.
-- An attempt's character and companion totals are decided and stored by the
-- existing attempt_guild_pve_v3 RPC. This read-only RPC divides those same
-- totals into timed display cues; it never changes HP, attempts or rewards.
-- Only the authenticated attempt owner in their current guild may read it.
begin;

create or replace function public.guild_pve_attempt_timeline_v1(p_encounter uuid)
returns jsonb language plpgsql stable security definer set search_path=public
as $$
declare
 uid uuid := auth.uid();
 v_attempt public.guild_pve_attempts_v3%rowtype;
 v_events jsonb;
begin
 if uid is null then raise exception 'AUTH_REQUIRED'; end if;

 select a.* into v_attempt
 from public.guild_pve_attempts_v3 a
 join public.guild_pve_encounters_v1 e on e.id=a.encounter_id
 join public.guild_members g on g.guild_id=e.guild_id and g.account_id=uid
 where a.encounter_id=p_encounter and a.account_id=uid
 order by a.attempt_number desc limit 1;

 if not found then return null; end if;

 -- Character: 30 visible swings across the 180-second window.
 -- Companion: 10 assists, if a companion contributed. Each partition sums
 -- exactly to the precommitted total (even for small or capped damage).
 select coalesce(jsonb_agg(
   jsonb_build_object('id',hits.actor||'-'||hits.idx,
    'atMs',hits.at_ms,'actor',hits.actor,'amount',hits.amount)
   order by hits.at_ms,hits.actor
 ),'[]'::jsonb) into v_events
 from (
  select 'character'::text as actor,idx,
   (3000+(idx-1)*5600)::integer as at_ms,
   (v_attempt.character_damage/30
    +case when idx <= (v_attempt.character_damage%30) then 1 else 0 end)::bigint as amount
  from generate_series(1,30) as idx
  union all
  select 'companion'::text as actor,idx,
   (7000+(idx-1)*17000)::integer as at_ms,
   (v_attempt.companion_damage/10
    +case when idx <= (v_attempt.companion_damage%10) then 1 else 0 end)::bigint as amount
  from generate_series(1,10) as idx
  where v_attempt.companion_id is not null
 ) hits where hits.amount>0;

 return jsonb_build_object(
   'encounterId',v_attempt.encounter_id,
   'attemptNumber',v_attempt.attempt_number,
   'startedAt',v_attempt.created_at,
   'resolvesAt',v_attempt.resolves_at,
   'resolved',v_attempt.resolved_at is not null,
   'characterDamage',v_attempt.character_damage,
   'companionDamage',v_attempt.companion_damage,
   'events',v_events
 );
end $$;

revoke all on function public.guild_pve_attempt_timeline_v1(uuid) from public,anon;
grant execute on function public.guild_pve_attempt_timeline_v1(uuid) to authenticated;
commit;
