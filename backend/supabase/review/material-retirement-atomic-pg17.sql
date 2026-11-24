-- Disposable PG17 review fixture only. No production schema or Supabase credentials.
-- Deliberately NOT a deployable migration. Model the authoritative revision/wallet/
-- account lock and receipt transaction with the verified vendor destination.
begin;
create schema material_retirement_review;
set local search_path=material_retirement_review,pg_catalog;
create table state_fixture(account_id uuid primary key,character_id uuid not null,revision bigint not null,state jsonb not null);
create table wallet_fixture(character_id uuid primary key,gold bigint not null check(gold>=0));
create table character_fixture(character_id uuid primary key,gold bigint not null check(gold>=0));
create table receipt_fixture(account_id uuid not null,item_id text not null,version integer not null,inventory_quantity bigint not null,bank_quantity bigint not null,character_credit bigint not null,bank_credit bigint not null,primary key(account_id,item_id,version));
create table notice_fixture(account_id uuid not null,item_id text not null,version integer not null,body text not null,primary key(account_id,item_id,version));
-- The gate is a fixture stand-in for verified cessation of every issuance path.
create table gate_fixture(item_id text primary key,issuance_closed boolean not null);
insert into gate_fixture values('ECHO_BAT_WING',false);

create function retire_fixture(a uuid,expected_revision bigint,fail_notice boolean default false) returns text
language plpgsql security invoker set search_path=material_retirement_review,pg_catalog as $$
declare g state_fixture%rowtype; w bigint; c bigint; b bigint; iq bigint; bq bigint; inv jsonb; bank jsonb; s jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended('party-account:'||a,0));
 select * into strict g from state_fixture where account_id=a for update;
 if not exists(select 1 from gate_fixture where item_id='ECHO_BAT_WING' and issuance_closed) then raise exception 'issuance_not_closed'; end if;
 if jsonb_typeof(g.state#>'{inventory,stacks}') is distinct from 'array' or jsonb_typeof(g.state#>'{bank,stacks}') is distinct from 'array' then raise exception 'invalid_storage'; end if;
 if exists(select 1 from jsonb_array_elements((g.state#>'{inventory,stacks}')||(g.state#>'{bank,stacks}')) x where x->>'itemId'='ECHO_BAT_WING' and (coalesce(x->>'quantity','') !~ '^[1-9][0-9]*$' or x ? 'instanceId')) then raise exception 'invalid_retirement_stack'; end if;
 select coalesce(sum((x->>'quantity')::bigint) filter(where x->>'itemId'='ECHO_BAT_WING'),0),coalesce(jsonb_agg(x order by ord) filter(where x->>'itemId' is distinct from 'ECHO_BAT_WING'),'[]'::jsonb) into iq,inv from jsonb_array_elements(g.state#>'{inventory,stacks}') with ordinality t(x,ord);
 select coalesce(sum((x->>'quantity')::bigint) filter(where x->>'itemId'='ECHO_BAT_WING'),0),coalesce(jsonb_agg(x order by ord) filter(where x->>'itemId' is distinct from 'ECHO_BAT_WING'),'[]'::jsonb) into bq,bank from jsonb_array_elements(g.state#>'{bank,stacks}') with ordinality t(x,ord);
 if exists(select 1 from receipt_fixture where account_id=a and item_id='ECHO_BAT_WING' and version=1) then
  if iq+bq>0 then raise exception 'late_issuance'; end if;
  return 'replay';
 end if;
 if g.revision<>expected_revision then raise exception 'stale_state'; end if;
 if iq+bq=0 then return 'empty'; end if;
 select gold into strict w from wallet_fixture where character_id=g.character_id for update;
 select gold into strict c from character_fixture where character_id=g.character_id for update;
 b:=(g.state#>>'{bank,gold}')::bigint;
 if w is distinct from c or w is distinct from (g.state#>>'{character,gold}')::bigint or b is null or b<0 then raise exception 'wallet_mismatch'; end if;
 if w+iq*80>9007199254740991 or b+bq*80>9007199254740991 then raise exception 'gold_overflow'; end if;
 s:=jsonb_set(jsonb_set(jsonb_set(jsonb_set(g.state,'{inventory,stacks}',inv),'{bank,stacks}',bank),'{character,gold}',to_jsonb(w+iq*80)),'{bank,gold}',to_jsonb(b+bq*80));
 if jsonb_typeof(s#>'{settings,favoriteItemIds}')='array' then s:=jsonb_set(s,'{settings,favoriteItemIds}',(s#>'{settings,favoriteItemIds}')-'ECHO_BAT_WING'); end if;
 if jsonb_typeof(s#>'{settings,lockedItemIds}')='array' then s:=jsonb_set(s,'{settings,lockedItemIds}',(s#>'{settings,lockedItemIds}')-'ECHO_BAT_WING'); end if;
 update state_fixture set state=s,revision=revision+1 where account_id=a;
 update wallet_fixture set gold=w+iq*80 where character_id=g.character_id;
 update character_fixture set gold=c+iq*80 where character_id=g.character_id;
 insert into receipt_fixture values(a,'ECHO_BAT_WING',1,iq,bq,iq*80,bq*80);
 insert into notice_fixture values(a,'ECHO_BAT_WING',1,case when fail_notice then null else format('Retired %s wings at 80 Gold each. Carried Gold +%s; Bank Gold +%s.',iq+bq,iq*80,bq*80) end);
 return 'converted';
end $$;

insert into state_fixture values('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',7,'{"character":{"gold":100},"inventory":{"stacks":[{"itemId":"ECHO_BAT_WING","quantity":143},{"itemId":"RUNEBOUND_CORE","quantity":7}]},"bank":{"gold":200,"stacks":[{"itemId":"ECHO_BAT_WING","quantity":707}]},"settings":{"lockedItemIds":["ECHO_BAT_WING","RUNEBOUND_CORE"],"favoriteItemIds":["ECHO_BAT_WING"]}}');
insert into wallet_fixture values('00000000-0000-0000-0000-000000000002',100);
insert into character_fixture select * from wallet_fixture;

do $$
declare a uuid:='00000000-0000-0000-0000-000000000001'; old jsonb; g state_fixture%rowtype;
begin
 select state into old from state_fixture where account_id=a;
 begin perform retire_fixture(a,7); raise exception 'gate_did_not_block'; exception when others then if sqlerrm<>'issuance_not_closed' then raise; end if; end;
 update gate_fixture set issuance_closed=true;
 begin perform retire_fixture(a,6); raise exception 'stale_did_not_block'; exception when others then if sqlerrm<>'stale_state' then raise; end if; end;
 begin perform retire_fixture(a,7,true); raise exception 'rollback_did_not_block'; exception when not_null_violation then null; end;
 if (select state from state_fixture where account_id=a) is distinct from old or exists(select 1 from receipt_fixture) or (select gold from wallet_fixture)<>100 then raise exception 'rollback_failed'; end if;
 if retire_fixture(a,7)<>'converted' then raise exception 'conversion_failed'; end if;
 select * into g from state_fixture where account_id=a;
 if g.revision<>8 or (g.state#>>'{character,gold}')::bigint<>11540 or (g.state#>>'{bank,gold}')::bigint<>56760 or (select gold from wallet_fixture)<>11540 or (select gold from character_fixture)<>11540 then raise exception 'wrong_credit'; end if;
 if g.state#>'{inventory,stacks}'<>'[{"itemId":"RUNEBOUND_CORE","quantity":7}]'::jsonb or g.state#>'{bank,stacks}'<>'[]'::jsonb or g.state#>'{settings,lockedItemIds}'<>'["RUNEBOUND_CORE"]'::jsonb or g.state#>'{settings,favoriteItemIds}'<>'[]'::jsonb then raise exception 'protected_stock_or_flags_changed'; end if;
 if (select character_credit+bank_credit from receipt_fixture)<>68000 or (select count(*) from notice_fixture)<>1 then raise exception 'receipt_or_notice_failed'; end if;
 if retire_fixture(a,7)<>'replay' or (select count(*) from receipt_fixture)<>1 or (select gold from wallet_fixture)<>11540 then raise exception 'replay_paid_twice'; end if;
 update state_fixture set state=jsonb_set(state,'{bank,stacks}','[{"itemId":"ECHO_BAT_WING","quantity":1}]') where account_id=a;
 begin perform retire_fixture(a,8); raise exception 'late_did_not_block'; exception when others then if sqlerrm<>'late_issuance' then raise; end if; end;
 raise notice 'PASS: issuance gate, revision conflict, atomic rollback, full value split, unrelated stock, protection cleanup, receipt/notice, replay, late issuance';
end $$;
rollback;
