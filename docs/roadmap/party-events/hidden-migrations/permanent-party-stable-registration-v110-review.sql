-- DISPOSABLE PG17 REVIEW ONLY, after V108. No live reader/writer cutover.
-- public.party_members and its historical rows remain untouched.
create table private.party_registration_state_v110 (
 party_id uuid primary key references public.parties(id) on delete cascade,
 roster_revision bigint not null check(roster_revision between 1 and 9007199254740990),
 leader_account_id uuid not null references auth.users(id) on delete cascade,
 minimum_level integer not null check(minimum_level between 0 and 2000),
 activity_locked boolean not null default true,
 -- Until every existing membership mutation/reader is reconciled, only
 -- disposable fixtures may mark this ready. NOT a production release flag.
 qa_fixture_ready boolean not null default false
);
create table private.party_registration_members_v110 (
 registration_id uuid primary key default gen_random_uuid(),
 party_id uuid not null references private.party_registration_state_v110(party_id) on delete cascade,
 account_id uuid not null references auth.users(id) on delete cascade,
 character_id uuid not null,
 role text not null check(role in ('tank','damage','support')),
 joined_at timestamptz not null,
 unique(party_id,account_id),
 unique(account_id),
 unique(party_id,character_id),
 foreign key(character_id,account_id) references public.characters(id,account_id)
);
create table private.party_registration_exchange_history_v110 (
 proposal_id uuid not null references private.party_role_swap_proposals_v108(id) on delete cascade,
 registration_id uuid not null,
 account_id uuid not null references auth.users(id) on delete cascade,
 party_id uuid not null references private.party_registration_state_v110(party_id) on delete cascade,
 from_character_id uuid not null,
 to_character_id uuid not null,
 from_role text not null check(from_role in ('tank','damage','support')),
 to_role text not null check(to_role in ('tank','damage','support')),
 original_joined_at timestamptz not null,
 roster_revision bigint not null check(roster_revision>1),
 changed_at timestamptz not null,
 primary key(proposal_id,account_id),
 check(from_character_id<>to_character_id and from_role<>to_role)
);
alter table private.party_registration_state_v110 enable row level security;
alter table private.party_registration_members_v110 enable row level security;
alter table private.party_registration_exchange_history_v110 enable row level security;
revoke all on private.party_registration_state_v110,private.party_registration_members_v110,
 private.party_registration_exchange_history_v110 from public,anon,authenticated,service_role;

-- SQL-specific canonical JSONB snapshot. Do not equate this digest format
-- with the TypeScript V109 snapshot digest without explicit reconciliation.
create function private.party_registration_snapshot_v110(p_party uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object(
 'partyId',s.party_id,'rosterRevision',s.roster_revision,'leaderAccountId',s.leader_account_id,
 'minimumLevel',s.minimum_level,
 'members',coalesce((select jsonb_agg(jsonb_build_object(
 'registrationId',m.registration_id,'accountId',m.account_id,'characterId',m.character_id,
 'role',m.role,'joinedAt',m.joined_at) order by m.account_id)
 from private.party_registration_members_v110 m where m.party_id=s.party_id),'[]'::jsonb))
 from private.party_registration_state_v110 s where s.party_id=p_party
$$;
revoke all on function private.party_registration_snapshot_v110(uuid) from public,anon,authenticated,service_role;
