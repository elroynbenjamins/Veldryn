-- DISPOSABLE PG17 REVIEW ONLY, after V110/V111/V124.
-- No live migration or public reader/writer cutover. No shadow dual-write.
-- Report ambiguous legacy roles/leader pointers instead of silently choosing
-- a player's registered hero or altering the Party's role composition.
create function private.inspect_party_registration_cutover_v126(p_party uuid)
returns jsonb language plpgsql stable security invoker set search_path='' set timezone='UTC' as $$
declare p public.parties%rowtype;
 v_count integer; v_members jsonb; v_issues text[]:=array[]::text[];
begin
 select * into p from public.parties where id=p_party;
 if not found or p.status='disbanded' then raise exception 'party_cutover_v126_inactive';end if;
 select count(*),coalesce(jsonb_agg(jsonb_build_object('accountId',m.account_id,'characterId',m.character_id,
  'role',m.role,'joinedAt',m.joined_at) order by m.account_id),'[]'::jsonb)
 into v_count,v_members from public.party_members m where m.party_id=p_party and m.left_at is null;
 if v_count not between 1 and 4 then v_issues:=array_append(v_issues,'member_count');end if;
 if exists(select 1 from public.party_members m where m.party_id=p_party and m.left_at is null
  and exists(select 1 from public.party_members x where x.account_id=m.account_id and x.left_at is null
   and (x.party_id,x.character_id) is distinct from (m.party_id,m.character_id)))
 then v_issues:=array_append(v_issues,'duplicate_active_account');end if;
 if exists(select 1 from public.party_members m left join public.characters c
  on c.id=m.character_id and c.account_id=m.account_id
  where m.party_id=p_party and m.left_at is null
  and (c.id is null or private.party_registration_role_v111(c.class_id) is distinct from m.role))
 then v_issues:=array_append(v_issues,'registered_role_or_owner_mismatch');end if;
 if not exists(select 1 from public.party_members m where m.party_id=p_party and m.left_at is null
  and m.account_id=p.leader_account_id and m.character_id=p.leader_character_id)
 then v_issues:=array_append(v_issues,'leader_character_mismatch');end if;
 return jsonb_build_object('partyId',p_party,'leaderAccountId',p.leader_account_id,
  'leaderCharacterId',p.leader_character_id,'minimumLevel',p.minimum_level,
  'status',p.status,'members',v_members,'issues',to_jsonb(v_issues),'canSeed',cardinality(v_issues)=0,
  'releaseEnabled',false);
end
$$;
revoke all on function private.inspect_party_registration_cutover_v126(uuid) from public,anon,authenticated,service_role;

create table private.party_registration_cutover_fence_v126(
 party_id uuid primary key references private.party_registration_state_v110(party_id) on delete cascade,
 legacy_snapshot jsonb not null,
 seeded_at timestamptz not null default clock_timestamp()
);
alter table private.party_registration_cutover_fence_v126 enable row level security;
revoke all on private.party_registration_cutover_fence_v126 from public,anon,authenticated,service_role;

-- Freeze the old storage for seeded fixture Parties. Actual production
-- cutover must replace ALL old writers/readers first, not install this
-- trigger as an isolated production migration. Active-character sync
-- MUST stop writing registered roles before activating the new model.
create function private.reject_legacy_party_write_v126()
returns trigger language plpgsql security invoker set search_path='' as $$
declare old_party uuid;new_party uuid;
begin
 if tg_table_name='party_members' then
  if tg_op<>'INSERT' then old_party:=old.party_id;end if;
  if tg_op<>'DELETE' then new_party:=new.party_id;end if;
 else
  if tg_op<>'INSERT' then old_party:=old.id;end if;
  if tg_op<>'DELETE' then new_party:=new.id;end if;
 end if;
 if exists(select 1 from private.party_registration_cutover_fence_v126
  where party_id=old_party or party_id=new_party)
 then raise exception 'party_cutover_v126_legacy_write_fenced';end if;
 if tg_op='DELETE' then return old;end if;
 return new;
end
$$;
revoke all on function private.reject_legacy_party_write_v126() from public,anon,authenticated,service_role;
create trigger party_cutover_members_fence_v126 before insert or update or delete on public.party_members
 for each row execute function private.reject_legacy_party_write_v126();
create trigger party_cutover_parent_fence_v126 before update or delete on public.parties
 for each row execute function private.reject_legacy_party_write_v126();

-- Explicit, one-time fixture bootstrap. Lock legacy tables for this isolated
-- rehearsal to prove a coherent snapshot; not a production lock strategy.
-- Defaults stay activity_locked=true/qa_fixture_ready=false.
create function private.seed_party_registration_v126(p_party uuid)
returns jsonb language plpgsql security invoker set search_path='' set timezone='UTC' as $$
declare v_plan jsonb;v_count integer;
begin
 lock table public.parties, public.party_members, public.characters in share row exclusive mode;
 if exists(select 1 from private.party_registration_state_v110 where party_id=p_party)
 then raise exception 'party_cutover_v126_already_seeded';end if;
 v_plan:=private.inspect_party_registration_cutover_v126(p_party);
 if v_plan->>'canSeed' is distinct from 'true'
 then raise exception 'party_cutover_v126_ambiguous_snapshot';end if;
 insert into private.party_registration_state_v110(party_id,roster_revision,leader_account_id,minimum_level)
 select id,1,leader_account_id,minimum_level from public.parties where id=p_party;
 insert into private.party_registration_members_v110(party_id,account_id,character_id,role,joined_at)
 select party_id,account_id,character_id,role,joined_at from public.party_members where party_id=p_party and left_at is null;
 get diagnostics v_count=row_count;
 if v_count<>jsonb_array_length(v_plan->'members') then raise exception 'party_cutover_v126_seed_count';end if;
 insert into private.party_registration_cutover_fence_v126(party_id,legacy_snapshot) values(p_party,v_plan);
 return private.party_registration_snapshot_v110(p_party);
end
$$;
revoke all on function private.seed_party_registration_v126(uuid) from public,anon,authenticated,service_role;

-- Explicit new reader shape for seeded Parties, not a public compatibility
-- view replacing the table. No union of legacy and private active members.
create function private.party_active_members_v126(p_party uuid)
returns table(party_id uuid,character_id uuid,account_id uuid,role text,joined_at timestamptz,left_at timestamptz)
language plpgsql stable security invoker set search_path='' as $$
begin
 if not exists(select 1 from private.party_registration_cutover_fence_v126 f where f.party_id=p_party)
 then raise exception 'party_cutover_v126_not_seeded';end if;
 return query select m.party_id,m.character_id,m.account_id,m.role,m.joined_at,null::timestamptz
 from private.party_registration_members_v110 m where m.party_id=p_party order by m.joined_at,m.account_id;
end
$$;
revoke all on function private.party_active_members_v126(uuid) from public,anon,authenticated,service_role;
