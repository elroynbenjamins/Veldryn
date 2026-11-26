-- Read-only, authenticated availability preview for the existing Social Name editor.
-- The save RPC remains authoritative (including concurrency, cooldown and uniqueness).
-- Match set_account_social_name_v1 normalization, moderation, and legacy-name fallback.
create or replace function public.account_social_name_availability_v1(p_name text)
returns boolean
language plpgsql stable security definer
set search_path=''
as $$
declare
 v_uid uuid:=auth.uid();
 v_name text:=btrim(coalesce(p_name,''));
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if not exists(select 1 from public.player_profiles where account_id=v_uid)
 then raise exception 'PROFILE_NOT_FOUND';end if;
 if not public.safe_identity_name_v1(v_name,2,20)
 then raise exception 'INVALID_SOCIAL_NAME';end if;
 if exists(select 1 from public.chat_filter_terms t
   where t.enabled and t.action in ('block','mute_review')
   and char_length(t.normalized_term)>1
   and position(lower(t.normalized_term) in lower(v_name))>0)
 then raise exception 'SOCIAL_NAME_BLOCKED';end if;
 return not exists(select 1 from public.player_profiles p
   where p.account_id<>v_uid
   and lower(coalesce(nullif(p.social_name,''),nullif(p.display_name,'')))=lower(v_name));
end $$;

-- SECURITY DEFINER can read protected profiles, but never returns profiles or owners.
revoke all on function public.account_social_name_availability_v1(text)
 from public,anon,authenticated;
grant execute on function public.account_social_name_availability_v1(text)
 to authenticated;
