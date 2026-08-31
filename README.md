# VELDRYN

VELDRYN is an idle multiplayer RPG currently being validated as an **offline-first Asterfall vertical slice** before production server costs are introduced.

## Start here
Codex/developers should read [`START_HERE_CODEX.md`](START_HERE_CODEX.md) first.

## Repository
- `apps/mobile/` — active Expo/React Native offline prototype.
- `backend/` — preserved server-authoritative backend foundation for the future online migration; not deployed for Milestone 1.
- `docs/sources/` — canonical design workbook(s).
- `docs/implementation/` — implementation/test/debug/UI contracts.

## Canonical design source
`docs/sources/VELDRYN_Master_Design_Database_v4.5.xlsx`

When design/content/balance differs from code, follow `CODEX_IMPLEMENTATION_GUIDE.md` and document intentional prototype overrides.

## Current milestone
**Milestone 1 — The Fallen Knight:** create a character, progress through Asterfall levels 1–25, improve through combat/loot/skilling/crafting/quests, defeat the Fallen Knight, and expose the Sunscar unlock teaser.

## Cost policy for current prototype
No Supabase deployment, paid hosting or other required online infrastructure is needed. The mobile prototype uses local persistence and repository abstractions so server ownership can replace local authority later.

## Android package
`com.elroybenjamins.veldryn`
