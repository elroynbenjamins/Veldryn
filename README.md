# Veldryn

VELDRYN — An Idle Multiplayer RPG.

This repository currently uses a **local-first playable prototype** so the core loop can be tested without Supabase/server hosting costs.

## Structure

- `apps/mobile` — Expo / React Native offline prototype v0.4.
- `backend` — accumulated server-authoritative backend foundation v2.1, preserved for later online migration.

## Current prototype loop

Create character → idle combat → collect deterministic rewards → loot/equip/sell/salvage → gather resources → craft → complete onboarding quests → reach level 25 → challenge the Fallen Knight.

## Architecture

The mobile UI depends on a `GameRepository` abstraction. Today it is backed by AsyncStorage. A future `SupabaseGameRepository` can implement the same interface and progressively move authoritative actions online without rebuilding the UI.

## Android

Canonical package/application id: `com.elroybenjamins.veldryn`

## Run the offline prototype

```bash
cd apps/mobile
npm install
npx expo start
```

No Supabase project is required for the current prototype.
