-- VELDRYN — identity name hardening and player reporting.
begin;

create or replace function public.safe_identity_name_v1(p_name text,p_min_length integer,p_max_length integer)
returns boolean
language sql
immutable
set search_path=''
as $$
 select p_name is not null
    and char_length(p_name) between p_min_length and p_max_length
    and p_name=btrim(p_name)
    and p_name ~ $rx$^[A-Za-zÀ-ÖØ-öø-ÿĀ-ſƀ-ɏḀ-ỿ]+([ '-][A-Za-zÀ-ÖØ-öø-ÿĀ-ſƀ-ɏḀ-ỿ]+)*$$rx$;
$$;

create or replace function public.enforce_identity_name_v1()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare v_min integer;v_max integer;v_label text;
begin
 if tg_op='UPDATE' and new.name is not distinct from old.name then return new;end if;
 if tg_table_name='characters' then v_min:=2;v_max:=20;v_label:='character';
 elsif tg_table_name='guilds' then v_min:=3;v_max:=24;v_label:='guild';
 else raise exception 'unsupported_identity_table';end if;
 if not public.safe_identity_name_v1(new.name,v_min,v_max) then raise exception 'invalid_%_name',v_label;end if;
 return new;
end
$$;

drop trigger if exists enforce_character_identity_name_v1 on public.characters;
create trigger enforce_character_identity_name_v1
before insert or update on public.characters
for each row execute function public.enforce_identity_name_v1();

drop trigger if exists enforce_guild_identity_name_v1 on public.guilds;
create trigger enforce_guild_identity_name_v1
before insert or update on public.guilds
for each row execute function public.enforce_identity_name_v1();

create or replace function public.sync_active_profile_display_name_v1()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare v_name text;
begin
 if new.active_character_id is null then return new;end if;
 select c.name into v_name
 from public.characters c
 where c.id=new.active_character_id and c.account_id=new.account_id;
 if v_name is not null then new.display_name:=v_name;end if;
 return new;
end
$$;

drop trigger if exists sync_active_profile_display_name_v1 on public.player_profiles;
create trigger sync_active_profile_display_name_v1
before insert or update of active_character_id on public.player_profiles
for each row execute function public.sync_active_profile_display_name_v1();

create table if not exists public.social_player_reports_v1(
 id uuid primary key default gen_random_uuid(),
 reporter_account_id uuid not null references auth.users(id) on delete cascade,
 target_account_id uuid not null references auth.users(id) on delete cascade,
 message_id uuid references public.chat_messages(id) on delete set null,
 reason text not null check(reason in('identity','harassment_spam')),
 channel_type text,
 channel_id text,
 status text not null default 'open' check(status in('open','reviewed','dismissed','actioned')),
 created_at timestamptz not null default clock_timestamp(),
 reviewed_at timestamptz,
 review_note text,
 check(reporter_account_id<>target_account_id)
);
create index if not exists social_player_reports_target_v1 on public.social_player_reports_v1(target_account_id,status,created_at desc);
create index if not exists social_player_reports_reporter_v1 on public.social_player_reports_v1(reporter_account_id,created_at desc);
alter table public.social_player_reports_v1 enable row level security;
revoke all on public.social_player_reports_v1 from public,anon,authenticated;
grant all on public.social_player_reports_v1 to service_role;

create or replace function public.report_social_player_v1(p_target_account_id uuid,p_reason text,p_message_id uuid default null)
returns text
language plpgsql
security definer
set search_path=''
as $$
declare
 v_uid uuid:=auth.uid();
 v_message public.chat_messages%rowtype;
 v_visible boolean:=false;
begin
 if v_uid is null then raise exception 'authentication_required';end if;
 if p_target_account_id is null or p_target_account_id=v_uid then raise exception 'invalid_report_target';end if;
 if p_reason not in('identity','harassment_spam') then raise exception 'invalid_report_reason';end if;
 if not exists(select 1 from auth.users u where u.id=p_target_account_id) then raise exception 'player_not_found';end if;
 if (select count(*) from public.social_player_reports_v1 r where r.reporter_account_id=v_uid and r.created_at>clock_timestamp()-interval '24 hours')>=12 then
  raise exception 'report_rate_limit';
 end if;

 if p_message_id is not null then
  select * into v_message from public.chat_messages m where m.id=p_message_id;
  if not found or v_message.account_id<>p_target_account_id then raise exception 'report_message_unavailable';end if;
  if v_message.channel_type='world' then v_visible:=true;
  elsif v_message.channel_type='guild' then
   select exists(select 1 from public.guild_members gm where gm.account_id=v_uid and gm.guild_id::text=v_message.channel_id) into v_visible;
  elsif v_message.channel_type='party' then
   select exists(
    select 1 from public.party_members pm join public.parties p on p.id=pm.party_id
    where pm.account_id=v_uid and pm.left_at is null and p.status<>'disbanded' and pm.party_id::text=v_message.channel_id
   ) into v_visible;
  else v_visible:=false;
  end if;
  if not v_visible then raise exception 'report_message_unavailable';end if;
 end if;

 if exists(
  select 1 from public.social_player_reports_v1 r
  where r.reporter_account_id=v_uid
    and r.target_account_id=p_target_account_id
    and r.reason=p_reason
    and r.message_id is not distinct from p_message_id
    and r.created_at>clock_timestamp()-interval '24 hours'
 ) then return 'already_reported';end if;

 insert into public.social_player_reports_v1(reporter_account_id,target_account_id,message_id,reason,channel_type,channel_id)
 values(v_uid,p_target_account_id,p_message_id,p_reason,v_message.channel_type,v_message.channel_id);
 return 'submitted';
end
$$;

revoke all on function public.safe_identity_name_v1(text,integer,integer),public.enforce_identity_name_v1(),public.sync_active_profile_display_name_v1(),public.report_social_player_v1(uuid,text,uuid) from public,anon;
grant execute on function public.report_social_player_v1(uuid,text,uuid) to authenticated;
grant execute on function public.safe_identity_name_v1(text,integer,integer),public.enforce_identity_name_v1(),public.sync_active_profile_display_name_v1() to service_role;

comment on function public.safe_identity_name_v1(text,integer,integer) is 'Accepts normalized Latin identity names containing only letters, single spaces, apostrophes and hyphens.';
comment on table public.social_player_reports_v1 is 'Server-owned player safety reports with optional chat-message evidence.';
comment on function public.report_social_player_v1(uuid,text,uuid) is 'Submits rate-limited identity or harassment/spam reports after validating optional chat evidence visibility.';
commit;
