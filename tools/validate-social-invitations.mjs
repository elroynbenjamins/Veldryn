import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.cwd(),'../..');
const migrationPath=path.join(root,'backend/supabase/migrations/20261018000100_social_direct_invitations.sql');
const managementMigrationPath=path.join(root,'backend/supabase/migrations/20261018000110_social_member_management.sql');
const successionMigrationPath=path.join(root,'backend/supabase/migrations/20261018000120_social_departure_succession.sql');
const clientPath=path.join(root,'apps/mobile/src/online/social.ts');
const partyClientPath=path.join(root,'apps/mobile/src/online/party-social.ts');
const migration=fs.readFileSync(migrationPath,'utf8');
const managementMigration=fs.readFileSync(managementMigrationPath,'utf8');
const successionMigration=fs.readFileSync(successionMigrationPath,'utf8');
const client=fs.readFileSync(clientPath,'utf8');
const partyClient=fs.readFileSync(partyClientPath,'utf8');

function need(haystack,needle,label){
 if(!haystack.includes(needle))throw new Error('social invitation contract missing '+label+': '+needle);
}

for(const [needle,label] of [
 ['create table if not exists public.party_invitations_v1','party invitation table'],
 ['create table if not exists public.guild_invitations_v1','guild invitation table'],
 ['social_invite_capabilities_v1','capability RPC'],
 ['send_party_invitation_v1','party send RPC'],
 ['respond_party_invitation_v1','party response RPC'],
 ['send_guild_invitation_v1','guild send RPC'],
 ['respond_guild_invitation_v1','guild response RPC'],
 ['social_invitation_state_v1','inbox RPC'],
 ['public.join_persistent_party_v16','authoritative Party join reuse'],
 ['public.party_social_blocked_v16','block enforcement'],
 ['party_invite_rate_limit','Party invite rate limit'],
 ['guild_invite_rate_limit','Guild invite rate limit'],
 ["when v_class in('IRONWARDEN','BASTION','DREADGUARD') then 'tank'",'Tank role inference'],
 ["when v_class in('DAWNKEEPER','STONECALLER') then 'support'",'Support role inference'],
])need(migration,needle,label);

for(const rpc of [
 'social_invitation_state_v1',
 'social_invite_capabilities_v1',
 'send_party_invitation_v1',
 'respond_party_invitation_v1',
 'send_guild_invitation_v1',
 'respond_guild_invitation_v1',
])need(client,"rpc('"+rpc+"'","mobile RPC "+rpc);

for(const [needle,label] of [
 ['transfer_party_leadership_v1','Party leadership transfer RPC'],
 ['remove_party_member_v1','Party remove-member RPC'],
 ['cancel_party_invitation_v1','Party invite cancellation RPC'],
 ['update_guild_member_role_v1','Guild role management RPC'],
 ['remove_guild_member_v1','Guild remove-member RPC'],
 ['cancel_guild_invitation_v1','Guild invite cancellation RPC'],
 ['social_outgoing_invitation_state_v1','outgoing invitation state RPC'],
 ["v_actor_role='officer' and v_target_role<>'member'",'officer cannot manage officers'],
 ["if v_target_role='leader'",'Guild leader role protection'],
])need(managementMigration,needle,label);

for(const rpc of [
 'social_outgoing_invitation_state_v1',
 'cancel_guild_invitation_v1',
 'update_guild_member_role_v1',
 'remove_guild_member_v1',
])need(client,"rpc('"+rpc+"'","mobile Guild management RPC "+rpc);
for(const rpc of [
 'transfer_party_leadership_v1',
 'remove_party_member_v1',
 'cancel_party_invitation_v1',
])need(partyClient,"rpc<","Party client typed RPC container"),need(partyClient,"'"+rpc+"'","mobile Party management RPC "+rpc);

for(const [needle,label] of [
 ["interval '21 days'",'21-day inactivity threshold'],
 ["case candidate.role when 'officer' then 0 else 1 end",'Guild Officer-first succession'],
 ["order by candidate.joined_at,candidate.account_id",'oldest active Party successor'],
 ['player_activity_daily','server activity source'],
 ['last_sign_in_at','auth sign-in activity fallback'],
 ['social_activity_leadership_reconcile_v1','activity-triggered succession'],
 ['update public.guilds set owner_account_id=v_next_account','Guild owner synchronization'],
 ["set role='officer'",'outgoing Guild leader becomes Officer'],
 ['guild_leader_must_transfer_or_disband','leader leave safeguard'],
 ['transfer_guild_leadership_v1','manual Guild leadership transfer'],
 ['leave_guild_v1','Guild leave RPC'],
 ['disband_guild_v1','Guild disband RPC'],
 ['disband_party_v1','Party disband RPC'],
 ['party_leader_invitation_reconcile_v1','Party invite cleanup after leader change'],
])need(successionMigration,needle,label);

for(const rpc of [
 'guild_leadership_status_v1',
 'transfer_guild_leadership_v1',
 'leave_guild_v1',
 'disband_guild_v1',
])need(client,"rpc('"+rpc+"'","mobile Guild succession/departure RPC "+rpc);
need(partyClient,"'disband_party_v1'","mobile Party disband RPC");

console.log('PASS: direct social invitation migration/client contract');
