-- Guild Quest settlement uses RETURNS TABLE(quest_key text, ...).
-- Its historical INSERT ... RETURNING quest_key is ambiguous with that
-- output variable and may fail when a Guild Quest first completes.
-- Qualify the actual inserted table column; preserve exact-once awards.
do $quest_return_fix$
declare v_source text;v_old text:='returning quest_key into inserted_key;';
 v_new text:='returning public.guild_quest_completions.quest_key into inserted_key;';
 v_n integer;
begin
 select pg_get_functiondef('public.guild_quest_state_v1()'::regprocedure)
 into v_source;
 if position(v_new in v_source)>0 then
  raise notice 'Guild Quest completion RETURNING already qualified';
  return;
 end if;
 v_n:=(length(v_source)-length(replace(v_source,v_old,'')))/length(v_old);
 if v_n<>2 then raise exception 'guild_quest_returning_source_mismatch: %',v_n;end if;
 execute replace(v_source,v_old,v_new);
end $quest_return_fix$;
