# VELDRYN — Codex Implementation Guide

## Mission
Build the offline-first Asterfall vertical slice before expanding online systems. The prototype must be fun, deterministic, testable, and easy to migrate to the existing server backend later.

## Source-of-truth order
When sources disagree, use this order and do not silently invent a fourth answer:
1. `docs/sources/VELDRYN_Master_Design_Database_v4.5.xlsx` — canonical design/content/balance.
2. `MVP_SCOPE.md` — canonical prototype scope and exclusions.
3. `CONTENT_MAPPING.md` — runtime mapping for workbook data.
4. `apps/mobile/src/core/*` — current offline gameplay contracts.
5. `backend/*` — future authoritative online/security implementation.

If workbook and code conflict, preserve the workbook value unless a documented prototype override exists. Record intentional overrides in `docs/implementation/PROTOTYPE_OVERRIDES.md`.

## Current authority model
- Current prototype: local repository is authoritative for testing only.
- Future production: server becomes authoritative for combat, loot, currency, crafting, Market, guilds, PvP, raids, Echo/squad rewards, chat moderation, entitlements and progression claims.
- UI never owns gameplay truth. Screens call repository/domain functions.
- Never embed a Supabase assumption directly in a screen component.

## Architecture rules
- Keep `GameRepository` as the boundary between UI and persistence/network.
- Keep deterministic gameplay logic in pure TypeScript under `src/core`.
- Keep content definitions separate from engines.
- Prefer data-driven tags/effects over class/monster-specific `if` chains.
- Stable IDs are immutable after release. Never reuse an ID for different content.
- Persist timestamps, not background timers. Offline claims derive elapsed time when the app resumes.
- All random gameplay outcomes must use an explicit deterministic seed/PRNG input.
- Monetary/reward operations must be idempotent when migrated online.

## Folders Codex may edit now
- `apps/mobile/**`
- `docs/implementation/**`
- root implementation docs

## Folders Codex should treat as reference-only during offline MVP
- `backend/**` except for compatibility fixes explicitly requested.
- `docs/sources/**` — never rewrite the workbook from code.

## UI implementation rules
- Reuse components before introducing screen-specific copies.
- Minimum interactive touch target: 44 CSS px; aim for 48 where practical.
- Support text scales through 150% without clipping critical labels.
- Do not communicate rarity, danger or status through color alone.
- Core screens must work with Reduce Motion enabled.
- Prefer readable pixel styling over literal tiny pixel-sized text/buttons.

## Required reusable components before broad screen expansion
`GameHeader`, `PixelPanel`, `GameButton`, `ProgressBar`, `StatRow`, `ItemCard`, `MonsterCard`, `ActivityCard`, `CurrencyDisplay`, `RewardPopup`, `ConfirmModal`, `EmptyState`.
Existing components may be evolved into these; do not duplicate equivalents.

## Save/data rules
- Current canonical local save schema is declared in `src/core/save-migrations.ts`.
- Every persisted shape change that breaks an older save requires a migration.
- Never silently reset a valid older save.
- Unknown newer save versions must fail safely rather than being coerced backwards.
- Performance/device settings may remain device-local later; account gameplay state must be migratable to server ownership.

## Testing gate for every gameplay change
At minimum run:
- `npm run typecheck:core`
- `npm run test:core`

Add deterministic tests whenever modifying progression, loot, offline claims, crafting, quests, item stats or boss gates.

## First Codex task
Improve and complete the v0.4 offline Asterfall vertical slice described in `MVP_SCOPE.md`. Do not add Supabase deployment, live multiplayer, production Market or monetization. Prioritize the core loop: kill -> loot -> compare -> equip -> stronger target -> quest/boss progression.
