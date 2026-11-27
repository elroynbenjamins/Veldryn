-- New independent fixture Party; existing V111-V125 tests run first.
do $test$
declare
 party uuid:=gen_random_uuid(); a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();
 atank uuid:=gen_random_uuid();adamage uuid:=gen_random_uuid();bdamage uuid:=gen_random_uuid();btank uuid:=gen_random_uuid();
 proposal uuid:=gen_random_uuid(); t timestamptz; plan jsonb; seeded jsonb; after_swap jsonb;
 legacy_rows jsonb;
begin
 insert into auth.users values(a),(b);
 insert into public.characters values(atank,a,'IRONWARDEN',25),(adamage,a,'WAYFINDER',25),
 (bdamage,b,'RAVAGER',25),(btank,b,'BASTION',25);
 insert into public.parties(id,status,leader_account_id,leader_character_id,minimum_level)
 values(party,'active',a,adamage,10);
 insert into public.party_members values(party,atank,a,'damage','2026-11-01 00:00:00+00',null),
 (party,adamage,a,'damage','2026-10-01 00:00:00+00','2026-10-02 00:00:00+00'),
 (party,bdamage,b,'damage','2026-11-02 00:00:00+00',null);
 plan:=private.inspect_party_registration_cutover_v126(party);
 if plan->>'canSeed'<>'false' or not (plan->'issues' ? 'registered_role_or_owner_mismatch')
 or not (plan->'issues' ? 'leader_character_mismatch') then raise exception 'ambiguous legacy snapshot not reported';end if;
 begin
  perform private.seed_party_registration_v126(party);
  raise exception 'expected ambiguous denial';
 exception when raise_exception then
  if sqlerrm<>'party_cutover_v126_ambiguous_snapshot' then raise;end if;
 end;
 if exists(select 1 from private.party_registration_state_v110 s where s.party_id=party)
 then raise exception 'failed bootstrap leaked state';end if;
 -- Explicit fixture correction before bootstrap; never auto-correct real data.
 update public.party_members m set role='tank' where m.party_id=party and m.character_id=atank;
 update public.parties set leader_character_id=atank where id=party;
 select jsonb_agg(to_jsonb(m) order by character_id) into legacy_rows from public.party_members m where m.party_id=party;
 seeded:=private.seed_party_registration_v126(party);
 if jsonb_array_length(seeded->'members')<>2 or seeded->>'rosterRevision'<>'1'
 or not exists(select 1 from private.party_registration_state_v110 s where s.party_id=party and s.activity_locked and not s.qa_fixture_ready)
 then raise exception 'bad seed or unsafe defaults';end if;
 begin
  perform private.seed_party_registration_v126(party);
  raise exception 'expected duplicate seed denial';
 exception when raise_exception then
  if sqlerrm<>'party_cutover_v126_already_seeded' then raise;end if;
 end;
 -- Rehearse the legacy active-character trigger's UPDATE and the leader
 -- pointer UPDATE separately. Neither may alter the old registered rows.
 begin
  update public.party_members m set role='damage' where m.party_id=party and m.account_id=a and m.left_at is null;
  raise exception 'expected legacy write fence';
 exception when raise_exception then
  if sqlerrm<>'party_cutover_v126_legacy_write_fenced' then raise;end if;
 end;
 begin
  update public.parties set leader_character_id=adamage where id=party;
  raise exception 'expected legacy pointer fence';
 exception when raise_exception then
  if sqlerrm<>'party_cutover_v126_legacy_write_fenced' then raise;end if;
 end;
 -- Explicit isolated fixture enable only; not a production release flag.
 update private.party_registration_state_v110 s set qa_fixture_ready=true,activity_locked=false where s.party_id=party;
 t:=clock_timestamp();
 insert into private.party_role_swap_proposals_v108
 (id,party_id,proposer_account_id,roster_revision,original_roster,original_roster_digest,created_at,expires_at)
 values(proposal,party,a,1,seeded,encode(sha256(convert_to(seeded::text,'UTF8')),'hex'),t,t+interval '5 minutes');
 insert into private.party_role_swap_participants_v108(proposal_id,account_id,from_character_id,to_character_id,from_role,to_role)
 values(proposal,a,atank,adamage,'tank','damage'),(proposal,b,bdamage,btank,'damage','tank');
 if private.respond_party_registration_swap_v111(party,proposal,a,'accept')->>'state'<>'pending'
 then raise exception 'partial response invalid';end if;
 if private.respond_party_registration_swap_v111(party,proposal,b,'accept')->>'state'<>'completed'
 then raise exception 'swap failed';end if;
 after_swap:=private.party_registration_snapshot_v110(party);
 if after_swap->>'rosterRevision'<>'2' then raise exception 'revision not advanced';end if;
 if (select count(*) from private.party_active_members_v126(party))<>2
 or not exists(select 1 from private.party_active_members_v126(party) m where m.account_id=a and m.character_id=adamage and m.role='damage' and m.joined_at='2026-11-01 00:00:00+00')
 or not exists(select 1 from private.party_active_members_v126(party) m where m.account_id=b and m.character_id=btank and m.role='tank')
 then raise exception 'compatibility reader did not use private active roster';end if;
 if (select jsonb_agg(to_jsonb(m) order by character_id) from public.party_members m where m.party_id=party) is distinct from legacy_rows
 then raise exception 'legacy history altered';end if;
 raise notice 'PARTY_REGISTRATION_V126_COMPATIBILITY_FENCE_PASS';
end
$test$;
