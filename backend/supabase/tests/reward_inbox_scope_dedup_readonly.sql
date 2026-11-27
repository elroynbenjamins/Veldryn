-- No writes. Synthetic canonical scope test and live projection parity.
with fixture(scope,source_id,created_at,claimed_at) as (
 values ('mixed',1,1,null::integer),('mixed',2,2,7),
 ('pending',3,2,null),('pending',4,1,null),
 ('claimed',5,1,9),('claimed',6,2,8)
), canonical as (
 select distinct on(scope) * from fixture
 order by scope,(claimed_at is null),claimed_at asc nulls last,created_at,source_id
)
select count(*)=3 and bool_and(case scope when 'mixed' then source_id=2 and claimed_at=7 when 'pending' then source_id=4 and claimed_at is null when 'claimed' then source_id=6 and claimed_at=8 else false end) as passed from canonical;

with party_rows as (
 select r.account_id,r.id source_id,i.definition_id,i.season_key,r.reward_key,r.reward_json,r.created_at,
 coalesce(r.claimed_at,(select min(a.created_at) from public.server_action_receipts a where a.account_id=r.account_id and a.action='party_contract_reward' and a.idempotency_key=i.definition_id||':'||i.season_key||':'||r.reward_key)) claimed_at
 from public.party_contract_reward_entitlements_v16 r join public.party_contract_instances_v16 i on i.id=r.instance_id
), expected as (
 select account_id,definition_id,season_key,reward_key,count(*) n,min(claimed_at) earliest_claim from party_rows group by 1,2,3,4
), canonical as (
 select distinct on(account_id,definition_id,season_key,reward_key) * from party_rows
 order by account_id,definition_id,season_key,reward_key,(claimed_at is null),claimed_at asc nulls last,created_at asc,source_id asc
)
select (select count(*) from party_rows) input_rows,(select count(*) from expected) expected_scopes,(select count(*) from canonical) output_rows,
 (select count(*) from expected e join canonical c using(account_id,definition_id,season_key,reward_key) where e.earliest_claim is distinct from c.claimed_at) claim_mismatches,
 (select count(*) from expected where n>1) duplicate_scopes;
