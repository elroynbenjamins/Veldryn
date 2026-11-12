-- Veldryn — persistent Party composition enforcement.
-- Four-member parties use the same 1 Tank / 2 Damage / 1 Support roster
-- as live dungeons. No existing members are removed or rewritten.
-- Every insertion path (RPC join, invitation acceptance, service job,
-- old client) passes through this server-side trigger.

create or replace function public.party_role_composition_guard_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
 v_class text;
 v_expected_role text;
 v_existing_tank integer;
 v_existing_damage integer;
 v_existing_support integer;
 v_existing_total integer;
 v_excluded_character uuid;
begin
 if new.left_at is not null then return new; end if;

 -- An existing active row's non-composition edits never break an older
 -- nonstandard roster; leadership changes, chat and weekly contracts survive.
 if tg_op = 'UPDATE' then
   if old.left_at is null
      and old.account_id = new.account_id
      and old.character_id = new.character_id
      and old.party_id = new.party_id
      and old.role = new.role then
      return new;
   end if;
   v_excluded_character := old.character_id;
 end if;

 select upper(c.class_id::text) into v_class
 from public.characters c
 where c.id = new.character_id and c.account_id = new.account_id;
 if v_class is null then raise exception 'party_character_not_owned'; end if;

 v_expected_role := case
   when v_class in ('IRONWARDEN','BASTION','DREADGUARD') then 'tank'
   when v_class in ('DAWNKEEPER','STONECALLER') then 'support'
   else 'damage' end;
 if new.role is distinct from v_expected_role then
   raise exception 'party_role_mismatch';
 end if;

 -- Serializes concurrent direct joins and invitation accepts with a shared
 -- lock. Count canonical character classes, not client-supplied role strings.
 perform 1 from public.parties p where p.id = new.party_id for update;
 if not found then raise exception 'party_not_found'; end if;

 select count(*)::integer,
   count(*) filter (where upper(c.class_id::text) in ('IRONWARDEN','BASTION','DREADGUARD'))::integer,
   count(*) filter (where upper(c.class_id::text) not in ('IRONWARDEN','BASTION','DREADGUARD','DAWNKEEPER','STONECALLER'))::integer,
   count(*) filter (where upper(c.class_id::text) in ('DAWNKEEPER','STONECALLER'))::integer
 into v_existing_total,v_existing_tank,v_existing_damage,v_existing_support
 from public.party_members m
 join public.characters c on c.id = m.character_id
 where m.party_id = new.party_id and m.left_at is null
   and (v_excluded_character is null or m.character_id <> v_excluded_character);

 if v_existing_total >= 4 then raise exception 'party_full'; end if;
 if v_existing_tank > 1 or v_existing_damage > 2 or v_existing_support > 1 then
   raise exception 'party_legacy_role_overflow';
 end if;
 if (v_expected_role = 'tank' and v_existing_tank >= 1)
    or (v_expected_role = 'damage' and v_existing_damage >= 2)
    or (v_expected_role = 'support' and v_existing_support >= 1) then
   raise exception 'party_role_full';
 end if;
 return new;
end;
$function$;

drop trigger if exists party_role_composition_guard_v1 on public.party_members;
create trigger party_role_composition_guard_v1
before insert or update of account_id,character_id,party_id,role,left_at
on public.party_members for each row
execute function public.party_role_composition_guard_v1();

-- Trigger function is not callable as an external authenticated RPC.
revoke all on function public.party_role_composition_guard_v1()
from public,anon,authenticated;
