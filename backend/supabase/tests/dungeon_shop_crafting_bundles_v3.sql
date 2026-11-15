-- Synthetic, rollback-only contract: verify one complete purchase and safety checks.
begin;
set local statement_timeout='30s';
do $qa$
declare
 a uuid:=gen_random_uuid();
 c uuid:=gen_random_uuid();
 bought jsonb;
 replay jsonb;
 balance bigint;
begin
 insert into auth.users(id,email) values(a,'dshop-bundle-test-'||a::text||'@example.invalid');
 insert into public.characters(id,account_id,name,class_id,gold)
 values(c,a,'ShopQa'||translate(substr(replace(c::text,'-',''),1,10),'0123456789abcdef','abcdefghijklmnop'),'BASTION',100);
 insert into public.online_game_states(account_id,character_id,revision,state)
 values(a,c,1,jsonb_build_object('version',11,'account','{}'::jsonb,'character',jsonb_build_object('id',c::text,'gold',100),
 'inventory',jsonb_build_object('capacity',30,'stacks','[]'::jsonb),
 'bank',jsonb_build_object('capacity',1,'stacks',jsonb_build_array(jsonb_build_object('itemId','MOSS_FIBER','quantity',25)))));
 insert into public.expedition_wallets(account_id,expedition_marks) values(a,5000);
 update public.dungeon_shop_settings_v1 set enabled=true where singleton;
 bought:=public.dungeon_shop_purchase_server_v1(a,'dshop_moss_fiber_100','shop-test-bundle-001');
 if bought->>'status'<>'purchased' or bought->>'balance'<>'4850' then raise exception 'purchase: %',bought;end if;
 if (select (state#>>'{bank,stacks,0,quantity}')::bigint from public.online_game_states where account_id=a)<>125
 then raise exception 'bank grant mismatch';end if;
 if (select revision from public.online_game_states where account_id=a)<>2 then raise exception 'revision mismatch';end if;
 replay:=public.dungeon_shop_purchase_server_v1(a,'dshop_moss_fiber_100','shop-test-bundle-001');
 if replay->>'idempotentReplay'<>'true' then raise exception 'idempotency: %',replay;end if;
 begin
   perform public.dungeon_shop_purchase_server_v1(a,'dshop_moss_fiber_100','shop-test-bundle-002');
   raise exception 'weekly cap not enforced';
 exception when raise_exception then
   if sqlerrm<>'dungeon_shop_weekly_limit' then raise;end if;
 end;
 begin
   perform public.dungeon_shop_purchase_server_v1(a,'dshop_greenwood_log_100','shop-test-bundle-003');
   raise exception 'full bank accepted';
 exception when raise_exception then
   if sqlerrm<>'dungeon_shop_bank_full' then raise;end if;
 end;
 select expedition_marks into balance from public.expedition_wallets where account_id=a;
 if balance<>4850 then raise exception 'failed or retried purchase charged Marks: %',balance;end if;
 if (select count(*) from public.dungeon_shop_receipts_v1 where account_id=a)<>1
 then raise exception 'failed purchase created receipt';end if;
 if has_function_privilege('authenticated','public.dungeon_shop_purchase_server_v1(uuid,text,text)','execute')
 then raise exception 'public purchase RPC exposure';end if;
end $qa$;
select 'PASS: Dungeon Shop x100 Bank grant, retry, weekly cap, full storage and RPC permission' as result;
rollback;
