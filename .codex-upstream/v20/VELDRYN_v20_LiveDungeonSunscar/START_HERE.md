# START HERE — VELDRYN v20

This pack is **v20 — Live Dungeon Production Polish + Sunscar Region II + generic partial Equipment Set framework**.

## Authoritative merge rule

The user's **CURRENT LOCAL VELDRYN repository is authoritative** and may contain unpushed work. Do not reset it to this ZIP, do not assume GitHub is current, and do not overwrite newer files wholesale.

Use `dependencies/VELDRYN_v19_RegionalCrisesWorldBosses.zip` only to recover missing foundations. That dependency contains the earlier v18 → v17 → v16.1 chain.

## Read in this order

1. `CODEX_INSTRUCTIONS.txt`
2. `LIVE_DUNGEON_PRODUCTION_V20.md`
3. `SUNSCAR_REGION_V20.md`
4. `EQUIPMENT_SET_FRAMEWORK_V20.md`
5. `SETTLEMENT_WIRING_V20.md`
6. `files/control-center/backend_integration/V20_CONTROL_WIRING.md`

## Core v20 decisions

- Live Dungeon = synchronous 4-player mode, **exactly 1 Tank / 2 Damage / 1 Support**.
- Q-Mode remains the separate asynchronous mode using saved player loadouts.
- **No Hybrid Queue and no Echo-profile autofill for Live Dungeons.** Reconnect protection uses a deliberately weak server Safety AI only.
- One account may occupy only one Live Dungeon queue/ready/run slot, regardless of character count.
- Ready checks, route votes, recovery, AFK/deserter classification and reward eligibility are server-authoritative.
- Sunscar is promoted to versioned Region II content, recommended Lv25–45, ending with The Sand Tyrant.
- Sunscar includes 5 zones, 16 normal enemies, 4 bosses, 3 co-op dungeons, 12 resources, 10 story quests, 4 regional Echo conditions, 4 relic hooks and 9 Pet/Companion unlock hooks.
- Sunscar's old weapons/armor/sets are **draft_do_not_implement**.
- The generic set-bonus engine exists now and supports partial thresholds such as 2/3/5 or 2/3/4/5 plus mixed 3+2 builds.
- Do **not** author final Sunscar equipment until the later richer-stat equipment rework.
- Do **not** restore a player Market or Guild Procurement system.

## Migrations

v20 adds:

- `20260914_032_live_dungeon_production_v20.sql`
- `20260914_033_region_content_registry_v20.sql`

Only apply them after any missing dependency migrations are merged/applied in forward order. Never modify or replay migrations already applied to the real database.

## Verification already performed on the reference pack

- strict backend TypeScript compile
- Live Dungeon policy/matchmaking/ready/reconnect/vote/recovery tests
- Sunscar content + versioned-content tests
- generic partial set-bonus tests
- mobile helper tests
- React Native TSX syntax/transpile checks
- migration/RLS static safety audit
- active-code Market/Procurement/Hybrid-Queue scan
- dependency ZIP integrity

Codex must still run the **real repository's** complete test/build suite and real Supabase migration/RLS/concurrency tests after merging.
