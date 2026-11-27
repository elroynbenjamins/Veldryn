# Veldryn

Veldryn is a mobile-first idle MMORPG with pixel-art presentation, offline progression, class-based combat, gathering, crafting and cooperative adventures. Build characters, discover equipment, develop professions and progress alongside friends and guildmates.

## Project status

| Track | Status |
| --- | --- |
| 1.x | Live game; ongoing content, balance, performance and quality-of-life updates |
| Main branch | Android release candidate configured as **1.0.13** |
| 2.0 | In development; not available in the live game |

The version in [app.json](apps/mobile/app.json) is the source of truth for the configured app version, not proof of Google Play publication. Store availability and deployed backend versions must be verified separately.

## Game features

- Nine classes across Tank, Damage and Support roles, with multiple characters per account.
- Idle and offline progression, regional enemies and bosses, equipment, gems, loadouts, mastery and quests.
- Gathering, refining, crafting and other skills with independent progression paths.
- Companions, pets, collections, profile customization and seasonal content.
- Friends, persistent parties, guilds, guild projects, rankings, chat and public character showcases.
- Cooperative dungeons with Live matchmaking and Q-Mode/Echo parties, role-based composition (1 Tank, 2 Damage, 1 Support), route choices and server-validated rewards.
- Guest-first accounts with email and Google linking, and optional VIP, VIP+ and Supporter entitlements.

Content availability depends on the deployed version, account progression and event schedule.

## Development direction

The 1.x release track focuses on stability, balancing, seasonal events, mobile usability and performance. Larger progression and combat changes are developed separately for a coordinated 2.0 release.

Features in development are not release commitments. Keep unfinished systems isolated from production entry points, item discovery, rewards and public roadmap claims until explicitly approved for release.

## Technology

| Component | Stack |
| --- | --- |
| Mobile | Expo SDK 58, React Native 0.88, React 19, TypeScript |
| Backend | TypeScript, server-authoritative gameplay services |
| Data and identity | PostgreSQL, Supabase Auth, Realtime, RLS and RPCs |
| Android builds | EAS Build, Node.js 22, pnpm |
| Native integrations | Google Sign-In, Play Games Services v2, Google Play Billing |

Android application ID: `com.elroybenjamins.veldryn`.

## Repository structure

| Path | Purpose |
| --- | --- |
| [apps/mobile/](apps/mobile/) | Mobile app, UI, runtime assets and tests |
| [backend/src/](backend/src/) | Gameplay logic and shared contracts |
| [backend/online/](backend/online/) | Online services and integration tests |
| [backend/supabase/](backend/supabase/) | Database migrations, Edge Functions, policies and tests |
| [control-center/](control-center/) | Operations dashboard |
| [packages/](packages/) | Shared packages |
| [tools/](tools/) | Build, asset, validation and deployment utilities |
| [docs/](docs/) | Technical, operational and art references |
| [marketing/](marketing/) | Store and marketing assets |

Current code, tests, migration history and approved implementation decisions take precedence over historical design notes.

## Local development

Use Node.js 22 and pnpm. The mobile app and backend have separate package manifests; install dependencies in the relevant directory.

### Mobile

```sh
cd apps/mobile
pnpm install --frozen-lockfile
pnpm start
```

Use `pnpm android`, `pnpm ios` or `pnpm web` as appropriate. Native authentication, billing and Play Games require a native development or store build rather than Expo Go.

### Backend

```sh
cd backend
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run build
```

For an isolated local database stack:

```sh
cd backend
pnpm run supabase:start
pnpm run supabase:status
pnpm run supabase:test-db
```

Only reset disposable local databases. Never use production service-role credentials in mobile builds or commit private credentials.

## Validation

Run checks appropriate to the changed system. Commands below are defined in the current package manifests.

**Mobile** (from `apps/mobile`):

```sh
pnpm run typecheck
pnpm run typecheck:core
pnpm run test:core
pnpm run test:onboarding
pnpm run test:online
pnpm run test:release-bundle
```

**Backend** (from `backend`):

```sh
pnpm run typecheck
pnpm run build
pnpm run test:online
pnpm run test:release-gate
```

Use focused tests for dungeons, commerce, companions, events, migration safety, economy and any other affected systems. Passing compilation alone does not establish production readiness.

## Release workflow

Production profiles are defined in [eas.json](apps/mobile/eas.json). Build from `apps/mobile`:

```sh
pnpm install --frozen-lockfile
npx expo-doctor
npx eas build --platform android --profile production
```

EAS manages the Android build code remotely; the user-facing version is maintained separately in app.json. Respect the lockfile and dependency supply-chain policy.

From 1.0.14 onward, follow the [release-note writing standard](marketing/release-notes/WRITING-STANDARD.md) for all in-game highlights, detailed patch notes and Google Play release notes.

Before publication, verify the exact release commit, applicable CI checks, database migration/deployment compatibility, Android bundle, real-device behavior, account linking, chat, multiplayer reconnect and reward settlement, purchases/restores and seasonal availability. Confirm Google Play rollout separately.

## Repository maintenance

- Keep `main` release-oriented. Use focused pull requests and separate review branches for unfinished systems.
- Preserve active release fixes and stacked development dependencies; never merge an unfinished review branch simply to reduce the PR count.
- Consolidate superseded reviews only after verifying that the retained branch contains their changes and evidence.
- Delete merged or redundant branches only after checking ancestry, open PR dependencies and unique commits. Preserve release tags, recovery refs and migration history.
- Keep gameplay and website verification scoped to their respective changes.
- Keep the README stable and concise; use app configuration, release notes, PRs and focused documentation for changing implementation details.

## Engineering principles

Keep protected gameplay decisions and rewards server-authoritative. Preserve account ownership and guest progression, enforce access boundaries, make settlement idempotent and transactional where needed, and keep unreleased systems isolated. Prefer compact, accessible mobile interfaces and test the actual player journey rather than relying solely on static checks.

[Pull requests](../../pulls) · [Issues](../../issues) · [Actions](../../actions)
