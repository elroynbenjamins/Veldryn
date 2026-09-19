import {readFileSync} from 'node:fs';

const migration=new URL('../backend/supabase/migrations/20260919194610_v53_guild_tags.sql',import.meta.url);
const sql=readFileSync(migration,'utf8').toLowerCase();
const checks=[
  ['permanent registry',/create table if not exists public\.guild_tag_registry/],
  ['three-letter constraint',/tag ~ '\^\[a-z\]\{3\}\$'/],
  ['retirement without deletion',/set status='retired',retired_at=now\(\)/],
  ['disband retirement trigger',/trigger retire_guild_tag_on_delete_v53 before delete on public\.guilds/],
  ['moderation blocklist',/create table if not exists public\.guild_tag_blocklist/],
  ['atomic tagged guild creation',/create function public\.create_guild\(p_name text,p_join_policy text,p_minimum_level integer,p_tag text\)/],
  ['identity projection',/function public\.guild_identities\(p_account_ids uuid\[\]\)/],
  ['tag color unlock validation',/function public\.update_guild_tag_color/],
  ['empty security-definer search path',/security definer set search_path=''/],
  ['anonymous execution revoked',/from public,anon/],
  ['authenticated execution granted',/to authenticated/],
];
const failed=checks.filter(([,pattern])=>!pattern.test(sql));
if(failed.length)throw new Error(`Guild-tag migration failed: ${failed.map(([name])=>name).join(', ')}`);
console.log(`Guild-tag migration checks passed (${checks.length})`);
