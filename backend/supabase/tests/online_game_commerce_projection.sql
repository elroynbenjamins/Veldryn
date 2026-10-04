-- Regression fixture for the authoritative commerce/name-style projection.
-- Run after installing the online_game_commerce_projection migration.
-- All writes affect randomly generated test identities and roll back on success.
-- Run the entire file in one connection/transaction as the migration owner.
begin;
set local statement_timeout = '30s';

do $test$
declare
  a uuid := gen_random_uuid();
  absent uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  s jsonb;
  projected jsonb;
  loaded jsonb;
  response jsonb;
  first_response jsonb;
  replay jsonb;
  receipt_before jsonb;
  saved_before jsonb;
  fn regprocedure;
  fn_name text;
  request_id text := 'commerce-test-' || replace(gen_random_uuid()::text, '-', '');
begin
  -- Validate the exact callable surface, including effective PUBLIC inheritance.
  foreach fn_name in array array[
    'private.project_online_game_commerce_v1(uuid,jsonb)',
    'public.load_online_game_server_v1(uuid)',
    'public.commit_online_game_server_v1(uuid,bigint,bigint,text,text,jsonb,jsonb)',
    'public.read_online_game_receipt_server_v1(uuid,text)'
  ] loop
    fn := to_regprocedure(fn_name);
    if fn is null then raise exception 'missing expected function: %', fn_name; end if;
    if has_function_privilege('anon', fn, 'EXECUTE') is distinct from false
       or has_function_privilege('authenticated', fn, 'EXECUTE') is distinct from false then
      raise exception 'untrusted role can execute: %', fn_name;
    end if;
    if fn_name like 'public.%' and
       has_function_privilege('service_role', fn, 'EXECUTE') is distinct from true then
      raise exception 'service role lost RPC execute: %', fn_name;
    end if;
  end loop;
  if (select prosecdef from pg_proc where oid = 'private.project_online_game_commerce_v1(uuid,jsonb)'::regprocedure)
     is distinct from false then
    raise exception 'projection helper must use SECURITY INVOKER';
  end if;

  insert into auth.users(id,email)
  values(a, 'commerce-projection-' || a::text || '@example.invalid');

  s := jsonb_build_object(
    'version', 11,
    'account', jsonb_build_object(
      'entitlements', jsonb_build_object(
        'vip', true, 'vip_plus', true, 'supporter', true,
        'vipplus', true, 'vip+', true, 'supporter_subscription', true,
        'unrelated_reward', true
      ),
      'playerNameStyle', jsonb_build_object('mode','solid','solidColor','#123456','animation','none'),
      'vipPlusNameColor', '#123456',
      'unrelated_account_field', 'keep'
    ),
    'character', jsonb_build_object(
      'id', c, 'name', 'Tst' || translate(left(replace(c::text,'-',''),10),'0123456789','ghijklmnop'), 'classId', 'IRONWARDEN', 'bodyPresentation', 'male',
      'level', 1, 'xp', 7, 'gold', 100, 'hp', 100, 'currentHp', 80,
      'attack', 10, 'defense', 10, 'equipment', '{}'::jsonb
    ),
    'inventory', jsonb_build_object('stacks', jsonb_build_array(jsonb_build_object('itemId','keep','quantity',7))),
    'activity', jsonb_build_object('targetId','keep')
  );

  if private.project_online_game_commerce_v1(a, null) is not null
     or private.project_online_game_commerce_v1(a, 'null'::jsonb) is distinct from 'null'::jsonb
     or private.project_online_game_commerce_v1(a, '[]'::jsonb) is distinct from '[]'::jsonb
     or private.project_online_game_commerce_v1(a, '123'::jsonb) is distinct from '123'::jsonb then
    raise exception 'null/invalid state sentinel changed';
  end if;
  projected := private.project_online_game_commerce_v1(absent, s);
  if projected #> '{account,entitlements}' is distinct from
     '{"vip":false,"vip_plus":false,"supporter":false,"vipplus":false,"vip+":false,"supporter_subscription":false,"unrelated_reward":true}'::jsonb then
    raise exception 'unentitled identity retained stale paid flags or lost unrelated flag';
  end if;
  if projected #> '{account,playerNameStyle}' is distinct from '{"mode":"default","animation":"none"}'::jsonb
     or (projected -> 'account') ? 'vipPlusNameColor' then
    raise exception 'unsaved client colour survived canonical projection';
  end if;
  if (projected #- '{account,entitlements}' #- '{account,playerNameStyle}' #- '{account,vipPlusNameColor}')
     is distinct from
     (s #- '{account,entitlements}' #- '{account,playerNameStyle}' #- '{account,vipPlusNameColor}') then
    raise exception 'projection changed progress or unrelated account data';
  end if;
  if private.project_online_game_commerce_v1(a, '{}'::jsonb) #>> '{account,playerNameStyle,mode}'
     is distinct from 'default' then
    raise exception 'missing account object not projected safely';
  end if;

  -- An expired store subscription must not suppress a valid lifetime promo.
  insert into private.account_commerce_entitlements_v1(account_id,vip,vip_plus,supporter_active,supporter_expires_at,source)
  values(a,false,false,true,now()-interval '1 day','regression_fixture');
  insert into private.commerce_promo_entitlements_v1(account_id,vip,vip_plus,supporter_lifetime)
  values(a,true,true,true);
  -- Exercise the actual authenticated save RPC, including the permanent VIP+
  -- fallback preserved when the player subsequently chooses a gradient.
  perform set_config('request.jwt.claim.sub',a::text,true);
  perform set_config('request.jwt.claim.role','authenticated',true);
  set local role authenticated;
  response := public.update_player_name_style_v1('solid','#ABCDEF','{}','none');
  if response ->> 'solidColor' is distinct from '#ABCDEF'
     or response ->> 'vipFallbackColor' is distinct from '#ABCDEF' then
    raise exception 'authenticated solid save did not preserve VIP fallback';
  end if;
  response := public.update_player_name_style_v1('gradient',null,array['#112233','#445566','#778899'],'flow');
  if response ->> 'mode' is distinct from 'gradient'
     or response ->> 'animation' is distinct from 'flow' then
    raise exception 'authenticated Supporter gradient save failed';
  end if;
  reset role;
  perform set_config('request.jwt.claim.role','service_role',true);
  projected := private.project_online_game_commerce_v1(a, s);
  if projected #> '{account,entitlements,vip}' is distinct from 'true'::jsonb
     or projected #> '{account,entitlements,vip_plus}' is distinct from 'true'::jsonb
     or projected #> '{account,entitlements,supporter}' is distinct from 'true'::jsonb then
    raise exception 'lifetime promo or permanent VIP entitlement lost';
  end if;
  if projected #> '{account,playerNameStyle}' is distinct from
     '{"mode":"gradient","gradientColors":["#112233","#445566","#778899"],"animation":"flow"}'::jsonb
     or projected #>> '{account,vipPlusNameColor}' is distinct from '#ABCDEF' then
    raise exception 'canonical gradient or permanent VIP fallback mapped incorrectly';
  end if;
  if private.project_online_game_commerce_v1(a, projected) is distinct from projected then
    raise exception 'repeated projection not idempotent';
  end if;

  -- Strict expiration is evaluated by the existing authoritative helper.
  update private.commerce_promo_entitlements_v1
  set supporter_lifetime=false,supporter_expires_at=now() where account_id=a;
  projected := private.project_online_game_commerce_v1(a, s);
  if projected #> '{account,entitlements,supporter}' is distinct from 'false'::jsonb
     or projected #>> '{account,playerNameStyle,mode}' is distinct from 'gradient'
     or projected #>> '{account,vipPlusNameColor}' is distinct from '#ABCDEF' then
    raise exception 'expiry did not lock Supporter while preserving saved gradient/fallback';
  end if;
  update private.account_commerce_entitlements_v1
  set supporter_expires_at=now()+interval '1 day' where account_id=a;
  if private.project_online_game_commerce_v1(a, s) #> '{account,entitlements,supporter}' is distinct from 'true'::jsonb then
    raise exception 'valid store subscription did not unlock';
  end if;
  update private.account_commerce_entitlements_v1 set supporter_active=false where account_id=a;
  if private.project_online_game_commerce_v1(a, s) #> '{account,entitlements,supporter}' is distinct from 'false'::jsonb then
    raise exception 'inactive store subscription accepted future expiry alone';
  end if;
  update private.commerce_promo_entitlements_v1
  set supporter_expires_at=now()+interval '1 day' where account_id=a;
  if private.project_online_game_commerce_v1(a, s) #> '{account,entitlements,supporter}' is distinct from 'true'::jsonb then
    raise exception 'valid time-limited promo did not unlock';
  end if;

  loaded := public.load_online_game_server_v1(a);
  if loaded -> 'state' is distinct from 'null'::jsonb
     or loaded ->> 'version' is distinct from '0' then
    raise exception 'new-account load no longer preserves Edge constructor sentinel';
  end if;
  response := jsonb_build_object('state',s,'version',1,'accountId',a,'serverNow',loaded->'serverNow');
  first_response := public.commit_online_game_server_v1(a,0,null,request_id,repeat('a',64),response,'[]'::jsonb);
  if first_response is distinct from jsonb_set(response,'{state}',private.project_online_game_commerce_v1(a,s))
     or (select gold from public.character_wallets where character_id=c) is distinct from 100::bigint
     or (select revision from public.online_game_states where account_id=a) is distinct from 1::bigint then
    raise exception 'first commit changed response, wallet or revision outside projection';
  end if;
  select r.response into receipt_before from public.server_action_receipts r
  where r.account_id=a and r.action='online_game_v1' and r.idempotency_key=request_id;
  select state into saved_before from public.online_game_states where account_id=a;

  -- Existing game states and receipts can contain stale metadata. Reads must
  -- project fresh access/preferences without rewriting their historical data.
  update private.commerce_promo_entitlements_v1
  set supporter_expires_at=now()-interval '1 day' where account_id=a;
  update public.player_name_styles_v1 set mode='solid',solid_color='#FEDCBA',gradient_colors='{}',animation='none'
  where account_id=a;
  loaded := public.load_online_game_server_v1(a);
  replay := public.read_online_game_receipt_server_v1(a,request_id);
  if loaded #> '{state,account,entitlements,supporter}' is distinct from 'false'::jsonb
     or loaded #>> '{state,account,playerNameStyle,solidColor}' is distinct from '#FEDCBA'
     or loaded ->> 'version' is distinct from '1'
     or loaded ->> 'walletGold' is distinct from '100'
     or replay ->> 'requestHash' is distinct from repeat('a',64)
     or replay #>> '{response,version}' is distinct from '1'
     or replay #> '{response,state,account,entitlements,supporter}' is distinct from 'false'::jsonb then
    raise exception 'load/receipt did not refresh metadata and preserve outcome envelope';
  end if;
  replay := public.commit_online_game_server_v1(a,0,null,request_id,repeat('a',64),response,'[]'::jsonb);
  if (replay #- '{state,account,entitlements}' #- '{state,account,playerNameStyle}' #- '{state,account,vipPlusNameColor}')
     is distinct from
     (first_response #- '{state,account,entitlements}' #- '{state,account,playerNameStyle}' #- '{state,account,vipPlusNameColor}')
     or replay #> '{state,account,entitlements,supporter}' is distinct from 'false'::jsonb then
    raise exception 'duplicate commit changed historical outcome or returned stale access';
  end if;
  if (select r.response from public.server_action_receipts r where r.account_id=a and r.action='online_game_v1' and r.idempotency_key=request_id)
     is distinct from receipt_before
     or (select state from public.online_game_states where account_id=a) is distinct from saved_before
     or (select revision from public.online_game_states where account_id=a) is distinct from 1::bigint
     or (select gold from public.character_wallets where character_id=c) is distinct from 100::bigint
     or (select count(*) from public.server_action_receipts where account_id=a and action='online_game_v1') <> 1 then
    raise exception 'read/replay mutated stored progress, receipt, wallet or revision';
  end if;

  begin
    perform public.commit_online_game_server_v1(a,1,100,request_id,repeat('b',64),response,'[]'::jsonb);
    raise exception 'changed request hash was accepted';
  exception when raise_exception then
    if sqlerrm <> 'idempotency_key_conflict' then raise; end if;
  end;
  begin
    perform public.commit_online_game_server_v1(a,0,100,request_id||'-stale',repeat('b',64),response,'[]'::jsonb);
    raise exception 'stale revision was accepted';
  exception when raise_exception then
    if sqlerrm <> 'stale_state' then raise; end if;
  end;
  update public.character_wallets set gold=150 where character_id=c;
  begin
    perform public.commit_online_game_server_v1(a,1,100,request_id||'-wallet',repeat('b',64),response,'[]'::jsonb);
    raise exception 'stale wallet was accepted';
  exception when raise_exception then
    if sqlerrm <> 'stale_state_wallet' then raise; end if;
  end;
  if public.load_online_game_server_v1(a) ->> 'walletGold' is distinct from '150' then
    raise exception 'fresh external wallet value lost';
  end if;

  -- Accounts without paid access remain unable to save premium styles, but
  -- must still be allowed to reset an expired preference to the default.
  update private.commerce_promo_entitlements_v1 set vip=false,vip_plus=false where account_id=a;
  set local role authenticated;
  begin
    perform public.update_player_name_style_v1('gradient',null,array['#112233','#445566'],'flow');
    raise exception 'unentitled gradient save was accepted';
  exception when raise_exception then
    if sqlerrm <> 'SUPPORTER_REQUIRED' then raise; end if;
  end;
  begin
    perform public.update_player_name_style_v1('solid','#ABCDEF','{}','none');
    raise exception 'unentitled solid save was accepted';
  exception when raise_exception then
    if sqlerrm <> 'VIP_PLUS_OR_SUPPORTER_REQUIRED' then raise; end if;
  end;
  response := public.update_player_name_style_v1('default',null,'{}','none');
  reset role;
  if response ->> 'mode' is distinct from 'default'
     or public.load_online_game_server_v1(a) #>> '{state,account,playerNameStyle,mode}' is distinct from 'default' then
    raise exception 'expired account default reset did not persist through load';
  end if;
end $test$;

select 'PASS: access, expiry, authenticated style saves, null initialization, progress, wallet/version/hash guards and replay; transaction rolled back' as result;
rollback;
