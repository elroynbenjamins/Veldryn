-- Production migration-history receipt: this seven-day Echo update was
-- applied directly to Veldryn production under version 20261030213402.
-- The durable and repeatable implementation lives in
-- 20261104000014_echo_sharing_seven_days.sql (also used for fresh databases).
-- Keep this no-op receipt to align the source and production histories;
-- do not execute the old implementation twice.
select 1;
