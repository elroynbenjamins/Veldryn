-- Keep the original four-event guard for normal activity, but permit the
-- server-verified one-unit events emitted by the bounded Forge Claim All.
-- Queue storage: 20 ready + 7 active + 5 waiting = at most 32 jobs.
DO $hotfix$
DECLARE
  fn regprocedure := 'public.commit_online_game_server_v1(uuid,bigint,bigint,text,text,jsonb,jsonb)'::regprocedure;
  original text;
  old_guard constant text := 'jsonb_array_length(p_contributions)>4';
  new_guard constant text := $guard$(jsonb_array_length(p_contributions)>36 or (jsonb_array_length(p_contributions)>4 and ((select count(*) from jsonb_array_elements(p_contributions) as entry(value) where (value->>'kind'='crafting' and value->'units'='1'::jsonb) is not true)>4 or (select count(*) from jsonb_array_elements(p_contributions) as entry(value) where (value->>'kind'='crafting' and value->'units'='1'::jsonb) is true)>32)))$guard$;
BEGIN
  original := pg_get_functiondef(fn);
  IF strpos(original,new_guard)>0 THEN RETURN; END IF;
  IF (length(original)-length(replace(original,old_guard,'')))/length(old_guard) <> 1 THEN
    RAISE EXCEPTION 'Unexpected online commit guard; refusing to patch';
  END IF;
  EXECUTE replace(original,old_guard,new_guard);
END
$hotfix$;
