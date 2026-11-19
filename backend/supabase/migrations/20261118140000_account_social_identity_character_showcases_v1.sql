-- Hidden social identity foundation: one account name, independent character showcases.
-- This migration does not change the three-character roster limit.
alter table public.player_profiles
 add column if not exists social_name text,
 add column if not exists social_name_changed_at timestamptz;
comment on column public.player_profiles.social_name is
 'Account-wide social identity. NULL retains the historical active-character name until the player chooses one.';
create unique index if not exists player_profiles_social_name_unique_v1
 on public.player_profiles (lower(social_name)) where social_name is not null;

-- Preserve the account identity on every character switch; legacy players retain old behaviour until opting in.
create or replace function public.sync_active_profile_display_name_v1()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_name text;
begin
 if new.social_name is not null then
   new.display_name:=new.social_name;
   return new;
 end if;
 if new.active_character_id is null then return new;end if;
 select c.name into v_name from public.characters c
 where c.id=new.active_character_id and c.account_id=new.account_id;
 if v_name is not null then new.display_name:=v_name;end if;
 return new;
end $$;

-- Legacy services may update display_name directly. Keep it pinned to the social name.
drop trigger if exists sync_active_profile_display_name_v1 on public.player_profiles;
create trigger sync_active_profile_display_name_v1
 before insert or update of active_character_id,display_name on public.player_profiles
 for each row execute function public.sync_active_profile_display_name_v1();

-- Client updates must go through the validated, cooldown-limited RPC.
create or replace function public.protect_social_name_v1()
returns trigger language plpgsql set search_path='' as $$
begin
 if new.social_name is distinct from old.social_name
   and coalesce(current_setting('veldryn.social_name_write',true),'')<>'yes'
 then raise exception 'SOCIAL_NAME_RPC_REQUIRED';end if;
 return new;
end $$;
drop trigger if exists protect_social_name_v1 on public.player_profiles;
create trigger protect_social_name_v1 before update of social_name on public.player_profiles
 for each row execute function public.protect_social_name_v1();

create or replace function public.account_social_name_self_v1()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_profile public.player_profiles%rowtype;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 select * into v_profile from public.player_profiles where account_id=v_uid;
 if not found then raise exception 'PROFILE_NOT_FOUND';end if;
 return jsonb_build_object(
  'socialName',coalesce(v_profile.social_name,v_profile.display_name,'Adventurer'),
  'selected',v_profile.social_name is not null,
  'nextChangeAt',case when v_profile.social_name_changed_at is null then null
    else v_profile.social_name_changed_at+interval '30 days' end);
end $$;

create or replace function public.set_account_social_name_v1(p_name text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_name text:=btrim(coalesce(p_name,''));v_old public.player_profiles%rowtype;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if not public.safe_identity_name_v1(v_name,2,20) then raise exception 'INVALID_SOCIAL_NAME';end if;
 if exists(select 1 from public.chat_filter_terms t
   where t.enabled and t.action in ('block','mute_review') and char_length(t.normalized_term)>1
     and position(lower(t.normalized_term) in lower(v_name))>0)
 then raise exception 'SOCIAL_NAME_BLOCKED';end if;
 perform pg_advisory_xact_lock(hashtextextended('account-social-name-v1',0));
 select * into v_old from public.player_profiles where account_id=v_uid for update;
 if not found then raise exception 'PROFILE_NOT_FOUND';end if;
 if v_old.social_name is not null and lower(v_old.social_name)=lower(v_name) then
   return public.account_social_name_self_v1();
 end if;
 if v_old.social_name_changed_at is not null and v_old.social_name_changed_at+interval '30 days'>clock_timestamp()
 then raise exception 'SOCIAL_NAME_COOLDOWN';end if;
 if exists(select 1 from public.player_profiles p where p.account_id<>v_uid
   and lower(coalesce(nullif(p.social_name,''),nullif(p.display_name,'')))=lower(v_name))
 then raise exception 'SOCIAL_NAME_TAKEN';end if;
 perform set_config('veldryn.social_name_write','yes',true);
 update public.player_profiles
   set social_name=v_name,display_name=v_name,social_name_changed_at=clock_timestamp(),updated_at=clock_timestamp()
 where account_id=v_uid;
 return public.account_social_name_self_v1();
exception when unique_violation then raise exception 'SOCIAL_NAME_TAKEN';
end $$;

revoke all on function public.account_social_name_self_v1() from public,anon,authenticated;
grant execute on function public.account_social_name_self_v1() to authenticated;
revoke all on function public.set_account_social_name_v1(text) from public,anon,authenticated;
grant execute on function public.set_account_social_name_v1(text) to authenticated;

create table if not exists public.character_profile_showcases_v1 (
 character_id uuid primary key references public.characters(id) on delete cascade,
 account_id uuid not null references public.player_profiles(account_id) on delete cascade,
 favorite_skill_id text,
 favorite_companion_id text,
 achievement_showcase_ids text[] not null default '{}'::text[],
 collection_showcase jsonb not null default '[]'::jsonb,
 record_showcase_ids text[] not null default '{}'::text[],
 mastery_showcase_action_ids text[] not null default '{}'::text[],
 updated_at timestamptz not null default now(),
 constraint character_showcase_slot_limit_v1 check(
  cardinality(achievement_showcase_ids)<=3 and
  cardinality(record_showcase_ids)<=3 and
  cardinality(mastery_showcase_action_ids)<=3 and
  jsonb_typeof(collection_showcase)='array' and jsonb_array_length(collection_showcase)<=3)
);
create index if not exists character_profile_showcases_owner_v1
 on public.character_profile_showcases_v1(account_id);
alter table public.character_profile_showcases_v1 enable row level security;
revoke all on public.character_profile_showcases_v1 from public,anon,authenticated;

-- Migrate the currently showcased hero's preferences without copying them to their alts.
insert into public.character_profile_showcases_v1 (
 character_id,account_id,favorite_skill_id,favorite_companion_id,
 achievement_showcase_ids,collection_showcase,record_showcase_ids,mastery_showcase_action_ids)
select e.selected_character_id,e.account_id,e.favorite_skill_id,e.favorite_companion_id,
 coalesce(e.achievement_showcase_ids,'{}'::text[]),coalesce(e.collection_showcase,'[]'::jsonb),
 coalesce(e.record_showcase_ids,'{}'::text[]),coalesce(e.mastery_showcase_action_ids,'{}'::text[])
from public.player_profile_extensions e
join public.characters c on c.id=e.selected_character_id and c.account_id=e.account_id
where e.selected_character_id is not null
on conflict(character_id) do nothing;

-- Reuse the existing server-validated profile update RPC. Its post-update trigger mirrors
-- the validated showcased fields to that character only. Identity/privacy/bio stay account-wide.
create or replace function public.store_character_showcase_from_extension_v1()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.selected_character_id is null then return new;end if;
 if not exists(select 1 from public.characters c
     where c.id=new.selected_character_id and c.account_id=new.account_id) then
   raise exception 'CHARACTER_NOT_OWNED';end if;
 insert into public.character_profile_showcases_v1 (
  character_id,account_id,favorite_skill_id,favorite_companion_id,
  achievement_showcase_ids,collection_showcase,record_showcase_ids,mastery_showcase_action_ids,updated_at)
 values(new.selected_character_id,new.account_id,new.favorite_skill_id,new.favorite_companion_id,
   coalesce(new.achievement_showcase_ids,'{}'::text[]),coalesce(new.collection_showcase,'[]'::jsonb),
   coalesce(new.record_showcase_ids,'{}'::text[]),coalesce(new.mastery_showcase_action_ids,'{}'::text[]),now())
 on conflict(character_id) do update set
  favorite_skill_id=excluded.favorite_skill_id,
  favorite_companion_id=excluded.favorite_companion_id,
  achievement_showcase_ids=excluded.achievement_showcase_ids,
  collection_showcase=excluded.collection_showcase,
  record_showcase_ids=excluded.record_showcase_ids,
  mastery_showcase_action_ids=excluded.mastery_showcase_action_ids,updated_at=now()
 where public.character_profile_showcases_v1.account_id=excluded.account_id;
 return new;
end $$;
drop trigger if exists store_character_showcase_from_extension_v1 on public.player_profile_extensions;
create trigger store_character_showcase_from_extension_v1
 after insert or update of selected_character_id,favorite_skill_id,favorite_companion_id,
 achievement_showcase_ids,collection_showcase,record_showcase_ids,mastery_showcase_action_ids
 on public.player_profile_extensions
 for each row execute function public.store_character_showcase_from_extension_v1();

-- Private-to-owner lookup for switching heroes in the editor. Only owned characters are readable.
create or replace function public.character_showcase_self_v1(p_character_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_row public.character_profile_showcases_v1%rowtype;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if not exists(select 1 from public.characters c where c.id=p_character_id and c.account_id=v_uid)
 then raise exception 'CHARACTER_NOT_OWNED';end if;
 select * into v_row from public.character_profile_showcases_v1
   where character_id=p_character_id and account_id=v_uid;
 return jsonb_build_object('characterId',p_character_id,
  'favoriteSkillId',v_row.favorite_skill_id,
  'favoriteCompanionId',v_row.favorite_companion_id,
  'achievementShowcaseIds',coalesce(v_row.achievement_showcase_ids,'{}'::text[]),
  'collectionShowcase',coalesce(v_row.collection_showcase,'[]'::jsonb),
  'recordShowcaseIds',coalesce(v_row.record_showcase_ids,'{}'::text[]),
  'masteryShowcaseActionIds',coalesce(v_row.mastery_showcase_action_ids,'{}'::text[]));
end $$;
revoke all on function public.character_showcase_self_v1(uuid) from public,anon,authenticated;
grant execute on function public.character_showcase_self_v1(uuid) to authenticated;

comment on table public.character_profile_showcases_v1 is
 'Per-character display slots; social name, privacy, biography, and name style remain account-wide.';
