# VELDRYN mobile app

Expo/React Native client for the offline-first solo game and the feature-gated online/co-op presentation.

## Included

- Asterfall/Fallen Knight solo progression, idle combat, loot, equipment, enhancement, inventory/bank, gathering, crafting, quests, seasons/weather, saves, and accessibility/settings foundations.
- Public Supabase account/profile and social presentation using client-safe credentials.
- Co-op dungeon browsing, loadout selection, Q-Mode/Live projections, route and reward presentation, and authenticated API adapters.
- Co-op remains off by default until the server integration gates in `../../docs/implementation/COOP_CURRENT_STATUS.md` pass.

## Run

```powershell
pnpm install --frozen-lockfile
pnpm start
```

Use `pnpm android`, `pnpm ios`, or `pnpm web` for a target platform. Copy `.env.example` to an ignored local environment file for public Supabase and co-op API configuration. Never add a Supabase service-role key here.

## Verify

```powershell
pnpm run typecheck:core
pnpm run test:core
pnpm run test:pre-codex
```

Release candidates also require a full TypeScript check, Android Expo/Hermes export, and physical-device layout/accessibility validation.
