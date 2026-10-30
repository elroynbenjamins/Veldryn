begin;
alter table public.guild_pve_claims_v1 drop constraint if exists guild_pve_claims_v1_gold_check;
alter table public.guild_pve_claims_v1 add constraint guild_pve_claims_v1_gold_check check(gold>=0);
create table if not exists public.guild_pve_treasury_v1(
 guild_id uuid primary key references public.guilds(id) on delete cascade,
 gold bigint not null default 0 check(gold>=0),
 materials jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now()
);
create table if not exists public.guild_pve_treasury_awards_v1(
 encounter_id uuid not null references public.guild_pve_encounters_v1(id) on delete cascade,
 guild_id uuid not null references public.guilds(id) on delete cascade,
 milestone integer not null check(milestone in(25,50,100)),
 gold bigint not null check(gold>=0),
 guild_xp integer not null check(guild_xp>=0),
 materials jsonb not null,
 created_at timestamptz not null default now(),
 primary key(encounter_id,milestone)
);
alter table public.guild_pve_treasury_v1 enable row level security;
alter table public.guild_pve_treasury_awards_v1 enable row level security;
revoke all on public.guild_pve_treasury_v1,public.guild_pve_treasury_awards_v1 from public,anon,authenticated;
grant all on public.guild_pve_treasury_v1,public.guild_pve_treasury_awards_v1 to service_role;

create or replace function public.claim_guild_pve_v1(p_encounter uuid,p_milestone integer) returns jsonb
language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid();gid uuid;e record;g record;v_gold integer;v_count integer;v_currency integer:=0;v_candy integer:=0;v_account jsonb;v_kind text;v_bank_gold integer;v_bank_xp integer;v_materials jsonb;v_award_count integer;v_bank_materials jsonb;v_resource record;
begin
 if uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_milestone not in(25,50,100) or p_milestone is null then raise exception 'INVALID_MILESTONE';end if;
 -- Lock the same account state used by gameplay so wallet updates cannot be overwritten.
 select * into g from public.online_game_states where account_id=uid for update;
 if g.character_id is null or g.state->'character' is null or g.state->'character'='null'::jsonb then raise exception 'CHARACTER_REQUIRED';end if;
 select guild_id into gid from public.guild_members where account_id=uid limit 1 for share;
 select * into e from public.guild_pve_encounters_v1 where id=p_encounter and guild_id=gid;
 if e.id is null then raise exception 'GUILD_MEMBERSHIP_REQUIRED';end if;
 if exists(select 1 from public.guild_pve_claims_v1 where account_id=uid and scope_key=e.scope_key and milestone=p_milestone) then return jsonb_build_object('alreadyClaimed',true);end if;
 if e.kind='event' and not exists(select 1 from public.visible_live_events() v where v.event_id=e.event_id and v.starts_at=e.starts_at) then raise exception 'EVENT_UNAVAILABLE';end if;
 if now()>=e.claim_ends_at then raise exception 'CLAIM_WINDOW_ENDED';end if;
 if e.damage*100<e.max_hp*p_milestone then raise exception 'MILESTONE_NOT_REACHED';end if;
 if coalesce((select damage from public.guild_pve_members_v1 where encounter_id=e.id and account_id=uid),0)<1000 then raise exception 'CONTRIBUTE_1000_DAMAGE';end if;
 v_gold:=case when e.kind='event' then case p_milestone when 25 then 250 when 50 then 500 else 1000 end else 0 end;
 insert into public.guild_pve_claims_v1(account_id,scope_key,milestone,encounter_id,gold) values(uid,e.scope_key,p_milestone,e.id,v_gold) on conflict do nothing;
 get diagnostics v_count=row_count;
 if v_count=0 then return jsonb_build_object('alreadyClaimed',true);end if;
 if v_gold>0 then
  insert into public.character_wallets(character_id,gold) values(g.character_id,v_gold) on conflict(character_id) do update set gold=public.character_wallets.gold+excluded.gold;
  update public.online_game_states set revision=revision+1,updated_at=now(),state=jsonb_set(state,'{character,gold}',to_jsonb((select gold from public.character_wallets where character_id=g.character_id))) where account_id=uid;
 end if;
 -- A guild receives each milestone once, even when several members claim it.
 v_bank_gold:=case when e.kind='event' then case p_milestone when 25 then 5000 when 50 then 10000 else 20000 end else case p_milestone when 25 then 2500 when 50 then 5000 else 10000 end end;
 v_bank_xp:=case when e.kind='event' then case p_milestone when 25 then 150 when 50 then 300 else 600 end else case p_milestone when 25 then 100 when 50 then 200 else 400 end end;
 v_materials:=case
  when e.kind='weekly' and p_milestone=25 then '{"MOSS_FIBER":50,"GREENWOOD_LOG":25}'::jsonb
  when e.kind='weekly' and p_milestone=50 then '{"IRONWOOD_LOG":40,"ASTER_IRON_INGOT":10}'::jsonb
  when e.kind='weekly' then '{"IRONWOOD_LOG":100,"ASTER_IRON_INGOT":25,"OATHGLASS_SHARD":5}'::jsonb
  when p_milestone=25 then '{"MOSS_FIBER":75,"GREENWOOD_LOG":40}'::jsonb
  when p_milestone=50 then '{"IRONWOOD_LOG":75,"ASTER_IRON_INGOT":20}'::jsonb
  else '{"IRONWOOD_LOG":150,"ASTER_IRON_INGOT":40,"OATHGLASS_SHARD":10}'::jsonb end;
 insert into public.guild_pve_treasury_awards_v1(encounter_id,guild_id,milestone,gold,guild_xp,materials)
 values(e.id,gid,p_milestone,v_bank_gold,v_bank_xp,v_materials) on conflict do nothing;
 get diagnostics v_award_count=row_count;
 if v_award_count=1 then
  insert into public.guild_pve_treasury_v1(guild_id) values(gid) on conflict do nothing;
  select materials into v_bank_materials from public.guild_pve_treasury_v1 where guild_id=gid for update;
  for v_resource in select key,value from jsonb_each_text(v_materials) loop
   v_bank_materials:=jsonb_set(v_bank_materials,array[v_resource.key],to_jsonb(coalesce((v_bank_materials->>v_resource.key)::bigint,0)+v_resource.value::bigint));
  end loop;
  update public.guild_pve_treasury_v1 set gold=gold+v_bank_gold,materials=v_bank_materials,updated_at=now() where guild_id=gid;
  update public.guilds guild set xp=guild.xp+v_bank_xp,
   level=greatest(guild.level,1+(select count(*) from unnest(array[1200,3200,6500,11000,17000,24500,33500,44000,56000]) as thresholds(required_xp) where guild.xp+v_bank_xp>=thresholds.required_xp))
   where id=gid;
 end if;
 if e.kind='event' then
 v_currency:=case p_milestone when 25 then 100 when 50 then 200 else 400 end;
 v_candy:=case when p_milestone=100 then 2 else 1 end;
 v_kind:=case when p_milestone=25 then 'skill' when p_milestone=50 then 'combat' else 'companion' end;
 v_account:=coalesce(g.state->'account','{}'::jsonb);
 v_account:=jsonb_set(v_account,'{eventCurrencyBalanceById}',coalesce(v_account->'eventCurrencyBalanceById','{}'::jsonb)||jsonb_build_object(e.event_id,coalesce((v_account#>>array['eventCurrencyBalanceById',e.event_id])::bigint,0)+v_currency));
 v_account:=jsonb_set(v_account,'{eventProgressById}',coalesce(v_account->'eventProgressById','{}'::jsonb)||jsonb_build_object(e.event_id,coalesce((v_account#>>array['eventProgressById',e.event_id])::bigint,0)+v_currency));
 v_kind:=e.event_id||':candy:'||v_kind;
 v_account:=jsonb_set(v_account,'{eventCandyChargesById}',coalesce(v_account->'eventCandyChargesById','{}'::jsonb)||jsonb_build_object(v_kind,coalesce((v_account#>>array['eventCandyChargesById',v_kind])::bigint,0)+v_candy));
 if e.event_id='EVT_ANNUAL_010_2026' then
   if p_milestone>=25 then insert into public.guild_cosmetic_unlocks(guild_id,unlock_id,source_kind,source_ref) values(gid,'name_halloween_orange','event',e.event_id) on conflict do nothing; end if;
   if p_milestone>=50 then insert into public.guild_cosmetic_unlocks(guild_id,unlock_id,source_kind,source_ref) values(gid,'border_halloween_veil','event',e.event_id) on conflict do nothing; end if;
   if p_milestone>=100 then
     insert into public.guild_cosmetic_unlocks(guild_id,unlock_id,source_kind,source_ref) values(gid,'halloween_pumpkin_lantern','event',e.event_id) on conflict do nothing;
     insert into public.guild_cosmetic_unlocks(guild_id,unlock_id,source_kind,source_ref) values(gid,'halloween_bat_moon','event',e.event_id) on conflict do nothing;
   end if;
 end if;
 update online_game_states set state=jsonb_set(state,'{account}',v_account) where account_id=uid;
 end if;
 return jsonb_build_object('alreadyClaimed',false,'gold',v_gold,'eventCurrency',v_currency,'candy',v_candy,'guildBankGold',case when v_award_count=1 then v_bank_gold else 0 end,'guildXp',case when v_award_count=1 then v_bank_xp else 0 end);
end $$;
revoke all on function public.claim_guild_pve_v1(uuid,integer) from public,anon;
grant execute on function public.claim_guild_pve_v1(uuid,integer) to authenticated;

create or replace function public.guild_pve_treasury_summary_v1() returns jsonb
language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid();gid uuid;result jsonb;
begin
 if uid is null then raise exception 'AUTH_REQUIRED';end if;
 select guild_id into gid from public.guild_members where account_id=uid limit 1;
 if gid is null then raise exception 'GUILD_MEMBERSHIP_REQUIRED';end if;
 select jsonb_build_object('gold',coalesce(bank.gold,0),'materials',coalesce(bank.materials,'{}'::jsonb),'guildXp',guild.xp)
 into result from public.guilds guild left join public.guild_pve_treasury_v1 bank on bank.guild_id=guild.id where guild.id=gid;
 return coalesce(result,jsonb_build_object('gold',0,'materials','{}'::jsonb,'guildXp',0));
end $$;
revoke all on function public.guild_pve_treasury_summary_v1() from public,anon;
grant execute on function public.guild_pve_treasury_summary_v1() to authenticated;
commit;
