-- Transactional regression; no user/profile fixtures survive.
begin;
create or replace function pg_temp.assert_availability(value boolean,label text)
returns void language plpgsql as $$
begin if value is distinct from true
then raise exception 'SOCIAL_NAME_AVAILABILITY_FAIL: %',label;end if;end $$;

do $qa$
declare
 owner_id uuid:=gen_random_uuid();
 other_id uuid:=gen_random_uuid();
begin
 insert into auth.users(id,email)
 values(owner_id,'availability-owner-'||owner_id||'@example.invalid'),
       (other_id,'availability-other-'||other_id||'@example.invalid');
 insert into public.player_profiles(account_id,display_name)
 values(owner_id,'Virelia Keeper'),(other_id,'Zynoria Twelfth')
 on conflict(account_id) do nothing;

 perform pg_temp.assert_availability(
  has_function_privilege('authenticated','public.account_social_name_availability_v1(text)','EXECUTE'),
  'authenticated may check');
 perform pg_temp.assert_availability(
  not has_function_privilege('anon','public.account_social_name_availability_v1(text)','EXECUTE'),
  'anonymous role cannot enumerate availability');

 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 perform pg_temp.assert_availability(
  not public.account_social_name_availability_v1('zynoria twelfth'),
  'existing legacy display name blocks case-insensitively');
 perform pg_temp.assert_availability(
  public.account_social_name_availability_v1('Unclaimed Echo'),
  'valid unclaimed name is available');
 perform public.set_account_social_name_v1('Unclaimed Echo');
 perform pg_temp.assert_availability(
  public.account_social_name_availability_v1('unclaimed echo'),
  'self-selected name remains available to the owner');

 perform set_config('request.jwt.claim.sub',other_id::text,true);
 perform pg_temp.assert_availability(
  not public.account_social_name_availability_v1('UNCLAIMED ECHO'),
  'newly claimed name is unavailable to another account');

 begin
  perform public.account_social_name_availability_v1('X');
  raise exception 'expected invalid name rejection';
 exception when others then
  if sqlerrm not like '%INVALID_SOCIAL_NAME%' then raise;end if;
 end;
end $qa$;
select 'PASS: Social Name availability, legacy fallback, self, roles and validation' as result;
rollback;
