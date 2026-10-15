-- Festival contributions use the canonical activity weights when available.
-- Newer resources retain a regional weight so every authoritative gathering
-- node contributes even before it is individually added to that catalogue.
create or replace function public.credit_guild_pve_effort_v2(p_account uuid,p_guild uuid,p_contributions jsonb,p_now timestamptz)
returns void language plpgsql security definer set search_path=public as $$
declare e record;a jsonb;v_since timestamptz;v_start timestamptz;v_end timestamptz;v_day timestamptz;v_next timestamptz;
 v_ms bigint;v_before bigint;v_after bigint;v_used bigint;v_credit bigint;v_total bigint;v_joined timestamptz;v_weight numeric;
begin
 perform pg_advisory_xact_lock(hashtextextended('party-account:'||p_account,0));
 select joined_at into v_joined from public.guild_members where account_id=p_account and guild_id=p_guild for share;
 if not found then return;end if;
 perform public.ensure_guild_pve_v1(p_guild,p_now);
 for e in select x.* from public.guild_pve_encounters_v1 x where x.guild_id=p_guild and x.starts_at<=p_now and x.claim_ends_at>p_now
  and (x.kind='weekly' or exists(select 1 from public.visible_live_events() v where v.event_id=x.event_id and v.starts_at=x.starts_at)) order by x.id for update loop
  select eligible_since into v_since from public.guild_pve_roster_v2 where encounter_id=e.id and account_id=p_account;
  if not found then continue;end if;
  select coalesce(sum(m.damage),0) into v_used from public.guild_pve_members_v1 m join public.guild_pve_encounters_v1 x on x.id=m.encounter_id where m.account_id=p_account and x.scope_key=e.scope_key;
  v_total:=0;
  for a in select * from jsonb_array_elements(p_contributions) loop
   v_weight:=1;
   if (a->>'kind'='combat' and jsonb_typeof(a->'combatEffort')='object'
       and jsonb_typeof(a#>'{combatEffort,startsAtMs}')='number' and jsonb_typeof(a#>'{combatEffort,endsAtMs}')='number') then
    v_start:=greatest(to_timestamp((a#>>'{combatEffort,startsAtMs}')::numeric/1000),e.starts_at,v_since,v_joined);
    v_end:=least(to_timestamp((a#>>'{combatEffort,endsAtMs}')::numeric/1000),e.ends_at,p_now);
   elsif e.kind='event' and a->>'kind'='skilling'
       and jsonb_typeof(a->'startsAtMs')='number' and jsonb_typeof(a->'endsAtMs')='number' then
    -- The established party catalogue is authoritative when it has an exact resource.
    select units_per_action into v_weight from public.party_activity_weights_v16
     where kind='gathering' and content_id=a->>'contentId';
    v_weight:=coalesce(v_weight,case upper(coalesce(a->>'regionId',''))
     when 'GREENFIELDS' then 1.0 when 'OLD_MINES' then 1.0 when 'SILVERBROOK' then 1.0 when 'KINGS_ROAD' then 1.0
     when 'IRONWOOD' then 1.55 when 'SUNSCAR' then 2.10 when 'FROSTMARCH' then 2.55 when 'ASHLANDS' then 3.20 else 1.0 end);
    v_start:=greatest(to_timestamp((a->>'startsAtMs')::numeric/1000),e.starts_at,v_since,v_joined);
    v_end:=least(to_timestamp((a->>'endsAtMs')::numeric/1000),e.ends_at,p_now);
   elsif e.kind='event' and a->>'kind'='crafting' and jsonb_typeof(a->'units')='number' then
    -- Crafting remains a small, capped bonus; gathering carries the resource and region scaling.
    v_end:=least(p_now,e.ends_at);
    v_start:=greatest(v_end-interval '15 seconds'*least(100,greatest(0,(a->>'units')::numeric)),e.starts_at,v_since,v_joined);
   else
    continue;
   end if;
   if v_start is null or v_end is null or v_end<=v_start then continue;end if;
   while v_start<v_end and v_used<e.personal_cap loop
    v_day:=date_trunc('day',v_start at time zone 'UTC') at time zone 'UTC';v_next:=least(v_end,v_day+interval '1 day');
    v_ms:=floor(extract(epoch from v_next-v_start)*1000*v_weight);
    insert into public.guild_pve_daily_v2(account_id,scope_key,earned_day) values(p_account,e.scope_key,(v_day at time zone 'UTC')::date) on conflict do nothing;
    select credited_ms into v_before from public.guild_pve_daily_v2 where account_id=p_account and scope_key=e.scope_key and earned_day=(v_day at time zone 'UTC')::date for update;
    v_after:=least(v_before+v_ms,e.daily_cap*300,v_before+(e.personal_cap-v_used)*300);
    v_credit:=floor(v_after/300.0)-floor(v_before/300.0);
    update public.guild_pve_daily_v2 set credited_ms=v_after where account_id=p_account and scope_key=e.scope_key and earned_day=(v_day at time zone 'UTC')::date;
    v_used:=v_used+v_credit;v_total:=v_total+v_credit;v_start:=v_next;
   end loop;
  end loop;
  if v_total>0 then
   insert into public.guild_pve_members_v1 values(e.id,p_account,v_total) on conflict(encounter_id,account_id) do update set damage=public.guild_pve_members_v1.damage+excluded.damage;
   update public.guild_pve_encounters_v1 set damage=least(max_hp,damage+v_total) where id=e.id;
  end if;
 end loop;
end $$;
revoke all on function public.credit_guild_pve_effort_v2(uuid,uuid,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.credit_guild_pve_effort_v2(uuid,uuid,jsonb,timestamptz) to service_role;
