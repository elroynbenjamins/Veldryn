-- Frostfall event emotes use the existing account-bound chat entitlement trigger.
create or replace function public.enforce_chat_guild_emote_ownership_v1()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_count integer;v_owned jsonb;v_id text;
begin
 select count(*)::integer into v_count
 from regexp_matches(coalesce(new.body,''),':[a-z0-9_]+:','g');
 if v_count>2 then raise exception 'CHAT_EMOTE_LIMIT';end if;

 select coalesce(s.state#>'{account,unlockedEmoteIds}','[]'::jsonb)
 into v_owned from public.online_game_states s where s.account_id=new.account_id;
 if v_owned is null or jsonb_typeof(v_owned)<>'array' then v_owned:='[]'::jsonb;end if;

 for v_id in select m.value[1]
  from regexp_matches(coalesce(new.body,''),':([a-z0-9_]+):','g') as m(value)
 loop
  if v_id ~ '^(male|female)_0[1-5]$' then continue;end if;
  -- Enforce account ownership for authored Frostfall reactions as well.
  -- Unknown colon-marked words are ordinary text, never a free emote.
  if v_id ~ '^(male|female)_[0-9]{2}$'
    or v_id ~ '^pet_set_[ab]_[0-9]{2}$'
    or v_id in ('emote_snowbell_ring','emote_frostfall_wave','emote_aurora_chime','emote_cozy_hearth','emote_snowball_attack') then
   if not (v_owned ? v_id) then raise exception 'CHAT_EMOTE_LOCKED';end if;
  end if;
 end loop;
 return new;
end $$;
revoke all on function public.enforce_chat_guild_emote_ownership_v1()
 from public,anon,authenticated;
