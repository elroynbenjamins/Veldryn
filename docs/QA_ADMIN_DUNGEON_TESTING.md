# VELDRYN Admin / QA account and dungeon testing

## Security model

VELDRYN deliberately keeps two different concepts separate:

1. **Control Center Owner** — the trusted server-side administrator. Owner access is authenticated through Supabase and `liveops_admin_users`. Never put an admin secret, service-role key, or an "isAdmin" client bypass in the mobile app.
2. **Gameplay QA character** — a normal gameplay state prepared with progression/resources so real crafting, equipment, dungeon, queue, reward and failure logic can still be exercised.

The mobile QA shortcuts below are compiled behind `__DEV__` and Settings hides them for authoritative online sessions.

## Local full-access QA character

1. Start a development build and create any class normally.
2. Open **Account / More → Settings → Developer**.
3. Use one of:
   - **Prepare full QA access** — level 100, all normal skills 100, all monster encounters unlocked, world boss gates marked complete, quests marked claimed, large Gold/material/gem stock, five character slots, max local forge-slot entitlements, Guild access flag and test premium balance.
   - **Prepare equipment crafting lab** — preserves progression/story state but gives max crafting skills, 50M Gold, large non-gear item stocks, large Inventory/Bank capacity and five forge slots.
   - **Prepare dungeon-ready loadout** — level 100 plus the current class's complete novice set, without faking a dungeon clear.
4. These actions do **not** auto-craft V33 equipment and do **not** auto-complete co-op runs. Use the normal Forge, Inventory, upgrade, socket, compare, sell/salvage and dungeon flows.

This lets QA verify timers, rarity rolls, duplicate equipment instances, upgrade success/failure feedback, Stat/Effect Gems, queue/backlog behavior, reward moments and inventory decisions.

## Equipment test path

For the current class:

1. Run **Prepare equipment crafting lab**.
2. Open **Skills → Smithing / Equipment Forge**.
3. Craft each available V33 recipe normally.
4. Queue enough pieces to exercise all five forge slots plus the waiting backlog.
5. Claim duplicate copies of the same item and verify each copy can carry its own rank and Stat/Effect Gems.
6. Compare duplicates, equip the selected instance, then sell/salvage only the chosen instance.
7. Repeat with another class/character when validating class-restricted sets.

Do not grant finished V33 equipment as the default QA path; doing so would skip the systems being tested.

## Dungeon test paths

### A. Fast UI/presentation review

In a local development build:

1. **Prepare dungeon-ready loadout**.
2. Open **World → Co-op** to browse the development dungeon fixtures.
3. Open **Settings → Developer → Open Co-op UI Lab** for ready-check, route, combat, result and recovery presentation states.

This path needs no other human accounts.

### B. Full Q-Mode composition/domain test

The backend has `createQaEchoPool()` in `server/coop/qa-echo-fixtures.ts`.

Run:

```bash
cd backend
pnpm install --frozen-lockfile
pnpm test:coop-composition
```

The QA pool contains all nine classes as separate source accounts. The regression test starts Q-Mode with every class as controller and requires:

- exactly 4 members,
- exactly 1 Tank,
- exactly 2 Damage,
- exactly 1 Support,
- 3 distinct Echo source accounts,
- two different Damage classes.

The run still uses `QModeService`, normal route generation, level checks, roster invariants and combat snapshots.

### C. Real online Echo/Q-Mode test

Production Echoes are not client-authored bots. A donor character publishes a verified server loadout through the existing online co-op publication pipeline.

For a live/staging pool:

1. Use distinct test accounts/characters as Echo donors.
2. Give each donor a legal dungeon loadout and sufficient level/readiness.
3. From the co-op entry flow, opt that loadout into Echo sharing.
4. The server publishes a 24-hour Echo profile.
5. Start Q-Mode from the QA controller account.

Minimum donor roles depend on the controller:

- Tank controller → Support + two **different** Damage classes.
- Support controller → Tank + two **different** Damage classes.
- Damage controller → Tank + Support + another **different** Damage class.

For dependable all-class testing, keep donors across all nine classes. Echoes intentionally expire, so long-lived staging donors must republish periodically rather than becoming permanent hidden power.

## Live matchmaking

Echoes are for Q-Mode/offline composition. To test **live matchmaking**, use four real authenticated test accounts. The matcher should reject:

- missing 1T/2D/1S composition,
- two Damage players of the same class,
- duplicate account/character participation,
- stale/changed loadout revisions,
- unready or illegal loadouts.

## Admin account setup

The existing VELDRYN Control Center already supports **Viewer / Editor / Owner**. Use an Owner login for the primary QA operator.

Do not create a magic password in Git, a client-side admin flag, or a mobile service-role key. If a second administrator is needed, create/sign in that Supabase Auth user normally and add it through the existing Control Center admin-access screen as an Owner/Editor as appropriate.

## What to verify before calling dungeons ready

- Browse every dungeon and difficulty tier.
- Verify level/tier locking and effective-level normalization.
- Publish/unpublish an Echo.
- Verify expired Echoes are excluded.
- Run Q-Mode as Tank, Support and each Damage class.
- Confirm different-Damage-class enforcement.
- Test route branches, camp/merchant/special nodes and boss completion.
- Verify reward marks and weekly enhanced-reward limits.
- Test disconnect/retry/idempotency paths.
- Test live ready-check accept/decline/timeout and refill.
- Verify source Echo accounts cannot read/control the controller's run.
