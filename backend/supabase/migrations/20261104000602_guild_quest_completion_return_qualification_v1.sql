-- Guild Quest settlement uses RETURNS TABLE(quest_key text, ...).
-- Its historical INSERT ... RETURNING quest_key is ambiguous with that
-- output variable and may fail when a Guild Quest first completes.
-- Qualify the actual inserted table column; preserve exact-once awards.
do $quest_return_fix$
declare v_source text;v_old text:='returning quest_key into inserted_key;';
 v_new text:='returning public.guild_quest_completions.quest_key into inserted_key;';
 v_prod text:='returning completed_quest.quest_key into inserted_key;';
 v_n integer;v_qualified integer;
begin
 select pg_get_functiondef('public.guild_quest_state_v1()'::regprocedure)
 into v_source;
 v_n:=(length(v_source)-length(replace(v_source,v_old,'')))/length(v_old);
 v_qualified:=(length(v_source)-length(replace(v_source,v_new,'')))/length(v_new)
  +(length(v_source)-length(replace(v_source,v_prod,'')))/length(v_prod);
 if v_n=0 and v_qualified=2 then
  raise notice 'Guild Quest completion RETURNING already qualified in this environment';
  return;
 end if;
 if v_n<>2 or v_qualified<>0 then
  raise exception 'guild_quest_returning_source_mismatch: unqualified %, qualified %',v_n,v_qualified;
 end if;
 execute replace(v_source,v_old,v_new);
end $quest_return_fix$;
