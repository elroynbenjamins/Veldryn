# VELDRYN backend

TypeScript server-domain and Supabase foundation for authoritative VELDRYN online systems.

## Current capabilities

- Expeditions and combat resolution with persistent run state.
- Co-op lifecycle, normalization/readiness, immutable roster snapshots, route generation, Q-Mode Echo recruitment, Live matchmaking, ready/recovery, voting, chat, reward cadence, and sanitized public projections.
- Account, character, inventory, crafting, economy, market, guild/social, squad, Arena, Triad Trials, telemetry, abuse, and content-version schema foundations.
- Service-role-only RPC adapters for atomic runtime commits, worker leasing/fencing, reservations, trusted loadouts, and reward integrity.

See `../docs/implementation/COOP_CURRENT_STATUS.md` for current acceptance evidence and production release gates.

## Install and build

```powershell
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run build
```

Run the affected smoke scripts and `coop-phase1` through `coop-phase13` as appropriate. Script definitions are in `package.json`.

## Local Supabase

Docker Desktop with its WSL 2 backend is required on Windows. The CLI is pinned as a development dependency and configured in `supabase/config.toml`.

```powershell
pnpm run supabase:start
pnpm run supabase:reset
pnpm run supabase:status
pnpm run supabase:env
```

Local ports are API `54321`, PostgreSQL `54322`, Studio `54323`, and mail `54324`. `supabase:reset` recreates the database and applies all migrations in timestamp order. Stop the stack with `pnpm run supabase:stop`.

Before changing a hosted project, inspect linked migration status, run a linked dry run, and lint the database. Mobile clients may use only public/anonymous credentials; service-role credentials belong exclusively in trusted server environments.

## Discord announcements

`src/server/discord` contains the official VELDRYN announcement publisher. It posts branded embeds for event start/end, patch notices, maintenance, and new content. The publisher is idempotent in-process, disables mass mentions by default, and supports separate channels per announcement type.

Copy `discord-bot.env.example` into the deployment secret store and set the bot token plus channel IDs. The bot only needs `View Channel` and `Send Messages`/`Embed Links` in the configured channels.

Examples after compiling with `pnpm exec tsc --outDir dist-discord`:

```powershell
node dist-discord/server/discord/discord-cli.js event-start --id harvestwake-2026 --name Harvestwake --summary "Harvestwake is now live." --starts 2026-10-01T12:00:00Z --ends 2026-10-31T23:59:59Z --details "Earn Candy|Unlock guild cosmetics"
node dist-discord/server/discord/discord-cli.js patch --id mobile-0.1.0-v9 --version 0.1.0 --summary "Co-op and event improvements are now available."
node dist-discord/server/discord/discord-cli.js maintenance --id maintenance-2026-10-01 --title "Scheduled maintenance" --summary "Servers will be briefly unavailable." --starts 2026-10-01T22:00:00Z
node dist-discord/server/discord/discord-cli.js content --id sunscar-frostmarch --name "Sunscar Frostmarch" --summary "A new region and dungeon are now available."
```

Use `DISCORD_DRY_RUN=true` in CI preview jobs. Real credentials must never be committed or exposed to the mobile app.
