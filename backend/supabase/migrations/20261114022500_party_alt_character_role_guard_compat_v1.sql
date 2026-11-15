-- Role-only updates from a server-confirmed account character switch must
-- not be treated as a new Party join by the later Party composition guard.
-- No effect on databases that do not have this optional guard yet.
do $patch$
declare
  v_target regprocedure := to_regprocedure('public.party_role_composition_guard_v1()');
  v_def text;
  v_needle text := '   v_excluded_character := old.character_id;';
  v_replacement text;
begin
  if v_target is not null then
    v_def:=pg_get_functiondef(v_target);
    if length(v_def)-length(replace(v_def,v_needle,'')) <> length(v_needle) then
      raise exception 'party_alt_character_role_guard_definition_drift';
    end if;
    v_replacement := $body$
   -- A role-only update is not an account re-join: use the owned current
   -- fighter's role and leave historical membership/attempt IDs untouched.
   if old.left_at is null and new.left_at is null
      and old.account_id = new.account_id
      and old.character_id = new.character_id
      and old.party_id = new.party_id then
     select upper(c.class_id::text) into v_class
       from public.player_profiles pp
       join public.characters c on c.id=pp.active_character_id
                                  and c.account_id=pp.account_id
      where pp.account_id=new.account_id;
     if v_class is null then raise exception 'party_active_character_not_owned'; end if;
     v_expected_role := case
       when v_class in ('IRONWARDEN','BASTION','DREADGUARD') then 'tank'
       when v_class in ('DAWNKEEPER','STONECALLER') then 'support'
       else 'damage' end;
     if new.role is distinct from v_expected_role then
       raise exception 'party_role_mismatch';
     end if;
     return new;
   end if;
   v_excluded_character := old.character_id;
$body$;
    execute replace(v_def,v_needle,v_replacement);
  end if;
end
$patch$;
