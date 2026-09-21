import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.cwd(),'../..');
const migration=fs.readFileSync(path.join(root,'backend/supabase/migrations/20261018000170_identity_name_safety.sql'),'utf8');
const names=fs.readFileSync(path.join(root,'apps/mobile/src/core/identity-names.ts'),'utf8');
const game=fs.readFileSync(path.join(root,'apps/mobile/src/core/game.ts'),'utf8');
const guildBrowser=fs.readFileSync(path.join(root,'apps/mobile/src/components/OnlineGuildBrowser.tsx'),'utf8');
const social=fs.readFileSync(path.join(root,'apps/mobile/src/online/social.ts'),'utf8');
const sheet=fs.readFileSync(path.join(root,'apps/mobile/src/components/ChatPlayerSheet.tsx'),'utf8');

function need(haystack,needle,label){if(!haystack.includes(needle))throw new Error('identity safety contract missing '+label+': '+needle);}
function reject(haystack,needle,label){if(haystack.includes(needle))throw new Error('identity safety contract still contains '+label+': '+needle);}

for(const [needle,label] of [
 ['normalize(\'NFKC\')','compatibility normalization'],
 ["replace(/[’‘‛]/g","smart apostrophe normalization"],
 ['Script=Latin','Latin-script client restriction'],
 ['characterNameError','character name validation'],
 ['guildNameError','Guild name validation'],
])need(names,needle,label);

need(game,'normalizeCharacterName','normalized character storage');
need(guildBrowser,'guildNameError','Guild creation validation UI');
need(social,'normalizeGuildName','Guild RPC name normalization');
need(social,"rpc('report_social_player_v1'","player-report client RPC");
need(sheet,'reportSocialPlayer','player report action');
need(sheet,'message_id','chat evidence routing');

for(const [needle,label] of [
 ['safe_identity_name_v1','server safe-name function'],
 ['enforce_character_identity_name_v1','character name trigger'],
 ['enforce_guild_identity_name_v1','Guild name trigger'],
 ["tg_op='UPDATE' and new.name is not distinct from old.name",'existing-name grandfathering'],
 ['sync_active_profile_display_name_v1','active-character display-name sync'],
 ['social_player_reports_v1','server report ledger'],
 ['report_social_player_v1','report submission RPC'],
 ["p_reason not in('identity','harassment_spam')",'report reason allowlist'],
 ["interval '24 hours'","report rate limit window"],
 ['report_rate_limit','report rate limit'],
 ['v_message.account_id<>p_target_account_id','message-target evidence match'],
 ["v_message.channel_type='guild'","Guild report visibility check"],
 ["v_message.channel_type='party'","Party report visibility check"],
 ['already_reported','duplicate report protection'],
])need(migration,needle,label);

reject(names,'[0-9]','numeric character-name allowance');
console.log('PASS: identity name hardening and player-report contract');
