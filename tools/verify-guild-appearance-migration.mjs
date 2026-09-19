import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../backend/supabase/migrations/20260919205929_v52_appearance_completion.sql',import.meta.url),'utf8').toLowerCase();
const checks=[
 ['appearance table',/create table if not exists public\.guild_appearance/],['unlock receipts',/create table if not exists public\.guild_cosmetic_unlocks/],
 ['nine borders',/mythic_conqueror/],['name colors',/name_amethyst/],['tag colors',/tag_mythic/],['entitlement projection',/guild_appearance_entitlements_v52/],
 ['trusted update',/update_guild_appearance_v52/],['officer authorization',/guild_officer_required/],['empty search path',/security definer set search_path=''/],
 ['rls enabled',/alter table public\.guild_appearance enable row level security/],['explicit grants',/grant select on public\.guild_appearance to anon,authenticated/],
 ['no direct writes',/revoke all on public\.guild_appearance,public\.guild_cosmetic_unlocks from public,anon,authenticated/],
 ['new guild initialization',/create trigger initialize_guild_appearance_v52 after insert on public\.guilds/],
];
const failed=checks.filter(([,rx])=>!rx.test(sql));if(failed.length)throw new Error(`Guild appearance migration failed: ${failed.map(([name])=>name).join(', ')}`);
console.log(`Guild appearance migration checks passed (${checks.length})`);
