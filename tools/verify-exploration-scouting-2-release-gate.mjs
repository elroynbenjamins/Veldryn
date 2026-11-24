import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../backend/supabase/release-gates/exploration_scouting_2_release_check.sql',import.meta.url),'utf8').toLowerCase();
const required=[
 'account_exploration_v1','character_scouting_access_v1','scouting_assignments_v1','scouting_claims_v1',
 'scouting_snapshot_server_v1','scouting_dispatch_server_v1','scouting_claim_server_v1','scouting_migrate_account_server_v1',
 'exploration2_first_report','exploration2_asterfall_cartographer','exploration2_sunscar_cartographer','exploration2_frostmarch_cartographer','exploration2_known_realm',
 'relrowsecurity',"has_function_privilege('service_role'","has_function_privilege('authenticated'","has_function_privilege('anon'"
];
const missing=required.filter(x=>!sql.includes(x));
if(missing.length)throw Error('Exploration 2.0 release gate missing: '+missing.join(', '));
const withoutComments=sql.replace(/--.*$/gm,'');
if(/\b(insert|update|delete|create|alter|drop|truncate)\b/.test(withoutComments))throw Error('Exploration release gate must remain read-only');
console.log('Exploration 2.0 release gate static checks passed ('+required.length+')');
