import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
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

for(const rpc of ['social_chat_attention_state_v1','mark_social_chat_read_v2'])need(client,"rpc('"+rpc+"'","mobile RPC "+rpc);
need(client,'p_channel_id:channelId,p_message_id:messageId','displayed message and explicit conversation acknowledgement');
reject(client,"rpc('mark_social_chat_read_v1'",'server-clock read acknowledgement in updated clients');
for(const [needle,label] of [
 ['guildChatUnread','Guild unread projection'],
 ['guildChatMentions','Guild mention projection'],
 ['partyChatUnread','Party unread projection'],
 ['partyChatMentions','Party mention projection'],
 // Unread badges refresh every 30s while foregrounded, with immediate catch-up
 // on resume. Channel changes reuse the same account-scoped polling lifecycle.
 ["setInterval(()=>{if(AppState.currentState==='active')void refresh(false);},30000)",'foreground-only social attention polling'],
 ["const resumed=previous!=='active'&&status==='active'",'social attention catch-up on resume'],
 ['if(resumed)void refresh()','immediate social attention resume refresh'],
])need(hook,needle,label);

for(const [needle,label] of [
 ['RailTab','per-channel tab attention'],
 ['guildUnread','Guild tab unread'],
 ['partyUnread','Party tab unread'],
 ['guildMentions','Guild tab mentions'],
 ['partyMentions','Party tab mentions'],
])need(overlay,needle,label);
reject(overlay,'visibleGuildUnread','eager Guild unread suppression before catch-up');
reject(overlay,'visiblePartyUnread','eager Party unread suppression before catch-up');

need(dock,'mentionCount','dock mention attention');
need(dock,'unreadCount','dock unread attention');
need(guild,"await markSocialChatRead('guild',guild.id,messageId)",'Guild displayed-message catch-up read marker');
need(party,"await markSocialChatRead('party',id,messageId)",'Party displayed-message catch-up read marker');
for(const [component,label] of [[guild,'Guild'],[party,'Party']])need(component,'onCaughtUp={caughtUp}',label+' awaited read-result propagation');
need(message,'chatMentionSegments','message mention highlighting');
need(message,'selfMention','self-mention styling');
need(nav,"chat_unread:{primary:'account',subroute:'social.chat',mode:'count'}",'canonical chat notification route');
reject(nav,'unread_dm','obsolete direct-message notification kind');

console.log('PASS: persistent Guild/Party chat unread, catch-up and mention contract');
