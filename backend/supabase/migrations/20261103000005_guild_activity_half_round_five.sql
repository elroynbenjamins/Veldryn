-- Halve NEW verified Guild Activity contributions and round upwards to 5 units.
-- Example: 90 => 45, 95 => 50, 150 => 75. Existing receipts remain unchanged.
-- The daily participation/decay calculation still uses verified raw actions.
create or replace function public.guild_activity_award_v1(
 p_guild_id uuid,p_source_kind text,p_source_id text,p_contribution_units integer,p_occurred_at timestamptz default clock_timestamp()
)
returns table(meter_bps integer,awarded_bps integer,target_units integer)
language plpgsql security definer set search_path=public,private as $$
declare v_target integer;v_award integer;v_existing integer;v_today date:=(p_occurred_at at time zone 'UTC')::date;
 v_effective_units integer;
begin
 if p_contribution_units<=0 then raise exception 'GUILD_ACTIVITY_INVALID_UNITS'; end if;
 if nullif(trim(p_source_kind),'') is null or nullif(trim(p_source_id),'') is null then raise exception 'GUILD_ACTIVITY_SOURCE_REQUIRED'; end if;
 -- Idempotency must precede any new calculation: retries keep the original award.
 select r.awarded_bps into v_existing from private.guild_activity_receipts r
 where r.guild_id=p_guild_id and r.source_kind=trim(p_source_kind) and r.source_id=trim(p_source_id);
 if v_existing is not null then
  return query select s.meter_bps,v_existing,public.guild_activity_target_units_v1(p_guild_id)
   from public.guild_activity_state s where s.guild_id=p_guild_id;
  return;
 end if;
 perform public.guild_activity_apply_decay_v1(p_guild_id,v_today);
 v_target:=public.guild_activity_target_units_v1(p_guild_id);
 v_effective_units:=least(2147483647,(ceil(p_contribution_units::numeric / 10)*5))::integer;
 v_award:=least(11000,greatest(1,ceil(v_effective_units::numeric/v_target*10000)::integer));
 insert into private.guild_activity_receipts(guild_id,source_kind,source_id,contribution_units,awarded_bps)
 values(p_guild_id,trim(p_source_kind),trim(p_source_id),p_contribution_units,v_award);
 update public.guild_activity_state as target
 set meter_bps=least(11000,target.meter_bps+v_award),updated_at=p_occurred_at
 where target.guild_id=p_guild_id;
 return query select s.meter_bps,v_award,v_target from public.guild_activity_state s where s.guild_id=p_guild_id;
end $$;
revoke all on function public.guild_activity_award_v1(uuid,text,text,integer,timestamptz) from public,anon,authenticated;
grant execute on function public.guild_activity_award_v1(uuid,text,text,integer,timestamptz) to service_role;
