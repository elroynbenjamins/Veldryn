import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.cwd(),'../..');
const migration=fs.readFileSync(path.join(root,'backend/supabase/migrations/20261018000160_chat_usability.sql'),'utf8');
const log=fs.readFileSync(path.join(root,'apps/mobile/src/components/ChatLog.tsx'),'utf8');
const mention=fs.readFileSync(path.join(root,'apps/mobile/src/components/ChatMentionSuggestions.tsx'),'utf8');
const world=fs.readFileSync(path.join(root,'apps/mobile/src/components/OnlineWorldChat.tsx'),'utf8');
const party=fs.readFileSync(path.join(root,'apps/mobile/src/components/OnlinePartyChat.tsx'),'utf8');
const guild=fs.readFileSync(path.join(root,'apps/mobile/src/components/GuildChat.tsx'),'utf8');
const overlay=fs.readFileSync(path.join(root,'apps/mobile/src/components/ChatOverlay.tsx'),'utf8');
const hook=fs.readFileSync(path.join(root,'apps/mobile/src/online/useSocialNotificationCounts.ts'),'utf8');

function need(haystack,needle,label){if(!haystack.includes(needle))throw new Error('chat usability contract missing '+label+': '+needle);}
function reject(haystack,needle,label){if(haystack.includes(needle))throw new Error('chat usability contract still contains '+label+': '+needle);}

for(const [needle,label] of [
 ['firstUnreadMessageId','first unread server projection'],
 ['lastReadAt','read-marker timestamp projection'],
 ["order by cm.created_at,cm.id",'stable first-unread order'],
 ["cm.account_id<>v_uid",'own-message exclusion'],
 ['public.player_blocks','blocked-message exclusion'],
])need(migration,needle,label);

for(const [needle,label] of [
 ['NEW MESSAGES','unread divider'],
 ['pendingNew','new-message counter'],
 ['scrollToEnd','jump-to-latest behavior'],
 ['nearBottomRef','near-bottom auto-scroll gate'],
 ['if(nearBottomRef.current)','no forced scrolling while reading history'],
 ['firstUnreadMessageId','unread-boundary input'],
 ['items[0].id','history-window unread fallback'],
])need(log,needle,label);

for(const [needle,label] of [
 ['chatMentionSuggestions','mention suggestion filtering'],
 ['applyChatMentionSuggestion','mention insertion'],
 ['keyboardShouldPersistTaps="always"','keyboard-safe mention selection'],
])need(mention,needle,label);

for(const [haystack,needle,label] of [
 [world,'<ChatLog','World smart chat log'],
 [world,'<ChatMentionSuggestions','World recent-sender mentions'],
 [party,'<ChatLog','Party smart chat log'],
 [party,'<ChatMentionSuggestions','Party roster mentions'],
 [party,"markSocialChatRead('party')",'Party read only after catch-up'],
 [guild,'<ChatLog','Guild smart chat log'],
 [guild,'<ChatMentionSuggestions','Guild roster mentions'],
 [guild,'guildRoster','Guild roster suggestion source'],
 [guild,"markSocialChatRead('guild')",'Guild read only after catch-up'],
 [overlay,'partyFirstUnreadMessageId','Party unread boundary routing'],
 [overlay,'guildFirstUnreadMessageId','Guild unread boundary routing'],
 [hook,'guildFirstUnreadMessageId','Guild first-unread projection'],
 [hook,'partyFirstUnreadMessageId','Party first-unread projection'],
])need(haystack,needle,label);

reject(party,'void markRead();','Party polling must not auto-clear unread');
reject(guild,'void markRead();','Guild polling must not auto-clear unread');

console.log('PASS: chat unread divider, jump-to-latest and mention suggestion contract');
