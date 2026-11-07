-- Allow all Guild members to pre-fund the next RELEASED Skill rank before
-- Guild Skill Points are earned. Officers still authorize rank purchases.
-- Patch the currently deployed functions instead of restoring obsolete
-- definitions: in particular the construction member-count scaling guard.
-- This migration is intentionally narrow and idempotent.
BEGIN;
DO $guild_bank_skill_prefunding$
DECLARE
  v_sql text;
  v_old text;
  v_new text;
BEGIN
  SELECT pg_get_functiondef('public.guild_bank_deposit_server_v1(uuid,text,integer,text)'::regprocedure) INTO v_sql;
  v_old:=$old$
   v_level-1>coalesce((
     select sum(a.rank) from public.guild_skill_allocations a
     where a.guild_id=v_guild),0)
   and exists($old$;
  v_new:=$new$
   exists($new$;
  IF position(v_old in v_sql)>0 THEN
    IF md5(v_sql) <> '963273240cc77cc7d99bf6181d39cebd' THEN
      RAISE EXCEPTION 'guild_bank_deposit_unexpected_source';
    END IF;
    EXECUTE replace(v_sql,v_old,v_new);
  ELSIF position(v_new in v_sql)=0 THEN
    RAISE EXCEPTION 'guild_bank_deposit_prefunding_guard_missing';
  END IF;

  SELECT pg_get_functiondef('public.guild_bank_required_resources_guard_v1()'::regprocedure) INTO v_sql;
  v_old:=$old$
    and (select coalesce(sum(spent.rank),0) from public.guild_skill_allocations spent
      where spent.guild_id=new.guild_id)<greatest(0,g.level-1)$old$;
  IF position(v_old in v_sql)>0 THEN
    IF md5(v_sql) <> '9dc68ce09cb91b4e083ad18b36648ac7' THEN
      RAISE EXCEPTION 'guild_bank_required_resources_guard_unexpected_source';
    END IF;
    EXECUTE replace(v_sql,v_old,'');
  ELSIF position('coalesce(a.rank,0)<skill.max_rank' in v_sql)=0
    OR position('guild_construction_scaled_amount_v1' in v_sql)=0 THEN
    RAISE EXCEPTION 'guild_bank_required_resources_guard_missing';
  END IF;

  IF position('v_level-1>coalesce((' in
       pg_get_functiondef('public.guild_bank_deposit_server_v1(uuid,text,integer,text)'::regprocedure))>0
     OR position('spent.guild_id=new.guild_id' in
       pg_get_functiondef('public.guild_bank_required_resources_guard_v1()'::regprocedure))>0
     OR position('guild_construction_scaled_amount_v1' in
       pg_get_functiondef('public.guild_bank_required_resources_guard_v1()'::regprocedure))=0
  THEN
    RAISE EXCEPTION 'guild_bank_prefunding_postcondition_failed';
  END IF;
END $guild_bank_skill_prefunding$;
COMMIT;
