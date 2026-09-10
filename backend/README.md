# VELDRYN Backend v2.1

## Local Supabase database

Prerequisites on Windows: Docker Desktop with its WSL 2 backend running. The CLI is pinned as a backend development dependency and the local project is configured in `supabase/config.toml`.

```powershell
pnpm run supabase:start
pnpm run supabase:reset
pnpm run supabase:status
pnpm run supabase:env
```

`supabase:reset` recreates the local database and applies every file in `supabase/migrations` in timestamp order. Local endpoints use the standard project ports: API `54321`, PostgreSQL `54322`, Studio `54323`, and local mail `54324`. Obtain the generated local URL and public key with `pnpm exec supabase status -o env`; never place the service-role key in the mobile application.

To stop the local stack while retaining its Docker volumes, run `pnpm run supabase:stop`.

## Production-facing squad API contracts
- Adds idempotent Squad API receipts and a database assertion requiring exactly three distinct characters/positions.
- Adds client-facing contracts for saving squads, Arena defense publication/opponent discovery/match resolution and Triad Trials.
- Authoritative rating, rewards and RNG remain server-owned; clients submit choices and request IDs only.
- Includes a dedicated squad smoke suite covering roster validation, deterministic Arena, reward caps, Trials, synergies and repeat-opponent avoidance.

## Previous foundation

# VELDRYN Backend v2.0

## Squad Arena seasons, matchmaking and reward boundaries
- Adds 28-day Squad Arena seasons and persistent account ratings.
- Matchmaking prioritizes rating proximity, compatible power bands and avoiding recent repeat opponents.
- Offense bonus rewards are softly capped at 5 ranked wins/day and 25/week; defensive rewards cap at 10/day.
- Season rewards are account-wide progression/cosmetic rewards; paid combat power remains zero.

## Previous foundation

# VELDRYN Backend v1.9

## Squad formations and team synergies
- Adds Front / Middle / Back formation effects and small capped squad synergies.
- A balanced Tank + Damage + Support triad is rewarded, but triple-DPS and other compositions remain legal.
- Synergy output is capped at 8% so owning the correct classes never becomes mandatory power creep.
- Formation versions are immutable in history so Arena/Trials can resolve against the exact submitted loadout.

## Previous foundation

# VELDRYN Backend v1.8

## Triad Trials — repeatable 3-character PvE
- Adds a 30-floor rotating PvE challenge designed specifically for an account's three-character squad.
- Every fifth floor is a boss; difficulty and modifier count rise predictably.
- Characters can be knocked out across a run, creating roster-management pressure without permanent loss.
- Five-floor checkpoints keep the mode suitable for mobile sessions and Q-Mode-style resumability.

## Previous foundation

# VELDRYN Backend v1.7

## Three-character Squad Arena
- Adds asynchronous 3v3 Arena offense/defense snapshots with normalized character power.
- Every account fields three distinct characters; each slot resolves one matchup and best-of-three wins the match.
- Front/Middle/Back positioning and light role interactions matter without creating hard class counters.
- Ranked bonus rewards retain the existing 5 wins/day and 25 wins/week soft cap philosophy.

## Previous foundation

# VELDRYN Backend v1.6

## Three-character squad foundation
- Adds reusable account-level squads containing exactly three distinct owned characters.
- Positions are Front / Middle / Back and are intentionally separate from the normal 4-player co-op party system.
- Squad validation is server-side and supports Arena, PvE Trials, boss-team and future event modes.
- No paid squad slots or paid combat power are introduced.

## Previous foundation

# VELDRYN Backend v1.5 — Client/API Contract Pass

This is the accumulated backend through six passes after v0.9.

## New in v1.5
- Client build/content-version compatibility tables.
- API idempotency receipt foundation.
- Content manifests and minimum build rules.
- Typed bootstrap/API envelope contracts.
- Canonical Android package: `com.elroybenjamins.veldryn`.

## Accumulated v1.0–v1.5
1. Transactional economy boundaries.
2. Matchmaking and frozen Echo recruitment.
3. Guild progression and boss windows.
4. Normalized PvP and raid lockouts/pity.
5. Telemetry and anti-abuse risk signals.
6. Client-facing API/content-version contracts.
