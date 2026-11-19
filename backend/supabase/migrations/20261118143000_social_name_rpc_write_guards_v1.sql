-- Harden account-wide Social Name against direct Data API writes, timestamp tampering,
-- profile deletion/recreation and client-initiated inserts bypassing the cooldown RPC.
create or replace function public.protect_social_name_v1()
returns trigger language plpgsql set search_path='' as $$
begin
 if coalesce(current_setting('veldryn.social_name_write',true),'')='yes' then
  return case when tg_op='DELETE' then old else new end;
 end if;
 if tg_op='INSERT' then
  if new.social_name is not null or new.social_name_changed_at is not null
  then raise exception 'SOCIAL_NAME_RPC_REQUIRED';end if;
  return new;
 end if;
 if tg_op='DELETE' then
  if session_user in ('authenticator','authenticated','anon') and
   current_user in ('authenticated','anon')
  then raise exception 'PROFILE_DIRECT_DELETE_NOT_ALLOWED';end if;
  return old;
 end if;
 if new.social_name is distinct from old.social_name
  or new.social_name_changed_at is distinct from old.social_name_changed_at
 then raise exception 'SOCIAL_NAME_RPC_REQUIRED';end if;
 return new;
end $$;

drop trigger if exists protect_social_name_v1 on public.player_profiles;
create trigger protect_social_name_v1
 before insert or update of social_name,social_name_changed_at
 on public.player_profiles for each row
 execute function public.protect_social_name_v1();

drop trigger if exists protect_social_profile_delete_v1 on public.player_profiles;
create trigger protect_social_profile_delete_v1
 before delete on public.player_profiles for each row
 execute function public.protect_social_name_v1();
