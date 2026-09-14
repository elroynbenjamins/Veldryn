import fs from 'node:fs';
const path=new URL('../backend/supabase/migrations/20261010000000_parties_contracts_guild_seekers_v1.sql',import.meta.url);
const sql=fs.readFileSync(path,'utf8');
const required=[
  'party_members_one_current_party_per_account_v16',
  'public.server_action_receipts',
  'enforce_persistent_party_size_v16',
  'create_persistent_party_v16',
  'join_persistent_party_v16',
  'leave_persistent_party_v16',
  'party_contract_definitions_v16',
  'party_contract_objectives_v16',
  'party_contract_contributions_v16',
  'record_party_contract_contribution_v16',
  'create_party_contract_rewards_v16',
  'party_ranked_events_v16',
  'party_rankings_v16',
  'recruitment_one_active_owner_type_v16',
  "interval '6 hours'",
  "then 1 else 3 end",
  'active_recruitment_posts',
  'expires_at>now()',
  'party chat current members read v16',
  "p_role not in ('tank','damage','support')",
  "p_focus not in ('combat','skilling','mixed')",
  'service_role',
];
for(const token of required){if(!sql.includes(token))throw new Error(`missing migration invariant: ${token}`);}
if(/create\s+table[^;]*(party_currency|party_token|party_coin)/i.test(sql)) throw new Error('v16 must not introduce Party currency');
if((sql.match(/\$\$/g)?.length??0)%2!==0) throw new Error('unbalanced dollar-quoted SQL blocks');
if(!/least\(v_target,v_old_units\+round\(p_delta_units,4\)\)/.test(sql)) throw new Error('contract contribution must cap objective units');
if(!/unique\(instance_id,idempotency_key\)/.test(sql)) throw new Error('contribution idempotency uniqueness missing');
console.log(`v16 migration static audit passed (${required.length} invariants)`);
