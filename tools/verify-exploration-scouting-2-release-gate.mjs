import {readFileSync} from 'node:fs';
const gate=readFileSync(new URL('../backend/supabase/release-gates/exploration_scouting_2_release_check.sql',import.meta.url),'utf8').toLowerCase();
const migration=readFileSync(new URL('../backend/supabase/migrations/20261124123857_exploration_scouting_2_hidden_foundation_v1.sql',import.meta.url),'utf8').toLowerCase();
const indexMigration=readFileSync(new URL('../backend/supabase/migrations/20261124123959_exploration_scouting_2_hidden_foundation_indexes_v1.sql',import.meta.url),'utf8').toLowerCase();
const required=[
 'scouting_runtime_config_v1','account_exploration_v1','character_scouting_access_v1','scouting_assignments_v1','scouting_claims_v1',
 'scouting_snapshot_server_v1','scouting_dispatch_server_v1','scouting_claim_server_v1','scouting_migrate_account_server_v1',
 'achievement_snapshot_server_v1','achievement_claim_server_v1','achievement_showcase_update_server_v1',
 'exploration2_first_report','exploration2_asterfall_cartographer','exploration2_sunscar_cartographer','exploration2_frostmarch_cartographer','exploration2_known_realm',
 'relrowsecurity',"has_function_privilege('service_role'","has_function_privilege('authenticated'","has_function_privilege('anon'","runtime_not_released","placeholder_remaining"
];
const missing=required.filter(x=>!gate.includes(x));
if(missing.length)throw Error('Exploration 2.0 release gate missing: '+missing.join(', '));
const withoutComments=gate.replace(/--.*$/gm,'');
if(/\b(insert|update|delete|create|alter|drop|truncate)\b/.test(withoutComments))throw Error('Exploration release gate must remain read-only');
for(const token of ['released boolean not null default false','values(true,false)','enable row level security','from public,anon,authenticated','to service_role','scouting_dispatch_settlement_not_ready','scouting_claim_settlement_not_ready','achievement_reward_settlement_not_ready']){
 if(!migration.includes(token))throw Error('Hidden foundation migration missing: '+token);
}
if(!indexMigration.includes('achievement_claims_achievement_idx_v1'))throw Error('Exploration foundation index migration missing');
console.log('Exploration 2.0 migration/release static checks passed ('+required.length+')');
