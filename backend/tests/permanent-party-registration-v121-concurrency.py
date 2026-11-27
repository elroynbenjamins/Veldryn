"""Disposable PostgreSQL 17 service ONLY; never takes a database URL.
Runs independent psql processes against the CI container. Parent row held
until all contenders actually report a lock wait, not guessed sleeps.
"""
import concurrent.futures
import json
import re
import subprocess
import sys
import time

container = sys.argv[1]
assert re.fullmatch(r"[a-f0-9]{12,64}", container)
party = "00000000-0000-0000-0000-000000000010"
a = "00000000-0000-0000-0000-000000000001"
b = "00000000-0000-0000-0000-000000000002"
a_tank = "00000000-0000-0000-0000-000000000011"
a_damage = "00000000-0000-0000-0000-000000000012"
b_damage = "00000000-0000-0000-0000-000000000021"
b_tank = "00000000-0000-0000-0000-000000000022"
def cmd(tag):
    return ["docker", "exec", "-i", "-e", "PGAPPNAME="+tag, container,
            "psql", "-X", "-qAt", "-U", "postgres", "-d", "postgres",
            "-v", "ON_ERROR_STOP=1"]
def sql(statement, tag="party-v121-control"):
    result = subprocess.run(cmd(tag), input="set statement_timeout='15s';\n"+statement+"\n",
                            text=True, capture_output=True, timeout=25)
    if result.returncode:
        raise RuntimeError(result.stderr)
    return result.stdout.strip()
def reject(statement, expected):
    try:
        sql(statement)
    except RuntimeError as err:
        assert expected in str(err), str(err)
    else:
        raise AssertionError("unexpected success: "+expected)
def setup(proposal, message, rev, reverse=False, remaining_seconds=300):
    a0,a1,ar0,ar1 = (a_damage,a_tank,"damage","tank") if reverse else (a_tank,a_damage,"tank","damage")
    b0,b1,br0,br1 = (b_tank,b_damage,"tank","damage") if reverse else (b_damage,b_tank,"damage","tank")
    sql(f"""
    begin;
    insert into public.chat_messages values ('{message}',null,'party','{party}',true);
    with snap as (select private.party_registration_snapshot_v110('{party}') as roster,
      clock_timestamp() - interval '{300-remaining_seconds} seconds' as created)
    insert into private.party_role_swap_proposals_v108
      (id,party_id,proposer_account_id,chat_message_id,roster_revision,original_roster,original_roster_digest,created_at,expires_at)
    select '{proposal}','{party}','{a}','{message}',{rev},roster,encode(sha256(convert_to(roster::text,'UTF8')),'hex'),
      created,created+interval '5 minutes' from snap;
    insert into private.party_role_swap_participants_v108
      (proposal_id,account_id,from_character_id,to_character_id,from_role,to_role)
    values ('{proposal}','{a}','{a0}','{a1}','{ar0}','{ar1}'),
           ('{proposal}','{b}','{b0}','{b1}','{br0}','{br1}');
    commit;
    """)
def action(actor, key, proposal, message, rev, decision="accept"):
    return f"select private.respond_party_registration_chat_v122('{actor}','{key}','{party}','{proposal}','{message}',{rev},1,'{decision}');"
def race(statements, expire_proposal=None):
    holder = subprocess.Popen(cmd("party-v121-holder"), stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                              stderr=subprocess.PIPE, text=True, bufsize=1)
    pool = concurrent.futures.ThreadPoolExecutor(max_workers=len(statements))
    futures = []
    try:
        holder.stdin.write(f"begin; set local statement_timeout='15s'; select id from public.parties where id='{party}' for update; select 'LOCK_HELD';\n")
        holder.stdin.flush()
        assert holder.stdout.readline().strip() == party
        assert holder.stdout.readline().strip() == "LOCK_HELD"
        for index, statement in enumerate(statements):
            futures.append(pool.submit(sql, statement, f"party-v121-racer-{index}"))
        deadline = time.monotonic()+8
        while True:
            waiting = int(sql("select count(*) from pg_stat_activity where application_name like 'party-v121-racer-%' and wait_event_type='Lock';"))
            if waiting == len(statements):
                break
            assert not any(f.done() for f in futures), "contender did not wait for lock"
            assert time.monotonic()<deadline, "contenders did not reach lock"
            time.sleep(.05)
        if expire_proposal:
            # Await the real DB deadline while the contender is blocked.
            assert sql(f"select expires_at>clock_timestamp() from private.party_role_swap_proposals_v108 where id='{expire_proposal}';")=="t", "contender must reach lock before deadline"
            sql(f"select pg_sleep(greatest(0,extract(epoch from (expires_at-clock_timestamp())))+0.15) from private.party_role_swap_proposals_v108 where id='{expire_proposal}';")
        holder.stdin.write("commit;\n\\q\n")
        holder.stdin.flush()
        assert holder.wait(timeout=10)==0, holder.stderr.read()
        return [json.loads(f.result(timeout=20)) for f in futures]
    finally:
        if holder.poll() is None:
            holder.kill()
            holder.wait()
        pool.shutdown(wait=True)
# V111 regression leaves two stable registrations in original roles at revision 9.
proposal="00000000-0000-0000-0000-000000000031"
message="00000000-0000-0000-0000-000000000041"
setup(proposal,message,9)
orig = json.loads(sql(f"select private.party_registration_snapshot_v110('{party}');"))
aa=action(a,"V121_A",proposal,message,9)
bb=action(b,"V121_B",proposal,message,9)
first, second, duplicate = race([aa,bb,bb])
assert sum(x["newlyRecorded"] for x in [first,second,duplicate])==2
assert second["effectId"]==duplicate["effectId"]
assert second["response"]==duplicate["response"]
assert sorted([first["response"]["state"],second["response"]["state"]])==["completed","pending"]
assert int(sql(f"select roster_revision from private.party_registration_state_v110 where party_id='{party}';"))==10
assert int(sql(f"select count(*) from private.party_registration_exchange_history_v110 where proposal_id='{proposal}';"))==2
assert int(sql(f"select count(*) from private.party_chat_action_receipts_v108 where source_id='{proposal}';"))==2
assert int(sql(f"select count(*) from private.party_role_swap_effects_v122 where proposal_id='{proposal}';"))==2
assert json.loads(sql(aa))=={**first,"newlyRecorded":False}
reject(action(a,"V121_A",proposal,message,9,"decline"),"conflicting_replay")
after=json.loads(sql(f"select private.party_registration_snapshot_v110('{party}');"))
assert after["leaderAccountId"]==orig["leaderAccountId"]
for before_member,after_member in zip(orig["members"],after["members"]):
    for k in ["registrationId","accountId","joinedAt"]:
        assert before_member[k]==after_member[k]
    assert before_member["role"]!=after_member["role"]
# Force failure after final response has written its journal and before receipt
# insert completes. PostgreSQL must restore decision, effects and roster.
proposal2="00000000-0000-0000-0000-000000000032"
message2="00000000-0000-0000-0000-000000000042"
setup(proposal2,message2,10,reverse=True)
aa2=action(a,"V121_A2",proposal2,message2,10)
bb2=action(b,"V121_B2",proposal2,message2,10)
assert json.loads(sql(aa2))["response"]["state"]=="pending"
sql("""
create function private.fail_v121_fixture_receipt() returns trigger language plpgsql as $$
begin
 if new.request_id='V121_B2' then raise exception 'forced_v121_receipt_failure';end if;
 return new;
end;$$;
create trigger fail_v121_fixture_receipt before insert on private.party_chat_action_receipts_v108
 for each row execute function private.fail_v121_fixture_receipt();
""")
reject(bb2,"forced_v121_receipt_failure")
assert json.loads(sql(f"select private.party_registration_snapshot_v110('{party}');"))==after
assert sql(f"select decision is null from private.party_role_swap_participants_v108 where proposal_id='{proposal2}' and account_id='{b}';")=="t"
assert int(sql(f"select count(*) from private.party_registration_exchange_history_v110 where proposal_id='{proposal2}';"))==0
assert int(sql(f"select count(*) from private.party_role_swap_effects_v122 where proposal_id='{proposal2}';"))==1
sql("drop trigger fail_v121_fixture_receipt on private.party_chat_action_receipts_v108; drop function private.fail_v121_fixture_receipt();")
assert json.loads(sql(bb2))["response"]["state"]=="completed"
assert json.loads(sql(f"select private.party_registration_snapshot_v110('{party}');"))["members"]==orig["members"]
# A response that starts before expiry but waits on a lock until after expiry
# must not record a consent or exchange.
proposal3="00000000-0000-0000-0000-000000000033"
message3="00000000-0000-0000-0000-000000000043"
setup(proposal3,message3,11,remaining_seconds=10)
expired,=race([action(a,"V121_EXPIRED",proposal3,message3,11)],expire_proposal=proposal3)
assert expired["response"]["state"]=="expired"
assert int(sql(f"select count(*) from private.party_role_swap_participants_v108 where proposal_id='{proposal3}' and decision is not null;"))==0
assert int(sql(f"select roster_revision from private.party_registration_state_v110 where party_id='{party}';"))==11
assert int(sql(f"select count(*) from private.party_registration_exchange_history_v110 where proposal_id='{proposal3}';"))==0
# Message linkage, exact single consent, and decline do not change the roster.
proposal4="00000000-0000-0000-0000-000000000034"
message4="00000000-0000-0000-0000-000000000044"
setup(proposal4,message4,11)
sql(f"update public.chat_messages set is_system=false,account_id='{a}' where id='{message4}';")
reject(action(a,"V121_FORGED",proposal4,message4,11),"unverified_message")
sql(f"update public.chat_messages set is_system=true,account_id=null where id='{message4}';")
reject(action(a,"V121_STALE",proposal4,message4,10),"stale_scope")
assert json.loads(sql(action(a,"V121_A4",proposal4,message4,11)))["response"]["state"]=="pending"
reject(action(a,"V121_A4_NEW",proposal4,message4,11),"response_already_recorded")
assert json.loads(sql(action(b,"V121_B4",proposal4,message4,11,"decline")))["response"]["state"]=="declined"
assert json.loads(sql(f"select private.party_registration_snapshot_v110('{party}');"))["members"]==orig["members"]
assert int(sql(f"select roster_revision from private.party_registration_state_v110 where party_id='{party}';"))==11
assert int(sql(f"select count(*) from private.party_registration_exchange_history_v110 where proposal_id='{proposal4}';"))==0
for role in ["anon","authenticated","service_role"]:
    assert sql(f"select has_function_privilege('{role}','private.respond_party_registration_chat_v122(uuid,text,uuid,uuid,uuid,bigint,bigint,text)','execute');")=="f"
print("PARTY_V121_V122_PG17_CONCURRENT_RECEIPTS_ROLLBACK_EXPIRY_PASS")
