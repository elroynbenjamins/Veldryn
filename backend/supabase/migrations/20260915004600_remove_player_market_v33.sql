-- V33: Player Market is permanently removed. Keep the old create migration in history;
-- this later migration makes the live schema market-free and remains safe on reset.
drop policy if exists "read open market" on public.market_orders;
drop policy if exists "read market trades" on public.market_trades;
drop table if exists public.market_trades cascade;
drop table if exists public.market_orders cascade;
