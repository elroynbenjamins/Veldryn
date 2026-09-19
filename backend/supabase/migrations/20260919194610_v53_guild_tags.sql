begin;

create table if not exists public.guild_tag_registry(
  tag text primary key check(tag ~ '^[A-Z]{3}$'),
  guild_id uuid references public.guilds(id) on delete set null,
  status text not null default 'active' check(status in('active','retired')),
  claimed_at timestamptz not null default now(),
  retired_at timestamptz
);
create unique index if not exists guild_tag_one_active_per_guild
  on public.guild_tag_registry(guild_id) where status='active' and guild_id is not null;

create table if not exists public.guild_tag_blocklist(
  tag text primary key check(tag ~ '^[A-Z]{3}$'),
  reason text not null default 'moderation',
  created_at timestamptz not null default now()
);
insert into public.guild_tag_blocklist(tag,reason) values
 ('SEX','sexual'),('XXX','sexual'),('CUM','sexual'),('FUK','profanity'),('FCK','profanity'),('ASS','profanity'),('TIT','sexual'),('DIC','sexual'),('DCK','sexual'),('CNT','profanity'),
 ('KKK','hate'),('NAZ','hate'),('NIG','slur'),('FAG','slur'),
 ('ADM','reserved'),('MOD','reserved'),('DEV','reserved'),('SYS','reserved'),('BOT','reserved'),('NPC','reserved'),('SUP','reserved')
on conflict(tag) do nothing;

alter table public.guilds
  add column if not exists tag text,
  add column if not exists tag_color_id text not null default 'tag_silver';

do $$ begin
  if not exists(select 1 from pg_constraint where conname='guilds_tag_v53_check') then
    alter table public.guilds add constraint guilds_tag_v53_check check(tag is null or tag ~ '^[A-Z]{3}$');
  end if;
  if not exists(select 1 from pg_constraint where conname='guilds_tag_color_v53_check') then
    alter table public.guilds add constraint guilds_tag_color_v53_check check(tag_color_id in('tag_silver','tag_gold','tag_emerald','tag_sapphire','tag_frost','tag_crimson','tag_amethyst','tag_mythic'));
  end if;
end $$;

alter table public.guild_tag_registry enable row level security;
alter table public.guild_tag_blocklist enable row level security;
drop policy if exists "guild tags are public identity" on public.guild_tag_registry;
create policy "guild tags are public identity" on public.guild_tag_registry for select to anon,authenticated using(true);
revoke all on public.guild_tag_registry,public.guild_tag_blocklist from public,anon,authenticated;
grant select on public.guild_tag_registry to anon,authenticated;

create or replace function public.guild_tag_availability(p_tag text)
returns table(normalized_tag text,available boolean,reason text)
language plpgsql security definer set search_path=''
as $$
declare v_tag text:=upper(trim(coalesce(p_tag,'')));v_reason text;
begin
  if v_tag !~ '^[A-Z]{3}$' then return query select v_tag,false,'invalid_format'::text;return;end if;
  select case when b.reason='reserved' then 'reserved' else 'blocked' end into v_reason from public.guild_tag_blocklist b where b.tag=v_tag;
  if v_reason is not null then return query select v_tag,false,v_reason;return;end if;
  if exists(select 1 from public.guild_tag_registry r where r.tag=v_tag) then return query select v_tag,false,'taken'::text;return;end if;
  return query select v_tag,true,null::text;
end $$;

create or replace function public.guild_identities(p_account_ids uuid[])
returns table(account_id uuid,guild_tag text,guild_tag_color_id text)
language sql security definer set search_path=''
as $$
  select gm.account_id,g.tag,g.tag_color_id
  from public.guild_members gm join public.guilds g on g.id=gm.guild_id
  where auth.uid() is not null and gm.account_id=any(p_account_ids) and g.tag is not null;
$$;

drop function if exists public.create_guild(text,text,integer);
create function public.create_guild(p_name text,p_join_policy text,p_minimum_level integer,p_tag text)
returns uuid language plpgsql security definer set search_path=''
as $$
declare v_uid uuid:=auth.uid();v_id uuid;v_tag text:=upper(trim(coalesce(p_tag,'')));
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
  if coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'LINK_ACCOUNT_REQUIRED';end if;
  if exists(select 1 from public.guild_members where account_id=v_uid) then raise exception 'ALREADY_IN_GUILD';end if;
  if char_length(trim(p_name)) not between 3 and 24 then raise exception 'INVALID_GUILD_NAME';end if;
  if p_join_policy not in('open','apply','invite') then raise exception 'INVALID_JOIN_POLICY';end if;
  if p_minimum_level not between 1 and 100 then raise exception 'INVALID_MINIMUM_LEVEL';end if;
  if v_tag !~ '^[A-Z]{3}$' then raise exception 'GUILD_TAG_INVALID_FORMAT';end if;
  if exists(select 1 from public.guild_tag_blocklist where tag=v_tag) then raise exception 'GUILD_TAG_BLOCKED';end if;
  if exists(select 1 from public.guild_tag_registry where tag=v_tag) then raise exception 'GUILD_TAG_TAKEN';end if;
  insert into public.guilds(name,owner_account_id,minimum_level,join_policy,tag,tag_color_id)
    values(trim(p_name),v_uid,p_minimum_level,p_join_policy,v_tag,'tag_silver') returning id into v_id;
  begin
    insert into public.guild_tag_registry(tag,guild_id) values(v_tag,v_id);
  exception when unique_violation then raise exception 'GUILD_TAG_TAKEN';
  end;
  insert into public.guild_members(guild_id,account_id,role) values(v_id,v_uid,'leader');
  return v_id;
end $$;

create or replace function public.update_guild_tag(p_tag text)
returns table(guild_id uuid,tag text,previous_tag text)
language plpgsql security definer set search_path=''
as $$
declare v_uid uuid:=auth.uid();v_gid uuid;v_role text;v_tag text:=upper(trim(coalesce(p_tag,'')));v_previous text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
  select gm.guild_id,gm.role into v_gid,v_role from public.guild_members gm where gm.account_id=v_uid limit 1;
  if v_gid is null then raise exception 'NOT_IN_GUILD';end if;
  if v_role not in('leader','officer') then raise exception 'GUILD_OFFICER_REQUIRED';end if;
  if v_tag !~ '^[A-Z]{3}$' then raise exception 'GUILD_TAG_INVALID_FORMAT';end if;
  if exists(select 1 from public.guild_tag_blocklist where tag=v_tag) then raise exception 'GUILD_TAG_BLOCKED';end if;
  select g.tag into v_previous from public.guilds g where g.id=v_gid for update;
  if v_previous=v_tag then return query select v_gid,v_tag,v_previous;return;end if;
  if exists(select 1 from public.guild_tag_registry r where r.tag=v_tag) then raise exception 'GUILD_TAG_TAKEN';end if;
  update public.guild_tag_registry set status='retired',retired_at=now() where guild_id=v_gid and status='active';
  begin insert into public.guild_tag_registry(tag,guild_id) values(v_tag,v_gid);
  exception when unique_violation then raise exception 'GUILD_TAG_TAKEN';end;
  update public.guilds set tag=v_tag where id=v_gid;
  return query select v_gid,v_tag,v_previous;
end $$;

create or replace function public.update_guild_tag_color(p_tag_color_id text)
returns table(guild_id uuid,tag_color_id text)
language plpgsql security definer set search_path=''
as $$
declare v_uid uuid:=auth.uid();v_gid uuid;v_role text;v_level integer;v_required_level integer;v_trophy text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
  select gm.guild_id,gm.role,g.level into v_gid,v_role,v_level from public.guild_members gm join public.guilds g on g.id=gm.guild_id where gm.account_id=v_uid limit 1;
  if v_gid is null then raise exception 'NOT_IN_GUILD';end if;
  if v_role not in('leader','officer') then raise exception 'GUILD_OFFICER_REQUIRED';end if;
  v_required_level:=case p_tag_color_id when 'tag_silver' then 1 when 'tag_gold' then 5 when 'tag_emerald' then 10 when 'tag_sapphire' then 15 else null end;
  v_trophy:=case p_tag_color_id when 'tag_frost' then 'guild_pve_dungeon_25' when 'tag_crimson' then 'guild_pve_bossbreaker' when 'tag_amethyst' then 'guild_pve_raid_first_clear' when 'tag_mythic' then 'guild_pve_raid_hard_clear' else null end;
  if v_required_level is null and v_trophy is null then raise exception 'INVALID_GUILD_TAG_COLOR';end if;
  if v_required_level is not null and v_level<v_required_level then raise exception 'GUILD_TAG_COLOR_LOCKED';end if;
  if v_trophy is not null and not exists(select 1 from public.guild_hall_trophies t where t.guild_id=v_gid and t.trophy_key=v_trophy) then raise exception 'GUILD_TAG_COLOR_LOCKED';end if;
  update public.guilds set tag_color_id=p_tag_color_id where id=v_gid;
  return query select v_gid,p_tag_color_id;
end $$;

create or replace function public.retire_guild_tag_on_delete_v53()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  update public.guild_tag_registry set status='retired',retired_at=coalesce(retired_at,now())
  where guild_id=old.id and status='active';
  return old;
end $$;
drop trigger if exists retire_guild_tag_on_delete_v53 on public.guilds;
create trigger retire_guild_tag_on_delete_v53 before delete on public.guilds
for each row execute function public.retire_guild_tag_on_delete_v53();

revoke execute on function public.guild_tag_availability(text),public.guild_identities(uuid[]),public.create_guild(text,text,integer,text),public.update_guild_tag(text),public.update_guild_tag_color(text) from public,anon;
grant execute on function public.guild_tag_availability(text),public.guild_identities(uuid[]),public.create_guild(text,text,integer,text),public.update_guild_tag(text),public.update_guild_tag_color(text) to authenticated;
revoke execute on function public.retire_guild_tag_on_delete_v53() from public,anon,authenticated;

comment on table public.guild_tag_registry is 'Permanent V53 guild tag registry; retired tags are never recycled.';
comment on column public.guilds.tag_color_id is 'Independent cosmetic color for the guild tag prefix.';
commit;
