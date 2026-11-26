-- Resolve profile journal reads from the server-persisted state when the
-- dedicated journal row does not exist. Preserve private-row precedence.
-- Keep all existing function bodies, ownership checks, signatures and grants.
do $migration$
declare
 r record;
 old_read text;
 new_read text;
 body text;
 patched integer := 0;
begin
 for r in
  select p.proname, pg_get_functiondef(p.oid) as definition
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in
   ('profile_character_showcase_update_v2','profile_extension_update_v43','profile_public_v43')
 loop
  if r.proname='profile_public_v43' then
   old_read := 'select state into v_journal from private.adventurers_journal_state where account_id=p_target_account_id;';
   new_read := old_read || E'\n  if v_journal is null then v_journal := v_game#>''{account,journalState}''; end if;';
  else
   old_read := 'select state into v_journal from private.adventurers_journal_state where account_id=v_uid;';
   new_read := old_read || E'\n  if v_journal is null then v_journal := v_state#>''{account,journalState}''; end if;';
  end if;
  new_read := new_read || $normalize$
  -- Object-key membership only: malformed arrays/scalars cannot grant ownership.
  v_journal := jsonb_build_object(
   'unlockedAchievements',case when jsonb_typeof(v_journal->'unlockedAchievements')='object' then v_journal->'unlockedAchievements' else '{}'::jsonb end,
   'records',case when jsonb_typeof(v_journal->'records')='object' then v_journal->'records' else '{}'::jsonb end
  );$normalize$;
  if strpos(r.definition,new_read)>0 then
   patched := patched+1;
   continue;
  end if;
  if (length(r.definition)-length(replace(r.definition,old_read,'')))/length(old_read) <> 1 then
   raise exception 'Unexpected journal read in %',r.proname;
  end if;
  body := replace(r.definition,old_read,new_read);
  execute body;
  patched := patched+1;
 end loop;
 if patched<>3 then raise exception 'Expected three profile RPCs, found %',patched; end if;
end
$migration$;
