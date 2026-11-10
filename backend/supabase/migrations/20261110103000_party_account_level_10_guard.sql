-- Account-wide Parties unlock at current character Level 10.
-- Trigger applies to all entry paths, including invitations and old clients.
-- The separate per-Party minimum-level trigger remains unchanged.
create or replace function public.party_account_level_10_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
 v_highest_level integer;
begin
 if new.left_at is not null then return new; end if;
 -- Do not invalidate existing active memberships on harmless record updates.
 if tg_op = 'UPDATE'
    and old.left_at is null
    and old.account_id = new.account_id
    and old.character_id = new.character_id
    and old.party_id = new.party_id then
   return new;
 end if;
 select coalesce(max(c.level),0) into v_highest_level
 from public.characters c where c.account_id = new.account_id;
 if v_highest_level < 10 then raise exception 'party_level_10_required'; end if;
 return new;
end;
$function$;
drop trigger if exists party_account_level_10_guard on public.party_members;
create trigger party_account_level_10_guard
before insert or update of account_id, character_id, party_id, left_at
on public.party_members for each row
execute function public.party_account_level_10_guard();
-- Trigger-only definer function is not a public RPC.
revoke all on function public.party_account_level_10_guard() from public, anon, authenticated;
