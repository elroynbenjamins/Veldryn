const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const sql=read('backend/supabase/migrations/20261107003815_guild_daily_tokens_from_verified_gameplay_v1.sql');
const currentClaim=read('backend/supabase/migrations/20261018091000_guild_shop_daily_verified_rewards.sql');
const hall=read('apps/mobile/src/components/GuildHallSummary.tsx');
const eligibility=read('apps/mobile/src/core/guild-token-daily-claim.ts');

// Authenticated game-engine settlement is the ONLY new input. No forged client
// "I played" RPC, player-open analytics or arbitrary activity percentage.
assert.match(sql,/AFTER INSERT ON public\.server_action_receipts/);
assert.match(sql,/NEW\.action='online_game_v1'/);
assert.match(sql,/jsonb_typeof\(v_reward->'xp'\)='number'/);
assert.match(sql,/jsonb_typeof\(v_reward->'elapsedSeconds'\)='number'/);
assert.match(sql,/v_elapsed<=0 OR \(v_xp<=0 AND v_kills<=0\)/);
assert.match(sql,/IF v_kind='combat' THEN/);
for(const kind of ['woodcutting','mining','fishing','herbalism','processing','alchemy','exploration']){
 assert.ok(sql.includes("'"+kind+"'"),kind+' verified skill should qualify');
}
assert.ok(!sql.includes('player_activity_daily'),'Foreground or app taps must not unlock daily tokens');

// Keep guild changes, UTC rollover, duplicate receipts and claim authority safe.
assert.match(sql,/gm\.joined_at<=p_created_at/);
assert.match(sql,/AT TIME ZONE 'UTC'/);
assert.match(sql,/private\.guild_muster_day_bindings/);
assert.match(sql,/v_day_guild IS DISTINCT FROM v_guild/);
assert.match(sql,/ON CONFLICT\(guild_id,account_id,activity_date\) DO UPDATE/);
assert.match(sql,/combat_points=GREATEST/);
assert.match(sql,/skilling_points=GREATEST/);
assert.match(sql,/contribution_points=GREATEST\(public\.guild_muster_daily\.contribution_points,1\)/);
assert.match(sql,/check_in_points,\s*combat_points/);
assert.match(sql,/REVOKE ALL ON FUNCTION private\.guild_daily_token_verified_gameplay_credit_v1/);
assert.match(sql,/FROM PUBLIC,anon,authenticated/);
assert.match(sql,/GRANT EXECUTE ON FUNCTION private\.guild_daily_token_verified_gameplay_credit_v1/);
assert.match(sql,/DO \$today\$/);
assert.match(sql,/r\.created_at>=date_trunc\('day',now\(\) AT TIME ZONE 'UTC'\)/);

// Reuse existing 10-token, once-per-day, weekly-capped server claim exactly.
assert.match(currentClaim,/p_kind='attendance' then d\.check_in_points>0/);
assert.match(currentClaim,/d\.combat_points>0 or d\.skilling_points>0/);
assert.match(currentClaim,/guild-muster:/);
assert.match(currentClaim,/v_claim,10,'standard'/);
assert.ok(!sql.includes('guild_shop_wallets')&&!sql.includes('guild_shop_claim_sources'),
 'The receipt bridge must not mint or bypass capped/idempotent Guild Tokens');

// UI should explain precisely how to earn it and silently update after rewards.
assert.match(eligibility,/muster\.combatPoints>0\|\|muster\.skillingPoints>0/);
assert.match(hall,/Finish a hunt or skill action/);
assert.match(hall,/Complete a hunt or skilling reward, then claim/);
assert.match(hall,/setInterval\(\(\)=>\{/);
assert.match(hall,/AppState\.currentState==='active'&&!claimPending\.current/);
assert.match(hall,/void load\(true\)/);
assert.match(hall,/clearInterval\(refreshTimer\)/);
assert.match(hall,/disabled=\{!enabled\}/);
console.log('PASS: verified completed gameplay unlocks daily Guild Tokens without changing claim, cap, roster or check-in security');
