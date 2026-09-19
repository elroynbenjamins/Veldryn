begin;

-- VELDRYN V52: player Market is retired.
-- Keep the historical create migration in repository history, then clean forward here.
drop table if exists public.market_trades cascade;
drop table if exists public.market_orders cascade;

commit;
