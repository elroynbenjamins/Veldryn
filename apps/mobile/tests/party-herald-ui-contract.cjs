// Guard the Party Herald contract across database, transport and presentation.
const fs=require('fs');
const assert=require('assert');
const read=path=>fs.readFileSync(path,'utf8');
const sql=read('../../backend/supabase/migrations/20261116195000_party_chat_system_announcements_v1.sql');
const transport=read('src/online/party-social.ts');
const chat=read('src/components/OnlinePartyChat.tsx');
const social=read('src/online/social.ts');
const names=[
 'party_herald_member_change_v1',
 'party_herald_contract_completed_v1',
 'party_herald_event_score_v1',
 'chat_messages_party_system_event_unique_v1'
];
for(const name of names)assert(sql.includes(name),'Missing SQL guard: '+name);
for(const name of ['2000','4000','6000','9000'])assert(sql.includes(name),'Missing canonical party milestone: '+name);
assert(sql.includes('CREATE POLICY "party chat current members read v16"'),'Missing member-only read policy');
assert(sql.includes('public.is_active_party_member_v16'),'System notices must remain private to active members');
assert(sql.includes('REVOKE ALL ON FUNCTION public.party_chat_post_system_event_v1'),'Clients must not forge system events');
assert(sql.includes('OR (NOT is_system AND account_id IS NOT NULL'),'Normal messages require an account');
assert(transport.includes("select('id,account_id,is_system,sender_name,body,created_at')"),'Party feed must project authoritative is_system flag');
assert(transport.includes('account_id:string|null;is_system?:boolean'),'Party chat must allow null system sender');
assert(chat.includes('message.is_system&&message.account_id===null'),'Party system row must verify sender is not a player');
assert(chat.includes("accountId={message.account_id??undefined}"),'Normal players must retain profile identities');
assert(chat.includes("message={selected?.account_id?"),'System notices must never open player profiles');
assert(social.includes('typeof id===\'string\'&&id.length>0'),'System notices must not trigger player identity fetches');
console.log('PASS: Party Herald SQL authorization, dedupe, canonical milestones and player-safe chat presentation');
