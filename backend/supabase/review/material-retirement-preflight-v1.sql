-- READ-ONLY production-schema preflight. No write statements, no activation.
-- Review on staging/production; result is an aggregate, not authorization.
with roots as (
 select account_id,character_id,state,revision from public.online_game_states
 where state::text ~* 'ECHO_BAT_WING|ITEM_0077'
), locations as (
 select account_id,character_id,'active_inventory' as location,state#>'{inventory,stacks}' stacks from roots
 union all select account_id,character_id,'shared_bank',state#>'{bank,stacks}' from roots
 union all select account_id,character_id,'active_overflow',state#>'{overflow,stacks}' from roots
 union all select r.account_id,null,'inactive_inventory',o#>'{inventory,stacks}' from roots r cross join lateral jsonb_array_elements(case when jsonb_typeof(r.state->'otherCharacters')='array' then r.state->'otherCharacters' else '[]'::jsonb end) o
 union all select r.account_id,null,'inactive_overflow',o#>'{overflow,stacks}' from roots r cross join lateral jsonb_array_elements(case when jsonb_typeof(r.state->'otherCharacters')='array' then r.state->'otherCharacters' else '[]'::jsonb end) o
), matched as (
 select account_id,location,x->>'itemId' item_id,
 case when x->>'quantity' ~ '^[1-9][0-9]*$' then (x->>'quantity')::numeric end quantity,
 x ? 'instanceId' as instance_key
 from locations cross join lateral jsonb_array_elements(case when jsonb_typeof(stacks)='array' then stacks else '[]'::jsonb end) x
 where x->>'itemId' in ('ECHO_BAT_WING','ITEM_0077')
), stock as (
 select account_id,coalesce(sum(quantity) filter(where location='active_inventory' and item_id='ECHO_BAT_WING'),0) inv,
 coalesce(sum(quantity) filter(where location='shared_bank' and item_id='ECHO_BAT_WING'),0) bank,
 count(*) filter(where quantity is null or instance_key or item_id<>'ECHO_BAT_WING' or location not in ('active_inventory','shared_bank')) blockers
 from matched group by account_id
), checks as (
 select r.account_id,coalesce(s.inv,0) inv,coalesce(s.bank,0) bank,
 case when coalesce(s.blockers,0)>0 or r.state#>>'{character,id}' is distinct from r.character_id::text
 or c.id is null or w.character_id is null
 or not coalesce(r.state#>>'{character,gold}' ~ '^[0-9]+$',false)
 or not coalesce(r.state#>>'{bank,gold}' ~ '^[0-9]+$',false)
 or c.gold is distinct from w.gold
 or c.gold::text is distinct from r.state#>>'{character,gold}'
 or coalesce(s.inv,0)+coalesce(s.bank,0)=0
 or jsonb_typeof(r.state#>'{inventory,stacks}') is distinct from 'array'
 or jsonb_typeof(r.state#>'{bank,stacks}') is distinct from 'array'
 or jsonb_typeof(r.state#>'{overflow,stacks}') is distinct from 'array'
 then true else false end blocked,
 case when jsonb_typeof(r.state->'otherCharacters')='array' then jsonb_array_length(r.state->'otherCharacters') else 0 end inactive_count
 from roots r left join stock s using(account_id)
 left join public.characters c on c.id=r.character_id and c.account_id=r.account_id
 left join public.character_wallets w on w.character_id=r.character_id
)
select count(*) reference_accounts,count(*) filter(where blocked) blocked_accounts,
 count(*) filter(where inactive_count>0) affected_with_inactive_roster,
 coalesce(sum(inv),0) active_quantity,coalesce(sum(bank),0) bank_quantity,
 coalesce(sum(inv)*80,0) estimated_carried_credit,coalesce(sum(bank)*80,0) estimated_bank_credit,
 (select count(*) from private.reward_gift_catalog_v1 where resource_id in ('ECHO_BAT_WING','ITEM_0077')) open_gift_sources
from checks;
