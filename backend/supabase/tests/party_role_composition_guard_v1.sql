-- Transactional regression for the new Party role composition trigger.
-- Runs against a test/staging database with the migration applied.
begin;

create or replace function pg_temp.party_assert(p_ok boolean,p_message text)
returns void language plpgsql as $$
begin
 if p_ok is distinct from true then raise exception 'PARTY ROLE TEST: %',p_message; end if;
end $$;

do $$
declare
 a uuid[]:=array[gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),
                  gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid()];
 c uuid[]:=array[gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),
                  gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid()];
 classes text[]:=array['IRONWARDEN','WAYFINDER','WAYFINDER','DAWNKEEPER',
                       'WAYFINDER','BASTION','STONECALLER'];
 p uuid;p2 uuid;i integer;v_error text;
begin
 for i in 1..7 loop
  insert into auth.users(id,email)
  values(a[i],'party-role-'||a[i]||'@example.invalid');
  insert into public.characters(id,account_id,name,class_id,level)
  values(c[i],a[i],'Role Test '||chr(64+i),classes[i],10);
 end loop;
 perform set_config('request.jwt.claim.sub',a[1]::text,true);
 p:=public.create_persistent_party_v16(c[1],'tank','mixed','party-role-create-01');
 for i in 2..3 loop
   perform set_config('request.jwt.claim.sub',a[i]::text,true);
   perform public.join_persistent_party_v16(p,c[i],'damage','party-role-dps-'||i);
 end loop;
 perform set_config('request.jwt.claim.sub',a[5]::text,true);
 v_error:='';
 begin
  perform public.join_persistent_party_v16(p,c[5],'damage','party-role-extra-damage');
 exception when others then v_error:=sqlerrm; end;
 perform pg_temp.party_assert(v_error='party_role_full','third Damage blocked by database');
 perform set_config('request.jwt.claim.sub',a[4]::text,true);
 perform public.join_persistent_party_v16(p,c[4],'support','party-role-support');
 perform pg_temp.party_assert((select count(*)=4 from public.party_members
  where party_id=p and left_at is null),'full legal 1 Tank / 2 Damage / 1 Support');
 perform pg_temp.party_assert((select count(*)=1 from public.party_members
  where party_id=p and role='tank' and left_at is null),'one Tank');
 perform pg_temp.party_assert((select count(*)=2 from public.party_members
  where party_id=p and role='damage' and left_at is null),'two Damage');
 perform pg_temp.party_assert((select count(*)=1 from public.party_members
  where party_id=p and role='support' and left_at is null),'one Support');
 -- A separate party proves client-supplied fake role cannot bypass the guard.
 perform set_config('request.jwt.claim.sub',a[6]::text,true);
 p2:=public.create_persistent_party_v16(c[6],'tank','mixed','party-role-create-02');
 perform set_config('request.jwt.claim.sub',a[7]::text,true);
 v_error:='';
 begin
  perform public.join_persistent_party_v16(p2,c[7],'damage','party-role-spoof');
 exception when others then v_error:=sqlerrm; end;
 perform pg_temp.party_assert(v_error='party_role_mismatch','class determines role, not client');
 perform public.join_persistent_party_v16(p2,c[7],'support','party-role-valid-support');
 -- Harmless updates and leaving do not invalidate old or new Parties.
 update public.party_members set joined_at=joined_at
 where party_id=p2 and character_id=c[7];
 update public.party_members set left_at=now() where party_id=p2 and character_id=c[7];
 perform pg_temp.party_assert((select count(*)=1 from public.party_members
  where party_id=p2 and left_at is null),'leaving remains possible');
end $$;
select 'PASS: canonical class-derived Party composition, spoof rejection and departures' result;
rollback;
