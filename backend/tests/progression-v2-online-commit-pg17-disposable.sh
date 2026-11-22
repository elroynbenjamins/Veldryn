#!/usr/bin/env bash
# ONLY after progression-v2-pg17-disposable.sh on same throwaway PG17.
# Never run against a Supabase staging or production database.
set -Eeuo pipefail
if [[ "$PGHOST" != "127.0.0.1" || "$PGDATABASE" != "progression_v2_disposable" ||
 "$PGUSER" != "postgres" || "$PGPORT" != "5432" ]];then
 echo "Refusing unsafe PG17 target" >&2;exit 3
fi
pg(){ psql -X -w -v ON_ERROR_STOP=1 -q "$@"; }
A="11111111-1111-4111-8111-111111111111"
B="22222222-2222-4222-8222-222222222222"
pg <<'SQL'
alter table public.characters add column account_id uuid;
update public.characters set account_id=id;
create table public.online_game_states (
 account_id uuid primary key,character_id uuid not null references public.characters(id),
 revision bigint not null default 0
);
create table public.server_action_receipts (
 account_id uuid not null,action text not null,idempotency_key text not null,
 request_hash text not null,game_revision bigint not null,character_id uuid not null,
 primary key(account_id,action,idempotency_key)
);
insert into public.online_game_states(account_id,character_id)
 values ('11111111-1111-4111-8111-111111111111',
 '11111111-1111-4111-8111-111111111111');
update private.character_career_progress_v2
 set activated_at=clock_timestamp()-interval '1 day'
 where character_id='11111111-1111-4111-8111-111111111111';
SQL
# An intentionally SECURITY-INCOMPLETE disposable unit-test function;
# the actual gateway must supply server-verified evidence and authentication.
pg <<'SQL'
create function private.disposable_online_career_commit(
 p_account uuid,p_character uuid,p_request text,p_hash text,p_version bigint,
 p_source text,p_kind text,p_skill text,p_elapsed int,p_work int,p_xp bigint
) returns text language plpgsql security invoker
set search_path=pg_catalog,private as $body$
declare rev bigint;previous_hash text;cutover timestamptz;proof_time timestamptz;
begin
 if not exists(select 1 from public.characters
   where id=p_character and account_id=p_account) then
  raise exception 'character_owner_mismatch';end if;
 select revision into rev from public.online_game_states
  where account_id=p_account and character_id=p_character for update;
 if not found then raise exception 'unknown_account';end if;
 select request_hash into previous_hash from public.server_action_receipts
  where account_id=p_account and action='online_game_v1' and idempotency_key=p_request;
 if found then
  if previous_hash is distinct from p_hash then raise exception 'receipt_hash_collision';end if;
  return 'replayed';
 end if;
 if rev<>p_version then raise exception 'stale_revision';end if;
 select activated_at into cutover from private.character_career_progress_v2
  where character_id=p_character for update;
 if not found then raise exception 'career_not_activated';end if;
 update public.online_game_states set revision=revision+1 where account_id=p_account;
 insert into public.server_action_receipts
  (account_id,action,idempotency_key,request_hash,game_revision,character_id)
  values(p_account,'online_game_v1',p_request,p_hash,rev+1,p_character);
 insert into private.online_career_reward_sources_v2
  (source_kind,source_id,account_id,request_id,request_hash,segment_index,
   expected_game_revision,character_id,profession_id,claimed_elapsed_seconds,
   base_effort_seconds,difficulty_basis_points)
  values(p_kind,p_source,p_account,p_request,p_hash,0,rev+1,p_character,
   p_skill,p_elapsed,p_work,10000);
 select completed_at into proof_time from private.online_career_reward_sources_v2
  where source_kind=p_kind and source_id=p_source;
 if proof_time<=cutover then raise exception 'pre_activation_source';end if;
 insert into private.character_career_awards_v2
  (source_kind,source_id,character_id,overall_character_xp_delta,profession_id,fingerprint)
  values(p_kind,p_source,p_character,p_xp,p_skill,'verified-disposable-source');
 update private.character_career_progress_v2
  set overall_character_xp=overall_character_xp+p_xp where character_id=p_character;
 return 'applied';
end
$body$;
revoke all on function private.disposable_online_career_commit(
 uuid,uuid,text,text,bigint,text,text,text,int,int,bigint)
from public,anon,authenticated;
SQL

OUT="$(mktemp)"
trap 'rm -f "$OUT"' EXIT
PIDS=""
for ((i=0;i<16;i++));do
 (psql -X -w -v ON_ERROR_STOP=1 -tAqc \
 "select private.disposable_online_career_commit('$A'::uuid,'$A'::uuid,
 'online000001',repeat('a',64),0,repeat('9',64),'combat_reward',
 null,0,240,120);" >>"$OUT")&
 PIDS="$PIDS $!"
done
for pid in $PIDS;do wait "$pid";done
applied="$(grep -cx 'applied' "$OUT" || true)"
replayed="$(grep -cx 'replayed' "$OUT" || true)"
[[ "$applied" == 1 && "$replayed" == 15 ]] || {
 echo "Online state race failed applied=$applied replayed=$replayed";cat "$OUT";exit 4
}
pg <<'SQL'
do $check$
begin
 if (select revision from public.online_game_states)<>1
 or (select count(*) from public.server_action_receipts)<>1
 or (select count(*) from private.online_career_reward_sources_v2
     where source_id=repeat('9',64))<>1
 or (select count(*) from private.character_career_awards_v2
     where source_id=repeat('9',64))<>1
 or (select overall_character_xp from private.character_career_progress_v2
    where character_id='11111111-1111-4111-8111-111111111111')<>240
 then raise exception 'online_game_commit_not_atomic';end if;
end $check$;
SQL
ERR="$(psql -X -w -v ON_ERROR_STOP=1 -tAqc \
 "select private.disposable_online_career_commit('$A'::uuid,'$A'::uuid,
 'online000001',repeat('c',64),0,repeat('9',64),'combat_reward',
 null,0,240,120);" 2>&1 || true)"
grep -q 'receipt_hash_collision' <<<"$ERR" || { echo 'Hash conflict not rejected';exit 5; }
ERR="$(psql -X -w -v ON_ERROR_STOP=1 -tAqc \
 "select private.disposable_online_career_commit('$A'::uuid,'$A'::uuid,
 'online000002',repeat('c',64),0,repeat('7',64),'combat_reward',
 null,0,240,120);" 2>&1 || true)"
grep -q 'stale_revision' <<<"$ERR" || { echo 'Stale state not rejected';exit 6; }
ERR="$(psql -X -w -v ON_ERROR_STOP=1 -tAqc \
 "select private.disposable_online_career_commit('$A'::uuid,'$B'::uuid,
 'online000003',repeat('c',64),1,repeat('7',64),'craft_claim',
 'smithing',0,300,150);" 2>&1 || true)"
grep -q 'character_owner_mismatch' <<<"$ERR" || { echo 'Alt ownership not checked';exit 7; }

# Inject failure after revision, action receipt, source and award insert.
pg <<'SQL'
create function private.disposable_fail_career_bank()
returns trigger language plpgsql as $body$
begin
 if new.overall_character_xp>500 then raise exception 'bank_write_failed';end if;
 return new;
end $body$;
create trigger disposable_fail_career_bank before update
on private.character_career_progress_v2
for each row execute function private.disposable_fail_career_bank();
SQL
ERR="$(psql -X -w -v ON_ERROR_STOP=1 -tAqc \
 "select private.disposable_online_career_commit('$A'::uuid,'$A'::uuid,
 'online000004',repeat('d',64),1,repeat('8',64),'craft_claim',
 'smithing',0,300,300);" 2>&1 || true)"
grep -q 'bank_write_failed' <<<"$ERR" || { echo 'Injected failure missing';exit 8; }
pg <<'SQL'
do $check$
begin
 if (select revision from public.online_game_states)<>1
 or (select count(*) from public.server_action_receipts)<>1
 or exists(select 1 from private.online_career_reward_sources_v2
   where source_id=repeat('8',64))
 or exists(select 1 from private.character_career_awards_v2
   where source_id=repeat('8',64))
 or (select overall_character_xp from private.character_career_progress_v2
   where character_id='11111111-1111-4111-8111-111111111111')<>240
 then raise exception 'ghost_state_or_xp_after_failure';end if;
end $check$;
SQL
echo "PASS: disposable PG17 state revision, action receipt, source proof, XP atomic; 16-way replay and rollback"

# Third 2.0 review pass: an actual mixed claim carries MORE THAN ONE
# source-proof segment under ONE game action receipt and revision commit.
# This is still a disposable PG17 fixture, not a production gateway adapter.
pg <<'SQL'
begin;
update public.online_game_states
 set revision=revision+1
 where account_id='11111111-1111-4111-8111-111111111111' and revision=1;
insert into public.server_action_receipts
 (account_id,action,idempotency_key,request_hash,game_revision,character_id)
 values ('11111111-1111-4111-8111-111111111111','online_game_v1',
 'online000005',repeat('a',64),2,'11111111-1111-4111-8111-111111111111');
insert into private.online_career_reward_sources_v2
 (source_kind,source_id,account_id,request_id,request_hash,segment_index,
  expected_game_revision,character_id,profession_id,claimed_elapsed_seconds,
  base_effort_seconds,difficulty_basis_points)
 values
 ('gathering_claim',repeat('5',64),'11111111-1111-4111-8111-111111111111',
 'online000005',repeat('a',64),0,2,'11111111-1111-4111-8111-111111111111',
 'mining',120,120,10000),
 ('combat_reward',repeat('6',64),'11111111-1111-4111-8111-111111111111',
 'online000005',repeat('a',64),1,2,'11111111-1111-4111-8111-111111111111',
 null,0,120,10000);
insert into private.character_career_awards_v2
 (source_kind,source_id,character_id,overall_character_xp_delta,profession_id,fingerprint)
 values
 ('gathering_claim',repeat('5',64),'11111111-1111-4111-8111-111111111111',
 60,'mining','mixed-gathering-verified-disposable'),
 ('combat_reward',repeat('6',64),'11111111-1111-4111-8111-111111111111',
 60,null,'mixed-combat-verified-disposable');
update private.character_career_progress_v2
 set overall_character_xp=overall_character_xp+120
 where character_id='11111111-1111-4111-8111-111111111111';
commit;
do $check$
begin
 if (select revision from public.online_game_states
     where account_id='11111111-1111-4111-8111-111111111111')<>2
 or (select count(*) from public.server_action_receipts
     where idempotency_key='online000005' and game_revision=2)<>1
 or (select count(*) from private.online_career_reward_sources_v2
     where request_id='online000005')<>2
 or (select count(*) from private.character_career_awards_v2
     where source_id in (repeat('5',64),repeat('6',64)))<>2
 or (select overall_character_xp from private.character_career_progress_v2
     where character_id='11111111-1111-4111-8111-111111111111')<>360
 then raise exception 'mixed_claim_not_atomic';end if;
end $check$;
SQL

# A failed SECOND proof must roll back the first proof, the account revision
# and original action receipt. PostgreSQL exception block = subtransaction.
pg <<'SQL'
do $check$
declare collided boolean:=false;
begin
 begin
  update public.online_game_states set revision=3
   where account_id='11111111-1111-4111-8111-111111111111' and revision=2;
  insert into public.server_action_receipts
   (account_id,action,idempotency_key,request_hash,game_revision,character_id)
   values ('11111111-1111-4111-8111-111111111111','online_game_v1',
   'online000006',repeat('a',64),3,'11111111-1111-4111-8111-111111111111');
  insert into private.online_career_reward_sources_v2
   (source_kind,source_id,account_id,request_id,request_hash,segment_index,
    expected_game_revision,character_id,profession_id,claimed_elapsed_seconds,
    base_effort_seconds,difficulty_basis_points)
   values ('gathering_claim',repeat('0',64),
     '11111111-1111-4111-8111-111111111111',
     'online000006',repeat('a',64),0,3,'11111111-1111-4111-8111-111111111111',
     'mining',30,30,10000);
  -- Repeat a globally claimed combat source from the earlier action.
  insert into private.online_career_reward_sources_v2
   (source_kind,source_id,account_id,request_id,request_hash,segment_index,
    expected_game_revision,character_id,profession_id,claimed_elapsed_seconds,
    base_effort_seconds,difficulty_basis_points)
   values ('combat_reward',repeat('9',64),
     '11111111-1111-4111-8111-111111111111',
     'online000006',repeat('a',64),1,3,'11111111-1111-4111-8111-111111111111',
     null,0,30,10000);
 exception when unique_violation then collided:=true;
 end;
 if not collided
 or (select revision from public.online_game_states
    where account_id='11111111-1111-4111-8111-111111111111')<>2
 or exists(select 1 from public.server_action_receipts
    where idempotency_key='online000006')
 or exists(select 1 from private.online_career_reward_sources_v2
    where request_id='online000006')
 or (select overall_character_xp from private.character_career_progress_v2
    where character_id='11111111-1111-4111-8111-111111111111')<>360
 then raise exception 'mixed_claim_partial_commit';end if;
end $check$;
SQL
echo "PASS: disposable PG17 mixed gathering+combat source proofs settle together; second-proof collision rolls back entire claim"
