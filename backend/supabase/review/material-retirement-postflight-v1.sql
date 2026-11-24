-- READ ONLY: post-release reconciliation. Safe before release too; ready=false until closure/conversion.
with stock as (
 select account_id,
  coalesce((select sum((x->>'quantity')::bigint) from jsonb_array_elements(case when jsonb_typeof(state#>'{inventory,stacks}')='array' then state#>'{inventory,stacks}' else '[]'::jsonb end) x where x->>'itemId' in ('ECHO_BAT_WING','ITEM_0077')),0) active_qty,
  coalesce((select sum((x->>'quantity')::bigint) from jsonb_array_elements(case when jsonb_typeof(state#>'{bank,stacks}')='array' then state#>'{bank,stacks}' else '[]'::jsonb end) x where x->>'itemId' in ('ECHO_BAT_WING','ITEM_0077')),0) bank_qty,
  coalesce((select sum((x->>'quantity')::bigint) from jsonb_array_elements(case when jsonb_typeof(state#>'{overflow,stacks}')='array' then state#>'{overflow,stacks}' else '[]'::jsonb end) x where x->>'itemId' in ('ECHO_BAT_WING','ITEM_0077')),0) overflow_qty,
  coalesce((select sum((x->>'quantity')::bigint) from jsonb_array_elements(case when jsonb_typeof(state->'otherCharacters')='array' then state->'otherCharacters' else '[]'::jsonb end) o cross join lateral jsonb_array_elements(case when jsonb_typeof(o#>'{inventory,stacks}')='array' then o#>'{inventory,stacks}' else '[]'::jsonb end) x where x->>'itemId' in ('ECHO_BAT_WING','ITEM_0077')),0) inactive_qty
 from public.online_game_states
), state_refs as (
 select count(*) unexpected
 from public.online_game_states
 where (state#-'{settings,seenItemIds}')::text ~* 'ECHO_BAT_WING|ITEM_0077'
), receipts as (
 select count(*) count,
  coalesce(sum((response->>'inventoryQuantity')::bigint),0) inventory_quantity,
  coalesce(sum((response->>'bankQuantity')::bigint),0) bank_quantity,
  coalesce(sum((response->>'carriedCredit')::bigint),0) carried_credit,
  coalesce(sum((response->>'bankCredit')::bigint),0) bank_credit
 from public.server_action_receipts
 where action='material_retirement_v1' and idempotency_key='echo-bat-wing-retirement-v1'
), notices as (
 select count(*) count,count(*) filter(where claimed_at is null) unclaimed
 from private.reward_inbox_v1
 where source_key='material-retirement:echo-bat-wing-retirement-v1'
), wallets as (
 select count(*) mismatches
 from public.online_game_states g
 join public.character_wallets w on w.character_id=g.character_id
 join public.characters c on c.id=g.character_id and c.account_id=g.account_id
 where w.gold is distinct from c.gold or w.gold::text is distinct from g.state#>>'{character,gold}'
)
select
 (select coalesce(sum(active_qty+bank_qty+overflow_qty+inactive_qty),0) from stock) remaining_quantity,
 (select count(*) from private.reward_gift_catalog_v1 where resource_id in ('ECHO_BAT_WING','ITEM_0077') or id in ('ECHO_BAT_WING','ITEM_0077')) open_gift_catalog_rows,
 (select count(*) from private.reward_inbox_v1 where claimed_at is null and attachments::text ~* 'ECHO_BAT_WING|ITEM_0077') pending_inbox_rewards,
 (select count from receipts) receipt_count,
 (select inventory_quantity+bank_quantity from receipts) retired_quantity,
 (select carried_credit+bank_credit from receipts) credited_gold,
 (select count from notices) notice_count,
 (select unexpected from state_refs) unexpected_state_references,
 (select unclaimed from notices) claimable_notice_count,
 (select mismatches from wallets) wallet_mismatches,
 (
   (select coalesce(sum(active_qty+bank_qty+overflow_qty+inactive_qty),0) from stock)=0
   and (select count(*) from private.reward_gift_catalog_v1 where resource_id in ('ECHO_BAT_WING','ITEM_0077') or id in ('ECHO_BAT_WING','ITEM_0077'))=0
   and (select count(*) from private.reward_inbox_v1 where claimed_at is null and attachments::text ~* 'ECHO_BAT_WING|ITEM_0077')=0
   and (select unexpected from state_refs)=0
   and (select count from receipts)=(select count from notices)
   and (select unclaimed from notices)=0
   and (select mismatches from wallets)=0
 ) as database_reconciliation_ready;
