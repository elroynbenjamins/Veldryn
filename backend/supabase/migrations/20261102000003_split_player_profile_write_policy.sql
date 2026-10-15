-- Public profile previews already govern reads. Splitting the old ALL policy keeps
-- its write authorization while removing a redundant second SELECT policy.
begin;

drop policy if exists "account reads own profile" on public.player_profiles;
drop policy if exists "account writes own profile" on public.player_profiles;

create policy "account inserts own profile" on public.player_profiles
  for insert to public
  with check (account_id = auth.uid());

create policy "account updates own profile" on public.player_profiles
  for update to public
  using (account_id = auth.uid())
  with check (account_id = auth.uid());

create policy "account deletes own profile" on public.player_profiles
  for delete to public
  using (account_id = auth.uid());

commit;
