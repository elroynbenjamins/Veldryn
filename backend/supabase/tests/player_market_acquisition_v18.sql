-- Hidden V18 acquisition policy security and JS character-XP parity.
-- Pure synthetic checks; private database remains with no policy approvals.
begin;
set local statement_timeout='30s';
do $check$
declare
  v_level integer;
  v_xp bigint;
begin
  if (select count(*) from private.market_acquisition_policy_v18 where approved)<>0
    or has_table_privilege('authenticated','private.market_acquisition_policy_v18','SELECT')
    or has_table_privilege('service_role','private.market_acquisition_policy_v18','INSERT')
    or has_function_privilege('anon',
      'private.market_character_level_from_xp_v18(bigint)'::regprocedure,'EXECUTE')
    or has_function_privilege('authenticated',
      'private.market_enforce_acquisition_before_gold_v18()'::regprocedure,'EXECUTE')
    or not exists(select 1 from pg_catalog.pg_trigger
      where tgname='market_guard_purchase_acquisition_v18' and not tgisinternal)
  then raise exception 'market_v18_policy_or_trigger_exposed';end if;
  -- Generated with Math.floor(90*Math.pow(level,1.65)+level*35)*8
  -- in the current apps/mobile/src/core/progression.ts model.
  for v_level,v_xp in
    select target_level,min_xp from (values
    (1,0::bigint),
    (2,1000::bigint),
    (5,17272::bigint),
    (6,28912::bigint),
    (10,118272::bigint),
    (14,293968::bigint),
    (18,577176::bigint),
    (20,765096::bigint),
    (30,2254840::bigint),
    (52,9711040::bigint),
    (60,14189456::bigint),
    (100,54880136::bigint)
    ) t(target_level,min_xp)
  loop
    if private.market_character_level_from_xp_v18(v_xp)<>v_level then
      raise exception 'market_v18_xp_curve_wrong_at_%',v_level;end if;
    if v_level>1
      and private.market_character_level_from_xp_v18(v_xp-1)<>v_level-1
    then raise exception 'market_v18_level_boundary_wrong_at_%',v_level;end if;
  end loop;
  if private.market_character_level_from_xp_v18(9007199254740991::bigint)<>100
  then raise exception 'market_v18_max_safe_xp_did_not_cap';end if;
  begin
    perform private.market_character_level_from_xp_v18(-1::bigint);
    raise exception 'negative XP was accepted';
  exception when raise_exception then
    if sqlerrm<>'market_character_xp_invalid' then raise;end if;
  end;
  begin
    perform private.market_character_level_from_xp_v18(9007199254740992::bigint);
    raise exception 'unsafe XP was accepted';
  exception when raise_exception then
    if sqlerrm<>'market_character_xp_invalid' then raise;end if;
  end;
  begin
    insert into private.market_acquisition_policy_v18
      (item_id,asset_kind,source_tier,item_required_level,approved)
    values('DRAFT_NOT_RELEASED','resource','T1',1,true);
    raise exception 'unaudited Market acquisition policy was approved';
  exception when check_violation then
    null;
  end;
  if (select count(*) from private.market_acquisition_policy_v18 where approved)<>0
  then raise exception 'Market V18 approval leaked';end if;
end
$check$;
rollback;
