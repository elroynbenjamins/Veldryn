import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.cwd(),'../..');
const migrationPath=path.join(root,'backend/supabase/migrations/20261018000100_social_direct_invitations.sql');
const clientPath=path.join(root,'apps/mobile/src/online/social.ts');
const migration=fs.readFileSync(migrationPath,'utf8');
const client=fs.readFileSync(clientPath,'utf8');

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

console.log('PASS: direct social invitation migration/client contract');
