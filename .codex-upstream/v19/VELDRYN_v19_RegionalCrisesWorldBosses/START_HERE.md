# START HERE — VELDRYN v19

This pack adds **Regional Crises + Asynchronous World Bosses** on top of v18.

Read in order:

1. `REGIONAL_CRISES_WORLD_BOSSES_V19.md`
2. `SETTLEMENT_WIRING_V19.md`
3. `files/control-center/backend_integration/SHARED_WORLD_CONTROL_WIRING_V19.md`
4. `CODEX_INSTRUCTIONS.txt`

## Source-of-truth rule

The user's **current local VELDRYN repository is authoritative**. It may contain unpushed changes. Do not replace it with the dependency ZIPs.

The embedded v18 ZIP is implementation/reference history so Codex can recover missing v16.1→v18 systems if needed. Merge forward selectively.

## Migration

New migration:

`files/backend/supabase/migrations/20260914_031_regional_crises_world_bosses_v19.sql`

Apply it as a new forward migration only. Never rewrite an already-applied migration.

If the local repository is missing dependency migrations, merge/apply them in forward order first (v17/v17.1/v17.2/v17.3/v18, then v19). Migration 031 intentionally only registers Control Center rows when the v17.2/v17.3 control-plane tables already exist.

## Important product rules

- no player Market
- no new crisis/world-boss currency
- asynchronous; no simultaneous login requirement
- crisis activity happens through normal regional gameplay
- World Boss attempts are personal authoritative combat windows
- four score-bearing attempts/day by default, not purchasable
- role-aware Raid Impact prevents raw-DPS-only class bias
- Echo is one-time participation-only for players who missed the boss before early defeat
- immutable scale snapshots after start/spawn
- server-authoritative scoring/damage/rewards
- repairs rebuild from immutable receipts rather than entering arbitrary totals

## Control site

No new hand-built page is required for safety/support commands. v17.3's schema-driven Control page reads the new command registry rows automatically after migration. Remote Config reads the new feature gates automatically as well.
