-- Persistent Party preferences are social compatibility, not dungeon class restrictions.
-- Existing Parties remain unrestricted by default; the new creation UI defaults to Active.
alter table public.parties
  add column if not exists activity_level text not null default 'casual',
  add column if not exists language text not null default 'any',
  add column if not exists minimum_level integer not null default 0;

alter table public.parties drop constraint if exists parties_activity_level_valid_v1;
alter table public.parties add constraint parties_activity_level_valid_v1
  check (activity_level in ('casual','active','tryhard'));
alter table public.parties drop constraint if exists parties_language_valid_v1;
alter table public.parties add constraint parties_language_valid_v1
  check (language in ('any','en','nl','de','fr','es'));
alter table public.parties drop constraint if exists parties_minimum_level_valid_v1;
alter table public.parties add constraint parties_minimum_level_valid_v1
  check (minimum_level between 0 and 2000);

-- All joins, including old app versions and direct invitations, enforce a selected
-- character's minimum level. Language/activity are preferences and never hard gates.
create or replace function public.party_minimum_level_guard_v1()
returns trigger language plpgsql security definer set search_path = '' as $function$
declare v_required integer; v_level integer;
begin
 if new.left_at is not null then return new; end if;
 select coalesce(p.minimum_level,0) into v_required
 from public.parties p where p.id=new.party_id;
 if v_required is null then raise exception 'party_not_found'; end if;
 if v_required=0 then return new; end if;
 select c.level into v_level from public.characters c
 where c.id=new.character_id and c.account_id=new.account_id;
 if v_level is null then raise exception 'character_not_owned'; end if;
 if v_level<v_required then raise exception 'party_minimum_level_not_met'; end if;
 return new;
end;
$function$;
drop trigger if exists party_minimum_level_guard_v1 on public.party_members;
create trigger party_minimum_level_guard_v1 before insert or update of character_id,account_id,party_id,left_at
 on public.party_members for each row execute function public.party_minimum_level_guard_v1();

-- Atomic initial setup. The old role field remains for dungeon/contract compatibility;
-- it is derived from the owned character instead of being a user-facing Party gate.
create or replace function public.create_party_with_preferences_v1(
 p_character_id uuid,p_activity_level text,p_language text,p_minimum_level integer,p_idempotency_key text
) returns uuid language plpgsql security definer set search_path = '' as $function$
declare v_uid uuid:=auth.uid();v_class text;v_role text;v_party uuid;
begin
 if v_uid is null then raise exception 'authentication_required'; end if;
 if p_activity_level is null or p_activity_level not in ('casual','active','tryhard') then raise exception 'invalid_party_activity'; end if;
 if p_language is null or p_language not in ('any','en','nl','de','fr','es') then raise exception 'invalid_party_language'; end if;
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

-- Existing leaders can edit preferences without disbanding their Party.
create or replace function public.update_party_preferences_v1(
 p_party_id uuid,p_activity_level text,p_language text,p_minimum_level integer
) returns jsonb language plpgsql security definer set search_path = '' as $function$
declare v_uid uuid:=auth.uid();v_party public.parties;
begin
 if v_uid is null then raise exception 'authentication_required'; end if;
 if p_activity_level is null or p_activity_level not in ('casual','active','tryhard') then raise exception 'invalid_party_activity'; end if;
 if p_language is null or p_language not in ('any','en','nl','de','fr','es') then raise exception 'invalid_party_language'; end if;
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

-- Safe extension of the existing social snapshot: contracts/member logic stays in v16.
create or replace function public.party_social_state_v18()
returns jsonb language plpgsql security definer set search_path = '' as $function$
declare v_uid uuid:=auth.uid();v_state jsonb;v_party public.parties;
begin
 if v_uid is null then raise exception 'authentication_required'; end if;
 v_state:=public.party_social_state_v16();
 if v_state->'party'='null'::jsonb then return v_state; end if;
 select p.* into v_party from public.parties p
 where p.id=(v_state->'party'->>'id')::uuid
 and exists(select 1 from public.party_members m where m.party_id=p.id and m.account_id=v_uid and m.left_at is null);
 if not found then return v_state; end if;
 return jsonb_set(v_state,'{party}',(v_state->'party')||jsonb_build_object(
  'activityLevel',v_party.activity_level,'language',v_party.language,
  'minimumLevel',v_party.minimum_level));
end;
$function$;

revoke all on function public.party_minimum_level_guard_v1() from public,anon,authenticated;
revoke all on function public.create_party_with_preferences_v1(uuid,text,text,integer,text) from public,anon;
revoke all on function public.update_party_preferences_v1(uuid,text,text,integer) from public,anon;
revoke all on function public.party_social_state_v18() from public,anon;
grant execute on function public.create_party_with_preferences_v1(uuid,text,text,integer,text) to authenticated;
grant execute on function public.update_party_preferences_v1(uuid,text,text,integer) to authenticated;
grant execute on function public.party_social_state_v18() to authenticated;
