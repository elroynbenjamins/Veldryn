begin;

-- Active Guild Meter v3: 10% reserve above the 100% power cap.
-- 100-110% grants no additional bonuses; it only absorbs future decay.
alter table public.guild_activity_state drop constraint if exists guild_activity_state_meter_bps_check;
alter table public.guild_activity_state add constraint guild_activity_state_meter_bps_check check(meter_bps between 0 and 11000);

create or replace function public.guild_quest_rarity_reward_v3(r text)
returns integer language sql immutable as $$
 select case r when 'common' then 90 when 'uncommon' then 150 when 'rare' then 240 when 'epic' then 360 else 540 end
$$;

create or replace function public.guild_activity_award_v1(
 p_guild_id uuid,p_source_kind text,p_source_id text,p_contribution_units integer,p_occurred_at timestamptz default clock_timestamp()
)
returns table(meter_bps integer,awarded_bps integer,target_units integer)
language plpgsql security definer set search_path=public,private as $$
declare v_target integer;v_award integer;v_existing integer;v_today date:=(p_occurred_at at time zone 'UTC')::date;
begin
 if p_contribution_units<=0 then raise exception 'GUILD_ACTIVITY_INVALID_UNITS'; end if;
 if nullif(trim(p_source_kind),'') is null or nullif(trim(p_source_id),'') is null then raise exception 'GUILD_ACTIVITY_SOURCE_REQUIRED'; end if;
 perform public.guild_activity_apply_decay_v1(p_guild_id,v_today);
 v_target:=public.guild_activity_target_units_v1(p_guild_id);
 v_award:=least(11000,greatest(1,ceil(p_contribution_units::numeric/v_target*10000)::integer));
 select r.awarded_bps into v_existing from private.guild_activity_receipts r where r.guild_id=p_guild_id and r.source_kind=p_source_kind and r.source_id=p_source_id;
 if v_existing is not null then
   return query select s.meter_bps,v_existing,v_target from public.guild_activity_state s where s.guild_id=p_guild_id;return;
 end if;
 insert into private.guild_activity_receipts(guild_id,source_kind,source_id,contribution_units,awarded_bps)
 values(p_guild_id,trim(p_source_kind),trim(p_source_id),p_contribution_units,v_award);
 update public.guild_activity_state set meter_bps=least(11000,meter_bps+v_award),updated_at=p_occurred_at where guild_id=p_guild_id;
 return query select s.meter_bps,v_award,v_target from public.guild_activity_state s where s.guild_id=p_guild_id;
end $$;
revoke all on function public.guild_activity_award_v1(uuid,text,text,integer,timestamptz) from public,anon,authenticated;
grant execute on function public.guild_activity_award_v1(uuid,text,text,integer,timestamptz) to service_role;

comment on table public.guild_activity_state is 'Persistent Active Guild meter. Bonuses cap at 100%; 100-110% is decay reserve.';
comment on function public.guild_quest_rarity_reward_v3(text) is 'Guild Quest Activity units balanced for a five-slot board: 90/150/240/360/540.';
commit;