const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const sql=read('backend/supabase/migrations/20261110180000_expedition_marks_shop_foundation.sql');
const panel=read('apps/mobile/src/components/ExpeditionShopPanel.tsx');
const client=read('apps/mobile/src/online/expedition-shop.ts');
const screen=read('apps/mobile/src/screens/CoopExpeditionScreen.tsx');

// Schema: price-authoritative tables with authentication-anchored keys.
assert(sql.includes('create table if not exists public.expedition_shop_catalogue'),'catalogue table must exist');
assert(sql.includes('mark_cost bigint not null check (mark_cost > 0)'),'prices must be positive and server-owned');
assert(sql.includes('enabled boolean not null default false'),'catalogue rows must ship disabled');
assert(sql.includes('create table if not exists public.expedition_shop_owned'),'one-time ownership table must exist');
assert(sql.includes('create table if not exists public.expedition_shop_weekly'),'weekly-limit table must exist');
assert(sql.includes('create table if not exists public.expedition_shop_ledger'),'idempotent receipt ledger must exist');
assert(sql.includes('primary key (account_id, request_id)'),'ledger keyed by request id for replay-safe retries');
for(const table of ['expedition_shop_catalogue','expedition_shop_owned','expedition_shop_weekly','expedition_shop_ledger']){
 assert(sql.includes('alter table public.'+table+' enable row level security'),'RLS must be enabled on '+table);
}
assert(sql.match(/revoke all on public\.expedition_shop_catalogue[^;]*from public, anon, authenticated/),'shop tables must be read through the RPC, not directly');

// State RPC: server-computed balance, week key, locked reasons.
assert(sql.includes('create or replace function public.expedition_shop_state_v1()'),'state RPC must exist');
assert(sql.includes("raise exception 'AUTH_REQUIRED'"),'state RPC must require authentication');
assert(sql.includes("where c.enabled"),'state RPC must hide disabled catalogue rows');
assert(sql.includes("'account_level_locked'")&&sql.includes("'already_owned'")&&sql.includes("'weekly_limit_reached'"),'state RPC must publish every lock reason');
assert(sql.includes('grant execute on function public.expedition_shop_state_v1() to authenticated'),'state RPC must be callable by signed-in players');

// Purchase RPC: idempotent, atomic, server-only grant.
assert(sql.includes('create or replace function public.expedition_shop_purchase_v1'),'purchase RPC must exist');
assert(sql.includes("raise exception 'shop_item_not_released'"),'disabled rows must refuse purchases');
assert(sql.includes("raise exception 'insufficient_expedition_marks'"),'balance check must precede entitlement');
assert(sql.includes("raise exception 'weekly_limit_reached'"),'weekly cap must be enforced server-side');
assert(sql.includes("for update"),'balance row must be locked before deduction');
assert(sql.includes("insert into public.expedition_shop_ledger"),'receipts must be written for every successful purchase');
assert(sql.includes('idempotent_replay'),'replayed request ids must return the prior receipt, not charge again');
assert(sql.includes("insert into public.expedition_currency_ledger")&&sql.includes("'shop_purchase:'"),'purchases must leave an audit row on the shared expedition ledger');
assert(sql.match(/grant execute on function public\.expedition_shop_purchase_v1\(text, text\) to service_role/),'purchase RPC stays service-role until entitlement delivery is verified');
assert(!sql.match(/grant execute on function public\.expedition_shop_purchase_v1\(text, text\) to authenticated/),'purchase RPC must not be granted to authenticated clients');

// Mobile client: idempotent purchases, AsyncStorage pending receipts.
assert(client.includes("rpc('expedition_shop_state_v1')"),'client calls the state RPC');
assert(client.includes("rpc('expedition_shop_purchase_v1'"),'client calls the purchase RPC');
assert(client.includes('p_item_id:itemId,p_request_id:pending.requestId'),'request id travels with the purchase for idempotent replay');
assert(client.includes('expedition-shop-pending:')&&client.includes('AsyncStorage'),'pending purchase persists before send');
assert(client.includes('Resolve your pending Expedition purchase'),'client refuses to buy a different item while a receipt is pending');

// Mobile panel: category labels, locked copy, confirm modal.
assert(panel.includes('CATEGORY_LABEL')&&panel.includes("cosmetic_border:'Border'"),'category labels cover every server category');
assert(panel.includes('LOCK_COPY')&&panel.includes('account_level_locked')&&panel.includes('already_owned')&&panel.includes('weekly_limit_reached'),'every server lock reason has copy');
assert(panel.includes('GameModalSurface visible={!!selected}'),'purchase goes through a confirm modal, not a bare tap');
assert(panel.includes('offer.markCost')&&panel.includes('data?.balance'),'cost and balance come from the server snapshot');

// Screen wiring: entry point from the dungeon browse list.
assert(screen.includes('<ExpeditionShopPanel'),'shop renders inside the expedition screen');
assert(screen.includes('Open Expedition shop'),'an entry point opens the shop from the dungeon list');

console.log('PASS Expedition Marks shop: schema, RLS, idempotent purchase RPC, mobile client and panel wiring');
