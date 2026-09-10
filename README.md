# VELDRYN

VELDRYN is an idle multiplayer RPG built as an Expo/React Native mobile game with an offline-first solo progression loop and a server-authoritative co-op dungeon foundation.

The current playable milestone is **The Fallen Knight** in Asterfall. The repository also contains the shared co-op dungeon engine, Q-Mode and Live-mode domain systems, Supabase migrations, mobile co-op presentation, two implemented dungeon regions, event expedition previews, and broader online-system foundations.

> Development status: active pre-release. Offline solo play is the most complete end-to-end path. Co-op rules, simulation, persistence boundaries, and UI foundations are implemented and tested, but production HTTP/Realtime handlers and multi-device release validation are still gated.

## Start here

Read these before changing gameplay or content:

1. [`START_HERE_CODEX.md`](START_HERE_CODEX.md)
2. [`CODEX_IMPLEMENTATION_GUIDE.md`](CODEX_IMPLEMENTATION_GUIDE.md)
3. [`MVP_SCOPE.md`](MVP_SCOPE.md)
4. [`CONTENT_MAPPING.md`](CONTENT_MAPPING.md)
5. [`docs/implementation/TEST_CONTRACT.md`](docs/implementation/TEST_CONTRACT.md)
6. [`docs/implementation/UI_DESIGN_TOKENS.md`](docs/implementation/UI_DESIGN_TOKENS.md)

The canonical design workbook is [`docs/sources/VELDRYN_Master_Design_Database_v5.6.xlsx`](docs/sources/VELDRYN_Master_Design_Database_v5.6.xlsx). Stable IDs and explicit implementation contracts take precedence over display text. Intentional prototype deviations should be documented in [`docs/implementation/PROTOTYPE_OVERRIDES.md`](docs/implementation/PROTOTYPE_OVERRIDES.md).

## Current functionality

### Mobile game and solo progression

- Character creation and class selection, character profiles, equipment previews, stat presentation, and save migration/recovery tools.
- Asterfall level 1–25 progression culminating in the Fallen Knight milestone and the Sunscar progression handoff.
- Idle combat with timestamp-based offline progress, capped at eight hours, plus XP, gold, loot, auto-eat, recovery, boss gates, and activity settlement.
- Inventory and bank management with search, categories, sorting, capacity-aware transfers, equipment comparison, enhancement, selling, salvaging, and overflow visibility.
- Mining, Woodcutting, Fishing, Smithing, and Cooking with requirements, material checks, gathering-tool loadouts, craft previews, and activity feedback.
- Guided quest journal with chapter filters, search, prerequisites, objective progress, reward previews, and navigation to the relevant activity.
- Deterministic regional weather and UTC seasons that modify combat and gathering, with the active effects exposed in the shared top bar.
- Quick navigation, home summaries, accessibility/settings foundations, localization, local telemetry, and development tools.
- Social and online presentation foundations for accounts, friends, guilds, world chat, guild chat, and moderated chat.

### Co-op dungeons

The co-op implementation uses one shared authoritative engine for both modes:

- **Q-Mode:** one human controller recruits three eligible saved-player Echoes and makes personal route decisions.
- **Live:** four players enter role-bounded matchmaking, accept a ready check, vote on routes, reconnect within a grace period, and use run-scoped party chat.
- Every party must contain exactly **1 Tank, 2 Damage, and 1 Support**. Character role, readiness, immutable loadout snapshots, and normalized combat stats are derived on the server.
- Normalization reduces excessive stats but does not boost undergeared builds. Observed damage contribution is reported as produced; no damage-share cap is applied.
- Every launch run contains exactly **five non-boss rooms followed by one final boss**. Each pre-boss decision exposes at least three distinct reachable choices.
- Run state persists HP, downs, resources, cooldowns, effects, decisions, node results, event cursors, and reward settlement with idempotency and stale-state protection.
- Live ready checks last 20 seconds, route votes last 8 seconds, personal Q-Mode choices last 15 seconds, and reconnect grace lasts 60 seconds.
- The target full session is **6–8 minutes**, including matchmaking, ready checks, route choices, combat, and results.

#### Entry and rewards

- Co-op access begins at the dungeon's base minimum level. Tier II–V add 5, 10, 15, and 20 levels to that minimum.
- Entry is unlimited. Reward availability never blocks play.
- Live and Q-Mode share three enhanced-reward charges per account.
- One charge regenerates every eight hours, up to three stored charges.
- A maximum of twelve enhanced rewards may be claimed per authoritative week.
- Valid clears without a charge, or after the weekly enhanced limit, retain the reduced 20% Marks payout.
- Entitlements, ledgers, spending, assistance rewards, and claims are server-owned and idempotent.

#### Dungeon progression

| Region | Dungeon | Base level | Server combat status |
| --- | --- | ---: | --- |
| Asterfall | Rootbound Vault | 15 | Implemented |
| Asterfall | Lanternwatch Descent | 18 | Implemented |
| Sunscar | Mirage Well | 32 | Implemented |
| Sunscar | Buried Observatory | 36 | Implemented |
| Frostmarch | Shiverlake Descent | 52 | Locked pending encounters and balance |
| Frostmarch | Choir Caverns | 57 | Locked pending encounters and balance |
| Ashlands | Blackglass Fen | 77 | Locked pending encounters and balance |
| Ashlands | Crucible Depths | 82 | Locked pending encounters and balance |

Suncrest Games and Starfall Convergence have presentation-only event expedition previews. They cannot start a run until server schedules, encounter registries, normalized rules, reward budgets, and event-specific art are implemented.

### Backend and database

- TypeScript server-domain modules for combat, expeditions, co-op lifecycle, matchmaking, ready checks, recovery, voting, Echo recruitment, party chat, rewards, and public/private projections.
- Supabase schema and RLS migrations for accounts, characters, expeditions, combat, inventory, crafting, market, social/guild systems, squads, co-op persistence, saved loadouts, queue tickets, party chat, reward cadence, and equipment enhancement.
- Service-role-only runtime adapters and RPC boundaries for atomic state/projection/outbox commits, worker leasing/fencing, reservation management, and trusted loadout access.
- Foundations for three-character squads, asynchronous Squad Arena, Triad Trials, guild PvE, matchmaking Echoes, telemetry, abuse signals, and content/build compatibility.
- The service-role key must never be shipped in the mobile app. Clients receive only sanitized projections and use public Supabase credentials.

## Repository layout

```text
apps/mobile/                 Expo/React Native application, local game engine, UI, assets, and tests
backend/src/server/          Server-authoritative gameplay and service-domain code
backend/src/shared/          Shared backend contracts
backend/supabase/            Supabase configuration and ordered SQL migrations
backend/artifacts/           Reproducible balance outputs
docs/implementation/         Test, UI, system, phase, and refinement reports
docs/sources/                Canonical design workbooks and source guidance
tools/                       Asset-processing and review utilities
```

Android package: `com.elroybenjamins.veldryn`

## Development setup

Requirements:

- Node.js compatible with Expo 53
- pnpm (recommended; lockfiles are committed)
- Android Studio/emulator or a physical device for Android validation
- Docker Desktop with WSL 2 only when running the local Supabase stack

### Mobile

```powershell
cd apps/mobile
pnpm install --frozen-lockfile
pnpm start
```

Other launch commands are `pnpm android`, `pnpm ios`, and `pnpm web`. Copy `.env.example` to a local ignored environment file when connecting to Supabase or a co-op API. Set `EXPO_PUBLIC_COOP_ROGUELITE_V1=true` only against a compatible authenticated backend.

### Backend

```powershell
cd backend
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run build
```

### Local Supabase

```powershell
cd backend
pnpm run supabase:start
pnpm run supabase:reset
pnpm run supabase:status
pnpm run supabase:env
```

The default local ports are API `54321`, PostgreSQL `54322`, Studio `54323`, and mail `54324`. `supabase:reset` recreates the local database and applies every migration in timestamp order. The repository has also been linked to a hosted Veldryn Supabase project during development; inspect migration status and use a dry run before applying new migrations.

## Verification

### Mobile checks

```powershell
cd apps/mobile
pnpm run typecheck:core
pnpm run test:core
pnpm run test:pre-codex
```

The core suite covers offline progression, saves, localization, events, equipment, gathering tools, regions/weather, co-op browser/loadouts/shared-run/Q-Mode projections, and UI-domain contracts. Release candidates should also pass the full TypeScript check and an Android Expo/Hermes export.

### Backend checks

```powershell
cd backend
pnpm run typecheck
pnpm run build
pnpm run smoke
pnpm run combat-smoke
pnpm run combat-service-smoke
pnpm run coop-phase1
# Continue through coop-phase13
```

The co-op acceptance coverage includes lifecycle authorization, server-derived normalization/readiness, immutable roster commits, 10,000-seed route validation, stateful runs, Q-Mode privacy, matchmaking, ready/recovery, voting, chat, rewards, and regional content.

The reproducible balance gates currently include:

- 8,000 Asterfall runs across valid parties, route lengths, normalized overgear, and invalid solo-role scenarios.
- 2,000 Sunscar runs across both implemented dungeons and two valid support compositions.
- Zero solo-role clears in the tested scenarios.
- Uncapped observed Damage share reaching 41.52% in the recorded Asterfall study.

See [`backend/artifacts/coop-balance-summary.json`](backend/artifacts/coop-balance-summary.json) and [`docs/implementation/COOP_REFINEMENT_PASS_03.md`](docs/implementation/COOP_REFINEMENT_PASS_03.md) for the latest recorded results.

## Current release boundaries

- The co-op feature flag is off by default.
- Mobile production start/resume adapters exist, but deployed authenticated HTTP handlers and Realtime transport are not yet demonstrated end to end.
- Q-Mode still needs a trusted saved-loadout publication worker and a complete server-backed start/choose/resume/settlement device test.
- Live mode still needs deployed queue workers, transactional PostgreSQL race coverage, deadline workers, reconnect tests, and two-or-more-device testing.
- Frostmarch and Ashlands remain intentionally non-startable until their combat registries and balance gates pass.
- Event expeditions remain non-startable previews.
- Physical-device layout, large-text, keyboard, screen-reader, and narrow-width QA remain release work.

## Planned refinement passes

The next passes should preserve server authority and complete one release gate at a time:

1. **Co-op integration pass:** deploy authenticated start, choose, resume, ready, vote, chat, and settlement handlers; connect Realtime projections and the trusted saved-loadout publisher.
2. **Database concurrency pass:** run PostgreSQL integration tests for queue reservation races, state compare-and-set, job fencing, decision resolution, weekly counters, entitlements, and duplicate claims.
3. **Two-device Live pass:** validate matchmaking, exact role composition, ready timeout/refill, vote resolution, disconnect/reconnect, chat authorization/revocation, and reward delivery on real devices.
4. **Q-Mode completion pass:** finish one server-backed run with three privacy-safe Echoes, reconnect at a decision/offer, resume identical state, and verify personal rewards without exposing source-owner data.
5. **Frostmarch content pass:** implement Shiverlake and Choir encounters, bosses, route events, visual identity, tier scaling, and balance across restoration and utility Support parties.
6. **Ashlands content pass:** implement Blackglass Fen and Crucible Depths after Frostmarch meets the same acceptance and balance gates.
7. **Event expedition pass:** promote Suncrest and Starfall only after authoritative schedules, encounter content, node art, eligibility, reward budgets, Live/Q-Mode behavior, and expiration handling exist.
8. **UI and accessibility pass:** capture native phone/tablet states, reduce remaining density, test large text and screen readers, refine combat/route feedback, and finish all supported localization copy.
9. **Economy and telemetry pass:** measure real run duration, queue health, completion/failure rates, role availability, reward-charge behavior, and progression impact before tuning rewards or enabling the feature flag.
10. **Release-hardening pass:** load test workers, audit RLS and service boundaries, exercise upgrade/save compatibility, produce release builds, and enable co-op gradually behind monitored configuration.

Detailed implementation history is indexed in [`docs/implementation/`](docs/implementation/), including the [co-op phase report](docs/implementation/COOP_ROGUELITE_V1_PHASE_REPORT.md), [entry/reward cadence](docs/implementation/COOP_CADENCE_AND_ENTRY_REPORT.md), and [latest regional refinement](docs/implementation/COOP_REFINEMENT_PASS_03.md).

## Project rules

- Never accept client-supplied combat stats, roles, readiness, rewards, or authoritative route outcomes.
- Never expose service-role credentials, Echo source-owner account IDs, private inventory/loadout data, hidden route graph state, or unentitled reward values.
- Keep Live and Q-Mode on the same dungeon, combat, normalization, route, and reward engines.
- Preserve exactly 1 Tank / 2 Damage / 1 Support and at least three distinct reachable choices at every pre-boss decision.
- Keep damage contribution observational; do not cap a player's measured damage share.
- Run the relevant acceptance tests and record commands actually executed, results, changed files, and remaining work after each implementation phase.
