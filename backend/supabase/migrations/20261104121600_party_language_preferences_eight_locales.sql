-- Expand persistent Party communication preferences to every selectable interface language.
-- Preferences are discovery-only and NEVER affect Party membership or dungeon matchmaking.
-- Keep the existing constraints and signatures. This migration does not change Party roles.
alter table public.parties drop constraint if exists parties_language_valid_v1;
alter table public.parties add constraint parties_language_valid_v1
  check (language in ('any','en','nl','de','fr','es','it','ru','tr'));

-- Preserve all existing idempotency, ownership, and level validation from v1.
create or replace function public.create_party_with_preferences_v1(
 p_character_id uuid,p_activity_level text,p_language text,p_minimum_level integer,p_idempotency_key text
) returns uuid language plpgsql security definer set search_path = '' as $function$
declare v_uid uuid:=auth.uid();v_class text;v_role text;v_party uuid;
begin
 if v_uid is null then raise exception 'authentication_required'; end if;
 if p_activity_level is null or p_activity_level not in ('casual','active','tryhard') then raise exception 'invalid_party_activity'; end if;
 if p_language is null or p_language not in ('any','en','nl','de','fr','es','it','ru','tr') then raise exception 'invalid_party_language'; end if;
 if p_minimum_level is null or p_minimum_level not between 0 and 2000 then raise exception 'invalid_party_minimum_level'; end if;
 select c.class_id into v_class from public.characters c where c.id=p_character_id and c.account_id=v_uid;
 if v_class is null then raise exception 'character_not_owned'; end if;
 v_role:=case when v_class in ('IRONWARDEN','BASTION','DREADGUARD') then 'tank'
   when v_class in ('DAWNKEEPER','STONECALLER') then 'support' else 'damage' end;
 v_party:=public.create_persistent_party_v16(p_character_id,v_role,'mixed',p_idempotency_key);
 update public.parties set activity_level=p_activity_level,language=p_language,
  minimum_level=p_minimum_level,updated_at=now()
 where id=v_party and leader_account_id=v_uid and status<>'disbanded';
 if not found then raise exception 'party_leader_required'; end if;
 return v_party;
end;
$function$;

create or replace function public.update_party_preferences_v1(
 p_party_id uuid,p_activity_level text,p_language text,p_minimum_level integer
) returns jsonb language plpgsql security definer set search_path = '' as $function$
declare v_uid uuid:=auth.uid();v_party public.parties;
begin
 if v_uid is null then raise exception 'authentication_required'; end if;
 if p_activity_level is null or p_activity_level not in ('casual','active','tryhard') then raise exception 'invalid_party_activity'; end if;
 if p_language is null or p_language not in ('any','en','nl','de','fr','es','it','ru','tr') then raise exception 'invalid_party_language'; end if;
 if p_minimum_level is null or p_minimum_level not between 0 and 2000 then raise exception 'invalid_party_minimum_level'; end if;
 update public.parties p set activity_level=p_activity_level,language=p_language,
  minimum_level=p_minimum_level,updated_at=now()
 where p.id=p_party_id and p.leader_account_id=v_uid and p.status<>'disbanded'
 returning * into v_party;
 if not found then raise exception 'party_leader_required'; end if;
 return jsonb_build_object('activityLevel',v_party.activity_level,
  'language',v_party.language,'minimumLevel',v_party.minimum_level);
end;
$function$;

-- Function grants from v1 remain in place across CREATE OR REPLACE.
