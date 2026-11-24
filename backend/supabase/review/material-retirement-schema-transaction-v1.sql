-- REVIEW ONLY: production-shaped transaction candidate; never auto-apply.
-- Run only on an isolated schema clone after verified issuance closure.
-- Default guard deliberately fails. Even with guard changed in a reviewed clone,
-- final ROLLBACK is mandatory. No production migration is included here.
begin;
do $$
declare
 release_cleared constant boolean := false;
 a uuid; g public.online_game_states%rowtype; c public.characters%rowtype;
 w bigint; b bigint; iq bigint; bq bigint; i jsonb; k jsonb; s jsonb; check_state jsonb;
 receipt_id constant text := 'echo-bat-wing-retirement-v1';
begin
 if not release_cleared then raise exception 'review_only_retirement_disabled'; end if;
 if exists(select 1 from private.reward_gift_catalog_v1 where resource_id in ('ECHO_BAT_WING','ITEM_0077')) then raise exception 'gift_issuance_open'; end if;
 if exists(select 1 from private.reward_inbox_v1 where claimed_at is null and attachments::text ~* 'ECHO_BAT_WING|ITEM_0077') then raise exception 'pending_inbox'; end if;
 if exists(select 1 from public.coop_reward_entitlements where claimed_at is null and reward_json::text ~* 'ECHO_BAT_WING|ITEM_0077') then raise exception 'pending_coop'; end if;
 if exists(select 1 from public.party_contract_reward_entitlements_v16 where claimed_at is null and reward_json::text ~* 'ECHO_BAT_WING|ITEM_0077') then raise exception 'pending_party'; end if;
 if exists(select 1 from public.item_instances where item_id in ('ECHO_BAT_WING','ITEM_0077')) or exists(select 1 from public.account_bank_items where item_id in ('ECHO_BAT_WING','ITEM_0077')) then raise exception 'relational_custody_not_supported'; end if;
 if exists(select 1 from public.guild_bank_balances where resource_id in ('ECHO_BAT_WING','ITEM_0077') and amount>0) then raise exception 'guild_custody_not_supported'; end if;
 -- Every referenced account is locked and re-read; the historical seen flag is
 -- preserved. Any additional custody/queued reference requires a separate review.
 for a in select account_id from public.online_game_states where state::text ~* 'ECHO_BAT_WING|ITEM_0077' order by account_id loop
  perform pg_advisory_xact_lock(hashtextextended('party-account:'||a,0));
  select * into strict g from public.online_game_states where account_id=a for update;
  if jsonb_typeof(g.state#>'{inventory,stacks}') is distinct from 'array' or jsonb_typeof(g.state#>'{bank,stacks}') is distinct from 'array' then raise exception 'invalid_storage'; end if;
  if exists(select 1 from jsonb_array_elements((g.state#>'{inventory,stacks}')||(g.state#>'{bank,stacks}')) x where x->>'itemId'='ECHO_BAT_WING' and (coalesce(x->>'quantity','') !~ '^[1-9][0-9]*$' or x ? 'instanceId')) then raise exception 'invalid_stack'; end if;
  select coalesce(sum((x->>'quantity')::bigint) filter(where x->>'itemId'='ECHO_BAT_WING'),0),coalesce(jsonb_agg(x order by ord) filter(where x->>'itemId' is distinct from 'ECHO_BAT_WING'),'[]'::jsonb) into iq,i from jsonb_array_elements(g.state#>'{inventory,stacks}') with ordinality t(x,ord);
  select coalesce(sum((x->>'quantity')::bigint) filter(where x->>'itemId'='ECHO_BAT_WING'),0),coalesce(jsonb_agg(x order by ord) filter(where x->>'itemId' is distinct from 'ECHO_BAT_WING'),'[]'::jsonb) into bq,k from jsonb_array_elements(g.state#>'{bank,stacks}') with ordinality t(x,ord);
  s:=jsonb_set(jsonb_set(g.state,'{inventory,stacks}',i),'{bank,stacks}',k);
  if jsonb_typeof(s#>'{settings,favoriteItemIds}')='array' then s:=jsonb_set(s,'{settings,favoriteItemIds}',(s#>'{settings,favoriteItemIds}')-'ECHO_BAT_WING'); end if;
  if jsonb_typeof(s#>'{settings,lockedItemIds}')='array' then s:=jsonb_set(s,'{settings,lockedItemIds}',(s#>'{settings,lockedItemIds}')-'ECHO_BAT_WING'); end if;
  check_state:=s#-'{settings,seenItemIds}';
  if check_state::text ~* 'ECHO_BAT_WING|ITEM_0077' then raise exception 'unexpected_custody_or_reference'; end if;
  if exists(select 1 from public.server_action_receipts where account_id=a and action='material_retirement_v1' and idempotency_key=receipt_id) then
   if iq+bq>0 then raise exception 'late_issuance'; end if;
   continue;
  end if;
  if iq+bq=0 then continue; end if;
  if g.character_id::text is distinct from g.state#>>'{character,id}' then raise exception 'character_identity_mismatch'; end if;
  select gold into strict w from public.character_wallets where character_id=g.character_id for update;
  select * into strict c from public.characters where id=g.character_id and account_id=a for update;
  b:=(g.state#>>'{bank,gold}')::bigint;
  if w is distinct from c.gold or w is distinct from (g.state#>>'{character,gold}')::bigint or b is null or b<0 or w<0 then raise exception 'wallet_mismatch'; end if;
  if w+iq*80>9007199254740991 or b+bq*80>9007199254740991 then raise exception 'gold_overflow'; end if;
  s:=jsonb_set(jsonb_set(s,'{character,gold}',to_jsonb(w+iq*80)),'{bank,gold}',to_jsonb(b+bq*80));
  update public.online_game_states set state=s,revision=revision+1,updated_at=now() where account_id=a and revision=g.revision;
  if not found then raise exception 'stale_state'; end if;
  update public.character_wallets set gold=w+iq*80,updated_at=now() where character_id=g.character_id;
  update public.characters set gold=c.gold+iq*80,updated_at=now() where id=g.character_id and account_id=a;
  insert into public.server_action_receipts(account_id,action,idempotency_key,response) values(a,'material_retirement_v1',receipt_id,jsonb_build_object('itemId','ECHO_BAT_WING','characterId',g.character_id,'inventoryQuantity',iq,'bankQuantity',bq,'unitSellGold',80,'carriedCredit',iq*80,'bankCredit',bq*80,'version',1));
  -- Existing gift/history schema: already delivered informational system mail,
  -- no attachments, no claim action, no second payout. Same atomic transaction.
  insert into private.reward_inbox_v1(account_id,source_key,source_kind,source_id,title,body,attachments,claimed_at)
  values(a,'material-retirement:'||receipt_id,'gift',gen_random_uuid(),'Material retirement compensation',
   format('We removed %s Echo Bat Wings at their full sell value of 80 Gold each. %s Gold was added to your character and %s Gold to your shared Bank. Your compensation has already been credited; no claim is needed.',iq+bq,iq*80,bq*80),
   '[]'::jsonb,now());
 end loop;
end $$;
rollback;
