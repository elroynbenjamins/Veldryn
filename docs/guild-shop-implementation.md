# Guild Shop implementation status

Foundation only. This branch introduces a data-driven catalogue and proposed token rewards in `packages/guild-shop/src/catalogue.ts`. It is **not yet wired into gameplay**, purchases, or the mobile UI.

## Approved design
- Personal account-bound Guild Tokens, 250 base tokens earned per week maximum.
- Separate, finite event milestone rewards above the base weekly cap; server-side idempotency and membership checks required.
- Pets at guild levels 3 and 7; Epic companions at 10, 15 and 20.
- Personal borders, profile icon and three sets of five emotes; cosmetics remain with the player after leaving.
- Guild construction projects unlock at guild levels but require collective material and gold donations before a permanent guild decoration is granted.
- Guild leveling must not be blocked by construction.
- No premium currency shortcut.

## Required integration work
1. Identify canonical guild, wallet, inventory, pet, companion, cosmetic and event schemas; replace placeholder reward IDs.
2. Add database tables and migrations for token ledger, earned caps, purchases, project contributions, project state and guild unlocks.
3. Add server-authoritative atomic purchase, reward claim, and donation actions with replay prevention, membership and balance checks.
4. Integrate guild Shop and Construction screens and purchase/donation states.
5. Add tests for concurrent purchases/donations, duplicate claims, event caps, guild changes, and progression locks.
6. Simulate token earnings and guild-level pacing before enabling production.

The catalogue is intentionally **not** imported by production screens yet, to avoid exposing nonfunctional purchase buttons.
