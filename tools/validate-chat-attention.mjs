import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.cwd(),'../..');
const migration=fs.readFileSync(path.join(root,'backend/supabase/migrations/20261018000150_chat_unread_mentions.sql'),'utf8');
const client=fs.readFileSync(path.join(root,'apps/mobile/src/online/social.ts'),'utf8');
const hook=fs.readFileSync(path.join(root,'apps/mobile/src/online/useSocialNotificationCounts.ts'),'utf8');
const overlay=fs.readFileSync(path.join(root,'apps/mobile/src/components/ChatOverlay.tsx'),'utf8');
const dock=fs.readFileSync(path.join(root,'apps/mobile/src/components/ChatDock.tsx'),'utf8');
const guild=fs.readFileSync(path.join(root,'apps/mobile/src/components/GuildChat.tsx'),'utf8');
const party=fs.readFileSync(path.join(root,'apps/mobile/src/components/OnlinePartyChat.tsx'),'utf8');
const message=fs.readFileSync(path.join(root,'apps/mobile/src/components/ChatMessageText.tsx'),'utf8');
const nav=fs.readFileSync(path.join(root,'apps/mobile/src/core/navigation-notifications.ts'),'utf8');

function need(haystack,needle,label){if(!haystack.includes(needle))throw new Error('chat attention contract missing '+label+': '+needle);}
function reject(haystack,needle,label){if(haystack.includes(needle))throw new Error('chat attention contract still contains '+label+': '+needle);}

for(const [needle,label] of [
 ['create table if not exists public.chat_read_markers_v1','server read-marker table'],
 ['primary key(account_id,channel_type,channel_id)','per-account/channel read marker key'],
 ['social_chat_attention_state_v1','attention state RPC'],
 ['mark_social_chat_read_v1','mark-read RPC'],
 ["p_channel_type not in('guild','party')",'channel allowlist'],
 ["cm.account_id<>v_uid",'own-message exclusion'],
 ['public.player_blocks','blocked-message exclusion'],
 ["position('@'||lower(v_display_name) in lower(cm.body))>0",'mention count'],
 ["insert into public.chat_read_markers_v1",'first-view baseline/read persistence'],
 ["m.channel_type='guild'",'Guild unread scope'],
 ["m.channel_type='party'",'Party unread scope'],
 ["pm.left_at is null and p.status<>'disbanded'",'active persistent Party scope'],
])need(migration,needle,label);

for(const rpc of ['social_chat_attention_state_v1','mark_social_chat_read_v1'])need(client,"rpc('"+rpc+"'","mobile RPC "+rpc);
for(const [needle,label] of [
 ['guildChatUnread','Guild unread projection'],
 ['guildChatMentions','Guild mention projection'],
 ['partyChatUnread','Party unread projection'],
 ['partyChatMentions','Party mention projection'],
 ['setInterval(()=>void refresh(),15000)','social attention polling'],
])need(hook,needle,label);

for(const [needle,label] of [
 ['TabAttention','per-channel tab attention'],
 ['guildUnread','Guild tab unread'],
 ['partyUnread','Party tab unread'],
 ['guildMentions','Guild tab mentions'],
 ['partyMentions','Party tab mentions'],
 ['visibleGuildUnread','active Guild badge suppression'],
 ['visiblePartyUnread','active Party badge suppression'],
])need(overlay,needle,label);

need(dock,'mentionCount','dock mention attention');
need(dock,'unreadCount','dock unread attention');
need(guild,"markSocialChatRead('guild')",'Guild clear-on-view');
need(party,"markSocialChatRead('party')",'Party clear-on-view');
need(message,'chatMentionSegments','message mention highlighting');
need(message,'selfMention','self-mention styling');
need(nav,"chat_unread:{primary:'account',subroute:'social.chat',mode:'count'}",'canonical chat notification route');
reject(nav,'unread_dm','obsolete direct-message notification kind');

console.log('PASS: persistent Guild/Party chat unread and mention contract');
