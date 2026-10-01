-- Independent of the existing identity-name safety trigger, so either migration
-- order retains the stricter display limit. No existing guild names are rewritten.
create or replace function public.enforce_guild_name_display_limit()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
 if tg_op = 'UPDATE' and new.name is not distinct from old.name then
  return new;
 end if;
 if char_length(new.name) > 21 then
  raise exception 'invalid_guild_name' using errcode = '23514', detail = 'Guild names must be at most 21 characters, including spaces.';
 end if;
 return new;
end;
$$;
revoke all on function public.enforce_guild_name_display_limit() from public, anon, authenticated;
create trigger guild_name_display_limit
before insert or update of name on public.guilds
for each row execute function public.enforce_guild_name_display_limit();
