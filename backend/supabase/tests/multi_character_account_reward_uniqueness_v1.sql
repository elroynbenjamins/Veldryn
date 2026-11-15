-- Cross-mode multi-character reward invariant: one logical entitlement per
-- account. Read-only validation; safe on staging or production.
do $qa$
declare v_missing text;
begin
  select string_agg(expected.label, ', ' order by expected.label)
    into v_missing
    from (values
      ('Party Contract', 'public.party_contract_reward_entitlements_v16', '(instance_id, account_id, reward_key)'),
      ('World Boss', 'public.shared_world_world_boss_reward_claims', '(boss_id, account_id, reward_key)'),
      ('World Boss final rank', 'public.shared_world_world_boss_final_ranks', '(boss_id, account_id)'),
      ('Guild PvE', 'public.guild_pve_claims_v1', '(account_id, scope_key, milestone)'),
      ('Guild PvE roster', 'public.guild_pve_members_v1', '(encounter_id, account_id)'),
      ('Party membership', 'public.party_members', '(account_id)')
    ) as expected(label, relation_name, key_columns)
   where not exists (
     select 1 from pg_indexes ix
      where ix.schemaname='public'
        and format('%I.%I',ix.schemaname,ix.tablename)=expected.relation_name
        and ix.indexdef like 'CREATE UNIQUE INDEX %'
        and position(expected.key_columns in ix.indexdef)>0
        and (expected.label<>'Party membership' or position('WHERE (left_at IS NULL)' in ix.indexdef)>0)
   );
  if v_missing is not null then
    raise exception 'multi_character_account_uniqueness_missing: %',v_missing;
  end if;
end
$qa$;
