# VELDRYN

VELDRYN is a mobile-first idle MMORPG built with Expo / React Native. It combines offline character progression, gathering and crafting, equipment building, social systems, seasonal content, companions, and server-authoritative multiplayer dungeon foundations.

The project is in **active pre-release development**. The offline/solo game loop is broad and playable, production account/chat infrastructure is connected, Android release builds are being validated through EAS/Google Play, and the remaining work is mainly release hardening, device validation, content refinement, and continued multiplayer integration.

## Current status — October 2026

Recent production work on main includes:

- **Expo SDK 57** with React Native 0.86.3, React 19.2.3, TypeScript 6, Android edge-to-edge handling, Node 22 build profiles, and Expo Doctor in CI.
- Android release-bundle validation on **Android API 36**.
- Native **Google Sign-In** account linking/recovery and **Google Play Games Services v2** integration.
- Guest-first accounts with email verification recovery, password setup, and preservation of the original account/character ownership when linking.
- Production World/Guild/Party chat reliability work: newest **25 messages**, retained channel state/drafts, retry-safe sends, read cursors, Realtime catch-up, and inline emote + Send composition.
- Player profile icons across chat, Guild, Live/Q-Mode dungeon rosters, ready checks, LFG, and combat identity surfaces.
- VIP / VIP+ / Supporter entitlement runtime, Google Play Billing products, name styles, inventory/storage/loadout/queue benefits, and current gameplay speed/drop bonuses.
- Veilbreak reward-track restoration, including the **20,000-point milestone** and three event companions, plus date-gated Veilbreak startup artwork.
- A smoother startup-to-theme transition and theme choice during first identity setup.
- Character creation now asks the player to enter their own name rather than relying on visible name suggestions/default UI.
- Asset optimization and WebP validation passes to reduce packaged runtime artwork.
- Performance passes around timers, chat refreshes, profile customization, combat presentation, and repeated UI recalculation.

## Game overview

### Character and progression

- Nine-class roster covering Tank, Damage, and Support roles.
- Multiple characters per account with account-level progression and unlocks.
- Character equipment, enhancement, two-slot gem/socket systems, set bonuses, saved loadouts, cosmetics, titles, backgrounds, borders, and profile identity.
- Skill and mastery progression across gathering, production, combat-adjacent, exploration, Faith, and long-term systems.
- Working Toward planning, action queues, Contract Board progression, quests, achievements, milestones, and collection systems.
- Offline progression begins with an **8-hour reserve** and expands through progression and account entitlements, with a current hard cap of **30 hours**.

### World, combat, gathering, and crafting

- Regional travel, level/content locks, regional enemies, champions, bosses, weather, seasons, and progression handoffs.
- Idle combat with food use, recovery, tactics, class progression, loot, XP, gold, mastery, and deterministic settlement.
- Mining, Woodcutting, Fishing, Herbalism, Exploration, Smithing, Cooking, Tailoring, Enchanting, Alchemy, Faith, and timed production foundations.
- Crafting queues, material reservation, success/upgrade systems, equipment sources, and inventory/bank/overflow management.
- Compact source-chain presentation such as Ore → Bar → Equipment with bottleneck/preparation information.

### Companions, pets, and collections

- Combat companions with Tank/Damage/Support roles, rarity tiers, Essence/Bondstone progression, ascension, techniques, trials, expeditions, and team-building rules.
- Pets, backgrounds, borders, skins, and account collection bonuses.
- Monthly Companion Trial foundations and event companion support.
- Public profile identity is intentionally separate from companion/pet combat art.

### Social and multiplayer

- Friends, Guilds, Parties, LFG/LFM, public profiles, Guild recruitment, Guild projects, notice boards, roles, tags, customization, and social notifications.
- World, Guild, Party, and run-scoped Live dungeon chat with moderation and authorization boundaries.
- Selected profile icons and name styling propagate through supported social identity surfaces.
- Persistent Party and social systems remain distinct from temporary Live dungeon rosters.

### Co-op dungeons

Live and Q-Mode share the same authoritative dungeon/combat foundation:

- **Live:** four-player role-bounded matchmaking.
- **Q-Mode:** one player recruits three eligible saved-player Echoes.
- Parties use exactly **1 Tank, 2 Damage, and 1 Support**.
- Server-owned role/readiness checks, immutable loadout snapshots, normalization, routes, combat results, recovery, rewards, and privacy boundaries.
- Five non-boss rooms followed by a final boss, with route decisions between encounters.
- Reconnect, ready-check, route-vote, party-chat, reward-ledger, and entitlement foundations are implemented.

Current dungeon content:

| Region | Dungeon | Base level | Current status |
| --- | --- | ---: | --- |
| Asterfall | Rootbound Vault | 15 | Implemented and balance-covered |
| Asterfall | Lanternwatch Descent | 18 | Implemented and balance-covered |
| Sunscar | Mirage Well | 32 | Implemented and balance-covered |
| Sunscar | Buried Observatory | 36 | Implemented and balance-covered |
| Frostmarch | Shiverlake Descent | 52 | Implemented and regional-gate covered |
| Frostmarch | Choir Caverns | 57 | Implemented and regional-gate covered |
| Ashlands | Blackglass Fen | 77 | Implemented and regional-gate covered |
| Ashlands | Crucible Depths | 82 | Implemented and regional-gate covered |

Production multiplayer still requires continued real-device, reconnect, concurrency, queue-worker, reward, and multi-client validation before it should be considered fully release-hardened.

### Live events

VELDRYN contains an annual LiveOps/event framework with event identity, rewards, event currencies, companion rewards, seasonal expeditions, and date-based presentation.

Current event work includes Veilbreak, Frostfall, Suncrest, Starfall, Harvestwake, Turning of the Age, and other annual calendar content. Event visuals and startup presentation are date-gated so normal artwork is used outside the relevant event window.

## Accounts, identity, and purchases

VELDRYN is guest-first: a player can begin without creating a traditional account and later link that identity without replacing the account UUID or losing progress.

Supported/current account work includes:

- Guest → email verification → password completion.
- Continue with Google / Google account linking on Android.
- Google Play Games Services v2 as a separate game-platform identity.
- Account recovery and verification lifecycle handling.
- Public profile icons, guild tags, profile themes, and paid name-style entitlements.

Current commerce tiers:

| Tier | Type | Main current benefits |
| --- | --- | --- |
| VIP | One-time | +2h AFK, +10 Inventory, +20 Bank, +1 saved loadout, +5% Gathering speed, +5% Combat XP |
| VIP+ | One-time | +2h AFK, +10 Inventory, +30 Bank, +1 saved loadout, +1 waiting activity slot, +1 active Forge slot, +5% drop chance, +10% Crafting speed, solid RGB name colours |
| Supporter | Subscription | +2h AFK, +1 active Forge slot, advanced gradient/animated name styles while active |

Permanent tiers stack independently. Supporter can stack with them. Paid premium currency, paid PvP power, paid PvP stats, and paid ranking strength remain disabled by the commerce guardrails.

## Technology

- Expo SDK 57
- React Native 0.86.3
- React 19.2.3
- TypeScript 6
- Supabase Auth / PostgreSQL / RLS / Realtime / RPCs
- EAS Build
- expo-iap / Google Play Billing
- Android Google Sign-In
- Google Play Games Services v2
- pnpm
- Node.js 22 for EAS builds

Android package: **com.elroybenjamins.veldryn**

## Repository layout

    apps/mobile/                 Expo / React Native game, native modules, UI, assets, and mobile tests
    backend/src/server/          Server-authoritative gameplay and service-domain code
    backend/src/shared/          Shared backend contracts
    backend/supabase/            Supabase config, SQL migrations, database tests
    backend/online/              Hosted/online gameplay integration and tests
    backend/artifacts/           Reproducible balance outputs
    docs/implementation/         Current system contracts, status documents, QA/release notes
    docs/sources/                Canonical design workbooks and supporting source material
    tools/                       Validation, asset optimization, migration, and review utilities

## Source of truth

Read these before making broad gameplay/content changes:

1. [START_HERE_CODEX.md](START_HERE_CODEX.md)
2. [CODEX_IMPLEMENTATION_GUIDE.md](CODEX_IMPLEMENTATION_GUIDE.md)
3. [CONTENT_MAPPING.md](CONTENT_MAPPING.md)
4. [docs/implementation/README.md](docs/implementation/README.md)
5. [docs/implementation/TEST_CONTRACT.md](docs/implementation/TEST_CONTRACT.md)
6. [docs/implementation/UI_DESIGN_TOKENS.md](docs/implementation/UI_DESIGN_TOKENS.md)
7. [docs/sources/VELDRYN_Master_Design_Database_v5.6.xlsx](docs/sources/VELDRYN_Master_Design_Database_v5.6.xlsx)

The design workbook and stable implementation IDs take precedence over descriptive README copy. Intentional deviations belong in [docs/implementation/PROTOTYPE_OVERRIDES.md](docs/implementation/PROTOTYPE_OVERRIDES.md).

Useful live status documents include:

- [Chat/account reliability](docs/implementation/CHAT_ACCOUNT_RELIABILITY_20261004.md)
- [Chat/account recovery](docs/implementation/CHAT_ACCOUNT_RECOVERY_20261005.md)
- [Player identity surfaces](docs/implementation/PROFILE_IDENTITY_SURFACES.md)
- [Co-op current status](docs/implementation/COOP_CURRENT_STATUS.md)
- [Online gameplay status](docs/implementation/ONLINE_GAMEPLAY_STATUS.md)
- [Google account + Play Games setup](apps/mobile/GOOGLE_SERVICES_SETUP.md)

## Development setup

### Requirements

- Node.js 22 recommended
- pnpm
- Android Studio/emulator or a physical Android device for native validation
- EAS account/access for cloud builds
- Docker Desktop + WSL 2 only when running the local Supabase stack

### Mobile

    cd apps/mobile
    pnpm install --frozen-lockfile
    pnpm start

Useful launch commands:

    pnpm android
    pnpm ios
    pnpm web

Native Google Sign-In, Play Games, and billing cannot be fully tested in Expo Go. Use a development build, internal build, or Google Play build.

### Backend

    cd backend
    pnpm install --frozen-lockfile
    pnpm run typecheck
    pnpm run build

### Local Supabase

    cd backend
    pnpm run supabase:start
    pnpm run supabase:reset
    pnpm run supabase:status
    pnpm run supabase:env

Never ship the Supabase service-role key in the mobile app. Mobile clients use public credentials and sanitized/server-authorized projections.

## Android release build

Production EAS configuration lives in apps/mobile/eas.json.

From apps/mobile:

    pnpm install --frozen-lockfile
    npx expo-doctor
    npx eas build --platform android --profile production

Production builds currently use remote build-version management with automatic Android build-code incrementing. The user-facing Expo version is separate; change apps/mobile/app.json deliberately when preparing a new semantic store version.

Before uploading a new AAB, verify:

- Expo Doctor passes.
- Mobile TypeScript/core tests pass.
- The installed Settings screen reports the expected app version/build.
- Guest → linked account still preserves the same character/account.
- Google Sign-In and Play Games work with a licensed tester.
- World/Guild/Party chat sends and receives between real clients.
- Purchase/restore/refund behavior is correct for VIP, VIP+, and Supporter.
- Event startup artwork is only shown inside its date window.
- Existing Google Play users can upgrade to the new version code/device set.

## Verification

Common mobile checks:

    cd apps/mobile
    pnpm run typecheck
    pnpm run typecheck:core
    pnpm run test:core
    pnpm run test:pre-codex
    pnpm run test:onboarding
    pnpm run test:online
    pnpm run test:collectibles
    pnpm run test:companions

Common backend checks:

    cd backend
    pnpm run typecheck
    pnpm run build

Run the specific co-op, database, commerce, migration, chat, event, and balance suites relevant to the changed system. The repository contains extensive focused validators rather than relying on a single end-to-end test command.

## Release boundaries

The repository is not considered finished merely because a TypeScript/export build passes. Important release work still includes:

- Physical-device Android QA across startup, account linking, chat, purchases, combat, profile customization, and event presentation.
- Multi-device Live/Q-Mode validation and reconnect/reward testing.
- PostgreSQL concurrency/race validation for authoritative multiplayer state.
- Native accessibility, large-text, keyboard, narrow-width, and screen-reader passes.
- Google Play device-availability/update-path checks for each release.
- Ongoing asset-size and performance monitoring.
- Store release/version management and final Play Console verification.

## Project rules

- Keep combat, rewards, authoritative roles, matchmaking, and protected multiplayer state server-owned.
- Never expose service-role credentials, private Echo owner data, hidden route state, or unentitled reward data.
- Preserve guest progress when linking email/Google identities.
- Keep public profile cosmetics separate from authoritative combat identity.
- Do not silently fall back to demo chat or other non-production transports in production releases.
- Keep event presentation and availability tied to authoritative/date-gated event state.
- Run the relevant validation after each implementation pass and record meaningful durable behavior in the appropriate implementation document.
