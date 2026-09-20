import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.cwd(),'../..');
const migration=fs.readFileSync(path.join(root,'backend/supabase/migrations/20261018000140_guild_chat_online.sql'),'utf8');
const client=fs.readFileSync(path.join(root,'apps/mobile/src/online/social.ts'),'utf8');
const component=fs.readFileSync(path.join(root,'apps/mobile/src/components/GuildChat.tsx'),'utf8');
const overlay=fs.readFileSync(path.join(root,'apps/mobile/src/components/ChatOverlay.tsx'),'utf8');

function need(haystack,needle,label){if(!haystack.includes(needle))throw new Error('Guild Chat contract missing '+label+': '+needle);}
function reject(haystack,needle,label){if(haystack.includes(needle))throw new Error('Guild Chat contract still contains '+label+': '+needle);}

for(const [needle,label] of [
 ['guild_chat_state_v1','membership-scoped Guild chat state RPC'],
 ['send_guild_chat_v1','moderated Guild chat send RPC'],
 ["m.channel_type='guild'",'Guild channel scope'],
 ["m.channel_id=v_gid::text",'current Guild channel binding'],
 ['public.player_blocks','block filtering'],
 ['public.chat_account_sanctions','mute enforcement'],
 ['public.chat_filter_terms','server moderation filters'],
 ["v_term.action in('block','mute_review')",'severe filter enforcement'],
 ["interval '10 seconds'",'burst rate limit'],
 ["interval '1 minute'",'minute rate limit'],
 ["action='guild_chat'",'idempotency receipt action'],
 ['char_length(v_body) not between 1 and 300','server message length limit'],
])need(migration,needle,label);

for(const rpc of ['guild_chat_state_v1','send_guild_chat_v1'])need(client,"rpc('"+rpc+"'","mobile RPC "+rpc);
for(const [needle,label] of [
 ['ChatPlayerSheet','player profile inspection'],
 ['GuildTaggedPlayerName','Guild tag presentation'],
 ['ChatMessageText','emote-aware message rendering'],
 ['chatEmoteCount','client emote limit'],
 ['guildChatCommandKey','idempotent send key'],
 ['setInterval(()=>void load(),5000)','Guild chat refresh'],
])need(component,needle,label);

reject(component,'Elowen','hard-coded preview player');
reject(component,'Brann','hard-coded preview player');
reject(component,"chat.preview",'preview copy');
need(overlay,"myGuild","live Guild membership lookup");
need(overlay,"onlineGuildAvailable","live Guild tab state");

console.log('PASS: authoritative online Guild Chat contract');
