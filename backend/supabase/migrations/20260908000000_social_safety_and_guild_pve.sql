-- Server-owned social safety and weekly guild PvE foundation.
create table if not exists public.chat_filter_terms (
  normalized_term text primary key,
  action text not null default 'mask' check(action in ('mask','block')),
  enabled boolean not null default true
);
create table if not exists public.chat_account_sanctions (
  account_id uuid primary key references auth.users(id) on delete cascade,
  muted_until timestamptz,
  updated_at timestamptz not null default now()
);
insert into public.chat_filter_terms(term,normalized_term,action) values
 ('fuck','fuck','mask'),('shit','shit','mask'),('bitch','bitch','mask'),('cunt','cunt','block') on conflict do nothing;

create or replace function public.send_world_chat(p_channel_id text,p_body text,p_sender_name text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_body text:=trim(p_body); v_term public.chat_filter_terms%rowtype; v_id uuid;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_channel_id not in ('world-1','world-2','world-3','world-4') then raise exception 'INVALID_WORLD_CHANNEL'; end if;
 if char_length(v_body) not between 1 and 300 then raise exception 'INVALID_MESSAGE_LENGTH'; end if;
 if exists(select 1 from public.chat_account_sanctions where account_id=v_uid and muted_until>now()) then raise exception 'CHAT_MUTED'; end if;
 if (select count(*) from public.chat_messages where account_id=v_uid and created_at>now()-interval '10 seconds')>=3 then raise exception 'CHAT_COOLDOWN'; end if;
 if (select count(*) from public.chat_messages where account_id=v_uid and created_at>now()-interval '1 minute')>=15 then raise exception 'CHAT_RATE_LIMIT'; end if;
 for v_term in select * from public.chat_filter_terms where enabled loop
   if position(v_term.normalized_term in lower(v_body))>0 then
     if v_term.action='block' then raise exception 'MESSAGE_BLOCKED'; end if;
     v_body:=replace(lower(v_body),v_term.normalized_term,repeat('•',char_length(v_term.normalized_term)));
   end if;
 end loop;
 insert into public.chat_messages(account_id,channel_type,channel_id,sender_name,body)
 values(v_uid,'world',p_channel_id,left(trim(p_sender_name),20),v_body) returning id into v_id;
 return v_id;
end $$;
revoke all on function public.send_world_chat(text,text,text) from public;
grant execute on function public.send_world_chat(text,text,text) to authenticated;

create table if not exists public.guild_weekly_projects (
 guild_id uuid not null references public.guilds(id) on delete cascade,
 week_key date not null, goal bigint not null default 10000, progress bigint not null default 0,
 primary key(guild_id,week_key)
);
create table if not exists public.guild_weekly_bosses (
 guild_id uuid not null references public.guilds(id) on delete cascade,
 week_key date not null, max_hp bigint not null default 500000, current_hp bigint not null default 500000,
 primary key(guild_id,week_key)
);
create table if not exists public.guild_pve_receipts (
 id uuid primary key default gen_random_uuid(), guild_id uuid not null references public.guilds(id) on delete cascade,
 account_id uuid not null references auth.users(id) on delete cascade, week_key date not null,
 kind text not null check(kind in ('project','boss')), amount integer not null check(amount>0), created_at timestamptz not null default now()
);
alter table public.guild_weekly_projects enable row level security;
alter table public.guild_weekly_bosses enable row level security;
alter table public.guild_pve_receipts enable row level security;
drop policy if exists "guild weekly state readable by members" on public.guild_weekly_projects;
create policy "guild weekly state readable by members" on public.guild_weekly_projects for select to authenticated using(exists(select 1 from public.guild_members gm where gm.guild_id=guild_weekly_projects.guild_id and gm.account_id=auth.uid()));
drop policy if exists "guild boss readable by members" on public.guild_weekly_bosses;
create policy "guild boss readable by members" on public.guild_weekly_bosses for select to authenticated using(exists(select 1 from public.guild_members gm where gm.guild_id=guild_weekly_bosses.guild_id and gm.account_id=auth.uid()));

create or replace function public.guild_weekly_state()
returns table(guild_id uuid,project_progress bigint,project_goal bigint,boss_hp bigint,boss_max_hp bigint)
language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_gid uuid;v_week date:=date_trunc('week',now() at time zone 'UTC')::date;
begin
 select gm.guild_id into v_gid from public.guild_members gm where gm.account_id=v_uid limit 1;
 if v_gid is null then return; end if;
 insert into public.guild_weekly_projects(guild_id,week_key) values(v_gid,v_week) on conflict do nothing;
 insert into public.guild_weekly_bosses(guild_id,week_key) values(v_gid,v_week) on conflict do nothing;
 return query select v_gid,p.progress,p.goal,b.current_hp,b.max_hp from public.guild_weekly_projects p join public.guild_weekly_bosses b using(guild_id,week_key) where p.guild_id=v_gid and p.week_key=v_week;
end $$;

create or replace function public.guild_contribute(p_kind text,p_amount integer)
returns table(project_progress bigint,boss_hp bigint) language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_gid uuid;v_week date:=date_trunc('week',now() at time zone 'UTC')::date;v_limit integer:=case when p_kind='project' then 1000 else 50000 end;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_kind not in ('project','boss') or p_amount<1 or p_amount>v_limit then raise exception 'INVALID_CONTRIBUTION';end if;
 select guild_id into v_gid from public.guild_members where account_id=v_uid limit 1;if v_gid is null then raise exception 'NOT_IN_GUILD';end if;
 if (select coalesce(sum(amount),0) from public.guild_pve_receipts where account_id=v_uid and week_key=v_week and kind=p_kind)+p_amount>v_limit then raise exception 'WEEKLY_CONTRIBUTION_CAP';end if;
 insert into public.guild_weekly_projects(guild_id,week_key) values(v_gid,v_week) on conflict do nothing;insert into public.guild_weekly_bosses(guild_id,week_key) values(v_gid,v_week) on conflict do nothing;
 insert into public.guild_pve_receipts(guild_id,account_id,week_key,kind,amount) values(v_gid,v_uid,v_week,p_kind,p_amount);
 if p_kind='project' then update public.guild_weekly_projects set progress=least(goal,progress+p_amount) where guild_id=v_gid and week_key=v_week;else update public.guild_weekly_bosses set current_hp=greatest(0,current_hp-p_amount) where guild_id=v_gid and week_key=v_week;end if;
 return query select p.progress,b.current_hp from public.guild_weekly_projects p join public.guild_weekly_bosses b using(guild_id,week_key) where p.guild_id=v_gid and p.week_key=v_week;
end $$;
revoke all on function public.guild_weekly_state(),public.guild_contribute(text,integer) from public;
grant execute on function public.guild_weekly_state(),public.guild_contribute(text,integer) to authenticated;
