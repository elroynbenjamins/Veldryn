# VELDRYN Admin QA Account & Dungeon Testing

## Purpose

Use one dedicated QA/admin account to reach content quickly without weakening normal player progression. The QA profile is a test harness, not a production entitlement.

### QA profile capabilities

- Level 100 active character.
- All core skills set to 99.
- All currently registered monsters and bosses unlocked.
- 99,999,999 Gold and large material reserves.
- Five character slots unlocked.
- VIP, VIP+ and Supporter entitlement flags enabled for UI/system verification.
- Large Inventory/Bank capacity.
- Equipment crafting queue reset for repeatable tests.
- One-button class switching across all 9 classes so class-restricted equipment recipes can be tested from one account.
- Direct entry to the normal Dungeon UI.

## Safety rules

A QA account must be excluded from:
- rankings and seasonal ladders;
- world-first / first-clear records;
- economy and progression balance telemetry;
- live contribution leaderboards;
- player-facing achievement comparisons.

Do not use a normal player account as the QA account.

## How to access locally

Development builds expose **Account → Developer → Admin QA Console**.

1. Apply/reset the QA profile.
2. Pick the class you want to test.
3. Refill materials when necessary.
4. Open Skills/Crafting and start the real equipment recipes. This deliberately does **not** pre-own every equipment item: the point is to test recipe requirements, queue timing, claim feedback, rarity rolls, upgrades and sockets.
5. Switch class in the QA Console to test another class's equipment.

## Dungeon testing

There are two levels of testing.

### 1. Local UI / navigation test

When the app is a development build with server gameplay disabled, the Dungeon screen already uses `createCoopDungeonFixtureSource`.

This validates:
- dungeon availability and tier presentation;
- loadout readiness UI;
- Q-mode vs Live mode selection;
- event expedition presentation;
- locked/available states across levels.

Historically this fixture was intentionally **intent-only**, so it did not create a real dungeon run.

### 2. Full online dungeon run test

Use the normal online co-op runtime. Seed or publish four QA Echo profiles with the fixed 1 Tank / 2 Damage / 1 Support composition:

- `[QA] Bulwark` — Bastion — Tank
- `[QA] Arrow` — Wayfinder — Damage
- `[QA] Hex` — Hexweaver — Damage
- `[QA] Dawn` — Dawnkeeper — Support

Canonical fixture definitions live in:
`backend/src/server/coop/admin-qa-echo-fixtures.ts`

Recommended tests:
1. Start Q-mode with the QA player in each role and let Echoes fill the remaining roles.
2. Verify duplicate-Damage-class restrictions where applicable.
3. Run Tier 1 through Tier 5.
4. Test disconnect/reconnect and stale Echo version rejection.
5. Test boss completion, reward settlement, first-clear protection and repeat rewards.
6. Test run failure, abandon/cancel, and stuck-run recovery.
7. Test Live mode separately with real second clients; QA Echoes should not be used to pretend a live human is connected.

## Production account role

For a deployed QA account, store authorization in trusted server-side account metadata (for Supabase, use app metadata / a server-owned admin table, never user-editable user metadata).

Suggested role:
`admin_qa`

The mobile app should only expose the QA Console when either:
- `__DEV__` is true; or
- the authenticated account has the trusted `admin_qa` role.

Never ship a client-side email allowlist or password bypass.
