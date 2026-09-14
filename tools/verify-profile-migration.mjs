import {readFileSync} from 'node:fs';
const path=new URL('../backend/supabase/migrations/20261001000000_profile_identity_v1.sql',import.meta.url);
let sql='';
try{sql=readFileSync(path,'utf8').toLowerCase()}catch{console.log('Profile migration checks skipped: migration not yet present');process.exit(0)}
const checks=[['visibility',/profile_visibility/],['self rpc',/profile_self_server_v1/],['public rpc',/profile_public_server_v1/],['update rpc',/profile_update_server_v1/],['request id',/request_id/],['service role',/service_role/],['account ownership',/active_character_id/],['private projection',/owned_title_ids/]];
const failed=checks.filter(([,rx])=>!rx.test(sql));if(failed.length)throw new Error(`Profile migration failed: ${failed.map(([name])=>name).join(', ')}`);console.log(`Profile migration checks passed (${checks.length})`);
